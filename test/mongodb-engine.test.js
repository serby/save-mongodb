var Db = require('mongodb').Db
  , Server = require('mongodb').Server
  , collection

var db = new Db('test', new Server('127.0.0.1', 27017, { safe: true }))

function getEngine(callback) {
  collection.remove({}, function () {
    callback(undefined, require('../lib/mongodb-engine')(collection))
  })
}

require('save/test/engine.tests')('_id', getEngine, function (done) {
  db.open(function (error, connection) {
    connection.collection('test', function (error, c) {
      collection = c
      done()
    })
  })
}, function () {
  db.dropDatabase()
})