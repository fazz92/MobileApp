/**
 * @desc to direct to particular detail page
 *
 * @name filter-controller
 */


define(
    [
        'jquery',

        // Angular-specific dependencies
        'vendor/angular-custom',
        'factories/json-factory',
        'services/model-service',
        'modules/pubsub',
        'modules/canvas',
        'modules/go',
        'modules/nearby'
    ],

    function(

        $,

        // Angular-specific dependencies
        angular,
        jsonFactory,
        model,
        pubsub,
        canvas,
        go,
        nearby

    ) {

        'use strict';

        /* Controllers */
        return angular.module( 'Filter.controllers',
            [
                'JsonFactory'
            ]
        )

        .controller( 'filterController',
            [
                '$scope',
                '$parse',
                '$window',
                '$timeout',
                'model',
                'json',

                function(

                    $scope,
                    $parse,
                    $window,
                    $timeout,
                    model,
                    json

                ) {
                    var service = MGMRI.services.resultsGrid
                        , additionalParams=[]
                        , openNowFilter
                        , filterCategory
                        , currentFilter
                        , cObj = canvas()
                        , searchTerm = false
                        , storedFilter
                        , urlHash
                        , urlFilter
                        , pageHash
                        , openNow
                        , clearClick = false
                        ;

                    var init = function() {

                        urlHash = window.location.hash;
                        urlFilter = urlHash.split('/:filter=');
                        storedFilter = urlFilter[1];
                        pageHash = urlFilter[0];
                        $scope.filterScreen = false;


                        if( MGMRI.authorMode && MGMRI.authorMode === 'true' ){

                            pageHash = '';
                        }

                        openNowFilter = false;
                        $scope.search = '';
                        $scope.results = {};
                        $scope.gridLoader = true;
                        $scope.searchActive = false;
                        $scope.searchCleared = false;

                        openNow = storedFilter ? storedFilter.indexOf('openNow') >= 0 : false;

                        if( storedFilter && ( storedFilter.indexOf('viewType=map') >= 0 )){

                            $scope.viewType = 'map';

                        } else {

                            $scope.viewType = 'list';
                        }
						
                        pubsub( 'resultsGrid/toggleView' ).publish( $scope.viewType );

                        if( storedFilter && ( storedFilter.indexOf('&q=') >= 0 || storedFilter.indexOf('q=') >= 0 ) ){

                            $scope.search = setValueFromUrl( 'q' );

                        } else {

                            $scope.search = '';
                            
                        }

                        storedFilter = removeParam( 'viewType', storedFilter);
 
                        initListeners();
                        
                        setAdditionalParams();

                        getJSON();

                    };

                    function removeParam( key, queryString ) {
                        var param,
                            params_arr = [];
                        if (queryString !== '' && queryString !== undefined ) {
                            params_arr = queryString.split('&');
                            for (var i = params_arr.length - 1; i >= 0; i -= 1) {
                                param = params_arr[i].split('=')[0];
                                if (param === key) {
                                    params_arr.splice(i, 1);
                                }
                            }
                            queryString =  params_arr.join('&');
                        }
                        return queryString;
                    }

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

                    function initListeners() {

                        pubsub( 'filter/updatedResponse' ).emptyAll();
                        pubsub( 'resultsGrid/applyFilter' ).emptyAll();
                        pubsub( 'resultsGrid/closeFilter' ).emptyAll();
                        pubsub( 'filter/toggleView' ).emptyAll();
                        pubsub( 'resultsGrid/clearSearch' ).emptyAll();

                        pubsub( 'filter/toggleView' ).subscribe ( function( viewType ) {

                            $scope.viewType = viewType;
                        });


                        pubsub( 'filter/updatedResponse' ).subscribe( function (results, deviceLatLong) {

                            $scope.results = results;
                            $scope.deviceLatLong = deviceLatLong;
                            nearby.updateMap($scope.viewType, $scope.results, $scope.deviceLatLong);

                        });

                        pubsub( 'resultsGrid/closeFilter' ).subscribe( function( searchTerm ){
                            $scope.filterScreen = false;
                            $scope.searchTerm = searchTerm;
                            cObj.closeCanvas();
                        });

                        pubsub( 'resultsGrid/clearSearch' ).subscribe( function( searchTerm ){
                            
                            $scope.search = searchTerm;
                        });

                       
                    }
                    
                    function setAdditionalParams() {

                        var params = MGMRI.data.resultsGrid.params.additional;

                        for ( var key in params ) {

                            if ( params.hasOwnProperty( key ) ) {

                                additionalParams.push( key + '=' + params[ key ] );
                            }
                        }
                    }

                    function buildQuery( filter ) { 

                        var url = '?' + ( filter ? filter : storedFilter || $('.filter-form').find('form').serialize() )
                            , paramArray = []
                            ;

                        paramArray.push.apply( paramArray, additionalParams );

                        
                        url += '&' + paramArray.join( '&' );

                        return( url );
                    }

                    $scope.goHomePage = function(){

                        if ( MGMRI.authorMode === 'false' ) {
                            nearby.removeMap();
                        }
						
						pubsub( 'navigation/flow' ).publish(true);
                        pubsub( 'home/page' ).publish();
                    };

                    $scope.keywordSearch = function(){
					
						$scope.toggleSearch(false);
                        $scope.searchActive = false;
                        var url = $('.filter-box').find('form.keyword-search').serialize();

                        window.location.hash = pageHash + '/:filter=' + url + '&viewType=' + $scope.viewType;
                                            
                        if ( $scope.viewType === 'map' && MGMRI.authorMode === 'false' ) {
                            nearby.mapClickable( true );
                        }
                    };

                    $scope.toggleSearch = function( action ){
                        
						if ( $scope.viewType === 'map' && MGMRI.authorMode === 'false' ) {

                            if( $scope.filterScreen === true ){

                                nearby.mapClickable( false );
                                return false;
                            }
							nearby.mapClickable( !action );
						}
							
						$scope.searchActive = action;
						scopeApply();
                    };

                    $scope.clearSearch = function(){
						
                        clearClick = true;
                    };

                    $scope.toggleView = function( view ) {
                        
                        $scope.viewType = view;

                        pubsub( 'resultsGrid/toggleView' ).publish( $scope.viewType );

                        nearby.updateMap($scope.viewType, $scope.results, $scope.deviceLatLong);

                        
                    };

                    $scope.go = function( path,target, action ){
						
						pubsub( 'navigation/flow' ).publish(false);
                        go.go( path, target, action );
                    }; 
					
					$scope.goBack = function(path,target, action){
						
						pubsub( 'navigation/flow' ).publish(true);
								
						scopeApply();
						
						go.go( path, target, action );
					};

                    $scope.showFilter = function() {

                        $scope.filterScreen = true;
                        
                        //disbale to click map
                        if ( $scope.viewType === 'map' && MGMRI.authorMode === 'false' ) {
                            nearby.mapClickable( false );
                        } 
                        var source = $( '.filter-form' );

                        $scope.disabledBtns = false;

                        cObj.openCanvas( source, 'topZero' ,function(){

                            pubsub( 'resultsGrid/setFilter' ).publish( $scope.viewType );

                            $( '.off-canvas-container' ).on( 'click', '[data-action=close]', function( e ) {

                                cObj.closeCanvas();
                            });

                            cObj.openCurtain();

                        },{ customClass: 'full-page no-padding-top curtain-enabled' });
                    };


                    function getSearchAnalyticsData( searchNumberOfResults ) {

                        var analyticsFilterCurrent = currentFilter
                            , analyticsFilter
                            , analyticsData = {}
                            , filterSearchStr = ''
                            , searchKeyword
                            , filterSearch = {}
                            ;

                        if (analyticsFilterCurrent.substring(0, 1) === '?') { 

                            analyticsFilterCurrent = analyticsFilterCurrent.substring(1);
                        }
                        analyticsFilter = analyticsFilterCurrent.split('&');    

                        analyticsFilter.forEach(function(filter) {
                            filter = filter.split('=');
                            filterSearch[filter[0]] = decodeURIComponent(filter[1] || '');
                        });
                        
                        filterSearch =  JSON.parse(JSON.stringify(filterSearch));

                        for ( var key in filterSearch ) {

                            if ( filterSearch.hasOwnProperty( key ) ) {

                                if ( key !== 'q' ){

                                    filterSearchStr = filterSearchStr + key + '="' + filterSearch[ key ] + '" | ';
                                } else{
                         
                                    searchKeyword = filterSearch[ key ];
                                }
                            }
                        }
                        filterSearchStr = filterSearchStr.slice(0, -3);                    
                        
                        if( searchKeyword !== '' ){

                            analyticsData = {
                                'searchNumberOfResults': searchNumberOfResults,
                                'searchSort':'',
                                'searchView': $scope.viewType,
                                'searchFilter': filterSearchStr,
                                'searchKeyword': searchKeyword
                            };

                        } else {
                            
                            analyticsData = {
                                'browseView': $scope.viewType,
                                'browseFilter': filterSearchStr
                            };
                        }
                        
                        return analyticsData;
                    }

                    // JSON success callback
                    function processData( data, status, headers, config, openNow ) {

                        $scope.gridLoader = false;

                        openNowFilter = openNow ? openNow : false;
                        
                        // Valid data response
                        if ( data.response && data.response.length ) {

                            var analyticsData = getSearchAnalyticsData( data.response.length );
                            pubsub( 'resultsGrid/json/data' ).publish( data, openNowFilter, filterCategory, analyticsData );
                        }
                        else {

                            pubsub( 'resultsGrid/noResults' ).publish();
                        }
                    }

                    function processError( data, status, headers, config ) {

                        $scope.gridLoader = false;

                        pubsub( 'resultsGrid/noResults' ).publish();
                    }

                    function getJSON( filter ) {

                        var url = filter ? buildQuery(filter) : buildQuery();

                        if ( currentFilter === url && openNowFilter === openNow ) { 

                            $scope.disabledBtns = true;
                            return; 
                        }
                            
                        openNowFilter = openNow;
                        $scope.gridLoader = true;
                        currentFilter = url;

                        json.get( service + url )
                            .success(function(data, status, headers, config) {
                                processData( data, status, headers, config, openNow );
                            })
                            .error(function(data, status, headers, config) {
                                processError( data, status, headers, config );
                            })
                        ;
                    }

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