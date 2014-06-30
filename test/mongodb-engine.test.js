var Db = require('mongodb').Db
  , Server = require('mongodb').Server
  , collection
  , idProperty = '_id'

var db = new Db('test', new Server('127.0.0.1', 27017, {}),
  {fsync: true, w: 1})

function getEngine(callback) {
  collection.remove({}, function () {
    callback(undefined, require('../lib/mongodb-engine')(collection))
  })
}

function connect(done) {
  db.open(function (error, connection) {
    connection.collection('test', function (error, c) {
      collection = c
      done()
    })
  })
}

function drop() {
  db.dropDatabase()
}

require('save/test/engine.tests')(idProperty, getEngine, connect, drop)

describe('mongodb-engine', function () {

  before(connect)
  after(drop)

  it('should find records by id with a $in query', function (done) {

    var _1 = { a: 1 }, _2 = { a: 2 }

    getEngine(function (error, engine) {

      engine.create(_1, function(error, new1) {
        engine.create(_2, function (error, new2) {
          var query = {}
          query[idProperty] = { $in: [ new1[idProperty], new2[idProperty] ] }

          engine.find(query, function (error, entities) {
            entities.length.should.equal(2)
            done()
          })
        })
      })

    })
  })

  it('should find records by id with a $nin query', function (done) {

    var _1 = { a: 1 }, _2 = { a: 2 }

    getEngine(function (error, engine) {

      engine.create(_1, function(error, new1) {
        engine.create(_2, function (error, new2) {
          var query = {}
          query[idProperty] = { $nin: [ new1[idProperty] ] }

          engine.find(query, function (error, entity) {
            entity.length.should.equal(1)
            entity[0][idProperty].should.equal(new2[idProperty])
            done()
          })
        })
      })

    })
  })

  it('should find records by id with a $ne query', function (done) {

    var _1 = { a: 1 }, _2 = { a: 2 }

    getEngine(function (error, engine) {

      engine.create(_1, function(error, new1) {
        engine.create(_2, function (error, new2) {
          var query = {}
          query[idProperty] = { $ne: new1[idProperty] }

          engine.find(query, function (error, entity) {
            entity.length.should.equal(1)
            entity[0][idProperty].should.equal(new2[idProperty])
            done()
          })
        })
      })

    })
  })

})
