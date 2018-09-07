module.exports = init

var ObjectID = require('mongodb').ObjectID

function init (property) {
  return castIdProperty

  function castIdProperty (query) {
    var newQuery = Object.assign({}, query)
    var idQuery = query[property]
    // only convert if id is present
    if (!idQuery) {
      return newQuery
    }

    if (Object(idQuery) === idQuery) {
      newQuery[property] = castComplexId(idQuery)
    } else {
      newQuery[property] = ObjectID.isValid(newQuery[property])
        ? new ObjectID(newQuery[property]) : newQuery[property]
    }

    return newQuery
  }

  function castComplexId (query) {
    var newQuery = Object.assign({}, query)

    Object.keys(newQuery).map(function (key) {
      var value = newQuery[key]
      if (Array.isArray(value)) {
        newQuery[key] = value.map(function (item) {
          return ObjectID.isValid(item) ? new ObjectID(item) : item
        })
      } else {
        newQuery[key] = ObjectID.isValid(value) ? new ObjectID(value) : value
      }
    })

    return newQuery
  }
}
