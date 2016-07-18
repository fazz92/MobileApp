/**
 * @desc to populate the offcanvas for facilities whent that link is clicked 
 * @name component-facilities
 */
define(
    [
        'jquery',
        'modules/component-base',
        'modules/canvas',
    ],

    function(

        $,
        ComponentBase,
        canvas

    ) {

        'use strict';
        /**
        *@exports ComponentFacilities
        *@method ComponentFacilities
        *@param {object} element - object on which the events are attached.
        */
        var ComponentFacilities = function( element ) {

            var cObj = canvas();

            this.base = new ComponentBase();

            this.init = function( ) {

                this.base.init( $( element ), this );

                $( '.off-canvas-container' ).on( 'click', '[data-action=close]', function( e ) {

                    cObj.closeCanvas();
                });

                $( element ).find( '.view-room' ).on( 'click', function( e ) {

                    e.preventDefault();

                    // Get off-canvas content by AJAX (URL defined in inline data-href)
                    $.ajax( $( this ).attr( 'data-href' ), {

                        success: function( data ) {

                            cObj.openCanvas( data, 'left', function() {

                                //cObj.openCurtain();
                            }, { customClass: 'view-meeting' } );
                        }
                    });
                });
            };

            this.init();
        };

        return ComponentBase.ComponentConstructorCreator( ComponentFacilities );
    }
);