define(
    [
        'jquery',
        'modules/calendar-date-conversion',

        'vendor/angular-custom',
        'factories/json-factory'
    ],

    function(

        $,
        convertToDate,

        angular,
        jsonFactory

    ) {

        'use strict';

        var availabilityService = MGMRI.services.entertainment.ticketAvailability.replace( '{propertyId}', MGMRI.data.propertyId )
            //, bookingData = MGMRI.data.booking.ticketing.shows
            , pastStatus = 'past'
            , availableStatus = 'available'
            , soldOutStatus = 'sold_out'
            , unavailableStatus = 'unavailable'
            , pastWrapper = 'past-wrapper'
            , soldOutWrapper = 'sold-out-wrapper'
            , unavailableWrapper = 'unavailable-wrapper'
            ;

        return angular.module( 'TicketTile.directive',
            [
                'JsonFactory'
            ]
        )

        .directive( 'ticketTile',

            function() {

                return {

                    restrict: 'A',

                    controller : [

                        '$scope',
                        '$window',
                        'json',

                        function(

                            $scope,
                            $window,
                            json

                        ) {

                            $scope.dataRequest = function( evtIds, evtData ) {

                                if ( !evtData || evtData.length === 0 ) { return; }

                                var jsonCall
                                    , eventsParam = []
                                    , requestObj = {
                                        url: availabilityService
                                    }
                                    , cacheEl = $('.tickets-gallery-carousel div[data-evt-id]')
                                    ;

                                requestObj.url += '?';

                                // Build eventsIds query string param
                                for ( var i = 0; i < evtData.length; i++ ) {

                                    eventsParam.push( evtData[ i ].id );

                                    // only if status is available
                                    if( evtData[ i ].tile.data('evtStatus') === 'available'){
                                        requestObj.url += 'events=' + evtData[ i ].id + '&';
                                    }

                                }
                                requestObj.url = requestObj.url.substring(0,requestObj.url.length-1);

                                //requestObj.url += '?events=' + eventsParam.join( ',' );

                                $('p.ribbon span', cacheEl).css('display','none');

                                // JSON call
                                jsonCall = json.get( requestObj.url )

                                    .success( function( data, status, headers, config ) {


                                        //$('p.ribbon span', cacheEl).css('display','block');
                                        $('p.ribbon span', cacheEl).css('display','block');
                                        cacheEl.removeClass(unavailableWrapper);

                                        var tile;

                                        $scope.jsonDta = data;

                                        for ( var i = 0; i < data.response.length; i++ ) {

                                            // Find tile using eventId
                                            tile = $scope.tileComponent.find( '[data-evt-id=' + data.response[ i ].id + ']' );

                                            // Update availability styling
                                            $scope.setStatus( tile, data.response[ i ].status );

                                        }

                                    }
                                )
                                    .error( function( data, status, headers, config ) {

                                        console.error( 'AJAX ERROR: ', arguments );
                                    }
                                );
                            };

                            $scope.setStatus = function( tile, availability ) {

                                if ( !tile.length ) {
                                    return;
                                }

                                availability = availability.toLowerCase();

                                if ( availability === pastStatus ) {

                                    tile.addClass( pastWrapper );
                                }

                                else if ( availability === soldOutStatus ) {

                                    tile.addClass( soldOutWrapper );
                                }

                                else if ( availability === unavailableStatus ) {

                                    tile.addClass( unavailableWrapper );
                                }

                                // Update status data attribute
                                tile.attr( 'data-evt-status', availability );
                            };

                            $scope.buyTickets = function( templateData ) {

                                return function( e ) {

                                    var stepParam
                                        //, nextDay
                                        , model = {}
                                        , jsonTime
                                        , jsonDate
                                        ;


                                    // Determine departure date (i.e. next day)
                                    //nextDay = templateData.dateObj;
                                    //nextDay = new Date( nextDay.setDate( nextDay.getDate() + 1 ) );

                                    // Set flow type
                                    model.flow = 'ticketing';

                                    // Create dynamic sessionStorage ID
                                    model.sessionId = 'booking-' + model.flow;
                                    //model.arrive = convertToDate( templateData.date );
                                    //model.depart = convertToDate( nextDay );

                                    model.progress = '2';


                                    $.each($scope.jsonDta.response, function( k, v ) {
                                        if(v.id === templateData.id){
                                            jsonTime = v.time;
                                            jsonDate = v.date;
                                        }
                                    });

                                    model.show = {
                                        id: templateData.id,
                                        //showId: templateData.showId,
                                        //details: bookingData[ templateData.showId ],
                                        time: jsonTime,
                                        date: jsonDate,
                                        showTimes: [
                                            {
                                                id: templateData.id
                                                //time: templateData.time
                                            }
                                        ]
                                    };

                                    sessionStorage.setItem( 'booking-flow', model.flow );
                                    sessionStorage.setObject( model.sessionId, model );

                                    stepParam = 'step' + model.progress;

                                    $window.location.href = MGMRI.data.urls.booking.ticketing + '#' + stepParam;
                                };
                            };


                            $scope.gotoCta = function( url ) {

                                return function( e ) {

                                    $window.location.href = url;
                                };
                            };
                        }
                    ],

                    link: function( scope, element, attrs ) {

                        // Get all tiles in component
                        var eventData = []
                            , tileIds = []
                            , tileComponent = $( element )
                            , tiles = tileComponent.find( '.gallery-tile' )
                            //, today = new Date()
                            ;

                        scope.tileComponent = tileComponent;


                        // Loop through tiles
                        tiles.each( function() {

                            var ctaFunction
                                , eventIndex
                                , tile = $( this )
                                , evtId = tile.attr( 'data-evt-id' )
                                , evtShowId = tile.attr( 'data-evt-show' )
                                , evtStatus = tile.attr( 'data-evt-status' )
                                //, evtDate = tile.attr( 'data-evt-date' )
                                //, evtTime = tile.attr( 'data-evt-time' )
                                //, evtCtaUrl = tile.attr( 'data-evt-cta' )
                                , evtCta = tile.find( '.btns .cta' )
                                , evtCtaUrl = evtCta[0].href.charAt(evtCta[0].href.length-1) === '#' ? '#' : evtCta[0].href
                                //, evtDateArr = evtDate.split( '/' )
                                //, evtDateObj = new Date( evtDateArr[ 2 ], evtDateArr[ 0 ] - 1, evtDateArr[ 1 ] )
                                ;

                            // Event CTA URL defined
                            //if ( evtCtaUrl && evtCtaUrl.length > 0 ) {
                            if( evtCtaUrl !== '#' ) {

                                ctaFunction = scope.gotoCta( evtCtaUrl );
                            }

                            // No event CTA URL defined
                            else {
                                evtCta.removeAttr('href');
                                // Only add events which have no CTA URL and that have been defined as available
                                if (
                                    evtId && evtId.length > 0 && //event
                                    evtStatus.toLowerCase() === availableStatus && //available
                                    tileIds.indexOf( evtId ) === -1 //not already added to tileIds
                                ) {

                                    eventIndex = eventData.length;
                                    eventData.push({
                                        id: evtId,
                                        showId: evtShowId,
                                        tile: tile
                                        //date: evtDate,
                                        //dateObj: evtDateObj,
                                        //time: evtTime
                                    });

                                    tileIds.push( evtId );
                                }

                                ctaFunction = scope.buyTickets( eventData[ eventIndex ] );

                            }

                            // Update tile status if status is not available
                            /*if ( evtStatus !== availableStatus ) {

                                scope.setStatus( tile, evtStatus );
                            }*/

                            // If event date has passed, update styling
                            //if ( today > evtDateObj ) {

                                //scope.setStatus( tile, pastStatus );
                            //}

                            evtCta.on( 'click', function( e ) {

                                e.preventDefault();

                                ctaFunction( e );
                            });
                            evtCta.on( 'mouseover', function( e ) {

                                e.preventDefault();
                                if ($(this).hasClass('btn-unavailable')){
                                    ctaFunctionToolTip( e , this );
                                }

                            });
                            evtCta.on( 'mouseout', function( e ) {

                                e.preventDefault();
                                if ($(this).hasClass('btn-unavailable')){
                                    ctaFunctionToolTipClose( e );
                                }
                            });
                        });

                        // Send availability request to back-end for "available" events
                        scope.dataRequest( tileIds, eventData );


                        function ctaFunctionToolTip( e, item ) {

                            $(item).parents('.btns').find('.tile-tooltip-content').show();

                        }

                        function ctaFunctionToolTipClose( e ) {

                            $('.btns').find('.tile-tooltip-content').hide();

                        }
                    }
                };
            }
        );
    }
);
