/**
 * @desc it is used to load the offcanvas service
 * @name services
 */

require(
    [
        'jquery',
        // Angular-specific dependencies
        'directives/loading-animation-directive',
        'controllers/services-controller',
        'controllers/mgm-controller',
        'vendor/angular-custom'
    ],

    function(

        $,
        // Angular-specific
        loadingAnimation,
        servicesController,
        mgmController,
        angular

    ) {

        'use strict';

        var services = {

            /** funtion to hide and show offcanvas 
            *@method init
             */
            init: function() {

                this.initAngular();
            },

            initAngular: function() {

                // App/Module definition
                angular.module( 'App',
                    [
                        'LoadingAnimation.directive',
                        'Services.controllers',
                        'Mgm.controllers'
                    ]
                );

                // Bootstrap application dynamically to `document` as there is no access to global header elements inside AEM.
                angular.bootstrap( document, [ 'App' ] );
            }


        };

        services.init();

    }
);