/**
 *
 * @name components
 */
define(
    [
        'jquery',
        'modules/component-detail-links',
        'modules/component-venue-action'
    ],

    function(

        $,
        componentDetailLinks,
        venueAction

    ) { 

        /**@exports reloadInit*/
    
        'use strict';

        var components = [];


        var mediator = {

            /** to bind the UI funtions to the object
            * @method init
            * @returns {void}
            */
            init: function() {

                $( this.initUI.bind( this ) );
            },
            /** to bind the offCanvas UI funtions to the object
            * @method offCanvasInit
            * @returns {void}
            */
            offCanvasInit: function() {

                $( this.offcanvasInitUI.bind( this ) );
            },
            initUI: function() {

                var self = this;

                $.each( $( '[data-mgmapp-component]' ), function( index ) {

                    var fn
                        , functionName = $( this ).data( 'mgmapp-component' )
                        , className = '.' + $.trim( $( this ).attr( 'class' ) ).replace( /\s/g,'.' )
                        ;

                    fn = self[ functionName ].apply( self, [ className ] );

                    components = components.concat( fn );
                });


                this.components = components;
            },
            componentDetailLinks: function( elem ) { return componentDetailLinks( elem ); },

            venueAction: function( elem ) { return venueAction( elem ); }

        };
        /** to call the the initVideo and mediator.init method 
        * @method reloadInit
        * @returns {void}
        */
        function reloadInit(){
			require(['modules/video-details'],function(videoDetails) {
				videoDetails.initVideo();
			});            
            mediator.init();
        }
        
        return {
            reloadInit: reloadInit
        };
    }
);