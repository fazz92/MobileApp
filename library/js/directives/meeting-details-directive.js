define(
    [
        'jquery',
        'modules/canvas',

        // Angular-specific dependencies
        'factories/json-factory',
        'vendor/angular-custom'
    ],

    function(

        $,
        canvas,

        // Angular-specific dependencies
        jsonFactory,
        angular

    ) {

        'use strict';

        return angular.module( 'Meetings.directive', [] )

        .directive( 'meetings',

            function() {

                return {

                    restrict: 'A',

                    controller: [

                        '$scope',

                        function(

                            $scope

                        ) {

                            var canvasJsObj = canvas();

                            var loader = function ( action ) {

                                if ( action === 'show' ) {

                                    $( '.loading' ).show();

                                }
                                else if ( action === 'hide' ) {

                                    $( '.loading' ).fadeOut( 'slow' );
                                }

                            };

                            $scope.ViewMore = function( meetingId, event ) {

                                event.preventDefault();

                                $scope.meetingDetails = MGMRI.data.meetingDetails[ meetingId ];
                                //$scope.meetingDetails = 'asas12ggbjj'; // Dummy meeting ID given | meetingID will be generated dynamically from backend in CQ Environment.

                                if ( !$scope.$$phase ) {
                                    $scope.$apply();
                                }

                                canvasJsObj.openInnerCanvas( $('.facilities-off-canvas'), 'left',

                                        function() {

                                            loader( 'hide' );

                                            //canvasJsObj.openCurtain();

                                            $( 'body' ).on( 'click', '[data-action=close]', function( e ) {

                                                e.preventDefault();
                                                canvasJsObj.closeInnerCanvas();
                                            });
                                        },
                                {
                                    customClass: 'facilities-offcanvas'
                                });
                            };
                        }
                    ]
                };
            }
        );
    }
);