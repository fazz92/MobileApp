/**
 * @desc 
 *
 * @name filter-form-controller
 */
define(
    [
        'jquery',

        // Angular-specific dependencies
        'vendor/angular-custom',
        'services/model-service',
        'modules/nearby',
        'modules/pubsub',
        'modules/go'
    ],

    function(

        $,

        // Angular-specific dependencies
        angular,
        model,
        nearby,
        pubsub,
        go

    ) {

        'use strict';

        /* Controllers */
        return angular.module( 'FilterForm.controllers',
            [
                'JsonFactory'
            ]
        )

        .controller( 'filterFormController',
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

                    var target = '_self'
                        , offerText = []
                        , storedFilter
                        , urlHash
                        , urlFilter
                        , pageHash
                        , openNow = false
                        , filteredCategory 
                        , storedFilterMap = {}
                        ;
                    
                    var init = function() {

                        var hash;

                        urlHash = window.location.hash;
                        urlFilter = urlHash.split('/:filter');
                        storedFilter = urlFilter[1];


                        if ( storedFilter !== '' && storedFilter !== undefined && storedFilter.charAt( 0 ) === '=' ) {

                            storedFilter = $.trim( '' + storedFilter.substring( 1 ) );
                        }
                        
                        if (storedFilter && storedFilter.indexOf('&') > 0) {
                            storedFilter = storedFilter.split('&');
                            for ( var i=0; i < storedFilter.length; i++ ) {
                                var filter = storedFilter[i].split('=');
                                if( filter.length === 2 ) {
                                    storedFilterMap[filter[0]] = filter[1].replace(/\+/g, ' ' );
                                }
                            }
                        }

                        pageHash = urlFilter[0];

                        $scope.activeOpenNow = storedFilter ? storedFilter.indexOf('openNow') >= 0 : false;
                        if( MGMRI.authorMode && MGMRI.authorMode === 'true' ){

                            $scope.currentCategory = $window.location.pathname.replace('.html','');
                            pageHash = '';

                        }else {

                            hash = pageHash;
                            $scope.currentCategory = $.trim( '' + hash.substring( 1 ) );

                        }

                        pubsub( 'resultsGrid/setFilter' ).emptyAll();

                        pubsub( 'resultsGrid/setFilter' ).subscribe( function( viewType ){
            
                            var filteredCategoryFlag = false;

                            $scope.viewType = viewType;

                            $scope.filterChanged = false;

                            if( storedFilterMap && storedFilterMap.q ) {
                            
                                $scope.searchTerm = storedFilterMap.q;

                            } else if ( $scope.$parent.search || $scope.search ) {

                                $scope.searchTerm = $scope.$parent.search || $scope.search;

                            }  else {

                                $scope.searchTerm = '';
                            }
                            
                            $.each( $( '.filter-form input.filter' ), function( index ) {
                                var inputName = $(this).attr('name');
                                if( storedFilterMap && storedFilterMap[inputName] ){

                                    $scope[inputName] = storedFilterMap[inputName];
                                    $scope.filterChanged = false;
                                }
                            });

                            $.each( $( '.filter-form form select' ), function( index ) {

                                var inputName = $(this).attr('name');
                                if( storedFilterMap && storedFilterMap[inputName] ){

                                    $(this).val( storedFilterMap[inputName] );
                                    $scope.filterChanged = false;
                                }
                            });

                            $.each( $( '.category-filter option' ), function( index ) {

                                if( $scope.currentCategory === $(this).val() && !filteredCategoryFlag){

                                    $scope.filterCategory = $(this).val();
                                    $scope.currentCategoryLabel = $(this).html();
                                    filteredCategoryFlag = true;
                                } 

                                if( $(this).attr('data-target') === '_blank' ){

                                    offerText.push($(this).val());
                                }
                            });

                            scopeApply();
                        });
                        
                    };

                    $scope.categoryChange = function( e ) {

                        var ele = $(event.target);

                        if ( $scope.currentCategory === $scope.filterCategory ){

                            $scope.filterChanged = false;
                        }
                        else {

                            $scope.filterChanged = true;
                        }

                        if( $.inArray( ele.val(), offerText) > -1 ){

                            target = '_blank';
                        }

                        $scope.filterCategory = ele.val();
                    };

                    /**Apply filters and make new service call for small viewport
                    *@method applyFilters
                    */
                    $scope.applyFilters = function() {
                        
                        if ( MGMRI.authorMode === 'false' ){
                            nearby.mapClickable( true );
                        } 

                        if ( $scope.currentCategory === $scope.filterCategory ){ 

                            openNow = $scope.activeOpenNow ? '&openNow' : '';
                            window.location.hash = pageHash + '/:filter=' + $('.filter-form').find('form').serialize() + openNow + '&viewType=' + $scope.viewType;

                            if( MGMRI.authorMode && MGMRI.authorMode === 'true' ) {

                                window.location.reload();
                            }
                        } else {

                            if( MGMRI.authorMode && MGMRI.authorMode === 'true' ) {

                                filteredCategory = $scope.filterCategory + '.html#/:filter=' + 'q='+ $scope.searchTerm;
                            } else {

                                if( target === '_blank' ){

                                    filteredCategory = $scope.filterCategory;

                                } else{

                                    filteredCategory = $scope.filterCategory + '/:filter=' + 'q='+ $scope.searchTerm;
                                }
                            }
            
                            go.go( filteredCategory, target, 'mapreset' );

                        }
                        pubsub( 'resultsGrid/closeFilter' ).publish( $scope.searchTerm );
                    };

                    $scope.clearFilters = function() {

                        $('.filter-form').find('form')[0].reset();
                        
                        $.each( $( '.filter-form input.filter' ), function( index ) {
                            $scope[$(this).attr('name')] = '';
                        });
                        
                        $.each( $( '.category-filter option' ), function( index ) {

                            if( $scope.currentCategory === $(this).val() ){

                                $scope.filterCategory = $(this).val();
                                
                                $( '.category-filter' ).val($(this).val());

                                return false;    
                            }
                        });

                        $scope.activeOpenNow = false;
                        scopeApply();

                    };

                    $scope.setFilterValue = function( e, val ) {

                        if ( e && e.preventDefault ) {

                            e.preventDefault();
                        }
                        
                        var targetText = $(e.target).parents('.filter-radio').find('input[type=text]');
                        
                        targetText.val( val );
                        
                        $scope[targetText.attr('name')] = val;

                        $scope.filterChanged = true;

                    };

                    /**
                    *@method toggleOpenNow
                    *@param {event} e - Index  the carousel name.
                    */
                    $scope.toggleOpenNow = function( e ) {

                        if ( e && e.preventDefault ) {

                            e.preventDefault();
                        }
                        $scope.filterChanged = true;
                        $scope.activeOpenNow = !$scope.activeOpenNow;
                    };

                    /**Trigger the digest cycle
                    *@method scopeApply
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
