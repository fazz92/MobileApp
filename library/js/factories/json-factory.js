define(
    [
        'modules/object-serialize',
        'modules/pubsub',

        // Angular-specific dependencies
        'vendor/angular-custom'
    ],

    function(

        serialize,
        pubsub,

        // Angular-specific dependencies
        angular

    ) {

        'use strict';

        return angular.module( 'JsonFactory', [] )

        .config( function( $httpProvider ) {

                var  counter = 0
                    , skipCounter = true
                    ;

                $httpProvider.defaults.withCredentials = true;
                $httpProvider.defaults.headers.post[ 'Content-Type' ] = 'application/x-www-form-urlencoded;charset=utf-8';

                // Override $http service's default transformRequest
                $httpProvider.defaults.transformRequest = [ function( data ) {

                    if( data && data.sendJSONData ) {
                        if( data.addPropertyId ) {
                            data.postdata.propertyId = MGMRI.data.propertyId;
                        }

                        if( data.stringify ) {
                            data.postdata = JSON.stringify( data.postdata );
                        }
                        return data.postdata;
                    }

                    if( data && data.pickData ) {

                        data= data.pickPostData;
                    }

                    if ( angular.isObject( data ) && String( data ) !== '[object File]' ) {

                        // Set 'propertyId' to global value
                        data.propertyId = MGMRI.data.propertyId;

                        // Serialize data
                        data = serialize( data );

                    } else {

                        if ( data && typeof data === 'string' && data.indexOf( 'propertyId' ) === -1 ) {

                            if( data !== '' ) {

                                data = data + '&propertyId=' + MGMRI.data.propertyId;

                            } else {

                                data = 'propertyId=' + MGMRI.data.propertyId;

                            }
                        }
                    }

                    return data;

                }];

                $httpProvider.interceptors.push( function( $q ) {

                    return {

                        request: function( config ) {

                            counter++;

                            if ( config.data && config.data.loadAnim ) {

                                config.loadAnimation = config.data.loadAnim;

                                // Remove parameter before sending POST object
                                delete config.data.loadAnim;
                            }
                            //addCounter parameter will help the loading animation remain until all async calls on page load is complete. 
                            // This will be retained for all service call from there on made asynchronously
                            
                            if ( config.data && config.data.addCounter ) {

                                skipCounter = false;

                                // Remove parameter before sending POST object
                                delete config.data.addCounter;
                            } 
                            else if ( config.data && config.data.ignoreCounter ){

                                counter --;

                            }


                            if ( typeof config.loadAnimation !== 'undefined' ) {

                                pubsub( 'jsonFactory/request' ).publish( config.loadAnimation );
                            }

                            return config;
                        },

                        requestError: function( response ) {

                            counter--;

                            if( !counter || skipCounter ){

                                hideAnimation( response );

                            }

                            return $q.reject( response );
                        },

                        response: function( response ) {

                            counter--;
                            
                            if( !counter || skipCounter ){

                                hideAnimation( response );

                            }

                            return response;
                        },

                        responseError: function( response ) {

                            counter--;
                            
                            if( !counter || skipCounter ){

                                hideAnimation( response );

                            }

                            return $q.reject( response );
                        },
                    };
                });

                // Publish message to hide ajax animation
                function hideAnimation( response ) {

                    if ( typeof response.config.loadAnimation !== 'undefined' ) {

                        pubsub( 'jsonFactory/response' ).publish( response.config.loadAnimation );

                    }
                }

            }
        )

        .factory( 'json',
            [
                '$http',

                function (

                    $http

                ) {

                    return {

                        get: function( url, loadAnim ) {

                            var config;
                            // set loadAnimation if  loadAnim passed
                            if( loadAnim ) {
                                config = {
                                    'loadAnimation' : loadAnim
                                };
                            }
                            return $http.get( url, config );

                        },
                        post: function( url, data ) {

                            return $http.post( url, data );

                        },
                        postJson: function( url, data ) {

                            return $http.post( url, data, {
                                headers: {
                                    'Content-Type': 'application/json; charset=utf-8'
                                }
                            });
                        }
                    };
                }
            ]
        );
    }
);