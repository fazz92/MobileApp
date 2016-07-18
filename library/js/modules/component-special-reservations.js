/**
 * @desc create a special reservations component
 *
 * @name component-special-reservations
 */

define(
    [
        'jquery',
        'modules/component-base',
        'modules/canvas'
    ],

    function(

        $,
        ComponentBase,
        canvas

    ) {

        'use strict';
        /**
        *@exports ComponentSpecialReservations
        *@method ComponentSpecialReservations
        *@param {object} element - object on which the events are attached for video and virtual tour.
        */

        var ComponentSpecialReservations = function( element ) {

            var cObj = canvas();

            this.base = new ComponentBase();

            this.init = function( ) {

                var   timer
                    , btnRowWidth
                    , btnsWidth
                    , btnsMargin = 10
                    , vertClass = 'vert-layout'
                    , btnWrapper = $( '.special-reservations .buttons' )
                    , btnElems = btnWrapper.find( 'a' )
                    ;

                /** funtion to check the button type to decide which layout to be applied 
                *@method checkBtns
                */
                function checkBtns() {

                    clearTimeout( timer );

                    timer = setTimeout( function() {

                        btnRowWidth = btnWrapper.width();

                        btnsWidth = btnsMargin; //init btns width value with margin btwn them (not included in calc)

                        btnElems.each( function( index ) {

                            btnsWidth += $( this ).outerWidth();
                        });

                        // Buttons wider than row, apply vertical layout class
                        if ( btnsWidth > btnRowWidth || btnElems.length === 1 ) {

                            btnWrapper.addClass( vertClass );
                        }
                        // Otherwise, remove vertical layout class
                        else {

                            btnWrapper.removeClass( vertClass );
                        }
                    }, 200 );
                }

                $( document ).ready( checkBtns );
                $( window ).resize( checkBtns );

                this.base.init( $( element ), this );

                this.addVideoEvents();
                this.addVirtualTourEvents();

            };
            /** attach the events of video 
            *@method addVideoEvents
            */
            this.addVideoEvents = function() {

                var videoElement =  this.getElement().find( '[data-video]' )
                    , source = videoElement.data( 'video' )
                    , imageUrl = videoElement.data( 'server-url' )
                    , videoUrl = videoElement.data( 'video-server-url' )
                    , clickElements = this.getElement().find( '.play-icon, .img-wrapper ' )
                    ;

                clickElements.on( 'click.specialReservationVideo', function() {

                    cObj.openModal( source, {
                        media: 'video',
                        imageUrl: imageUrl,
                        videoUrl: videoUrl
                    } );
                });
            };
            /** attach the events of virtual tour  
            *@method addVirtualTourEvents
            */
            this.addVirtualTourEvents = function() {

                var vtElement = this.getElement().find( '[data-vturl]' )
                    , source = vtElement.data( 'vturl' )
                    , clickElements = this.getElement().find( '.vt-icon, .img-wrapper ' )
                    , clickRightLinks = this.getElement().find( '.additions-list a' )
                    , clickRightLinksSource
                    ;

                clickElements.on( 'click.specialReservationVT', function() {

                    cObj.openModal( source, {
                        media: 'virtual-tour'
                    } );
                });

                clickRightLinks.on( 'click.specialReservationVT', function( e ) {

                    clickRightLinksSource = $( this ).data( 'vturl' );

                    if ( clickRightLinksSource ) {

                        e.preventDefault();
                        cObj.openModal( clickRightLinksSource, {
                            media: 'virtual-tour'
                        } );
                    }
                });
            };

            this.init();
        };

        return ComponentBase.ComponentConstructorCreator( ComponentSpecialReservations );
    }
);