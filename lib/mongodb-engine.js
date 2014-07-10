var _ = require('lodash')
  , emptyFn = function () {}
  , EventEmitter = require('events').EventEmitter
  , ObjectID = require('mongodb').ObjectID

module.exports = function (collection, engineOptions) {
  var self = new EventEmitter()
    , options = _.extend({}, { idProperty: '_id' }, engineOptions)

  function create(object, callback) {
    callback = callback || emptyFn
    // if id is any falsy consider it empty
    if (!object[options.idProperty]) {
      delete object[options.idProperty]
    }
    self.emit('create', object)
    collection.insert(_.extend({}, object), { safe: true }, function (error, data) {

      if (error) {
        return callback(error)
      } else {
        data[0] = objectIdToString(data[0])
        self.emit('afterCreate', data[0])
        callback(error, data[0])
      }
    })
  }

  function createOrUpdate(object, callback) {
    if (typeof object[options.idProperty] === 'undefined') {
      // Create a new object
      self.create(object, callback)
    } else {
      // Try and find the object first to update
      self.read(object[options.idProperty], function(err, entity) {
        if (err) {
          return callback(err)
        }
        if (entity) {
          // We found the object so update
          self.update(object, callback)
        } else {
          // We didn't find the object so create
          self.create(object, callback)
        }
      })
    }
  }

  function castIdProperty(query) {
    var newQuery = _.extend({}, query)
      , idQuery = query[options.idProperty]
    // only convert if id is present
    if (!idQuery) {
      return newQuery
    }

    try {
      if (_.isObject(idQuery)) {
        newQuery[options.idProperty] = castComplexId(idQuery)
      } else {
        newQuery[options.idProperty] = new ObjectID(newQuery[options.idProperty])
      }
    } catch (e) {
      if (e.message === 'Argument passed in must be a single String of 12 bytes or a string of 24 hex characters') {
        return newQuery
      }
    }

    return newQuery

  }

  function castComplexId(query) {
    var newQuery = _.extend({}, query)

    _.each(newQuery, function (value, key) {
      if (_.isArray(value)) {
        newQuery[key] = _.map(value, function (item) {
          return new ObjectID(item)
        })
      } else {
        newQuery[key] = new ObjectID(value)
      }
    })

    return newQuery
  }

  function read(id, callback) {
    var query = {}
    query[options.idProperty] = id

    self.emit('read', id)

    callback = callback || emptyFn

    collection.findOne(castIdProperty(query), function (error, entity) {
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
      , updateObject = _.extend({}, object)
      , updateData = overwrite ? updateObject : { $set: updateObject }
      , id = object[options.idProperty]

    if (id === undefined || id === null) {
      return callback(new Error('Object has no \''
        + options.idProperty + '\' property'))
    }

    query[options.idProperty] = id;
    delete updateObject[options.idProperty]
    collection.findAndModify(castIdProperty(query), [['_id', 'asc']], updateData,
      { 'new': true }, function (error, entity) {

      if (!entity) {
        callback(new Error('No object found with \'' + options.idProperty +
          '\' = \'' + id + '\''))
      } else {
        entity = objectIdToString(entity)
        self.emit('afterUpdate', entity)
        callback(error, entity)
      }
    })
  }


  function updateMany(query, object, callback) {

    self.emit('updateMany', query, object)
    callback = callback || emptyFn

    collection.update(query, { $set: object }, { multi: true, safe: true, upsert: false }, function (error) {
      self.emit('afterUpdateMany', query, object)
      callback(error)
    })
  }

  function deleteMany(query, callback) {
    self.emit('deleteMany', query)
    callback = callback || emptyFn
    collection.remove(castIdProperty(query), function (error) {
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

    query[options.idProperty] = id
    collection.remove(castIdProperty(query), function (error) {
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
    entity[options.idProperty] = entity[options.idProperty].toString()
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
    collection.find(castIdProperty(query), {}, options).toArray(function (error, data) {

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
    self.emit('findOne', query)
    collection.findOne(castIdProperty(query), options, function (error, entity) {
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

  return _.extend(self,
    { create: create
    , createOrUpdate: createOrUpdate
    , read: read
    , update: update
    , updateMany: updateMany
    , deleteMany: deleteMany
    , 'delete': del
    , find: find
    , findOne: findOne
    , count: count
    , idProperty: options.idProperty
    , idType: ObjectID
    })
}