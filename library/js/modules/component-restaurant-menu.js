/**
 * @desc to populate the offcanvas with the returant menu in resturant details page
 * @name component-restaurant-menu
 */

define(
    [
        'jquery',
        'modules/canvas',
        'modules/component-base',
        'modules/pubsub'
    ],

    function(

        $,
        canvas,
        ComponentBase,
        pubsub

    ) {

        'use strict';
        /**
        *@exports ComponentRestaurantMenu
        *@method ComponentRestaurantMenu
        *@param {object} element - object on which the events are attached.
        */
        var ComponentRestaurantMenu = function( element ) {

            var self = this
                , canvasObj = canvas()
                , navOffset = 0
                , menuCloseHeight = 0
                ;

            this.base = new ComponentBase();

            this.init = function( ) {

                this.base.init( $( element ), this );

                //Menu Events
                this.getElement().find( '.menu-top-show-link' ).on( 'click', function() {

                    if ( !$( this ).hasClass( 'hidden' ) ) {

                        $( this ).addClass( 'hidden' );

                    }
                    else {

                        $( this ).removeClass( 'hidden' );
                    }
                });

                this.getElement().find( '.btn-more' ).on( 'click', function() {

                    var subMenu = self.getElement().find( '.menu-sub' );

                    if ( !$( this ).hasClass( 'selected' ) ) {

                        $( this ).addClass( 'selected' );
                        subMenu.css( 'max-height', 'none' );
                        subMenu.removeClass( 'hidden' );

                    }
                    else {

                        $( this ).removeClass( 'selected' );

                        if ( menuCloseHeight > 0 ) {

                            subMenu.css( 'max-height', '' + menuCloseHeight + 'px' );
                        }

                        subMenu.addClass( 'hidden' );

                        $( 'html, body' ).animate( {
                            scrollTop: self.getElement().offset().top - navOffset
                        }, 1000 );
                    }
                } );

                this.getElement().find( '.menu-top-list-item' ).on( 'click', function( e ) {

                    if ( e && e.preventDefault ) {

                        e.preventDefault();
                    }

                    var listItem = $( this )
                        , link = listItem.find( '.gold-link' )
                        ;

                    self.getElement().find( '.menu-top-list-item.selected' ).removeClass( 'selected' );

                    listItem.addClass( 'selected' );

                    self.swapMenus( link );
                });

                this.getElement().find( '.restaurant-menu-offcanvas .menu-sub-header' ).on( 'click', function() {

                    canvasObj.closeInnerCanvas();
                });

                this.getElement().find( '.view-all-container' ).on( 'click', function( e ) {

                    if ( e && e.preventDefault ) {

                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                    }

                    canvasObj.closeInnerCanvas();

                    $( 'html, body' ).animate( {
                        scrollTop: self.getElement().offset().top - navOffset
                    }, 1000 );

                    
                });

                pubsub( 'componentEvents/navState' ).subscribe( function( state, navContainer ) {

                    if ( state === 'fixed' ) {

                        navOffset = 160;

                    }
                    else {

                        navOffset = 0;
                    }
                });
            };

            this.viewAllMenus = function( ) {

                self.getElement().find( '.menu-top-show-link' ).removeClass( 'hidden' );

                $( 'html, body' ).animate( {
                    scrollTop: self.getElement().offset().top - navOffset
                }, 1000 );

            };

            this.swapMenus = function( link ) {

                var el = $( link )
                    , mainMenu = el.data( 'menu' )
                    , subMenu = el.data( 'menu-sub' )
                    , subMenuLi = el.parent()
                    , prevMenuLi = self.getElement().find( '.menu-top-list-item.active' )
                    , mainMenuEl = self.getElement().find( '.menu-sub-container[data-menu=' + mainMenu + ']' )
                    , prevMenuEl = self.getElement().find( '.menu-sub-container.active' )
                    , menuScrollWrapper = self.getElement().find( '.menu-sub-container.active' ).parents('.menu-scroll-wrapper')
                    , subMenuEl = self.getElement().find( '.menu-sub-list-container[data-menu-sub=' + subMenu + ']' )
                    , prevSubMenuEl = self.getElement().find( '.menu-sub-list-container.active' )
                    , offcanvasHeader = self.getElement().find( '.offcanvas-header' )
                    , nonOffcanvasHeader = subMenuEl.find( '.non-offcanvas-header' ).html()

                    ;


                if ( prevMenuLi !== subMenuLi ) {

                    prevMenuLi.removeClass( 'active' );
                    subMenuEl.addClass( 'active' );
                }

                //Switch menus if the selected menu isn't active
                if ( prevMenuEl !== mainMenuEl ) {

                    prevMenuEl.removeClass( 'active' );
                    mainMenuEl.addClass( 'active' );
                }

                if ( prevSubMenuEl !== subMenuEl ) {

                    prevSubMenuEl.removeClass( 'active' );
                    subMenuEl.addClass( 'active' );
                }


                canvasObj.openInnerCanvas( self.getElement().find( '.menu-sub' ), 'left' );
                menuScrollWrapper.css({'max-height':canvasObj.container.clientHeight - 100,'overflow-y':'auto'});
                offcanvasHeader.html( nonOffcanvasHeader );

            };

            this.getMenuRowCount = function( menuElement ) {

                var maxItemsPerRow = 3
                    , subHeaderCount = null
                    , menuLists = null
                    , menuRowCount = 0
                    ;

                //get the list of individual headers and descriptions excluding the pairs
                subHeaderCount = menuElement.find( '.menu-sub-item-header, menu-sub-item-description' ).length -
                                    menuElement.find( '.menu-sub-item-header + menu-sub-item-description' ).length;

                menuLists = menuElement.find( '.menu-sub-list' );

                $.each( menuLists, function() {

                    var list = $( this )
                        , parentEl = list.parent()
                        , menuItems = null
                        ;

                    if ( maxItemsPerRow > 1 ) {

                        while ( !parentEl.hasClass( 'menu-columns-1' ) &&
                                !parentEl.hasClass( 'menu-columns-2' ) &&
                                !parentEl.hasClass( 'menu-columns-3' ) &&
                                parentEl !== document.body ) {

                            parentEl = parentEl.parent();
                        }

                        if ( parentEl.hasClass( 'menu-columns-2' ) ) {

                            maxItemsPerRow = 2;

                        }
                        else if ( parentEl.hasClass( 'menu-columns-1' ) ) {

                            maxItemsPerRow = 1;
                        }
                    }

                    menuItems = list.find( '.menu-item' );

                    menuRowCount += Math.ceil( menuItems.length / maxItemsPerRow );
                });

                return menuRowCount + subHeaderCount;
            };

            this.init();
        };

        return ComponentBase.ComponentConstructorCreator( ComponentRestaurantMenu );
    }
);