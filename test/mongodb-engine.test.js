var Db = require('mongodb').Db
  , Server = require('mongodb').Server
  , map = require('async').map
  , collection
  , idProperty = '_id'
  , db = new Db('test', new Server('127.0.0.1', 27017, {})
  , { fsync: true, w: 1 })
  , assert = require('assert')

function getEngine(options, callback) {
  if (callback === undefined) {
    callback = options
    options = {}
  }
  collection.remove({}, function () {
    callback(undefined, require('../lib/mongodb-engine')(collection, options))
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
  db.close()
}

require('save/test/engine.tests')(idProperty, getEngine, connect, drop)

describe('mongodb-engine', function () {

  before(connect)
  after(drop)

  it('should find documents by id with a $in query', function (done) {
    getEngine(function (error, engine) {
      map([ { a: 1 }, { a: 2 }, { a: 3 } ], engine.create, function (error, documents) {
        var query = {}
        query[idProperty] = { $in: [ documents[0][idProperty], documents[1][idProperty] ] }
        engine.find(query, function (error, queryResults) {
          queryResults.length.should.equal(2)
          done()
        })
      })
    })
  })

  it('should find documents by id with a $nin query', function (done) {
    getEngine(function (error, engine) {
      map([ { a: 1 }, { a: 2 } ], engine.create, function (error, documents) {
        var query = {}
        query[idProperty] = { $nin: [ documents[0][idProperty] ] }
        engine.find(query, function (error, queryResults) {
          queryResults.length.should.equal(1)
          queryResults[0][idProperty].should.equal(documents[1][idProperty])
          done()
        })
      })
    })
  })

  it('should find documents by id with a $ne query', function (done) {
    getEngine(function (error, engine) {
      map([ { a: 1 }, { a: 2 } ], engine.create, function (error, documents) {
        var query = {}
        query[idProperty] = { $ne: documents[0][idProperty] }
        engine.find(query, function (error, queryResults) {
          queryResults.length.should.equal(1)
          queryResults[0][idProperty].should.equal(documents[1][idProperty])
          done()
        })
      })
    })
  })

})
