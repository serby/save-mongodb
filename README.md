# save-mongodb - mongodb persistence engine for **save**

## Installation

      npm install save-mongodb

## Usage

I won't bore your with waffle. If you want to see how this works look at the tests or this simple example:

```js
// What you'll need!
var Db = require('mongodb').Db // npm install mongodb
  , Server = require('mongodb').Server
  , save = require('save') // npm install save
  , saveMongodb = require('..')

  // Create a db object to a local mongodb database called SimpleExample.
  , db = new Db('SimpleExample', new Server('localhost', 27017, {}))

// Open your mongodb database.
db.open(function (error, connection) {

  // Get a collection. This will create the collection if it doesn't exist.
  connection.collection('contact', function (error, collection) {

    // Create a save object and pass in a mongodb engine.
    var contactStore = save('Contact', { engine: saveMongodb(collection) })

    // Then we can create a new object.
    contactStore.create({ name: 'Paul', email: 'paul@serby.net'}, function (error, contact) {

      // The created 'contact' is returned and has been given an _id
      console.log(contact)

      // Don't forget to close your database connection!
      connection.close()
    })

  })
})
```

### Streaming find()

Find now has a streaming interface

```js

var contactStore = save('Contact', { engine: saveMongodb(collection) })
  , es = require('event-stream')

contactStore.find({})
  .pipe(es.stringify())
  .pipe(process.stdout)

```

## Credits
[Paul Serby](https://github.com/serby/) follow me on twitter [@serby](http://twitter.com/serby)

## Licence
Licenced under the [New BSD License](http://opensource.org/licenses/bsd-license.php)
