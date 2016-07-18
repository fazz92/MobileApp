define(

    [
        'vendor/carousel',
        'vendor/hammer'
    ],

    function(
        carousel,
        Hammer
    ) {

        'use strict';

        var hammerObj;
        var defaults = {};
        var pluginNS = 'touch';
        var pluginOn = false;

        /**
         * Constructor
         */
        function Touch( api, options ) {

            this.api = api;
            this.options = this.api.extend( {}, defaults, options );

            this.setup();
        }

        Touch.prototype = {

            setup: function() {

                var self = this;

                // Carousel subscribers
                this.api.subscribe(

                    this.api.ns + '/init/after',

                    function() {

                        var pluginAttr = self.api.getOption( pluginNS );
                        pluginOn = ( ( typeof pluginAttr === 'boolean' && pluginAttr === true ) || typeof pluginAttr === 'object' ) ? true : false;

                        // If plugin on, load local object and set up subscribers
                        if ( pluginOn ) {

                            self.carousel = {
                                dom: self.api.getState( 'dom' ),
                                touch: pluginOn
                            };

                            //new Hammer( self.carousel.dom.viewport, { dragLockToAxis: true }).on('release dragleft dragright swipeleft swiperight', self.handleTouch.bind( self ) );

                            if ( self.carousel.dom && self.carousel.dom.viewport ) {

                                hammerObj = new Hammer( self.carousel.dom.viewport, { dragLockToAxis: true, dragBlockHorizontal: true }).on( 'tap swipeleft swiperight', self.handleTouch.bind( self ) );
                            }
                        }
                    }
                );
            },

            handleTouch: function( ev ) {

                var self = this;

                self.api.trigger( 'cache', 'autorotate/stopRotation', true ); //stop autorotate on any listened for event

                switch( ev.type ) {

                    case 'dragright':
                    case 'dragleft':

                        // stick to the finger
                        var pane_offset = -( 100/pane_count ) * current_pane;
                        var drag_offset = ( ( 100 / pane_width ) * ev.gesture.deltaX ) / pane_count;

                        // slow down at the first and last pane
                        if ( (current_pane == 0 && ev.gesture.direction == 'right' ) ||
                            ( current_pane == pane_count-1 && ev.gesture.direction == 'left' ) ) {

                            drag_offset *= .4;
                        }

                        setContainerOffset( drag_offset + pane_offset );
                        break;

                    case 'swipeleft':

                        // disable browser scrolling
                        //ev.gesture.preventDefault();
                        self.api.trigger( 'nextFrame' );
                        //ev.gesture.stopDetect();
                        break;

                    case 'swiperight':

                        // disable browser scrolling
                        //ev.gesture.preventDefault();
                        self.api.trigger( 'prevFrame' );
                        //ev.gesture.stopDetect();
                        break;

                    case 'release':

                        // more then 50% moved, navigate
                        if ( Math.abs( ev.gesture.deltaX ) > pane_width/2 ) {

                            if ( ev.gesture.direction == 'right' ) {

                                self.api.trigger( 'prevFrame' );
                            }

                            else {

                                self.api.trigger( 'nextFrame' );
                            }
                        }

                        else {
                            self.showPane(current_pane, true);
                        }

                        break;
                }
            }
        };

        carousel.plugin( pluginNS, function( options, api ) {

            new Touch( options, api );
        });
    }
);