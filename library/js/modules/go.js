define(
    [
        'jquery',
        'modules/pubsub',
        'modules/nearby',
        'modules/analytics-module'
    ],

    function(

        $,
        pubsub,
        nearby,
        analytics
    ) {

        'use strict';

        var _browserRef
        	, injectScriptPath = $('.cordova-inject').data('cordova-inject')
            , jsData
            , jsXHR = $.get(injectScriptPath, function(data) {
            	jsData = data;
            })
            , customOptions = {
                toolbar:{
                  height:38,
                  color:'#5c5c5c'
                },
                backButton: {
                  wwwImage: 'img/back.png',
                  wwwImagePressed: 'img/back.png',
                  wwwImageDensity: 3,
                  align: 'left',
                  event: 'backPressed'
                },
                customButtons: [
                  {
                      wwwImage: 'img/reload.png',
                      wwwImagePressed: 'img/reload.png',
                      wwwImageDensity: 3,
                      align: 'left',
                      event: 'reloadPressed'
                  }
                ],
                forwardButton: {
                  wwwImage: 'img/forward.png',
                  wwwImagePressed: 'img/forward.png',
                  wwwImageDensity: 3,
                  align: 'left',
                  event: 'forwardPressed'
                },
                closeButton: {
                  wwwImage: 'img/close.png',
                  wwwImagePressed: 'img/close.png',
                  wwwImageDensity: 3,
                  align: 'right',
                  event: 'closePressed'
                }
            };

        var openExt = function( url ) {

            if (typeof cordova != 'undefined' ) {

				analytics.updateAnalytics( url, 'exitLink' );
                
            	_browserRef = cordova.ThemeableBrowser.open(url, '_blank', customOptions);

                _browserRef.addEventListener('loadstop', function() {
                    console.log('External Page Loaded');
                    if(url.indexOf('mgmgrand') > -1) {
                        setTimeout(function () {
                            _browserRef.executeScript({
                                code: jsData
                            }, function() {
                                console.log('Script successfully injected');
                            });
                        }, 20);
                    }
                });

                _browserRef.addEventListener('reloadPressed', function() {
                	_browserRef.reload();
                	console.log('page reloaded');
                });
            }
        };

        var go = function( path, target, map, filter ) {

            if ( MGMRI.authorMode === 'false' && map === 'mapreset' ) {
                setTimeout(function(){
					nearby.removeMap();
				},1500);
            }

            var url = path;

            if ( MGMRI.authorMode === 'true' ) {

                if (url.indexOf("/") === 0 && url.indexOf(".html") < 0) {
                	url = path + '.html';
                }

                if ( target !== undefined && target !== '' && target !== '_self' ) {

                	window.open(url, target);
                 
                } else {

                	window.open(url, '_self');
                }
                
            } else {

                if ( target !== undefined && target !== '' && target !== '_self' ) {

                	if ( url.indexOf("/") > 0 ) {
                    	
                		openExt( url );
                		
                	}

                 } else {

                	 if ( url.indexOf("/") === 0 ) {
                    	
                		 // SPA hash navigation
                		 if( filter ) {
                    		 
                			 window.location.hash = path + filter;
                			 
                		 } else {

                			 window.location.hash = path;
							                 			 
                		 }
                	 }
                 }                                
            }
        };

        var goToDetail = function( path, category ) {

            var commonDetail = MGMRI.detailPagePath;

            category = window.encodeURIComponent(category);
            var removeHashTemp = path.split('#');
            path = removeHashTemp[0];

            var analyticsPath = path.split('.html');
            
            if ( MGMRI.authorMode === 'true' ) {

                window.location.href = commonDetail + '.html#/url=' + path + '&category=' + category;
            
            } else {
                
                analytics.updateAnalytics( analyticsPath[0], 'details' );
                
                //SPA hash navigation
                window.location.href = '#/' + commonDetail + '/:url=' + path + '&category=' + category;
			}
        };
        
        var openPDF = function ( url ) {
        	
        	var deviceOS = device.platform.toUpperCase();
			
			if ( deviceOS === 'ANDROID' ) {
				
                analytics.updateAnalytics( url, 'exitLink' );
				cordova.ThemeableBrowser.open(url, '_system', customOptions);
			
			} else {
				
				openExt ( url );
				
			}
        }; 

        return {
            go: go,
            goToDetail: goToDetail,
            openPDF: openPDF
        };
    }
);
