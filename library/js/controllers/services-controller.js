define(
    [
        'jquery',
        'modules/pubsub',
        'modules/go',
        'modules/canvas',
        'modules/file-save',
        // Angular-specific dependencies
        'vendor/angular-custom',
        'services/file-service',
        'modules/analytics-module'

    ],

        function(

            $,
            pubsub,
            go,
            canvas,
            fileSave,
            // Angular-specific dependencies
            angular,
            fileService,
            analytics

        ) {

            'use strict';

            /* Controllers */
            return angular.module( 'Services.controllers',
                ['File.service']
                ).controller( 'servicesController',
                [
                '$scope',
                '$parse',
                '$window',
                '$timeout',
                'fileService',

                function(

                    $scope,
                    $parse,
                    $window,
                    $timeout,
                    fileService

                    ) {

                    $scope.results = [ ];
                    var saveToFile = fileSave(fileService)
                    ,   allFilesResponse;

                    /**
                     * Read all files from the device file system
                     */
                    function readItem(){
                        saveToFile.readAllFiles()
                        .then(
                            function(response){

                                allFilesResponse = JSON.parse(response.data);
                                allFilesResponse.sort(function(a,b) {

                                    return new Date(b.last_modified_time) - new Date(a.last_modified_time);
                                });

                                $scope.results = allFilesResponse;
								$scope.gridLoader = false;
								scopeApply();
								
                            },
                            function(error){
                                $scope.results = {};
								$scope.gridLoader = false;
								scopeApply();
                            }
                        );
                    };
					
					function scopeApply() {

                        var phase = $scope.$root.$$phase;

                        if(phase !== '$apply' && phase !== '$digest') {
                            $scope.$apply();
                        }
                    };

                    var init = function() {

                        var cObj = canvas()
                        , detailEle = $('.services-subNav')
                        , detailEleLinks = detailEle.find( 'li' )
                        , source
                        , deletedIdList = []
                        , undoId
                        , deletedIdIndex
                        , list = document.querySelector('.swipe-parent')
                        ;
						
						//enable Grid Loader
						$scope.gridLoader = true;
						
                        pubsub( 'footer/tabs' ).publish( true );

                        detailEleLinks.on( 'click', function( e ){

                            var canvasType = $( this ).find( 'a' ).data( 'canvastype' )
                            , offcanvasHeading = $( this ).find( 'a' ).data( 'heading' )
                            , offcanvasTitle = $( this ).find( 'a' ).data( 'title' )
                            , analyticsData = {
                                'offcanvasTitle' : offcanvasTitle,
                                'offcanvasHeading' : offcanvasHeading
                            }
                            ;

                            cObj.closeCanvas();

                            if ( canvasType ) {

                                e.preventDefault();
                            }

                            source = $( '.'+canvasType+'-offcanvas' );

                            if ( source.length <= 0 ){ return; }

                            cObj.openCanvas( source, 'left' ,function(){

                                $( '.off-canvas-container' ).on( 'click', '[data-action=close]', function( e ) {

                                    cObj.closeCanvas();
                                });

                                analytics.updateAnalytics( analyticsData, 'servicesOffcanvas' );

                                //cObj.openCurtain();
                            }, { customClass: 'full-page', heading:offcanvasHeading, title: offcanvasTitle});

                        });

                        /**
                         * Swipe delete functionality
                         */
                        if ( list && ( !MGMRI.authorMode || MGMRI.authorMode !== 'true' ) ) {

                            readItem(); 
                        }else{
							$scope.gridLoader = false;							
						}
						
						/**
						 * Swipe Handler						 
						 */
						$scope.swipeHandler = function($event,flag){
							var self = $($event.currentTarget),
								direction = flag ? 'swipe-right' : 'swipe-left',
								dataFileId;
								
							if(self.hasClass('undo')){
								return;
							}
							$timeout(function(){
								$(self).removeClass(direction);
								$(self).addClass('undo');
								
								$(self).find('.tile-img').hide();
								$(self).find('.deleted').show();
								$(self).find('.undo-delete').show().attr('data-fileid', dataFileId);
								
								
							},500);
							
							$(self).addClass(direction);
							
							$timeout(function(){
								dataFileId = $(self).find('.trip-details-container').data('fileid');

								if(deletedIdList.length){
									saveToFile.deleteItem(deletedIdList[0]);
									$(".trip-details-container[data-fileid="+deletedIdList[0]+"]").parent().remove();
									deletedIdList = [];
								}

								deletedIdList.push(dataFileId); 
							},100);
							
						};

                        /**
                         * Undo delete Functionality
                         */
                        $scope.undoDelete = function(event) {
							var self = $(event.currentTarget),
								parent = self.parents('.swipe-container'),								
								undoId = self.data('fileid');
								
                            self.hide();
							
							parent.removeClass('undo');
							parent.find('.tile-img').show();
							parent.find('.deleted').hide();

                            deletedIdIndex = deletedIdList.indexOf(undoId);
							
                            if(deletedIdIndex !== -1){
                                deletedIdList.splice(deletedIdIndex, 1);
                            }
                        };

                        $scope.$on('$locationChangeStart', function(event, newUrl, oldUrl) {

                            for(var i=0; i < deletedIdList.length; i++ ){
                                saveToFile.deleteItem(deletedIdList[i]);
                            }
                        });

                    };

                    $scope.goToDetail = function( path, category ){
					
						pubsub( 'navigation/flow' ).publish(false);
                        go.goToDetail( path, category );
                    };

                    $scope.go = function( path,target ){
						
						pubsub( 'navigation/flow' ).publish(false);
                        go.go( path, target );
                    };

                    init();
                }
            ]
        );
    }
);