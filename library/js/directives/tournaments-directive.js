define(
    [
        'jquery',
        'modules/canvas',

        // Angular-specific dependencies
        'vendor/angular-custom'
    ],

    function(

        $,
        canvas,

        // Angular-specific dependencies
        angular

    ) {

        'use strict';

        return angular.module( 'Tournaments.directive',
            []
        )

        .directive( 'tournaments',

            function() {

                return {

                    restrict: 'A',

                    controller: [

                        '$scope',
                        '$filter',

                        function(

                            $scope,
                            $filter

                        ) {

                            var canvasJsObj = canvas()
                                , date
                                , startDate
                                , endDate
                                ;

                            $scope.learnMore = function( tournament, type ) {

                                canvasJsObj.openInnerCanvas( $( '[data-tournament-type='+ type +']' ), 'left' ,function(){

                                    setTimeout(function(){

                                        $scope.tournamentName = tournament;

                                        $scope.tournamentDetail = MGMRI.data.casinoDetails[ $scope.tournamentName ];

                                        date = '';
                                        startDate = new Date( $scope.tournamentDetail.startDate );
                                        endDate = new Date( $scope.tournamentDetail.endDate );

                                        date += startDate.toDateString().substring( 4, 10 ) + ' ' + '-' + ' ' + endDate.toDateString().substring( 4, 10 );

                                        date += ',' + endDate.getUTCFullYear();

                                        $scope.dateToDisplay = date;

                                        if ( !$scope.$$phase ) {
                                            $scope.$apply();
                                        }

                                        $( 'body' ).on( 'click', '[data-action=innerclose]', function( e ) {

                                            canvasJsObj.closeInnerCanvas();

                                        });
                                    },1000);

                                });
                            };
                        }
                    ]
                };
            }
        )

        .filter('trust',
            [
                '$sce',

                function($sce) {

                    return function(value) {
                        return $sce.trustAsHtml(value);
                    };
                }
            ]);
    }
);