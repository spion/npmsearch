wwwApp.controller('SearchCtrl', function($scope, $location, $http, $routeParams) {
    $scope.search = function() {
        $location.path('/' + $scope.query);
    }
    if (!$routeParams.query) return;

    $http.get('/search', {params: {
        q: $routeParams.query,
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
