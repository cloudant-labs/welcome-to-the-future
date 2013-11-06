/*
 * Perform a series of checks in advance of application startup.
 * Checks use the given URL to interact with Cloudant.
 */

var async = require('async');

module.exports = function (opts, cb) {
  async.applyEachSeries(
    [
      require('./databases'),
      require('./replications')
    ], 
    opts, 
    function (err) {
      if (err) throw err;
      cb();
    }
  );
};