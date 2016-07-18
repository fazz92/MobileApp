/**
 * @desc Create a bookmarked carousel 
 *
 * @name offcanvas-components
 */

define(
    [
        'jquery',
        'modules/details-carousels',
        'modules/bookmarked-carousels',
        'modules/component-amenities',
        'modules/component-amenities-hotel',
        'modules/component-facilities',
        'modules/component-grid-gallery',
        'modules/component-social-gallery',
        'modules/component-special-reservations',
        'modules/component-bio',
        'modules/component-restaurant-menu'

    ],

    function(

        $,
        detailsCarousels,
        bookmarkedCarousels,
        amenities,
        amenitiesHotel,
        facilities,
        gridGallery,
        socialGallery,
        specialReservations,
        bio,
        restaurantMenu

    ) {

        'use strict';

        var components = []
            , element
            ;


        var mediator = {

            offCanvasInit: function( elem ) {
                
                element = elem;
                $( this.offcanvasInitUI.bind( this ) );
            },


            offcanvasInitUI: function() {

                var self = this;

                $.each( $( element ).find( '[data-mgm-component]' ), function( index ) {

                    var fn
                        , functionName = $( this ).data( 'mgm-component' )
                        , carouselName
                        , className = '.' + $.trim( $( this ).attr( 'class' ) ).replace( /\s/g,'.' )
                        ;

                    if ($( this ).hasClass('initiated')){return;}

                    $( this ).addClass('initiated');

                    if ( functionName === 'detailsCarousels' ) {

                        carouselName = $( this ).data( 'carousel-name' );
                        detailsCarousels.buildCarousels(carouselName);

                        return;
                    }

                    if ( functionName === 'bookmarkedCarousels' ) {

                        bookmarkedCarousels.buildCarousels();

                        return;
                    }

                    fn = self[ functionName ].apply( self, [ className ] );

                    components = components.concat( fn );

                });

                this.components = components;
            },

            amenities: function( elem ) { return amenities( elem ); },

            amenitiesHotel: function( elem ) { return amenitiesHotel( elem ); },

            bio: function( elem ) { return bio( elem ); },

            facilities: function( elem ) { return facilities( elem ); },

            gridGallery: function( elem ) { return gridGallery( elem ); },

            specialReservations: function( elem ) { return specialReservations( elem ); },

            socialGallery: function( elem ) { return socialGallery( elem ); },

            restaurantMenu: function( elem ) { return restaurantMenu( elem ); }

        };
        function reloadOffCanvasInit( elem ){
            mediator.offCanvasInit( elem );
        }
        

        return {
            reloadOffCanvasInit : reloadOffCanvasInit
        };
    }
);