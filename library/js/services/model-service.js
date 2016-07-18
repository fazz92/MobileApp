define(
    [
        'vendor/angular-custom'
    ],

    function(
        angular
    ) {

        'use strict';

        return angular.module( 'Model.service', [] )

        .factory( 'model', function () {

                this.data = {};

                return this.data;
            }
        );
    }
);