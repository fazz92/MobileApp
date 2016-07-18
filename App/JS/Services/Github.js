/**
 * Created by shardul on 1/18/15.
 */
app.service('github', ['$http', function ($http) {
    'use strict'
    var getUser = function () {
        return $http.get('https://api.github.com/users/shardool').then(function (response) {
            return response.data;
        });
    };
    return {
        getUser: getUser
    };

}]);