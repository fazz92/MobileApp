define(
    [
        'jquery',
        'modules/pubsub',
        'vendor/angular-custom'
    ],

    function(

        $,
        pubsub,
        angular

    ) {

        'use strict';

        return angular.module( 'LoadingAnimation.directive', [] )

        .directive( 'loadingAnimation',

            function() {

                return {

                    restrict: 'A',

                    link: function( scope, element, attrs ) {

                        var animationClass = $( element ).attr( 'loading-animation' );

                        /*
                         *  Set up subscibers
                         */

                        // Request: add animation class
                        pubsub( 'jsonFactory/request' ).subscribe( function( anim ) {


                            if ( anim === animationClass ) {

                                $( element ).addClass( animationClass );
                            }

                        });

                        // Response: remove animation class
                        pubsub( 'jsonFactory/response' ).subscribe( function( anim ) {


                            if ( anim === animationClass ) {

                                $( element ).removeClass( animationClass );
                            }
                            
                        });
                    }
                };
            }
        );
    }
);