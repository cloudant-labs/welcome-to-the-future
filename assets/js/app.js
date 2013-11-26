angular.module('app', ['ngCookies', 'ngRoute'])
.constant('md', new Showdown.converter())
.constant('Pouch', new PouchDB('wttf'))
.constant('Proxy', '/proxy')
.constant('Api', '/api')
.factory('Master', ['Proxy', function (Proxy) {
  var url = [
        location.protocol,
        '//',
        location.host
      ].join(''),
      pouch = new PouchDB(url + Proxy + '/wttf-master');

  return pouch;
}])
.factory('Auth', [
  '$http', '$cookieStore', 'Proxy', 'Api', 'Pouch', 'Master', 
  function ($http, $cookieStore, Proxy, Api, Pouch, Master) {
    var currentUser = $cookieStore.get('AuthSession') || null,
        currentUsername = null;

    return {
      login: function login (username, password, done) {
        if (!done) done = function () {};

        return $http({
          url: [Proxy, '_session'].join('/'),
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: [
            ['name', username].join('='),
            ['password', password].join('=')
          ].join('&')
        })
        .success(function () {
          var url = [
                location.protocol,
                '//',
                username,
                ':',
                password,
                '@',
                location.host,
                Proxy,
              ].join(''),
              opts = {
                continuous: true
              },
              user_url = url + ['/wttf', username].join('-'),
              master_url = url + ['/wttf', 'master'].join('-');

          Pouch.replicate.to(user_url, opts);
          Pouch.replicate.from(user_url, opts);

          currentUsername = username;

          done();
        })
        .error(done);
      },
      signup: function signup (username, password, done) {
        if (!done) done = function () {};

        return $http({
          url: [Api, 'signup'].join('/'),
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: [
            ['name', username].join('='),
            ['password', password].join('=')
          ].join('&')
        })
        .success(login.bind(null, username, password, done))
        .error(done);
      },
      logout: function logout (done) {
        if (!done) done = function () {};

        return $http({
          url: [Proxy, '_session'].join('/'),
          method: 'DELETE'
        }).success(function (res) {
          currentUser = null;
          $cookieStore.remove('user');
          done();
        }).error(done);
      },
      isLoggedIn: function () {
        return !!currentUser;
      },
      getUsername: function () {
        return currentUsername;
      }
    };
  }
])
.controller('NavCtrl', [
  '$scope', 'Auth',
  function ($scope, Auth) {
    $scope.authenticated = Auth.isLoggedIn();
  }
])
.controller('HotCtrl', [
  '$scope', 'Master',
  function ($scope, Master) {
    $scope.title = "Hot Futures";

    function chunks (array, size) {
      var results = [];
      while (array.length) {
        results.push(array.splice(0, size));
      }
      return results;
    }

    function getHot () {
      Master.query('queries/hot', {
        group: true,
        limit: 40
      }, function (err, res) {
        if (err) {
          console.log(JSON.stringify(err));
        } else {
          var posts = {},
              by_hots = [];

          res.rows.forEach(function (row) {
            if (!posts[row.key[0]]) {
              posts[row.key[0]] = {
                _id: row.key[0]
              };
            }
            if (row.key[1]) {
              posts[row.key[0]].created_at = row.key[1];
              posts[row.key[0]].doc = row.key[2];
            } else {
              posts[row.key[0]].votes = row.value;
            }
          });

          Object.keys(posts).forEach(function (id) {
            by_hots.push(posts[id]);
          });

          by_hots = by_hots.sort(function (a, b) {
            var a_hots = (a.votes || 1) * a.created_at,
                b_hots = (b.votes || 1) * b.created_at;

            return a_hots - b_hots;
          }).map(function (row) {
            return row.doc;
          });

          $scope.$apply(function () {
            $scope.posts = by_hots;
          });
        }
      });
    }

    getHot();

    Master.changes({
      continuous: true,
      onChange: getHot
    });
  }
])
.controller('RecentCtrl', [
  '$scope', 'Master',
  function ($scope, Master) {
    $scope.title = "Recent Futures";

    function getRecent () {
      Master.query('queries/recent', {
        include_docs: true,
        limit: 40
      }, function (err, res) {
        if (err) {
          console.log(err);
        } else {
          var posts = res.rows.map(function (row) {
            return row.doc;
          });

          $scope.$apply(function () {
            $scope.posts = posts;
          }); 
        }
      });
    }

    getRecent();

    Master.changes({
      continuous: true,
      onChange: getRecent
    });
  }
])
.controller('PostCtrl', [
  '$scope', 'Master', '$routeParams',
  function ($scope, Master, $routeParams) {
    Master.get($routeParams.id, function (err, res) {
      if (err) throw JSON.stringify(err);

      $scope.$apply(function () {
        $scope.post = res;
      });
    });
  }
])
.controller('ProfileCtrl', [
  '$scope', 'Pouch',
  function ($scope, Pouch) {
    Pouch.query('queries/recent', {
      include_docs: true,
      limit: 40
    }, function (err, res) {
      if (err) throw JSON.stringify(err);

      var posts = res.rows.map(function (row) {
        return row.doc;
      });

      $scope.$apply(function () {
        $scope.posts = posts;
      });
    });
  }
])
.controller('SubmitCtrl', [
  '$scope', '$location', 'Pouch', 'Auth',
  function ($scope, $location, Pouch, Auth) {
    if (!Auth.isLoggedIn()) {
      $location.path('/login');
    }

    $scope.submit = function (post) {
      post.user = Auth.getUsername();
      post.created_at = new Date().getTime();

      Pouch.post(post, function (err, res) {
        if (err) throw JSON.stringify(err);

        $location.path('/profile');
      });
    };
  }
])
.controller('LoginCtrl', [
  '$scope', 'Auth', '$location',
  function ($scope, Auth, $location) {
    $scope.login = function (user) {
      Auth.login(user.username, user.password, function (err) {
        if (err) {
          $scope.$apply(function () {
            $scope.login_error = JSON.stringify(err);
          });
        } else {
          $location.path('/');
        }
      });
    };
    $scope.signup = function (user) {
      if (user.password === user.verify_password) {
        Auth.signup(user.username, user.password, function (err) {
          if (err) {
            $scope.$apply(function () {
              $scope.signup_error = JSON.stringify(err);
            });
          } else {
            $location.path('/'); 
          }
        });
      }
    };
  }
])
.controller('UserCtrl', [
  '$scope', '$location', 'Auth', 'Master', '$routeParams',
  function ($scope, $location, Auth, Master, $routeParams) {
    var username = $routeParams.username || Auth.getUsername();

    if (username) {
      $scope.title = username;

      Master.query('queries/posts_by_user', {
        include_docs: true,
        key: username
      }, function (err, res) {
        if (err) throw JSON.stringify(err);

        $scope.$apply(function () {
          $scope.posts = res.rows.map(function (row) {
            return row.doc;
          });
        });
      });
    } else {
      $location.path('/login');
    }
  }
])
.controller('VoteCtrl', [
  '$scope', '$location', 'Auth', 'Pouch', '$routeParams',
  function ($scope, $location, Auth, Pouch, $routeParams) {
    if (!Auth.isLoggedIn()) {
      $location.path('/login');
    } else {
      Pouch.post({
        type: 'vote',
        user: Auth.getUsername(),
        post: $routeParams.id
      }, function (err) {
        if (err) throw JSON.stringify(err);

        // back from whence ye came!
        history.back();
      });
    }
  }
])
.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider){
  $routeProvider
  .when('/', {
    templateUrl: 'list.html',
    controller: 'HotCtrl'
  })
  .when('/recent', {
    templateUrl: 'list.html',
    controller: 'RecentCtrl'
  })
  .when('/user/:username', {
    templateUrl: 'list.html',
    controller: 'UserCtrl'
  })
  .when('/profile', {
    templateUrl: 'list.html',
    controller: 'UserCtrl'
  })
  .when('/submit', {
    templateUrl: 'submit.html',
    controller: 'SubmitCtrl'
  })
  .when('/upvote/:id', {
    controller: 'VoteCtrl'
  })
  .when('/post/:id', {
    templateUrl: 'post.html',
    controller: 'PostCtrl'
  })
  .when('/login', {
    templateUrl: 'login.html',
    controller: 'LoginCtrl'
  })
  .otherwise({
    redirectTo: '/'
  });
}])
// markdown filter for dynamic content
.filter('markdown', ['md', function(md){
  return function(input){
    if(input) return md.makeHtml(input);
  };
}]);
