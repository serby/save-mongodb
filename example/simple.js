var save = require('save')
  , saveMongodb = require('save-mongodb')
  ;

serviceLocator.databaseConnections.main.collection('role', function(error, collection) {
  serviceLocator.saveFactory.role = function() {
    return save('role', { logger: serviceLocator.logger,
      engine: saveMongodb(collection)});
  };
  done();
});