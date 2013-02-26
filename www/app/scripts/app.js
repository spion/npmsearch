'use strict';

var wwwApp = angular.module('wwwApp', [])
.config(['$routeProvider','$locationProvider', 
        function($routeProvider, $locationProvider) {
            $locationProvider.html5mode(true)
                .hashPrefix('!');
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
