/**
 * @desc it is used to create a angular module home and load the required components
 *
 * @name home
 */


require(
    [
        'jquery',
        'modules/canvas',
        'modules/component-venue-action',
        // Angular-specific dependencies
        'directives/loading-animation-directive',
        'controllers/home-controller',
        'controllers/mgm-controller',
        'controllers/filter-controller',
        'controllers/filter-form-controller',
        'controllers/landing-controller',
        'filters/custom-filters',
        'vendor/angular-custom'
    ],

    function(

        $,
        canvas,
        venueAction,

        // Angular-specific
        loadingAnimation,
        homeController,
        mgmController,
        filterController,
        filterFormController,
        landingController,
        customFilters,
        angular

    ) {

        'use strict';

        var home = {

            init: function() {

                $( this.initUI.bind( this ) );
                
            },
            initUI: function() {

                this.initAngular();

            },

            initAngular: function() {

                // App/Module definition
                angular.module( 'Home',
                    [
                        'LoadingAnimation.directive',
                        'Home.controllers',
                        'Mgm.controllers',
                        'Landing.controllers',
                        'Filter.controllers',
                        'FilterForm.controllers',
                        'Custom.filters'
                    ]
                );

                /*
                 * Bootstrap application dynamically to `document` as there is no access to global header elements inside AEM.
                 */
                angular.bootstrap( document, [ 'Home' ] );
            },

            venueAction: function( elem ) { return venueAction( $( '[data-mgmapp-component=venueAction]' ) ); }

        };

        home.init();
        home.venueAction();
    }
);