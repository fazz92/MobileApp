define(
    [
        'jquery',
        'modules/pubsub',
        'modules/go',
        'modules/canvas',
        'modules/analytics-module',
        // Angular-specific dependencies
        'vendor/angular-custom'
    ],

    function(

        $,
        pubsub,
        go,
        canvas,
        analytics,
        // Angular-specific dependencies
        angular

    ) {

        'use strict';

        /* Controllers */
        return angular.module( 'Mgm.controllers',
            []
        ).controller( 'mgmController',
            [
                '$scope',
                '$parse',
                '$window',				
                '$timeout',
                '$animate',

                function(

                    $scope,
                    $parse,
                    $window,
					$timeout,
                    $animate

                ) {

                    var cObj = canvas()
                        ;

                    var init = function() {

                        $scope.footerTabs = false;
                        $scope.detailPage = false;
                        initListeners();
                    };

                    function initListeners() {					
						
                        pubsub( 'footer/tabs' ).emptyAll();

                        pubsub( 'footer/tabs' ).subscribe( function( value, activeFooter, page, detailPage ){
                            
                            $scope.footerTabs = value;

                            $scope.detailPage = detailPage ? true : false;

                            if( activeFooter !== undefined){

                                $scope.activeFooter = activeFooter;
                            } else {
    
                                $scope.activeFooter = ( window.location.hash ).substring( 1 ).replace(/\//g, '');
                            }
                               
                            var analyticsDataUpdate = $scope.activeFooter.split( '/:filter=' );

                            if ( page !== 'notTraked' ){

                                analytics.updateAnalytics( analyticsDataUpdate[0], 'footerNav' );

                            } else {

                                analytics.updateAnalytics( analyticsDataUpdate[0], 'setAppSection' );
                            
                            }

                        });
						
						pubsub( 'navigation/flow' ).subscribe( function(action){
							
							$scope.reverseFlow = action;						
							
						});
                    }

                    function skipAnimation(){

                        $animate.enabled(false);
                    }

                    $scope.goToDetail = function( path, category ){

                        $scope.activeFooter = path;
                        cObj.closeCanvas();
                        go.goToDetail( path, category );
                    };

                    $scope.goTab = function( path, target ){

                        skipAnimation();
                        cObj.closeCanvas();
                        go.go( path, target );
                    } 
					
                    $scope.$on('$routeChangeSuccess', function(ev, next, current) { 

                        analytics.updateAnalytics( '', 'pageLoad' );
						$timeout(function(){
                            $('a[href^="tel"]').off().on('click',function(){

								var analyticsData = {
									'category' : $(this).attr('data-category'),
									'title' : $(this).attr('data-service'),
									'number' : $(this).attr('data-number')
								};
								analytics.updateAnalytics( analyticsData, 'phoneLinks' );
                            });
						},800);
					});

                    init();
                }
            ]
        );
    }
);