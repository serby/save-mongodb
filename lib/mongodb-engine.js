var extend = require('util')._extend
  , emptyFn = function () {}
  , EventEmitter = require('events').EventEmitter
  , ObjectID = require('mongodb').ObjectID

module.exports = function (collection, engineOptions) {
  var defaults = { idProperty: '_id' }
    , self = new EventEmitter()

  engineOptions = engineOptions || {}
  extend(engineOptions, defaults)

  function create(object, callback) {
    callback = callback || emptyFn
    // if id is any falsy consider it empty
    if (!object[engineOptions.idProperty]) {
      delete object[engineOptions.idProperty]
    }
    self.emit('create', object)
    var a = extend({}, object)
    collection.insert(a, { safe: true }, function (error, data) {

      if (error) {
        return callback(error)
      } else {
        data[0] = objectIdToString(data[0])
        self.emit('afterCreate', data[0])
        callback(error, data[0])
      }
    })
  }

  function read(id, callback) {
    var oId
      , query = {}

    self.emit('read', id)

    try {
      oId = new ObjectID(id)
    } catch (e) {
      if (e.message === 'Argument passed in must be a single String of 12 bytes or a string of 24 hex characters') {
        return callback(undefined, undefined)
      }
    }

    callback = callback || emptyFn
    query[engineOptions.idProperty] = oId
    collection.findOne(query, function (error, entity) {
      callback(error, entity === null ? undefined : objectIdToString(entity))
    })
  }

  function update(object, overwrite, callback) {
    if (typeof overwrite === 'function') {
      callback = overwrite
      overwrite = false
    }

    self.emit('update', object, overwrite)
    callback = callback || emptyFn
    var query = {}
      , updateObject = extend({}, object)
      , updateData = overwrite ? updateObject : { $set: updateObject }
      , id = object[engineOptions.idProperty]

    if (id === undefined || id === null) {
      return callback(new Error('Object has no \''
        + engineOptions.idProperty + '\' property'))
    }

    var oId = new ObjectID(id)
    query[engineOptions.idProperty] = oId;
    delete updateObject[engineOptions.idProperty]
    collection.findAndModify(query, [['_id', 'asc']], updateData,
      { 'new': true }, function (error, entity) {

      if (!entity) {
        callback(new Error('No object found with \'' + engineOptions.idProperty +
          '\' = \'' + id + '\''))
      } else {
        entity = objectIdToString(entity)
        self.emit('afterUpdate', entity)
        callback(error, entity)
      }
    })
  }

  function deleteMany(query, callback) {
    self.emit('deleteMany', query)
    callback = callback || emptyFn
    collection.remove(query, function (error) {
      if (error) {
        return callback(error)
      }
      self.emit('afterDeleteMany', query)
      callback()
    })
  }

   /**
   * Deletes one object. Returns an error if the object can not be found
   * or if the ID property is not present.
   *
   * @param {Object} object to delete
   * @param {Function} callback
   * @api public
   */
  function del(id, callback) {

    callback = callback || emptyFn

    if (typeof callback !== 'function') {
      throw new TypeError('callback must be a function or empty')
    }

    self.emit('delete', id)
    var query = {}

    query[engineOptions.idProperty] = new ObjectID(id)
    collection.remove(query, function (error) {
      if (error) {
        return callback(error)
      }
      self.emit('afterDelete', id)
      callback()
    })
  }

  // Because your application using save shouldn't know about engine internals
  // ObjectID must be converted to strings before returning.
  function objectIdToString(entity) {
    entity[engineOptions.idProperty] = entity[engineOptions.idProperty].toString()
    return entity
  }

  function find(query, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    if (typeof callback !== 'function') {
      throw new Error('callback must be a function')
    }
    self.emit('find', query)
    collection.find(query, {}, options).toArray(function (error, data) {

      if (error) {
        return callback(error)
      }
      callback(undefined, data.map(objectIdToString))
    })
  }

  function findOne(query, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    var id = query[engineOptions.idProperty]
    if (id) {
      query[engineOptions.idProperty] = id = new ObjectID(id)
    }
    self.emit('findOne', query)
    collection.findOne(query, options, function (error, entity) {
      if (error) {
        return callback(error)
      }
      callback(error, entity === null ? undefined : objectIdToString(entity))
    })
  }

  function count(query, callback) {
    self.emit('count', query)
    collection.count(query, callback)
  }

  extend(self,
    { create: create
    , read: read
    , update: update
    , deleteMany: deleteMany
    , 'delete': del
    , find: find
    , findOne: findOne
    , count: count
    , idProperty: engineOptions.idProperty
    , idType: String
    })

  return self
}
