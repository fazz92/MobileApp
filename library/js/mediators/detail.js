/**
 * @desc it is used to instantiate the directive and detail controller
 *
 * @name bookmarked-carousel
 */


require(
    [
        'jquery',
        'mediators/components',
        'modules/venue-hours-calculator',
        // Angular-specific dependencies
        'directives/loading-animation-directive',
        'directives/meeting-details-directive',
        'directives/tournaments-directive',
        'directives/overview-cta-directive',
        'controllers/detail-controller',
        'controllers/mgm-controller',
        'vendor/angular-custom'
    ],

    function(

        $,
        components,
        venueHoursCalculator,
        // Angular-specific
        loadingDirective,
        meetingDetailsDirective,
        tournaments,
        overviewCta,
        detailController,
        mgmController,
        angular

    ) {

        'use strict';

        var details = {

            init: function() {

                $( this.initUI.bind( this ) );
            },

            initUI: function() {

                this.initAngular();

            },
            /** funtion to create a angular module
            *@method initAngular
             */
            initAngular: function() {

                // App/Module definition
                angular.module( 'App',
                    [
                        'Meetings.directive',
                        'Tournaments.directive',
                        'OverviewCta.directive',
                        'LoadingAnimation.directive',
                        'Detail.controller',
                        'Mgm.controllers'
                    ]
                );

                // Bootstrap application dynamically to `document` as there is no access to global header elements inside AEM.
                angular.bootstrap( document, [ 'App' ] );
            }
        };

        details.init();
    }
);