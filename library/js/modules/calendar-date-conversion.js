
/**
 * @desc This file contains the code for the calendar-date-conversion.
 *
 * @name calendar-date-conversion
 */



define( [],

    function() {

        'use strict';
            /**  
            *@module ConvertToDate
            *Converting the date sent in miliseconds to date format
            *@method ConvertToDate
            *@param {int} date - date in miliseconds
             */
             function ConvertToDate( date ) {

                var newDate = new Date( date );
            /**
             * if the date is coming as string format like --- '1427963663788' //new Date().getTime()
             */
             if( isNaN( newDate ) ) {
                newDate = new Date( parseInt( date, 10 ) );
            }

            var dateObj = {
                year: newDate.getFullYear(),
                num: newDate.getMonth(),
                month: MGMRI.data.date.month[ newDate.getMonth() ],
                date: newDate.getDate(),
                weekday: MGMRI.data.date.day[ newDate.getDay() ],
                abbrDay: MGMRI.data.date.abbrDay[ newDate.getDay() ]
            };

            return dateObj;
        }

        return ConvertToDate;

    }
    );