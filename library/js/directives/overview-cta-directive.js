define(
    [
        'jquery',
        'modules/go',
        // Angular-specific dependencies
        'factories/json-factory',
        'vendor/angular-custom'
    ],

    function(

        $,
        go,

        // Angular-specific dependencies
        jsonFactory,
        angular

    ) {

        'use strict';

        return angular.module( 'OverviewCta.directive',
            [
                'JsonFactory'
            ]
        )
        .directive( 'overviewCta',

            function() {

                return {

                    restrict: 'A',

                    controller: [

                        '$scope',
                        '$window',
                        'json',

                        function(

                            $scope,
                            $window,
                            json

                        ) {

                            var buyTicketService = MGMRI.services.entertainment.buyTickets;

                            $scope.buyTickets = function( templateData, ticketingUrl ) {

                                return function( e ) {

                                    var requestObj = {
                                        url: buyTicketService.replace( '{showId}', templateData.showId )
                                    };

                                    // JSON call
                                    json.get( requestObj.url )

                                        .success( function( data, status, headers, config ) {

                                            // Response contains at least one show
                                            if ( data && data.response && data.response.length > 0 ) {

                                                var showId= templateData.showId
                                                    , arrive = '&arrive=' + data.response[ 0 ].date
                                                    , showTimes= '&showFilter=' + showId
                                                    ;

                                                if ( data.response.length > 1 ) {

                                                    go.go( ticketingUrl + '#step1'+ arrive + showTimes , '_blank');
                                                }
                                                else if ( data.response.length === 1 ) {

                                                    go.go( ticketingUrl + '#step2' + showTimes, '_blank');
                                                }
                                            }
                                            // No shows
                                            else {
                                                
                                                go.go( ticketingUrl + '#step1', '_blank');
                                            }
                                        } )
                                        .error( function( data, status, headers, config ) {

                                            go.go( ticketingUrl + '#step1', '_blank');
                                        }
                                    );                                    
                                };
                            };
                        }
                    ],

                    link: function( scope, element, attrs ) {

                        var directiveElem = $( element )
                            , evtId = directiveElem.attr( 'data-evt-show' )
                            , ticketUrl = directiveElem.attr( 'data-href' )
                            , eventData = {
                                showId: evtId
                            }
                            ;

                        // only for entertainment 
                        if ( attrs.overviewCta === 'entertainment' && evtId && ticketUrl) {
                            /*
                             *  Buy Tickets CTA code
                             */
                            directiveElem.on( 'click', scope.buyTickets( eventData, ticketUrl ) );
                        }
                    }
                };
            }
        );
    }
);