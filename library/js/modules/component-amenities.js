/**
 * @desc Create a  
 *
 * @name component-amenities
 */

define(
    [
        'jquery',
        'modules/pubsub',
        'modules/component-base'
    ],

    function(

        $,
        pubsub,
        ComponentBase

    ) {

        'use strict';

        var ComponentAmenities = function( element ) {

            var amenitiesContainer = null
                , amenitiesList = null
                , amenitiesResults = null
                , moveResults = true
                , lastSelected
                , transitionEvent
                ;


            this.base = new ComponentBase();

            this.init = function( ) {

                this.base.init( $( element ), this );

                amenitiesContainer = this.getElement();
                amenitiesList = amenitiesContainer.find( '.amenities-categories' );
                amenitiesResults = amenitiesContainer.find( '.amenities-results' );

                function selectTransition() {

                    var t
                        , el = document.createElement( 'fakeelement' )
                        , transitions = {
                            'transition':'transitionend',
                            'OTransition':'oTransitionEnd',
                            'MozTransition':'transitionend',
                            'WebkitTransition':'webkitTransitionEnd'
                        }
                        ;

                    for ( t in transitions ) {
                        if ( el.style[ t ] !== undefined ) {
                            return transitions[ t ];
                        }
                    }
                }

                transitionEvent = selectTransition();

                this.alternateEven();

                this.bind();
            };

            this.bind = function() {

                var self = this;

                /*
                  Open/Close amenities drawer
                ---------------------------*/
                amenitiesResults.on( 'click', 'button', slideDetails );

                /*
                  Amenities directory
                ---------------------------*/
                amenitiesList.on( 'click', 'li.amenity-category', function( e ) {

                    e.stopPropagation();

                    var selectedAmenity = $( e.currentTarget )
                        , alreadySelected = selectedAmenity.hasClass( 'selected' )
                        ;

                    lastSelected = selectedAmenity;

                    

                    amenitiesList.find( '> li' ).removeClass( 'selected btn-expand-on' );

                    if ( moveResults && alreadySelected ) {

                        amenitiesResults = $( '.amenities-results' ).detach();
                        amenitiesResults.appendTo( amenitiesContainer );

                    }
                    else {

                        self.switchAmenities( selectedAmenity );
                    }
                });

                function slideDetails( event ) {

                    event.stopPropagation();

                    var target = $( event.currentTarget )
                        , listElement = target.parents( 'li:not(.amenity-category)' )
                        ;

                    listElement.find('.amenity-detail-drawer').slideToggle( 300, function() {

                        pubsub('amenities/details/map/init').publish( listElement );
                    } );

                    listElement.toggleClass('amenity-drawer-open');
                }
            };

            this.switchAmenities = function( selectedAmenity ) {

                var amenitiesToSelect = selectedAmenity.data( 'amenity' )
                    , amenitiesArray = amenitiesToSelect.split( ' ' )
                    , amenitiesResultsList = []
                    , selectedAmenityOffset = 0
                    ;

                // change to current selection
                selectedAmenity.addClass( 'selected btn-expand-on' );

                // reset class list
                amenitiesResults.attr( 'class', 'amenities-results' );

                // amenity special selection
                if ( amenitiesArray[ 0 ] !== 'all' ) {

                    amenitiesResults.addClass( 'amenity-selected' );

                    for ( var i = 0; i < amenitiesArray.length; i++ ) {

                        // add all classes in attributes list
                        amenitiesResults.addClass( 'amenity-select-' + amenitiesArray[ i ] );
                        // merge all list elements that apply
                        $.merge(amenitiesResultsList, amenitiesResults.find( '[data-amenity*=' + amenitiesArray[ i ] + ']' ) );
                    }

                    // remove duplicates and reorder dom properly
                    $.unique( amenitiesResultsList );
                    // highlight every even list element
                    this.alternateEven( amenitiesResultsList );

                }
                // view all amenities
                else {
                    amenitiesResults.addClass( 'amenity-all-selected' );
                    this.alternateEven();
                }

                // Small Viewport, must move list after selected category
                if ( moveResults ) {

                    amenitiesResults = $('.amenities-results').detach();
                    amenitiesResults.appendTo(selectedAmenity);
                    selectedAmenityOffset = selectedAmenity.offset().top;

                    $('html,body').animate({
                        scrollTop: selectedAmenityOffset
                    }, 1000);
                }
            };

            /*
              Accepts array of elements to highlight with '.even' class
            If no argument, it highlights from all amenities results
            ---------------------------*/
            this.alternateEven = function( list ) {

                // reset all amenities
                amenitiesResults.find( '> li' ).removeClass( 'even' );

                // Highlight from all amenities
                if ( !list ) {

                    list = amenitiesResults.find( 'li[data-view-all="true"]' ) ;

                }
                // Highlight specific 'li's that are being displayed


                for ( var i = 0; i < list.length; i ++ ) {

                    var isEven = i % 2;

                    if ( isEven ) {

                        $( list[ i ] ).addClass( 'even' );
                    }
                }
            };

            this.init();

        };

        return ComponentBase.ComponentConstructorCreator( ComponentAmenities );
    }
);