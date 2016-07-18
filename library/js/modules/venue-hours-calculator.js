/**
 * @desc to check if the resturant is open or not 
 *
 * @name venue-hours-calculator
 */

define( [],

    function() {

        'use strict';
        /** to check if the time is in the range of the returants open and close timings 
        *@method checkIfOpen
        *@param {int} value - current time
        *@param {int} start - open time 
        *@param {int} end - =close time
        */
        function inRange( value, start, end ) {

            start = +start || 0;

            if ( typeof end === 'undefined' ) {
                end = start;
                start = 0;
            }
            else {
                end = +end || 0;
            }

            return value >= start && value < end;
        }

        /** to check if the resturant is open or not 
        *@method checkIfOpen
        *@param {object} hoursObj - the object containing the time object
        *@param {int} offsetHours - time difference according to different time zones.
        */

        function checkIfOpen( hoursObj, offsetHours ) {

            var isOpen = false
                , hourRanges = []
                , userDate = new Date()
                , timezoneDate = new Date(
                    userDate.getUTCFullYear(),
                    userDate.getUTCMonth(),
                    userDate.getUTCDate(),
                    userDate.getUTCHours(),
                    userDate.getUTCMinutes(),
                    userDate.getUTCSeconds(),
                    userDate.getUTCMilliseconds() + ( offsetHours * 3600000 )
                )
                , today = timezoneDate.getDay()
                , currentHours = hoursObj[ today ]
                , prevHours = hoursObj.slice( ( today - 1 ), ( today || 7 ) )[ 0 ]
                , hourProps = [
                    [ 'secondopeninghours', 'secondclosinghours', 'secondclosinghourstext' ],
                    [ 'firstopeninghours', 'firstclosinghours', 'firstclosinghourstext' ]
                ]
                ;

            var checkHours = function ( values ) {

                var opening = values[ 0 ]
                    , closing = values[ 1 ]
                    , current = [ timezoneDate.getHours(), timezoneDate.getMinutes() ].join( '' )
                    ;

                closing = closing < opening ? 2400 : closing;

                isOpen = inRange( current, opening, closing );

                if ( isOpen ) {

                    result.isOpen = true;
                    result.displayText = values[ 2 ];
                }
            };

            var result = {
                isOpen: currentHours.closed === 'false',
                is24Hours: currentHours.open24Hours === 'true',
                displayText: ''
            };

            if ( result.is24Hours ) {

                return result;
            }

            result.isOpen = false;

            // Build the hour ranges to check against
            hourProps.forEach( function ( values ) {

                var openingYesterday = parseInt( prevHours[ values[ 0 ] ], 10 )
                    , closingYesterday = parseInt( prevHours[ values[ 1 ] ], 10 )
                    , isClosedYesterday = prevHours.closed === 'true'
                    , openingToday = parseInt( currentHours[ values[ 0 ] ], 10 )
                    , closingToday = parseInt( currentHours[ values[ 1 ] ], 10 )
                    , isClosedToday = currentHours.closed === 'true'
                    ;

                // Check to see if the previous day's closing spanned midnight
                if ( !isClosedYesterday && ( openingYesterday > closingYesterday ) ) {

                    hourRanges.push( [ 0, closingYesterday, prevHours[ values[ 2 ] ] ] );
                }

                if ( isClosedToday || isNaN( openingToday ) || isNaN( closingToday ) ) {

                    return;
                }

                hourRanges.push( [ openingToday, closingToday, currentHours[ values[ 2 ] ] ] );
            });

            hourRanges.forEach( checkHours );

            return result;
        }

        return checkIfOpen;
    }
);