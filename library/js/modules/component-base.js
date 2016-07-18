/** 
 *
 * @name component-base
 */

define(
    [
        'jquery'
    ],

    function(

        $

    ) {

        'use strict';

        var ComponentBase = function( ) {

            var componentElement = null
                , canAnimate = false
                ;

            this.enableAnimation = function() {

                if ( !canAnimate ) {

                    componentElement.removeClass( 'disable-transition' );
                }
            };

            this.init = function( element, childComponent ) {

                componentElement = element;

                childComponent.animate = childComponent.animate || this.animate;
                childComponent.animateCheck = this.animateCheck;
                childComponent.getElement = childComponent.getElement || this.getElement;
                childComponent.canAnimate = true;

                //  prerun and disable the animations on touch
                //  devices since they don't work well
                if ( !canAnimate ) {

                    componentElement
                        .addClass( 'disable-transition' )
                        .addClass( 'animate' );
                }
            };

            this.animateCheck = function( func ) {

                var animateFunc = function() { func(); }
                    , noAnimateFunc = function() {}
                    , returnFunc
                    ;

                if ( !canAnimate ) {

                    returnFunc = noAnimateFunc;

                }
                else {

                    returnFunc = animateFunc;
                }

                return returnFunc;
            };

            this.animate = function( ) {

                componentElement.addClass( 'animate' );
            };

            this.getElement = function( ) {

                return componentElement;
            };
        };

        ComponentBase.ComponentConstructorCreator = function( ChildComponentConstructor ) {

            return function( componentSelector ) {

                var components = $( componentSelector )
                    , hasComponent
                    , componentList = []
                    ;

                hasComponent = !!components.length;

                if ( hasComponent ) {

                    components.each( function() {

                        componentList.push( new ChildComponentConstructor( this ) );
                    } );
                }

                return componentList;
            };
        };

        return ComponentBase;
    }
);