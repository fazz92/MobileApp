define(
    [
        'jquery',

        // Angular-specific dependencies
        'vendor/angular-custom'
    ],
    function(

        $,

        // Angular-specific dependencies
        angular

    ) {
        'use strict';

        angular.module( 'Custom.filters',
            [
                
            ]
        )

        // Method to parse data as trusted content to display HTML correctly
        .filter( 'trust',
            [
                '$filter',
                '$sce',

                function(
                    $filter,
                    $sce
                ) {

                    return function( string ) {

                        return $sce.trustAsHtml( string );
                    };
                }
            ]
        )
        .filter('domain', 
            [
                '$filter',

                function (
                    $filter
                ) {
                    return function (url) {
                        return ( (url === '') || ( !(url.indexOf('http') > -1) )) ? false : ( url.indexOf("://") > -1 ? url.split('/')[2] : url.split('/')[0]);
                    };
                }
            ]
        );
    }
);