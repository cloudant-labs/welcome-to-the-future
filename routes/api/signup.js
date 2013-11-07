var util = require('./util'),
    async = require('async'),
    nano = require('nano'),
    passcrypt = util.password();

module.exports = function (app, prefix, admin_url) {
  var instance = nano(admin_url),
      users = instance.use('_users'),
      replicator = instance.use('_replicator'),
      makePath = util.makePath(prefix),
      db = util.connect(admin_url, '_users');

  app.post(makePath('signup'), function (req, res) {
    var username = req.body.username,
        password = req.body.password,
        creds = passcrypt(password);

      // add to _users db
      users.insert({
        name: username,
        type: 'user',
        salt: creds.salt,
        password_sha: creds.sha,
        roles: []
      }, 'org.couchdb.user:' + username, function (err) {
        if (err) {
          res.send(err.status_code, err);
        } else {
          async.parallel([
            // create user_{username}
            function (done) {
              instance.db.create('user_' + username, done);
            },
            // write security doc to user_{username}
            function (done) {
              var user = instance.use('user_' + username);

              user.insert({
                cloudant: {
                  nobody: [
                    "_reader",
                    "_writer",
                    "_admin"
                  ]
                },
                members: {
                  names: [username],
                  roles: []
                }
              }, '_security', done);
            },
            // add doc to _replicator: setup -> user_{username}
            function (done) {
              replicator.insert({
                source: [admin_url, 'setup'].join('/'),
                target: [admin_url, 'user_' + username].join('/'),
                continuous: true
              }, 'setup_' + username, done);
            },
            // add doc to _replicator: user_{username} -> master
            function (done) {
              replicator.insert({
                source: [admin_url, 'user_' + username].join('/'),
                target: [admin_url, 'master'].join('/'),
                continuous: true,
                filter: 'queries/content'
              }, 'master_' + username, done);
            }
          ], function (err) {
            if (err) {
              res.send(err.status_code, err);
            } else {
              res.send(200);
            }
          });
        }
      });
  });
};