var path_join = require('path').join,
    crypto = require('crypto'),
    pouchdb = require('pouchdb');

// create a pouchdb instance that's bidirectionally
// replicating with a given remote
// and storing data under the `data` folder
function connect (remote, db_name) {
  var db = new pouchdb(path_join('data', db_name)),
      opts = {
        continuous: true
      };

  db.replicate.to([remote, db_name].join('/'), opts);
  db.replicate.from([remote, db_name].join('/'), opts);

  return db;
}


// convenience method for generating route paths
// from the prefix and a given path
// good for, say, API versioning
function makePath (prefix) {
  return function (path) {
    var newPath = '/' + [prefix, path].join('/');
    return newPath;
  };
}

function password (SaltLength) {
  SaltLength = SaltLength || 9;

  function createHash(password) {
    var salt = generateSalt(SaltLength);
    var hash = sha1(password + salt);
    return {
      salt: salt,
      hash: hash,
      sha: salt + hash
    };
  }

  function validateHash(hash, password) {
    var salt = hash.substr(0, SaltLength);
    var validHash = salt + md5(password + salt);
    return hash === validHash;
  }

  function generateSalt(len) {
    var set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ',
        setLen = set.length,
        salt = '';
    for (var i = 0; i < len; i++) {
      var p = Math.floor(Math.random() * setLen);
      salt += set[p];
    }
    return salt;
  }

  function md5(string) {
    return crypto.createHash('md5').update(string).digest('hex');
  }

  function sha1(string) {
    return crypto.createHash('sha1').update(string).digest('hex');
  }

  return {
    hash: createHash,
    validate: validateHash
  };
}

module.exports = {
  password: password,
  connect: connect,
  makePath: makePath
};