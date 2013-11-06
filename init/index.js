/*
 * Perform a series of checks in advance of application startup.
 * Checks use the given URL to interact with Cloudant.
 */

var async = require('async');

module.exports = function (url, cb) {
  async.applyEach(
    [
      require('./databases'),
      require('./replications')
    ], 
    url, 
    function (err) {
      if (err) throw err;
      cb();
    }
  );
};