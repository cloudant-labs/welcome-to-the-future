/*
 * Checks to make sure each required database exists.
 */

var nano = require('nano'),
    async = require('async');

module.exports = function (opts, cb) {
  var instance = nano(opts.url);

  instance.db.list(function (err, dbs) {
    if (err) {
      cb(err);
    } else {
      var missing = [],
          needed = [
            [opts.prefix, 'base'].join('-'),
            [opts.prefix, 'master'].join('-'),
            '_replicator'
          ];

      needed.forEach(function (db) {
        if (dbs.indexOf(db) === -1) {
          missing.push(db);
        }
      });

      async.map(missing, instance.db.create, cb);
    }
  });
};