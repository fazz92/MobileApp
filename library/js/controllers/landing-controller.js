define(
    [
        'jquery',
        'modules/pubsub',
        'modules/venue-hours-calculator',
        'modules/component-venue-action',
        'modules/nearby',
        'modules/go',
        'modules/get-distance',
        'modules/share',
        'modules/file-save',
        'modules/canvas',
        'modules/analytics-module',

        // Angular-specific dependencies
        'factories/json-factory',
        'services/model-service',
        'services/file-service',
        'services/location-service',
        'vendor/angular-custom'
        
    ],

    function(

        $,
        pubsub,
        venueHoursCalculator,
        venueAction,
        nearby,
        go,
        getDistance,
        share,
        fileSave,
        canvas,
        analytics,

        // Angular-specific dependencies
        jsonFactory,
        model,
        fileService,
        LocationService,
        angular

    ) {

        'use strict';

        /* Controllers */
        return angular.module( 'Landing.controllers',
            [
                'JsonFactory',
                'Model.service',
                'File.service',
                'Location.service'
            ]
        ).controller( 'landingController',
                [
                    '$scope',
                    'json',
                    'model',
                    '$filter',
                    '$route', 
                    '$routeParams',
                    'fileService',
                    'LocationService',

                    function(
                        $scope,
                        json,
                        model,
                        $filter,
                        $route, 
                        $routeParams,
                        fileService,
                        locService
                    ) {

                        var updatedResponse
                            , cObj = canvas()
                            , saveToFile = fileSave(fileService)
                            , initialSearch = true
                            ;

                        $scope.model = model;
                        $scope.viewType = 'list';
                        $scope.predicate='';
                        $scope.marker = {};
                        $scope.results = {};

                        //Initialize Controller
                        var init = function() {
                            
                            cObj.closeCanvas();
                            pubsub( 'footer/tabs' ).publish( false, undefined, 'notTraked' );
                            initListeners();

                        };

                        function initListeners() {

                            pubsub( 'map/marker' ).emptyAll();
                            pubsub( 'resultsGrid/json/data' ).emptyAll();
                            pubsub( 'resultsGrid/toggleView' ).emptyAll();
                            pubsub( 'resultsGrid/noResults' ).emptyAll();

                            pubsub( 'map/marker' ).subscribe( function( marker ) {

                                $scope.marker = marker;
                                
                                scopeApply();
								
								//Initializing venue component after the ngModel is updated.
								venueAction( $( '[data-mgmapp-component=venueAction]' ) );

                                $('a[href^="tel"]').off().on('click',function(){

                                    var analyticsData = {
                                        'category' : $(this).attr('data-category'),
                                        'title' : $(this).attr('data-service'),
                                        'number' : $(this).attr('data-number')
                                    };
                                    analytics.updateAnalytics( analyticsData, 'phoneLinks' );
                                });

                                if(marker){

                                    var ftrHt = $('.nearby-wrapper .nearby-item-detail-wrapper').show().height(),
                                        minHt = $(window).height() - ftrHt -40;
                                    $('#map').css('height', minHt);

                                    $scope.readItem(marker.url);

                                    window.setTimeout(function(){
                                        nearby.refreshMap();
                                    },10);
                                }
                            });

                            pubsub( 'resultsGrid/toggleView' ).subscribe ( function( viewType ) {

                                $scope.viewType = viewType;
                            });

                            /*    
                             * Subscribe to filter controller returned json data
                             */
                            pubsub( 'resultsGrid/json/data' ).subscribe( function( data, openNow, filterIdText, analyticsData ) {
                                
                                updatedResponse = data.response;                               
                                $scope.noResults = false;
                                
                                if( analyticsData.browseView ){

                                    analyticsData.browseSort = ($scope.predicate && $scope.predicate!== '') ? 'nearby' : 'popular';
                                    analytics.updateAnalytics( analyticsData, 'browse' );

                                } else {

                                    analyticsData.searchSort = ($scope.predicate && $scope.predicate!== '') ? 'nearby' : 'popular';
                                    analytics.updateAnalytics( analyticsData, 'search' );
                                }
                                
                                initialSearch = false;  

                                if ( openNow ) {
                                    checkResultsHours(data);
                                    
                                } else {
                                    $scope.results = updatedResponse;
                                }
                                pubsub( 'footer/tabs' ).publish( false, undefined, 'notTraked' );

                                locService.getLocation().then(
                                    function (deviceLatLong) {
                                        var localResult = $scope.results;
                                        for(var i = 0; i < localResult.length; i++){
                                            var checkTrue = localResult[i] && localResult[i].latitude && localResult[i].longitude && typeof localResult[i].latitude === 'number'  && typeof localResult[i].longitude === 'number' && !isNaN(localResult[i].latitude)  && !isNaN(localResult[i].longitude);
                                            if( checkTrue ){
                                                var _getDis = getDistance.distance(deviceLatLong.latitude, deviceLatLong.longitude, localResult[i].latitude, localResult[i].longitude).toFixed(1);
                                                localResult[i].distance = parseFloat(_getDis);
                                            }
                                        }
                                        $scope.results = localResult;
                                        pubsub( 'filter/updatedResponse' ).publish( $scope.results, deviceLatLong );
                                        scopeApply();
                                    }, 
                                    function () {
                                        console.log('could not get location');
                                    }
                                );
                                
                                pubsub( 'filter/updatedResponse' ).publish( $scope.results );
                                scopeApply();
                            });

                            pubsub( 'resultsGrid/noResults' ).subscribe ( function( ) {
                                pubsub( 'footer/tabs' ).publish( false, undefined, 'notTraked' );
                                $scope.noResults = true;
                            
                            });
                        }

                        function checkResultsHours( results ) {

                            if ( results && results.response && typeof results.response === 'object' ) {

                                $.each( results.response, function() {

                                    if ( this.operatingHours && this.utcOffset !== undefined ) {

                                        var hoursCalc = venueHoursCalculator( this.operatingHours, this.utcOffset );

                                        this.resultsGridVenueHours = {};

                                        this.resultsGridVenueHours.isOpen = hoursCalc.isOpen;
                                        this.resultsGridVenueHours.is24Hours =  hoursCalc.is24Hours;
                                        this.resultsGridVenueHours.openText = hoursCalc.displayText;
                                        this.resultsGridVenueOpen = this.resultsGridVenueHours.isOpen;

                                    }
                                    else {

                                        this.resultsGridVenueOpen = false;
                                    }
                                });
                            }

                            $scope.results = getOpenNowResults( results.response );
                            if ( !$scope.results.length ){ $scope.noResults = true; }

                        }

                        /*
                         * Get only the results that are currently open.
                         *
                         * @param results {Array} An array of tiles objects to filter.
                         */
                        function getOpenNowResults( results ) {

                            return $filter( 'filter' )( results, { resultsGridVenueOpen: true } );
                        }


                        $scope.toggleView = function( view ) {
                            $scope.viewType = view;
                            pubsub( 'filter/toggleView' ).publish( $scope.viewType );
                        };

                        $scope.goToDetail = function( path, category ){
                            
                            if( $scope.viewType === 'map'){
                                nearby.removeMap();
                            }

                            go.goToDetail( path, category );
                        };

                        $scope.go = function( path,target ){
						
							pubsub( 'navigation/flow' ).publish(false);
                            go.go( path, target );
                        }; 

                        $scope.openShare = function( title, desc, img, link, category ) {

                            share.openShare( title, desc, img, link, category );
                        };

                        $scope.readItem = function(url) {
                            var fileId = url
                                , match = url.match(/^(https?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)(\/[^?#]*)(\?[^#]*|)(#.*|)$/);
                            if (match) {
                                fileId = match[5];
                                fileId = fileId.replace(/\//g,'-').replace(/\./g,'-');
                            }
                            
                            saveToFile.readItem(fileId, function(status) {
                                $scope.saveStatus = status;
                            });
                        };

                        $scope.saveItem = function(imageUrl, header, subHeader, url, urlTarget) {

                            var fileId = url
                                , match = url.match(/^(https?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)(\/[^?#]*)(\?[^#]*|)(#.*|)$/);
                            if (match) {
                                fileId = match[5];
                                fileId = fileId.replace(/\//g,'-').replace(/\./g,'-');
                            }
                            
                            if($scope.saveStatus === 'SAVED'){

                                saveToFile.deleteItem(fileId, header, subHeader, function(status) {
                                    $scope.saveStatus = status;
                                });
                            }
                            else if($scope.saveStatus === 'SAVE'){

                                saveToFile.saveItem(imageUrl, header, subHeader, fileId, url, urlTarget, function(status){
                                    $scope.saveStatus = status;
                                });
                            }
                        };

                        $scope.orderDis = function() {
                            $scope.predicate = 'distance';
                            $scope.results = $filter('orderBy')($scope.results,  $scope.predicate);
                            scopeApply();
                        };

                        /**
                         * Center Map button
                         */
                        $scope.cntrMap = function() {
                            nearby.centerMap();
                        };

                        /**
                         * Display Map direction
                         */
                        $scope.mapDir = function(){
                            nearby.openMapApp();
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

