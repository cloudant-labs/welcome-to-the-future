angular.module('app', [])
.constant('md', new Showdown.converter())
.constant('pouch', new PouchDB('WttF'))
.controller('HotCtrl', [])
.controller('RecentCtrl', [])
.controller('ProfileCtrl', [])
.controller('SubmitCtrl', [])
.controller('PostCtrl', [])
.controller('LoginCtrl', [])
.controller('SignupCtrl', [])
.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider){
  $routeProvider
  .when('/', {
    templateUrl: 'index.html',
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
  .when('/signup', {
    templateUrl: 'signup.html',
    controller: 'SignupCtrl'
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
