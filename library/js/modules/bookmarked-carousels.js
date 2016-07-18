/**
 * @desc Create a bookmarked carousel 
 *
 * @name bookmarked-carousel
 */


define(

    [
        'jquery',
        'vendor/carousel',
        'vendor/carousel.pagination',
        'vendor/carousel.touch',
        'modules/gallery-bookmarks'

    ],

    function(

        $,
        carousel,
        pagination,
        touch,
        bookmarks

    ) {

        /**constructor
        *@exports bookmarkedCarousels*/

        var BookmarkedCarousels = function() {
            /** funtion to create bookmarked Carousel
            
            *@method buildBookmarkedCarousels
            *@param {int} carouselName - Index  the carousel name.
             */
            function buildBookmarkedCarousels( carouselName ) {
                var carouselTiles
                    , tileTotal
                    , carouselInit
                    , bookmarks = {
                        venueEvents: {
                            elem: $( '.venue-calendar-carousel' )
                        }
                    }
                    , carousels = {
                        venueEvents: {
                            elem: document.querySelector( '[data-crsl=venue-events]' )
                        }
                    }
                    , skipTiles = {
                        venueEvents: true
                    }
                    , vpLookup = {
                        venueEvents: {
                            small: 1,
                            'fixed-slim-nav': 3
                        }
                    }
                    , tooltipContentClass = 'tile-tooltip-content'
                    ;

                var defaultConfig = {
                    tilesPerFrame: 1,
                    incrementMode: 'tile',
                    wrapperClass: '',
                    wrapControls: true,
                    accessible: false,
                    prevText: '',
                    nextText: '',
                    pagination: {
                        center: false,
                        frameText: '<span>{pageNumber}</span> / {total}'
                    },
                    loop: false,
                    touch: true
                };


                var carouselConfig, cacheEl = $('.venue-calendar-carousel li');

                if ( carousels[ carouselName ].elem ) {

                    carouselConfig = $.extend( {}, defaultConfig, { element: carousels[ carouselName ].elem } );
                    carouselConfig.wrapperClass = carouselName + '-carousel-wrapper';

                    carouselConfig.bookmarks = {
                        bookmarkCarousel: bookmarks[ carouselName ].elem,
                        contentCarousel: carousels[ carouselName ].elem,
                        skipTiles: skipTiles[ carouselName ]
                    };

                    carouselTiles = $( carousels[ carouselName ].elem ).find( '> li:visible' );
                    carousels[ carouselName ].tileCount = carouselTiles.length;


                    carouselTiles.find('.btn-unavailable').off().on('mouseover',function(e){
                        $(this).parents('.venue-event-tile').find( '.' + tooltipContentClass ).show();
                    });

                    carouselTiles.find('.btn-unavailable').off().on('mouseout',function(e){
                        $(this).parents('.venue-event-tile').find( '.' + tooltipContentClass ).hide();
                    });



                    carouselConfig.tilesPerFrame = vpLookup[ carouselName ].small;

                    if ( !carousels[ carouselName ].carousel || !carousels[ carouselName ].carousel.state ) {
                        carouselInit = false;
                    }
                    else {
                        carouselInit = !$.isEmptyObject( carousels[ carouselName ].carousel.state );

                    }

                    tileTotal = carousels[ carouselName ].tileCount;

                    // Was a carousel and still is: update options
                    if ( carouselInit && carouselConfig.tilesPerFrame < tileTotal ) {

                        carousels[ carouselName ].carousel.updateOptions( {
                            tilesPerFrame: carouselConfig.tilesPerFrame
                        });

                    }

                    // Was NOT a carousel, but is now: init
                    else if ( !carouselInit && carouselConfig.tilesPerFrame < tileTotal ) {

                        carousels[ carouselName ].carousel = carousel.create( carouselConfig );
                    }

                    // Was a carousel, but is NOT now: destroy
                    else if ( carouselInit && carouselConfig.tilesPerFrame >= tileTotal ) {

                        carousels[ carouselName ].carousel.destroy();
                    }

                    else {
                        /*to add active class onclick if carousel is not created */

                        cacheEl.on('click', function(event){
                            //if(event.currentTarget.dataset.bookmarkJump !== 'yes'){
                            if(event.currentTarget.getAttribute('data-bookmark-jump') !== 'yes') {

                                if(cacheEl.hasClass('active')){
                                    cacheEl.removeClass('active');
                                }
                                $(this).addClass('active');
                            }

                        });

                    }
                }

            }
            /** call to buildBookmarkedCarousels function  BookmarkedCarousels#buildCarousels */
            this.buildCarousels = function() {

                buildBookmarkedCarousels( 'venueEvents' );
            };
        };

        var bookmarkedCarousels = new BookmarkedCarousels();

        return bookmarkedCarousels;
    }
);