var Db = require('mongodb').Db // npm install mongodb
  , Server = require('mongodb').Server
  , save = require('save') // npm install save
  , saveMongodb = require('..')
  , es = require('event-stream')
  // Create a db object to a local mongodb database called SimpleExample.
  , db = new Db('test', new Server('127.0.0.1', 27017, {}), { fsync: true, w: 1 })

// Open your mongodb database.
db.open(function (error, connection) {

  if (error) return console.error(error.message)

  // Get a collection. This will create the collection if it doesn't exist.
  connection.collection('contact', function (error, collection) {

    if (error) return console.error(error.message)

    // Create a save object and pass in a mongodb engine.
    var contactStore = save('Contact', { engine: saveMongodb(collection) })

    // Then we can create a new object.
    contactStore.create({ name: 'Paul', email: 'paul@serby.net' }, function () {

      if (error) return console.error(error.message)

      contactStore.find({})
        .pipe(es.map(function (data, cb) {
          console.log(data)
          cb()
        }))
        .on('end', function () {
          connection.close()
        })

    })

  })
})
