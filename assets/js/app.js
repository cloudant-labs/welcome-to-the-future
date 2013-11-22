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
  function ($http, Proxy, Api, Pouch) {
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
.controller('HotCtrl', [
  '$scope', 'Master',
  function ($scope, Master) {
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
    $scope.submit = function () {
      var post = $scope.post;
      post.user = Auth.getUsername();

      Pouch.post(post, function (err, res) {
        if (err) throw JSON.stringify(err);

        $location.path('/profile');
      });
    };
  }
])
.controller('LoginCtrl', [
  '$scope', 'Auth', 
  function ($scope, Auth) {
    $scope.isLoggedIn = Auth.isLoggedIn;
    $scope.login = Auth.login;
    $scope.logout = Auth.logout;
    $scope.signup = Auth.signup;
  }
])
.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider){
  $routeProvider
  .when('/', {
    templateUrl: 'hot.html',
    controller: 'HotCtrl'
  })
  .when('/recent', {
    templateUrl: 'recent.html',
    controller: 'RecentCtrl'
  })
  .when('/profile', {
    templateUrl: 'profile.html',
    controller: 'ProfileCtrl'
  })
  .when('/submit', {
    templateUrl: 'submit.html',
    controller: 'SubmitCtrl'
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
