define(
    [
        'jquery',
        'modules/component-venue-action',
        'modules/pubsub',
        'modules/go',
        // Angular-specific dependencies
        'vendor/angular-custom'
    ],

    function(

        $,
        venueAction,
        pubsub,
        go,
        // Angular-specific dependencies
        angular

    ) {

        'use strict';

        /* Controllers */
        return angular.module( 'Home.controllers',
            []
        ).controller( 'homeController',
            [
                '$scope',
                '$parse',
                '$window',
                '$location',

                function(

                    $scope,
                    $parse,
                    $window,
                    $location

                ) {

                    var storedFilter
                        , urlHash
                        , urlFilter
                        , pageHash
                        ;

                    var init = function() {

                        urlHash = window.location.hash;
                        urlFilter = urlHash.split('/:filter=');
                        storedFilter = urlFilter[1];
                        pageHash = urlFilter[0];

                        if( MGMRI.authorMode && MGMRI.authorMode === 'true' ){

                            pageHash = '';
                        }

                        if( navigator.connection && navigator.connection.type !== 'none' ){

                            $scope.onlineMode = true;
                        } else {

                            $scope.onlineMode = false;
                        }

                        if( storedFilter && ( storedFilter.indexOf('&q=') >= 0 || storedFilter.indexOf('q=') >= 0 ) ){

                            $scope.search = setValueFromUrl( 'q' );
                            $scope.homeResults = true;
                            $scope.searchActive = true;

                        } else {

                            $scope.search = '';
                            $scope.homeResults = false;
                            $scope.searchActive = false;
                        }

                        pubsub( 'footer/tabs' ).publish( true );

                        pubsub( 'home/page' ).emptyAll();

                        pubsub( 'home/page' ).subscribe( function( ){
    
                            $scope.homeResults = false; 
                            $scope.searchActive = false;
                            pubsub( 'footer/tabs' ).publish( true, undefined, 'notTraked' );
                        });

                        venueAction( $( '[data-mgmapp-component=venueAction]' ) );

                        $scope.toggleSearch = function( action ){

                            if( !action ) {
							
								if(!$scope.homeResults){
									pubsub( 'footer/tabs' ).publish( !action, undefined, 'notTraked', true );
								}
							} else {
                                
                                pubsub( 'footer/tabs' ).publish( !action, undefined, 'notTraked', true );
                            }
							
							setTimeout(function(){
							
								$scope.searchActive = action;
								scopeApply();
							},0);
                        };
						
                        $scope.applySearch = function( searchTerm ){

                            if( searchTerm === '' ){
								
								$scope.toggleSearch(false);								
                                return false;
                            }
                            $scope.search = searchTerm;
                            window.location.hash = pageHash + '/:filter=q=' + searchTerm;
                            $scope.homeResults = true;                            
                        };

                        /* Handle navigation to app pages
                         */
                        $scope.goToDetail = function( path, category ){

                            pubsub( 'navigation/flow' ).publish(false);

							go.goToDetail( path, category );
                        };

                        $scope.go = function( path,target,map,filter ){

							pubsub( 'navigation/flow' ).publish(false);

                            go.go( path, target, map, filter );
                        };    


                        function setValueFromUrl( name ) {

                            var existingUrlParams = ( storedFilter ).split( '&' )
                                , existingUrlParamsLen = existingUrlParams.length
                                , arrayToHold = []
                                , filterUrlParams = []
                                , filterUrlParam
                                ;

                            for ( var j = 0; j < existingUrlParamsLen; ++j ) {

                                arrayToHold = ( existingUrlParams[ j ] ).split( '=' );
                                filterUrlParams[ arrayToHold [ 0 ] ] = decodeURIComponent( arrayToHold[ 1 ] );
                            }

                            for ( var key in filterUrlParams ) {

                                if ( filterUrlParams.hasOwnProperty( key ) ) {

                                    filterUrlParam = filterUrlParams[ key ];
                                    if ( key === name ){
                                        return filterUrlParam;
                                    }
                                }
                            }
                        }
                    };

                    /**
                     * Trigger the digest cycle
                     */
                    function scopeApply() {

                        var phase = $scope.$root.$$phase;

                        if(phase !== '$apply' && phase !== '$digest') {
                            $scope.$apply();
                        }
                    }

                    init();
                }
            ]
        );
    }
);