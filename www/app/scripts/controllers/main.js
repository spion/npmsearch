wwwApp.controller('SearchCtrl', function($scope, $location, $http, $routeParams) {
    $scope.search = function() {
        $location.path('/' + $scope.query);
    }
    if (!$routeParams.query) return;

    $scope.searching = true;
    $http.get('/search', {params: {
        q: $routeParams.query,
        options: JSON.stringify({
            limit: 50
        })
    }}).success(function(data) {
        $scope.searching = false;
        $scope.results = data.map(function(item) { 
            item.details = item.data;
            if (item.details.repository && item.details.repository.url) {
                item.details.url = item.details.url || item.details.repository.url.replace(/^git/,'https')
            }
            return item; 
        });
    }).error(function(err) {
        $scope.searching = false;
        $scope.failed = true;
    });

});
