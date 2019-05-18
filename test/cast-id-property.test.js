var assert = require('assert')
var ObjectID = require('mongodb').ObjectID
var castIdProperty = require('../lib/cast-id-property')

describe('cast-id-property', function () {
  it('should return original query if idProperty doesnt exist in query', function () {
    var query = { a: 'something' }
    var result = castIdProperty('_id')(query)
    assert.deepStrictEqual(result, query)
  })

  it('should return cast property if single value provided', function () {
    var objectId = new ObjectID()
    var query = { _id: objectId.toString() }
    var result = castIdProperty('_id')(query)
    assert.deepStrictEqual(result, { _id: objectId })
  })

  it('should return string if single string value provided', function () {
    var stringA = 'something'
    var query = { _id: { $neq: stringA } }
    var result = castIdProperty('_id')(query)
    assert.deepStrictEqual(result, query)
  })

  it('should return cast object if object provided', function () {
    var objectA = new ObjectID()
    var objectB = new ObjectID()
    var query = { _id: { $in: [ objectA.toString(), objectB.toString() ] } }
    var result = castIdProperty('_id')(query)
    assert.deepStrictEqual(result, { _id: { $in: [ objectA, objectB ] } })
  })

  it('should cast only object if mixture is provided', function () {
    var objectA = new ObjectID()
    var objectB = new ObjectID()
    var stringA = 'something'
    var query = { _id: { $in: [ objectA.toString(), stringA, objectB.toString() ] } }
    var result = castIdProperty('_id')(query)
    assert.deepStrictEqual(result, { _id: { $in: [ objectA, stringA, objectB ] } })
  })
})
