/*
 * Checks to make sure each required database exists.
 */

var nano = require('nano'),
    async = require('async');

module.exports = function (url, cb) {
  var instance = nano(url);

  instance.db.list(function (err, dbs) {
    if (err) {
      cb(err);
    } else {
      var missing = [],
          needed = ['base', 'master', '_replicator'];

      needed.forEach(function (db) {
        if (dbs.indexOf(db) === -1) {
          missing.push(db);
        }
      });

      async.map(missing, instance.db.create, cb);
    }
  });
};