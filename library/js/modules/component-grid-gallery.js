/**
 * @desc to create a grid gallery component 
 * @name component-grid-gallery
 */
define(
    [
        'jquery',
        'modules/component-base',
        'modules/canvas',
        'vendor/carousel',
        'vendor/carousel.pagination',
        'vendor/carousel.loop',
        'vendor/carousel.touch'
    ],

    function(

        $,
        ComponentBase,
        canvas,
        carousel,
        pagination,
        loop,
        touch

    ) {

        'use strict';
        /**
        *@exports ComponentGridGallery
        *@method ComponentGridGallery
        *@param {object} element - object on which the events are attached.
        */
        var ComponentGridGallery = function( element ) {

            this.base = new ComponentBase();

            this.init = function() {

                this.base.init( $( element ), this );

                carousel.create({
                    element: this.getElement().find( '#gallery-carousel' )[ 0 ],
                    tilesPerFrame: 1,
                    incrementMode: 'tile',
                    nextText: '',
                    prevText: '',
                    wrapControls: true,
                    pagination: {
                        center: true
                    },
                    autorotate: {
                        stopEvent: 'click'
                    },
                    loop: true
                });

            };

            this.init();
        };

        return ComponentBase.ComponentConstructorCreator( ComponentGridGallery );
    }
);