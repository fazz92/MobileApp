/**
* @name component-social-gallery
* @desc This file contains the code for the component-social-gallery.
*
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


        /** for creating social gallery by passing a object to component-base.js
        * @method ComponentSocialGallery
        * @param {object} element - this Object of ComponentConstructorCreator.
        */
        var ComponentSocialGallery = function( element ) {

            var cObj = canvas();

            this.base = new ComponentBase();
        /** init function to call the addVideoEvents function
        * @method init
        */
            this.init = function( ) {

                this.base.init( $( element ), this );

                this.addVideoEvents();
            };
        /**addVideoEvents function to attach different controls to video
        * @method addVideoEvents
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

            this.init();
        };

        return ComponentBase.ComponentConstructorCreator( ComponentSocialGallery );
    }
);