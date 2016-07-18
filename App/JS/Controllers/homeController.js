/**
 * Created by shardul on 1/18/15.
 */
var app = (function () {
    'use strict';
    return angular.module('DS', []);

}());

app.controller('homeController', ['$scope', 'github', function ($scope, github) {
        var OnSuccess = function (data) {
            $scope.user = {
                name: data.name,
                img: data.avatar_url
            };
        };
        var OnError = function (reason) {
            $scope.msg = {
                error: 'No Message From The Server'
            };
        };
        $scope.doStuff = function () {
            github.getUser().then(OnSuccess, OnError);
        };
        $scope.user1 = github.getUser();
        }]);
   
    