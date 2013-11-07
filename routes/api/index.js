var routes = [
      require('./signup')
    ];

module.exports = function(app, prefix, admin_url){
  routes.forEach(function (route) {
    route.call(null, app, prefix, admin_url);
  });
};
