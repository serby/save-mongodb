var _ = require('lodash')
  , emptyFn = function() {}
  , EventEmitter = require('events').EventEmitter
  ;

module.exports = function(collection, options) {
   var defaults = { idProperty: '_id'
      }
    , self = new EventEmitter()
    ;

  options = _.extend({}, options, defaults);

  function create(object, callback) {
   callback = callback || emptyFn;
    self.emit('create', object);
    var a = _.extend({}, object);
    collection.insert(a, { safe: true }, function(error, data) {
      if (error) {
        return callback(error);
      } else {
        callback(error, data[0]);
      }
    });
  }

  function read(id, callback) {
    var query = {};
    self.emit('read', id);
    callback = callback || emptyFn;
    query[options.idProperty] = id;
    collection.findOne(query, function(error, data) {
      callback(error, data === null ? undefined : data);
    });
  }

  function update(object, overwrite, callback) {
    if (typeof overwrite === 'function') {
      callback = overwrite;
      overwrite = false;
    }

    self.emit('update', object, overwrite);
    callback = callback || emptyFn;
    var query = {}
      , updateObject = _.extend({}, object)
      , updateData = overwrite ? updateObject : { $set: updateObject }
      , id = object[options.idProperty]
      ;

    if (id === undefined) {
      return callback(new Error('Object has no \''
        + options.idProperty + '\' property'));
    }

    query[options.idProperty] = id;
    delete updateObject[options.idProperty];
    collection.findAndModify(query, [['_id','asc']], updateData,
      { 'new': true }, function(error, entity) {

      if (entity === undefined) {
        callback(new Error('No object found with \'' + options.idProperty +
          '\' = \'1\''));
      } else {
        callback(error, entity);
      }

    });
  }

  function del(query, callback) {
    self.emit('delete', query);
    callback = callback || emptyFn;
    collection.remove(query, callback);
  }

   /**
   * Deletes one object. Returns an error if the object can not be found
   * or if the ID property is not present.
   *
   * @param {Object} object to delete
   * @param {Function} callback
   * @api public
   */
  function deleteOne(object, callback) {
    self.emit('deleteOne', object);
    var query = {}
      , id = object[options.idProperty]
      ;

    if (id === undefined) {
      return callback(new Error('Object has no \''
        + options.idProperty + '\' property'));
    }

    callback = callback || emptyFn;
    query[options.idProperty] = object[options.idProperty];
    collection.remove(query, callback);
  }


  function find(query, options, callback) {
    self.emit('find', query);
    collection.find(query, {}, options).toArray(function(error, data) {
      if (error) {
        return callback(error);
      }
      callback(undefined, data);
    });
  }

  function findOne(query, callback) {
    self.emit('findOne', query);
    collection.findOne(query, function(error, data) {
      if (error) {
        return callback(error);
      }
      callback(undefined, data);
    });
  }

  function count(query, callback) {
    self.emit('count', query);
    collection.count(query, callback);
  }

  _.extend(self, {
    create: create
    , read: read
    , update: update
    , deleteOne: deleteOne
    , 'delete': del
    , find: find
    , findOne: findOne
    , count: count
    , idProperty: options.idProperty
  });

  return self;
};