wwwApp.controller('MainCtrl', function($scope, $location) {
   $scope.search = function() {
        $location.path('/find')
        $location.search({q:$scope.query});
    }
});

wwwApp.controller('SearchCtrl', function($scope, $location, $http) {

    $scope.search = function() {
        $location.path('/find')
        $location.search({q:$scope.query});
    }
    $http.get('/search', {params: {
        q: $location.search().q, 
        options: JSON.stringify({
            limit: 50
        })
    }}).success(function(data) {
        $scope.results = data.map(function(item) { 
            item.details = item.data;
            if (item.details.repository && item.details.repository.url) {
                item.details.url = item.details.url || item.details.repository.url.replace(/^git/,'https')
            }
            return item; 
        });
    });

});
