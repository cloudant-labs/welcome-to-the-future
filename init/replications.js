/*
 * Checks to make sure the `base` database is continuously replicating to the `master`.
 */

var nano = require('nano');

module.exports = function (opts, cb) {
  var instance = nano(opts.url),
      replicator = instance.use('_replicator'),
      replication_doc = [opts.prefix, 'base', 'master'].join('-');

  function insert_doc (done) {
    replicator.insert({
      _id: replication_doc,
      source: [opts.url, [opts.prefix, 'base'].join('-')].join('/'),
      target: [opts.url, [opts.prefix, 'master'].join('-')].join('/'),
      continuous: true
    }, done);
  }

  replicator.get(replication_doc, function (err, doc) {
    if (err) {
      if (err.status_code === 404) {
        insert_doc(cb);
      } else {
        cb(err);
      }
    } else if (doc._replication_state !== 'triggered') {
      replicator.destroy(replication_doc, doc._rev, function (err) {
        if (err) {
          cb(err);
        } else {
          insert_doc(cb); 
        }
      });
    } else {
      cb();
    }
  });
};