define(

    [
        'jquery',
        'vendor/carousel',
        'vendor/carousel.pagination',
        'vendor/carousel.touch',
        'modules/pubsub'
    ],

    function(

        $,
        carousel,
        pagination,
        touch,
        pubsub

    ) {

        var DetailsCarousels = function() {

            function buildCarousel( carouselName ) {
                var   carouselTiles
                    , tileTotal
                    , carouselInit
                    , carousels = {
                        tickets: {
                            elem: document.querySelector( '[data-crsl=tickets-gallery]' )
                        },
                        grid: {
                            elem: document.querySelector( '[data-crsl=grid-gallery]')
                        },
                        social: {
                            elem: document.querySelector( '[data-crsl=social-gallery]' )
                        },
                        venueCalendar: {
                            elem: document.querySelector( '[data-crsl=venue-calendar]' )
                        },
                        performanceCalendar: {
                            elem: document.querySelector( '[data-crsl=performance-calendar]' )
                        }
                    }
                    , gridTilesNum = $( '.grid-gallery > li' ).length
                    , vpLookup = {
                        tickets: {
                            small: 1,
                            'fixed-slim-nav': 3,
                            startIndex : 0
                        },
                        grid: {
                            small: 1,
                            'fixed-slim-nav': gridTilesNum,
                            startIndex : 0
                        },
                        social: {
                            small: 1,
                            'fixed-slim-nav': 3,
                            startIndex : 0
                        },
                        venueCalendar: {
                            small: 1,
                            'fixed-slim-nav': 6,
                            startIndex : 0
                        },
                        performanceCalendar: {
                            small: 1,
                            'fixed-slim-nav': 3,
                            startIndex : 0
                        }
                    }
                    ;

                var defaultConfig = {
                    tilesPerFrame: 1,
                    incrementMode: 'tile',
                    wrapperClass: '',
                    wrapControls: true,
                    accessible: false,
                    startIndex: 0,
                    prevText: '',
                    nextText: '',
                    pagination: {
                        center: false,
                        frameText: '<span>{pageNumber}</span> / {total}'
                    },
                    loop: false,
                    touch: true,
                    video: {
                        //class options
                        containerClass: 'video-wrapper',
                        splashClass: 'video-splash',
                        fadeInTime: 1,

                        //s7options
                        source_quality_list: {
                            desktop: '_1280x720_2000K' //16:9
                            ,
                            desktop_ogg: '_OGG_800x450_1200K'

                            ,
                            tablet_high: '_iPad_768x432_1200K',
                            tablet_low: '_Mobile_512x288_600K',
                            mobile_high: '_Mobile_512x288_600K',
                            mobile_low: '_Mobile_512x288_400K'
                        }
                    }
                };


                var carouselConfig
                    , jump;

                if( carousels[ carouselName ].elem ) {

                    carouselConfig = $.extend( {}, defaultConfig, { element: carousels[ carouselName ].elem } );
                    carouselConfig.wrapperClass = carouselName + '-carousel-wrapper';
                    carouselConfig.tilesPerFrame = vpLookup[ carouselName ].small;
                    carouselConfig.startIndex = vpLookup[ carouselName ].startIndex;

                    carouselTiles = $( carousels[ carouselName ].elem ).find( '> li' );
                    carousels[ carouselName ].tileCount = carouselTiles.length;


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

                    carouselTiles.find('.btn-unavailable').off().on('click',function(e){
                        $(this).parents('.btns-wrapper').find( '.tile-tooltip-content' ).toggle();
                    });


                }

                if ( carouselName === 'performanceCalendar' && carousels.performanceCalendar.carousel ) {

                    $('.'+carouselName+'-carousel-wrapper').find('.calendar-tile').find('span').on('click',function(){

                        $('.'+carouselName+'-carousel-wrapper').find('.nextFrame').trigger('click');

                    });

                    jump = parseInt((document.querySelector( '[data-performance-calendar-startIndex]' )!== null ) ? document.querySelector( '[data-performance-calendar-startIndex]' ).getAttribute('data-performance-calendar-startIndex') : 0 );

                    carousels.performanceCalendar.carousel.jumpToFrame(jump);

                }
                if ( carouselName === 'venueCalendar') {

                    pubsub( 'venueCalendar/jump' ).subscribe( function( jump ) {

                            carousels.venueCalendar.carousel.jumpToFrame(jump);
                        }
                    );

                }
            }

            this.buildCarousels = function(carousel_Name) {

                buildCarousel( carousel_Name );

            };
        };

        var detailsCarousels = new DetailsCarousels();

        return detailsCarousels;
    }
);
