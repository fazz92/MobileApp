/**
 * @desc to direct to particular detail page
 *
 * @name detail-controller
 */

define(
    [
        'jquery',
        'modules/pubsub',
        'vendor/ionic-bundle',
        'modules/analytics-module'
    ],

        function(

            $,
            pubsub,
            angular,
            analytics

        ) {

            'use strict';

            /* Controllers */
            return angular.module( 'Detail.controller',
                [
                ]
            )

            .controller( 'detailController',
                [
                '$scope',
                '$parse',
                '$window',
                '$timeout',
                '$compile',

                function(

                    $scope,
                    $parse,
                    $window,
                    $timeout,
                    $compile

                ) {

                    var init = function() {

                        pubsub('footer/tabs/toggle').publish( true );
                        scopeApply();
                    };

                    /**
                     * Trigger the digest cycle
                     */
                    function scopeApply() {

                        var phase = $scope.$root.$$phase;

                        if( phase !== '$apply' && phase !== '$digest' ) {

                            $scope.$apply();
                        }
                    }

                    init();
                }
            ]
            );
        });
