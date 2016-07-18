define(
    [
        'jquery',
        'modules/component-base',
        'modules/canvas',
        'modules/map-pinch-zoom'
    ],

    function(

        $,
        ComponentBase,
        canvas,
        mapPinchZoom

    ) {

        'use strict';

        var ComponentVenueAction = function( element ) {

            var cObj = canvas()
                , venueAction
                , venueActionLinks
                , source
                ;

            this.base = new ComponentBase();

            this.init = function( ) {

                this.base.init( $( element ), this );
                
                venueAction = this.getElement();
                venueActionLinks = venueAction.find( '.venue-action-links a[data-tiletype]' );
                this.addEventHandlers();
            };

            this.openMaps = function(address) {
				var destnAddr = encodeURI(address)
					, deviceOS
					, url;
				
				deviceOS = device.platform.toUpperCase();
				
				url = ( deviceOS === 'ANDROID' ) ? ( "https://maps.google.com/?daddr=" + destnAddr ) : ( ( device.platform.toUpperCase()  === 'IOS' )
						? ( "maps://maps.apple.com/?daddr=" + destnAddr ) : "" );
                
				if (navigator.notification) {
					navigator.notification.confirm('',
						function onConfirm(buttonIndex) {
							if (buttonIndex == 2) {
								window.location.href = url;
							}
						}, 
						MGMRI.mapsCTADetails.appDirectionHeadingCopy, // title
						[ MGMRI.mapsCTADetails.appNoCopy, MGMRI.mapsCTADetails.appYesCopy ] // button labels
					);
				} else {
					window.open(url, '_blank');
				}
				
            }

            this.addEventHandlers = function() {
                
                var self = this;

                venueActionLinks.off().on( 'click', function( e ){
  
                    var tiletype = $( this ).data( 'tiletype' );

                    if ( tiletype ) {

                        e.preventDefault();
                    }
                    
                    if ( tiletype === 'call' ) {

                        source = $( '.call-modal' );

                        cObj.openCanvas( source, 'top' ,function(){

                            $( '.off-canvas-container' ).on( 'click', '[data-action=close]', function( e ) {

                                cObj.closeCanvas();
                            });

                            cObj.openCurtain( );

                        },{customClass: 'curtain-enabled'});

                    } else if ( tiletype === 'map' ) {

                        source = $( '.map-modal' );

                        cObj.openModal( source, 'top' ,function(){

                            cObj.openCurtain();
                        });

                        mapPinchZoom.init();

                    } else if ( tiletype === 'direction' ) {

                        var address = $( this ).data( 'address' );

                        if ( address ){

                            self.openMaps( address );
                        }

                    } else if ( tiletype === 'offcanvas' ) {

                        var source = $( '[data-name='+ $( this ).data( 'canvas' ) +']' )
                            , offcanvasHeading= $( this ).data( 'heading' )
                            , offcanvasTitle= $( this ).data( 'title' )
                            , customClass = $( this ).data( 'custom-class' ) ? $( this ).data( 'custom-class' ) + ' full-page' : 'full-page'
                            ;

                        e.preventDefault();

                        cObj.openCanvas( source, 'left' ,function(){

                            $( '.off-canvas-container' ).on( 'click', '[data-action=close]', function( e ) {
                                cObj.closeCanvas();
                            });

                            //cObj.openCurtain();

                            if( source.find('[data-mgm-component]').length !== 0 ){

                                components.reloadOffCanvasInit( source );
                            }
                          
                        }, { customClass: customClass, heading:offcanvasHeading, title: offcanvasTitle });
                    }                    
                });
            };

            this.init();

        };

        return ComponentBase.ComponentConstructorCreator( ComponentVenueAction );

    }
);