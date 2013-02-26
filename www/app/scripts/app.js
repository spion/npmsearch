'use strict';

var wwwApp = angular.module('wwwApp', [])
.config(['$routeProvider','$locationProvider', 
        function($routeProvider, $locationProvider) {
            $locationProvider.html5Mode(true)
                .hashPrefix('!');
            $routeProvider
           .when('/:query', {
                templateUrl: 'views/main.html',
                controller: 'SearchCtrl'
            }) 
            .otherwise({
                redirectTo: '/'
            });
        }]);
