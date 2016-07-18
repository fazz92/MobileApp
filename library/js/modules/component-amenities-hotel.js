/*!
* @name component-amenities-hotel
* @desc This file contains the code for the component-amenities-hotel.
*
*/


define(
    [
        'jquery',
        'modules/component-base'

    ],

    function(

        $,
        ComponentBase

    ) {

        'use strict';

        /**
        * @exports ComponentAmenitiesTabs  
        * initalise and create the component amenities tabs
        * @method ComponentAmenitiesTabs
        * @param {object} element - element on which the different operations need to be performed .
        */
        
        var ComponentAmenitiesTabs = function( element ) {

            this.base = new ComponentBase();

            this.init = function( ) {

                this.base.init( $( element ), this );
                this.initiateAmenitiesTabs( $( element ) );

            };
            /**
            * initalise component amenities tabs add animation to the tabs by adding a class 
            * @method ComponentAmenitiesTabs
            * @param {object} ele - element on which the different operations need to be performed.
            */
            this.initiateAmenitiesTabs = function( ele ) {

                var tabsWrapper = ele
                    , tabsHref = ele.find( '.amenity-list-tabs li' )
                    , accordianWrapper = ele.find( '.amenity-list-accordian' )
                    , tabContent = ele.find( '.amenity-list-content' )
                    , nextLi
                    , index
                    ;

                if(!tabsWrapper.hasClass('with-tabs')){
                    return;
                }
                if( tabsHref && tabsHref.length > 0 && accordianWrapper && accordianWrapper.length > 0 && tabContent && tabContent.length > 0){

                    var addLiAnimation = function ( $element, index ){

                        setTimeout( function(){

                            $element.addClass('wp');

                        }, index*100);
                    };

                    // @FLAG: use on ('click' , function) instead | Brameshmadhav Srinivasan
                    tabsHref.click(function (e){
                        e.preventDefault();

                        index = tabsHref.index( $(this) );

                        if( !$(this).find('a').hasClass('active') ){
                            tabsHref.find('a').removeClass( 'active no-background' );
                            $(this).find('a').addClass( 'active' );

                            nextLi = $(this).next();

                            if(nextLi){
                                nextLi.find( 'a' ).addClass( 'no-background' );
                            }
                            tabContent.removeClass( 'shown' ).find('ul').removeClass('wp');

                            tabContent.eq(index).addClass( 'shown' ).find('ul').each(function(i,v){

                                addLiAnimation( $(v),i);

                            });
                        }

                        if( accordianWrapper.eq(index).hasClass('active')){
                            accordianWrapper.removeClass( 'active' );
                            tabContent.removeClass( 'shown' ).find('ul').removeClass('wp');
                        }
                        else if( !accordianWrapper.eq(index).hasClass('active')){
                            accordianWrapper.removeClass( 'active' ).eq(index).addClass( 'active' );
                            tabContent.removeClass( 'shown' ).find('ul').removeClass('wp');
                            tabContent.eq(index).addClass( 'shown' );
                        }

                    });

                    /*
                     * On mobile, clicking the first accordian anchor to show first tab list
                     */

                    // @FLAG: use on ('click' , function) instead | Brameshmadhav Srinivasan
                    accordianWrapper.click(function (e){

                        e.preventDefault();

                        index = accordianWrapper.index( $(this) );

                        tabsHref
                        .eq(index)
                        .trigger( 'click' );

                    });

                }

            };


            this.init();

        };

        return ComponentBase.ComponentConstructorCreator( ComponentAmenitiesTabs );

    }
);