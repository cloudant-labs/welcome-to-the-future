var fs = require('fs'),
    path = require('path'),
  // root of the Cloudant URL we'll push to
    admin_url = "https://" + process.env.USERNAME + ":" + process.env.PASSWORD + "@" + process.env.USERNAME + ".cloudant.com",
  // get paths to every design doc in the folder, excluding this file
    paths = fs.readdirSync(__dirname).filter(function(path){ return path !== "index.js"; });

module.exports = function (opts) {
  var couchapps = {},
      url = opts.url,
      prefix = opts.prefix;

  paths.forEach(function (ddoc) {
    var db;
    if (ddoc[0] !== '_') {
      db = [prefix, ddoc.replace(/\.js/, '')].join('-');
    } else {
      db = ddoc.replace(/\.js/, '');
    }

    couchapps[db] = {
      db: [url, db].join('/'),
      app: path.join('ddocs', ddoc)
    };
  });

  return couchapps;
};