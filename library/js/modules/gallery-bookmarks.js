/**
 * Create bookmarks for any carousel out of any unordered list of tiles.
 * It works only with incrementMode: 'tile'
 *
 * @example
 * SOURCE HTML BOOKMARKS STRUCTURE
 * <ul class="example-BOOKMARKS">
 *      <li data-bookmark="0"><img src="library/images/test-image-1.jpg" alt="" /></li>
 *      <li data-bookmark="1"><img src="library/images/test-image-2.jpg" alt="" /></li>
 *      <li data-bookmark="2"><img src="library/images/test-image-3.jpg" alt="" /></li>
 * </ul>

 * SOURCE HTML CAROUSEL STRUCTURE
 * <ul class="example-carousel">
 *      <li data-bookmark="0"><img src="library/images/test-image-1.jpg" alt="" /></li>
 *      <li data-bookmark="0"><img src="library/images/test-image-1.jpg" alt="" /></li>
 *      <li data-bookmark="0"><img src="library/images/test-image-1.jpg" alt="" /></li>
 *      <li data-bookmark="1"><img src="library/images/test-image-2.jpg" alt="" /></li>
 *      <li data-bookmark="1"><img src="library/images/test-image-2.jpg" alt="" /></li>
 *      <li data-bookmark="1"><img src="library/images/test-image-2.jpg" alt="" /></li>
 *      <li data-bookmark="2"><img src="library/images/test-image-3.jpg" alt="" /></li>
 * </ul>
 *
 * OPTIONS
 * On medium viewport and higher, there is the option to jump a set of bookmarks. If this is required modify the HTML by adding
 * data-bookmark-jump="yes" to the appropriate bookmark and the respective tiles in the carousel. If last frame needs to be skipped, the
 * carousel will jump to the first frame.
 *
 * @example
 * SOURCE HTML BOOKMARKS STRUCTURE
 * <ul class="example-BOOKMARKS">
 *      <li data-bookmark="0" data-bookmark-jump="0"><img src="library/images/test-image-1.jpg" alt="" /></li>
 *      <li data-bookmark="1" data-bookmark-jump="1"><img src="library/images/test-image-2.jpg" alt="" /></li>
 *      <li data-bookmark="2" data-bookmark-jump="yes"><img src="library/images/test-image-3.jpg" alt="" /></li>
 * </ul>

 * SOURCE HTML CAROUSEL STRUCTURE
 * <ul class="example-carousel">
 *      <li data-bookmark="0" data-bookmark-jump="0"><img src="library/images/test-image-1.jpg" alt="" /></li>
 *      <li data-bookmark="0" data-bookmark-jump="0"><img src="library/images/test-image-1.jpg" alt="" /></li>
 *      <li data-bookmark="0" data-bookmark-jump="0"><img src="library/images/test-image-1.jpg" alt="" /></li>
 *      <li data-bookmark="1" data-bookmark-jump="1"><img src="library/images/test-image-2.jpg" alt="" /></li>
 *      <li data-bookmark="1" data-bookmark-jump="1"><img src="library/images/test-image-2.jpg" alt="" /></li>
 *      <li data-bookmark="1" data-bookmark-jump="1"><img src="library/images/test-image-2.jpg" alt="" /></li>
 *      <li data-bookmark="2" data-bookmark-jump="yes"><img src="library/images/test-image-3.jpg" alt="" /></li>
 * </ul>
 *
 * @name carousel
 */
define(

    [
        'jquery',
        'vendor/carousel',
        'modules/pubsub'

    ],

    function(

        $,
        carousel,
        pubsub

    ) {

        'use strict';

        var pluginNS = 'bookmarks'
            , currentTiles = []
            , firstTile
            //, lastTileIndx
            , defaults = {
                bookmarkCarousel: null,
                contentCarousel: null
            }
            ;

        function CarouselsBookmarks( api, options ) {

            this.api = api;
            this.options = this.api.extend( {}, defaults, options );

            this.bookmarkCarousel = this.options.bookmarkCarousel;
            this.contentCarousel = this.options.contentCarousel;
            this.skipTiles = this.options.skipTiles;
            this.bookmarks = $( this.options.bookmarkCarousel ).find( ' > li' );
            this.lastBookmarkIndx = this.bookmarks.length - 1;

            this.init();

        }

        CarouselsBookmarks.prototype = {

            init: function() {

                var self = this
                    , bookmark = self.bookmarks
                    , lastTypeFrameSelector = ' > li' + '[data-bookmark=' + self.lastBookmarkIndx + '] '
                    , lastTypeFramesNum = $( self.options.bookmarkCarousel ).find( lastTypeFrameSelector ).length
                    ;

                self.api.subscribe(

                    this.api.ns + '/init/after',
                    function() {

                        firstTile = self.api.getState( 'index' );
                        currentTiles = self.api.getState( 'tileArr' );

                        self.updateBookmarksState( firstTile );

                    }

                );

                // Carousel subscribers
                self.api.subscribe(

                    this.api.ns + '/animate/after',
                    function() {

                        firstTile = self.api.getState( 'index' );
                        currentTiles = self.api.getState( 'tileArr' );

                        self.updateBookmarksState( firstTile );

                    }

                );
                // Update tileArr only if tiles are skipped or last month tiles are less than tiles per frame
                if ( self.skipTiles || self.api.getOption( 'tilesPerFrame' )  >  lastTypeFramesNum ) {

                    self.api.subscribe(

                        this.api.ns + '/buildFrames/before',
                        function() {

                            self.updateTiles( );

                        }

                    );

                }

                bookmark.click( $.proxy( self.clickHandler, self ) );

            },

            clickHandler: function( e ) {

                var self = this
                    , bookmarks = self.bookmarks
                    , target = $( e.currentTarget )
                    , isActive = ( target.hasClass( 'active' ) ) ? true : false
                    , currentIndx = target.attr( 'data-bookmark' )
                    ;


                if ( isActive ) {

                    return;

                } else {

                    bookmarks.removeClass( 'active' );
                    target.addClass( 'active' );
                    self.contentCarouselHandler( currentIndx );

                }

            },

            contentCarouselHandler: function( startTile ) {

                var self = this
                    , contentTiles = self.api.getState( 'tileArr' )
                    , currentTileIndex
                    ;

                function returnSelectedTile() {

                    for ( var i = 0; i < contentTiles.length; ++i ) {

                        if ( contentTiles[i].attributes[ 'data-bookmark' ].value !== startTile ) {
                            continue;
                        }

                        break;
                    }

                    return i;
                }

                currentTileIndex = returnSelectedTile();

                self.api.trigger( 'jumpToFrame', currentTileIndex );

            },

            updateBookmarksState: function( bookmarkPos ) {

                var self = this
                    , bookmarks = self.bookmarks
                    , activeMonth = currentTiles[ bookmarkPos ].attributes[ 'data-bookmark' ].value
                    , cacheEl = $( bookmarks[ activeMonth ] )
                    , currentMonthTotalSlide
                    , currentMonthSlide
                    ;

                bookmarks.removeClass( 'active' );
                if( cacheEl.data('bookmark-jump') !== 'yes' ) {
                    cacheEl.addClass( 'active' );
                }

                /* translate the carousel in mobile based on the shown month tile */

                pubsub( 'venueCalendar/jump' ).publish(activeMonth);

                currentMonthTotalSlide = cacheEl.data('bookmark-jump');

                currentMonthSlide = currentTiles[ bookmarkPos ].attributes[ 'data-current-month-index' ].value;

                if (currentMonthTotalSlide !== 'yes') {

                    $('.venue-events-section').find('.carousel-frame').html('<span>'+currentMonthSlide+'</span> / '+currentMonthTotalSlide);
                } else {

                    $('.venue-events-section').find('.carousel-frame').html(' <span> &nbsp; </span>');
                }


            },

            updateTiles: function( ) {

                var self = this
                    , visibleTiles = $( self.options.contentCarousel ).find( ' > li:visible' )
                    , lastTypeFrameSelector = ' > li' + '[data-bookmark=' + self.lastBookmarkIndx + '] '
                    , lastTypeFramesNum = $( self.options.contentCarousel ).find( lastTypeFrameSelector ).length
                    , missingTilesNum = self.api.getOption( 'tilesPerFrame' )  -  lastTypeFramesNum
                    , clones = []
                    , endEmptyTile = document.createElement( 'li' )
                    , updatedTiles = []
                    , updateObj
                    ;

                for( var i = 0; i < missingTilesNum; i++ ) {
                    clones.push( endEmptyTile );
                }

                updatedTiles = $.merge( $.merge( [], visibleTiles ), clones );

                updateObj = {
                    tileArr: updatedTiles
                };

                self.api.trigger( 'updateState', updateObj );

            }

        };

        carousel.plugin( pluginNS, function( options, api ) {

            new CarouselsBookmarks( options, api );

        });
    }
);