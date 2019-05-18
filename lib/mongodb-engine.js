module.exports = createEngine

var emptyFn = function () {}
var ObjectID = require('mongodb').ObjectID
var through = require('through2')
var es = require('event-stream')
var createCastIdProperty = require('./cast-id-property')

function createEngine (collection, engineOptions) {
  var self = es.map(createOrUpdate)
  var options = Object.assign({}, { idProperty: '_id' }, engineOptions)
  var castIdProperty = createCastIdProperty(options.idProperty)

  function create (object, callback) {
    callback = callback || emptyFn
    // if id is any falsy consider it empty
    if (!object[options.idProperty]) {
      delete object[options.idProperty]
    }
    self.emit('create', object)
    collection.insertOne(Object.assign({}, object), function (error, res) {
      if (error) return callback(error)
      var entity = objectIdToString(res.ops[0])
      self.emit('afterCreate', entity)
      self.emit('received', entity)
      callback(null, entity)
    })
  }

  function createOrUpdate (object, callback) {
    if (typeof object[options.idProperty] === 'undefined') {
      // Create a new object
      self.create(object, callback)
    } else {
      // Try and find the object first to update
      self.read(object[options.idProperty], function (err, entity) {
        if (err) return callback(err)
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

  function read (id, callback) {
    var query = {}
    query[options.idProperty] = id

    self.emit('read', id)

    callback = callback || emptyFn

    collection.findOne(castIdProperty(query), function (error, entity) {
      var data = entity === null ? undefined : objectIdToString(entity)
      self.emit('received', data)
      callback(error, data)
    })
  }

  function update (object, overwrite, callback) {
    if (typeof overwrite === 'function') {
      callback = overwrite
      overwrite = false
    }

    self.emit('update', object, overwrite)
    callback = callback || emptyFn
    var query = {}
    var updateObject = Object.assign({}, object)
    var updateData = overwrite ? updateObject : { $set: updateObject }
    var updateFunction = overwrite ? 'findOneAndReplace' : 'findOneAndUpdate'
    var id = object[options.idProperty]
    var typedId

    if (id === undefined || id === null) {
      return callback(new Error('Object has no \'' + options.idProperty + '\' property'))
    }

    query[options.idProperty] = id
    delete updateObject[options.idProperty]

    typedId = castIdProperty(query)

    collection[updateFunction](typedId, updateData, { returnOriginal: false, sort: { _id: 1 } }, function (error, res) {
      if (error) return callback(error)
      if (res.value === null) {
        return callback(new Error('No object found with \'' + options.idProperty + '\' = \'' + id + '\''))
      }
      var entity = objectIdToString(res.value)
      self.emit('afterUpdate', entity)
      self.emit('received', entity)
      callback(error, entity)
    })
  }

  function updateMany (query, object, callback) {
    self.emit('updateMany', query, object)
    callback = callback || emptyFn

    collection.update(query, { $set: object }, { multi: true, safe: true, upsert: false }, function (error) {
      if (error) return callback(error)
      self.emit('afterUpdateMany', query, object)
      self.emit('received', object)
      callback(error)
    })
  }

  function deleteMany (query, callback) {
    self.emit('deleteMany', query)
    callback = callback || emptyFn
    collection.deleteMany(castIdProperty(query), function (error) {
      if (error) return callback(error)
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
  function del (id, callback) {
    callback = callback || emptyFn

    if (typeof callback !== 'function') {
      throw new TypeError('callback must be a function or empty')
    }

    self.emit('delete', id)
    var query = {}

    query[options.idProperty] = id
    collection.deleteOne(castIdProperty(query), function (error) {
      if (error) return callback(error)
      self.emit('afterDelete', id)
      callback()
    })
  }

  // Because your application using save shouldn't know about engine internals
  // ObjectID must be converted to strings before returning.
  function objectIdToString (entity) {
    entity[options.idProperty] = entity[options.idProperty].toString()
    return entity
  }

  function find (query, saveOptions, callback) {
    if (typeof saveOptions === 'function') {
      callback = saveOptions
      saveOptions = {}
    }

    if (saveOptions === undefined) {
      saveOptions = {}
    }
    var options = Object.assign({}, saveOptions)

    if (options.fields) {
      options.projection = options.fields
      delete options.fields
    }
    // This is the streaming implementation
    if (callback === undefined) {
      self.emit('find', query, options)
      var convertIdStream = through.obj(function (chunk, enc, cb) {
        var mappedData = objectIdToString(chunk)
        self.emit('received', mappedData)
        cb(null, mappedData)
      })
      return collection.find(castIdProperty(query), options).pipe(convertIdStream)
    } else if (typeof callback !== 'function') {
      throw new Error('callback must be a function')
    }
    // Callback implementation - Uses lots of memory
    self.emit('find', query, options)
    collection.find(castIdProperty(query), options).toArray(function (error, data) {
      if (error) return callback(error)
      var mappedData = data.map(objectIdToString)
      self.emit('received', mappedData)
      callback(null, mappedData)
    })
  }

  function findOne (query, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    self.emit('findOne', query)
    collection.findOne(castIdProperty(query), options, function (error, entity) {
      if (error) return callback(error)
      var mappedEntity = entity === null ? undefined : objectIdToString(entity)
      self.emit('received', mappedEntity)
      callback(error, mappedEntity)
    })
  }

  function count (query, callback) {
    self.emit('count', query)
    collection.countDocuments(castIdProperty(query), function (error, data) {
      if (error) return callback(error)
      self.emit('received', data)
      callback(null, data)
    })
  }

  return Object.assign(self
    , { create: create,
      createOrUpdate: createOrUpdate,
      read: read,
      update: update,
      updateMany: updateMany,
      deleteMany: deleteMany,
      'delete': del,
      find: find,
      findOne: findOne,
      count: count,
      idProperty: options.idProperty,
      idType: ObjectID
    })
}
