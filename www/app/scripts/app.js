'use strict';

var wwwApp = angular.module('wwwApp', [])
  .config(['$routeProvider', function($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .when('/find', {
        templateUrl: 'views/main.html',
        controller: 'SearchCtrl'
      }) 
      .otherwise({
        redirectTo: '/'
      });
  }]);
