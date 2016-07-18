/**
 * @desc it is used to instantiate the below listed controllers
 *  :- filter-controller
 *  :- filter-form-controller
 *  :- landing-controller
 *  :- loading-animation-directive
 * @name landing
 */

require(
    [
        'jquery',

        // Angular-specific dependencies
        'vendor/angular-custom',
        'controllers/filter-controller',
        'controllers/filter-form-controller',
        'controllers/landing-controller',
        'controllers/mgm-controller',
        'directives/loading-animation-directive',
        'filters/custom-filters'
    ],

    function(

        $,
        // Angular-specific
        angular,
        filterController,
        filterFormController,
        landingController,
        mgmController,
        loadingAnimation,
        customFilters

    ) {

        'use strict';

        var mediator = {

            init: function() {

                $( this.initUI.bind( this ) );
            },

            initUI: function() {

                this.initAngular();
            },

            initAngular: function() {

                // App/Module definition
                angular.module( 'App',
                    [
                        'Landing.controllers',
                        'Filter.controllers',
                        'FilterForm.controllers',
                        'Mgm.controllers',
                        'LoadingAnimation.directive',
                        'Custom.filters'
                    ]
                );

                /*
                 * Bootstrap application dynamically to `document` as there is no access to global header elements inside AEM.
                 */
                angular.bootstrap( document, [ 'App' ] );
            }
        };

        mediator.init();

    }
);