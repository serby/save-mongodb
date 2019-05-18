var idProperty = '_id'
var MongoClient = require('mongodb').MongoClient
var assert = require('assert')
var Stream = require('stream').Stream
var mapSeries = require('async').mapSeries
var streamAssert = require('stream-assert')
var engine = require('../lib/mongodb-engine')
var connection
var collection
var mongoClient

function getEngine (options, callback) {
  if (callback === undefined) {
    callback = options
    options = {}
  }
  collection.removeMany({}, { j: true, w: 1 }, function (error) {
    if (error) {
      console.error('GetEngine', error)
      return callback(error)
    }
    collection.countDocuments({}, function (error, results) {
      if (error) {
        console.error('GetEngine', error)
        return callback(error)
      }
      if (results.length > 0) {
        console.error('GetEngine Check Empty Collection', error)
        return console.log(results)
      }
      callback(null, engine(collection, options))
    })
  })
}

function connect (done) {
  MongoClient.connect('mongodb://localhost:27017/test', { 'native_parser': true }, function (err, client) {
    mongoClient = client
    connection = client.db('test')
    if (err) return done(err)
    connection.collection('test', function (err, c) {
      if (err) return done(err)
      collection = c
      done()
    })
  })
}

function drop (done) {
  connection.dropDatabase(function (err) {
    if (err) return done(err)
    mongoClient.close(done)
  })
}

require('save/test/engine.tests')(idProperty, getEngine, connect)

describe('mongodb-engine', function () {
  after(drop)

  it('should find documents by id with a $in query', function (done) {
    getEngine(function (err, engine) {
      if (err) return done(err)
      mapSeries([ { a: 1 }, { a: 2 }, { a: 3 } ], engine.create, function (err, documents) {
        if (err) return done(err)
        var query = {}
        query[idProperty] = { $in: [ documents[0][idProperty], documents[1][idProperty] ] }
        engine.find(query, function (err, queryResults) {
          if (err) return done(err)
          assert.strictEqual(queryResults.length, 2)
          done()
        })
      })
    })
  })

  it('should find documents by id with a $nin query', function (done) {
    getEngine(function (err, engine) {
      if (err) return done(err)
      mapSeries([ { a: 1 }, { a: 2 } ], engine.create, function (err, documents) {
        if (err) return done(err)
        var query = {}
        query[idProperty] = { $nin: [ documents[0][idProperty] ] }
        engine.find(query, function (err, queryResults) {
          if (err) return done(err)
          assert.strictEqual(queryResults.length, 1)
          assert.strictEqual(queryResults[0][idProperty], documents[1][idProperty])
          done()
        })
      })
    })
  })

  it('should find documents by id with a $ne query', function (done) {
    getEngine(function (err, engine) {
      if (err) return done(err)
      mapSeries([ { a: 1 }, { a: 2 } ], engine.create, function (err, documents) {
        if (err) return done(err)
        var query = {}
        query[idProperty] = { $ne: documents[0][idProperty] }
        engine.find(query, function (err, queryResults) {
          if (err) return done(err)
          assert.strictEqual(queryResults.length, 1)
          assert.strictEqual(queryResults[0][idProperty], documents[1][idProperty])
          done()
        })
      })
    })
  })

  it('should callback with mongo errors', function (done) {
    getEngine(function (err, engine) {
      if (err) return done(err)
      engine.create({ a: 1 }, function (err, saved) {
        if (err) return done(err)
        engine.update({ _id: saved._id }, false, function (err) {
          assert.strictEqual(/No object found with '_id' =/.test(err.message), false
            , 'Unexpected error message: ' + err.message)
          done()
        })
      })
    })
  })

  describe('streaming interface of find()', function () {
    it('should return stream if no callback is provided', function (done) {
      getEngine(function (err, engine) {
        if (err) return done(err)
        assert.ok(engine.find({}) instanceof Stream, 'not a instance of Stream')
        done()
      })
    })

    it('should stream result data via ‘objectIdToString’ transformation', function (done) {
      getEngine(function (err, engine) {
        if (err) return done(err)
        mapSeries([ { a: 1, b: 0 }, { a: 2, b: 0 } ], engine.create, function (error, documents) {
          if (error) return done(error)
          var stream = engine.find({ b: 0 }, { cheese: 12, sort: { a: 1 } })
          stream
            .pipe(streamAssert.first(function (data) { assert.deepStrictEqual(data, documents[0]) }))
            .pipe(streamAssert.second(function (data) { assert.deepStrictEqual(data, documents[1]) }))
            .pipe(streamAssert.end(done))
        })
      })
    })

    it('should not lose any data if the stream is read asynchronously', function (done) {
      getEngine(function (err, engine) {
        if (err) return done(err)
        mapSeries([ {}, {}, {}, {}, {} ], engine.create, function (err) {
          if (err) return done(err)
          var stream = engine.find({})
          setTimeout(function () {
            stream
              .pipe(streamAssert.length(5))
              .pipe(streamAssert.end(done))
          }, 100)
        })
      })
    })
  })

  describe('castIdProperty()', function () {
    it('should correctly cast valid ObjectIDs when only valid ids passed', function (done) {
      getEngine(function (err, engine) {
        if (err) return done(err)
        const objects = [ { a: 1 }, { a: 2 }, { a: 3 } ]
        mapSeries(objects, engine.create, function (err, documents) {
          if (err) return done(err)
          var query = {}
          query[idProperty] = { $in:
            [ documents[0][idProperty], documents[1][idProperty], documents[2][idProperty] ]
          }
          engine.find(query, function (err, queryResults) {
            if (err) return done(err)
            assert.strictEqual(queryResults.length, 3)
            done()
          })
        })
      })
    })
    it('should correctly cast only valid ObjectIDs and return others untouched when mix of ids', function (done) {
      getEngine(function (err, engine) {
        if (err) return done(err)
        const objects = [ { a: 1 }, { _id: '34', a: 2 }, { _id: '767', a: 3 }, { a: 4 } ]
        mapSeries(objects, engine.create, function (err, documents) {
          if (err) return done(err)
          var query = {}
          query[idProperty] = { $in:
            [ documents[0][idProperty], '34', '767', documents[3][idProperty] ]
          }
          engine.find(query, function (err, queryResults) {
            if (err) return done(err)
            assert.strictEqual(queryResults.length, 4)
            done()
          })
        })
      })
    })
  })
})
