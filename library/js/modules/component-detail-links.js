/**
 * @desc to attach different event handlers on the detail links and to open and close the offcanvas on click of the detail links 
 * @name component-bio
 */
define(
    [
        'jquery',
        'modules/component-base',
        'modules/offcanvas-components',
        'modules/canvas',
        'modules/analytics-module'
    ],

    function(

        $,
        ComponentBase,
        components,
        canvas,
        analytics

    ) {

        'use strict';
        /**
        *@exports ComponentDetailsLink
        *@method ComponentDetailsLink
        *@param {object} element - object on which the events are attached.
        */
        var ComponentDetailsLink = function( element ) {

            var detailEle
                , detailEleLinks
                , cObj = canvas()
                ;

            this.base = new ComponentBase();

            this.init = function( ) {

                this.base.init( $( element ), this );

                detailEle = this.getElement();
                detailEleLinks = detailEle.find( 'a' );
                this.addEventHandlers();
            };

            this.addEventHandlers = function() {

                detailEleLinks.on( 'click', function( e ){
  
                    var source = $( '[data-name='+ $( this ).data( 'canvas' ) +']' )
                        , offcanvasHeading= $( this ).data( 'heading' )
                        , offcanvasTitle= $( this ).data( 'title' )
                        , customClass = $( this ).data( 'custom-class' ) ? $( this ).data( 'custom-class' ) + ' full-page' : 'full-page'
                        , analyticsData = {
                            'offcanvasTitle' : offcanvasTitle
                        };

                    e.preventDefault();

                    cObj.openCanvas( source, 'left' ,function(){

                        $( '.off-canvas-container' ).on( 'click', '[data-action=close]', function( e ) {
                            cObj.closeCanvas();
                        });

                        //cObj.openCurtain();

                        if( source.find('[data-mgm-component]').length !== 0 ){

                            components.reloadOffCanvasInit( source );
                        }

                        analytics.updateAnalytics( analyticsData, 'detailsOffcanvas' );
                      
                    }, { customClass: customClass, heading:offcanvasHeading, title: offcanvasTitle });
                  
                });
            };

            this.init();

        };

        return ComponentBase.ComponentConstructorCreator( ComponentDetailsLink );

    }
);