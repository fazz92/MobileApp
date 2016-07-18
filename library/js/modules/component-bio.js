/**
 *
 * @name component-bio
 */


define(
    [
        'jquery',
        'modules/component-base',
        'modules/pubsub'
    ],

    function(

        $,
        ComponentBase,
        pubsub

    ) {

        'use strict';
        /**
        *@exports ComponentBio
        *@method ComponentBio
        *@param {object} element - object on which the events are attached for video and virtual tour.
        */

        var ComponentBio = function( element ) {

            var bioImage = null
                , bioContainer = null
                , bioImageContainer = null
                , bioQuote = null
                , bioInfo = null
                , navOffset = 0
                ;

            this.base = new ComponentBase();

            this.init = function( ) {

                this.base.init( $( element ), this );

                bioContainer = this.getElement();
                bioImageContainer = this.getElement().find( '.artist-img' );
                bioQuote = this.getElement().find( '.quote-signature' );
                bioInfo = this.getElement().find( '.addl-info' );

                $( window ).scroll( this.animateCheck( this.parallaxArtist.bind(this) ) );

                bioImage =  $( bioImageContainer ).find( 'img' )[0] || false;

                pubsub( 'componentEvents/navState' ).subscribe( function( state, navContainer ) {

                    if ( state === 'fixed' ) {

                        navOffset = 140;

                    }
                    else {

                        navOffset = 0;
                    }
                });
            };

            this.parallaxArtist = function() {

                if ( !bioImageContainer ) {

                    return;
                }

                var bodyOffset = ( document.documentElement && document.documentElement.scrollTop ) || document.body.scrollTop
                    , offset = bodyOffset - bioContainer.offset().top + navOffset
                    ;

                if ( offset < 0 ) {

                    $( bioImageContainer ).css( 'bottom', offset/2.6 + 'px' );

                    bioQuote.css( 'top', '' );
                    bioInfo.css( 'top', '' );

                }
                else {

                    $( bioImageContainer ).css( 'bottom', '0px' );
                    bioQuote.css( 'top', '' );
                    bioInfo.css( 'top', '' );
                }
            };

            

            this.init();

        };

        return ComponentBase.ComponentConstructorCreator( ComponentBio );
    }
);