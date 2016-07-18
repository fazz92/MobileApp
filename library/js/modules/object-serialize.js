/**
 * From http://victorblog.com/2012/12/20/make-angularjs-http-service-behave-like-jquery-ajax/
 */
define( [],

    function() {

        'use strict';

        var serialize = function( obj ) {

            var query = ''
                , name
                , value
                , fullSubName
                , subName
                , subValue
                , innerObj
                , i
                ;

            for ( name in obj ) {

                value = obj[ name ];

                if ( value instanceof Array ) {

                    for ( i = 0; i < value.length; ++i ) {

                        subValue = value[ i ];
                        fullSubName = name + '[' + i + ']';
                        innerObj = {};
                        innerObj[ fullSubName ] = subValue;
                        query += serialize( innerObj ) + '&';

                    }

                } else if ( value instanceof Object ) {

                    for ( subName in value ) {

                        subValue = value[ subName ];
                        fullSubName = name + '[' + subName + ']';
                        innerObj = {};
                        innerObj[ fullSubName ] = subValue;
                        query += serialize( innerObj ) + '&';

                    }

                } else if ( value !== undefined && value !== null ) {

                    query += encodeURIComponent( name ) + '=' + encodeURIComponent( value ) + '&';

                }

            }

            return query.length ? query.substr( 0, query.length - 1 ) : query;

        };

        return serialize;

    }

);