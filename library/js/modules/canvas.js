/*!
* canvas.js
* This file contains the code for the canvas.
* 
* @project   MGM Grand MobileApp
* @author    SapientNitro 
* @licensor  MGM
* @site      MobileApp
*
*/



define(
    [
        'vendor/TweenLite',
        'modules/pubsub',
        'jquery'
    ],
    function(

        TweenLite,
        pubsub,
        $

    ) {

        'use strict';


        var   winState = {} //window State Object
            , doc = document
            , siteMaxWidth = 1440

            // DOM Elements
            , body = doc.querySelector( 'body' )
            , pageWrapper = doc.querySelector( '.wrapper' )
            , pageNav = doc.querySelector( '.nav-container' )
            , slimNav = doc.querySelector( '.slim-nav-container' )
            , slimNav2 = doc.querySelector( '.progress-bar' )
            , filterNav = doc.querySelector( '.section-wrapper.section-nav' )

            // Default Config Options
            , defaults = {
                customClass: '',
                transTime: 0.5 //seconds
            }

            // Component Class Selectors
            , modalCloseBtnClass = 'cta'
            , modalCloseWrapperClass = 'btn-close-wrapper'
            , offcanvasSelector = 'off-canvas-container'
            , curtainSelector = 'curtain-container'
            , modalSelector = 'modal-container'
            , offcanvasOpenClass = 'off-canvas-open'
            , offcanvasOpenedClass = 'off-canvas-opened'
            , curtainOpenClass = 'curtain-open'
            , curtainElemClass = 'curtain-elem'
            , modalOpenClass = 'modal-open'
            , mediaObject = false
            , modalCloseCallback = false
            ;

        /*
            UTILITIES
        */


        // function compHeight( element, parse ) {

        //     parse = ( typeof parse !== 'undefined' ) ? parse : false;

        //     var height = window.getComputedStyle( element ).getPropertyValue( 'height' );

        //     if ( parse ) {
        //         height = parseInt( height, 0 );
        //     }

        //     return height;
        // }

        /*
         * Simple method for extending multiple objects into one.
         *
         * @source http://stackoverflow.com/questions/11197247/javascript-equivalent-of-jquerys-extend-method/11197343#11197343
         */
        function extend() {

            var length = arguments.length;

            for ( var i = 1; i < length; i++ ) {

                for ( var key in arguments[ i ] ) {

                    if ( arguments[ i ].hasOwnProperty( key ) ) {

                        arguments[ 0 ][ key ] = arguments[ i ][ key ];
                    }
                }
            }

            return arguments[ 0 ];
        }

        // Using addEvent method for IE8 support
        // Polyfill created by John Resig: http://ejohn.org/projects/flexible-javascript-events
        function addEvent( obj, evt, fn, capture ) {

            if ( obj.addEventListener ) {

                if ( !capture ) {

                    capture = false;
                }

                obj.addEventListener( evt, fn, capture );

            }
            else if ( obj.attachEvent ) {

                obj[ 'e' + evt + fn ] = fn;
                obj[ evt + fn ] = function() { obj[ 'e' + evt + fn ]( window.event ); };
                obj.attachEvent( 'on' + evt, obj[ evt + fn ] );
            }
        }

        // Using removeEvent method for IE8 support
        // Polyfill created by John Resig: http://ejohn.org/projects/flexible-javascript-events
        function removeEvent( obj, evt, fn ) {

            if ( obj.removeEventListener ){

                obj.removeEventListener( evt, fn, false );
            }
            else if ( obj.detachEvent ) {

                obj.detachEvent( 'on' + evt, obj[ evt + fn ] );
                obj[ evt + fn ] = null;
            }
        }

        function getObjType( obj ) {

            return Object.prototype.toString.call( obj );
        }

        // Set multiple styles at once
        function setStyles( el, attrs ) {

            for ( var key in attrs ) {

                if ( attrs.hasOwnProperty( key ) ) {

                    el.style[ key ] = attrs[ key ];
                }
            }
        }

        // Returns true if o is a DOM element
        // Taken from: http://stackoverflow.com/a/384380
        function isElement( o ) {

            return (
                typeof HTMLElement === 'object' ? o instanceof HTMLElement : //DOM2
                o && typeof o === 'object' && o !== null && o.nodeType === 1 && typeof o.nodeName === 'string'
            );
        }

        function toggleClass( elem, elemClass, add ) {

            if ( typeof elem === 'undefined' || typeof elemClass === 'undefined' ) {
                return;
            }

            var classArr = elem.className.split(' ');
            var classIdx = classArr.indexOf( elemClass );

            // Element already has class, so remove unless add operation specified (add=true)
            if ( classIdx !== -1 && add !== true ) {

                classArr.splice( classIdx, 1 );
            }

            // Element doesn't have class, so add unless remove operation specified (add=false)
            else if ( classIdx === -1 && add !== false ) {

                classArr.push( elemClass );
            }

            elem.className = classArr.join(' ');
        }

        /*
            CANVAS CORE CODE
        */
        var core = {

            objSetup: false,

            setup: function( options ) {

                var scrollDiv, scrollbarWidth;
                var self = this;

                self.cacheObj = {};
                self.options = extend( {}, defaults, options );

                // Create bound version of functions which are used internally as event listeners
                self.funcs = {
                    updateWin: self.updateWin.bind( self ),
                    closeCanvas: self.closeCanvas.bind( self ),
                    closeCurtain: self.closeCurtain.bind( self ),
                    closeModal: self.closeModal.bind( self )
                };

                // Initiate component state object
                self.state = {
                    offcanvasOpen: false,
                    curtainOpen: false,
                    modalOpen: false
                };

                // Initiate timers
                self.timer = undefined;

                //Initiate store to save the target
                self.targetName = '';

                /*
                    Scrollbar detection
                */
                scrollDiv = document.createElement( 'div' );
                scrollDiv.className = 'scrollbar-measure';
                body.appendChild( scrollDiv );

                // Get the scrollbar width
                scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;

                // Delete the DIV
                body.removeChild( scrollDiv );

                self.doc = {
                    scrollbarWidth: scrollbarWidth
                };

                /*
                    Set up components
                */
                self.setupCanvas();

                self.setupCurtain();

                self.setupModal();

                // Init window state obj
                self.updateWin();

                addEvent( window, 'resize', self.funcs.updateWin );

                self.objSetup = true;

                return self;
            },

            setupCanvas: function() {

                var self = this;

                if ( !self.container ) {

                    self.container = doc.createElement( 'div' );
                    self.container.setAttribute( 'id', offcanvasSelector );
                    self.container.setAttribute( 'class', offcanvasSelector );

                    body.appendChild( self.container );
                }
            },

            setupCurtain: function() {

                var self = this;

                if ( !self.curtain ) {

                    self.curtain = doc.createElement( 'div' );
                    self.curtain.setAttribute( 'id', curtainSelector );
                    self.curtain.setAttribute( 'class', curtainSelector );

                    body.appendChild( self.curtain );
                }
            },

            setupModal: function() {

                var self = this;

                if ( !self.modal ) {

                    self.modal = doc.createElement( 'div' );
                    self.modal.setAttribute( 'id', modalSelector );
                    self.modal.setAttribute( 'class', modalSelector );

                    self.modal.closeWrapper = doc.createElement( 'div' );
                    self.modal.closeWrapper.setAttribute( 'class', modalCloseWrapperClass );
                    self.modal.closeBtn = doc.createElement( 'a' );
                    self.modal.closeBtn.setAttribute( 'href', '#' );
                    self.modal.closeBtn.innerHTML = 'Close';
                    self.modal.closeBtn.setAttribute( 'class', modalCloseBtnClass );

                    addEvent( self.modal.closeBtn, 'click', self.callbackCloseModal.bind( self ) );

                    self.modal.closeWrapper.appendChild( self.modal.closeBtn );
                    self.modal.appendChild( self.modal.closeWrapper );
                }
            },

            updateWin: function() {

                var self = this;

                clearTimeout( self.timer );

                self.timer = setTimeout( function() {

                    //if it's only a vertical resize ignore it for soft keyboards
                    if ( self.state.offcanvasOpen && ( winState && winState.width !== window.innerWidth )  ) {

                        self.closeCanvas();

                        pubsub('canvas/auto/close').publish();
                    }

                    if ( self.state.modalOpen && ( winState && winState.width !== window.innerWidth ) ) {

                        self.callbackCloseModal();
                    }

                    if ( self.state.curtainOpen && ( winState && winState.width !== window.innerWidth ) ) {

                        self.closeCurtain();
                    }

                    // Update window state object
                    winState = {
                        width: window.innerWidth,
                        height: window.innerHeight
                    };

                    // Keep curtain dimens in synch with window's
                    setStyles( self.curtain, {
                        width: winState.width + 'px',
                        height: '100%'
                    });

                }, 200 );
            },

            cache: function( key, value ) {

                var   cache = this.cacheObj
                    , query = cache[ key ] !== 'undefined' ? cache[ key ] : undefined
                    ;

                if ( typeof value === 'undefined' ) {
                    return query;
                }

                cache[ key ] = value;

                return cache;
            },

            parseContent: function( content, component ) {

                var   newElem
                    , pNode
                    , self = this
                    , scopePrefix = 'parseContent/' + component
                    ;

                // If jQuery object passed, convert to regular HTML element
                if ( content instanceof $ ) {

                    content = content[ 0 ];
                }

                // Type of content passed
                // HTML Element: remove elem from DOM and insert into off-canvas container
                if ( isElement( content ) ) {

                    pNode = content.parentNode;

                    // Element is in DOM tree, so cache elements for later re-insertion
                    if ( pNode ) {

                        self.cache( scopePrefix + '/parentNode', pNode ); //store parentNode of passed element for close method
                        self.cache( scopePrefix + '/elem', content );

                        // If content element has siblings, find its next sibling
                        if ( pNode.children.length > 1 ) {

                            for ( var i = 0; i < pNode.children.length; i++ ) {

                                // If this is the content node and it's not the last child,
                                // cache its next sibling as a reference for its later re-insertion into DOM
                                if ( pNode.children[ i ].isEqualNode( content ) && i !== pNode.children.length - 1 ) {

                                    self.cache( scopePrefix + '/siblingNode', pNode.children[ i + 1 ] );

                                    break;
                                }
                            }
                        }

                        pNode.removeChild( content ); //pop element out of DOM
                    }

                    newElem = content; //set equal to element getting appended to container below

                    return newElem;
                }
                // HTML String
                else if ( getObjType( content ) === '[object String]' ) {

                    newElem = doc.createElement( 'div' );
                    newElem.insertAdjacentHTML( 'afterbegin', content ); //parses HTML and inserts in newElem

                    return newElem;

                }
                // Unsupported type, so exit
                else {

                    return false;
                }
            },

            // Creates media modal content.
            // Modal Examples:
            // Video
            // cObj.openModal('MGM/Author1',{media:'video', videoUrl:'http://s7d2.scene7.com/is/content/', imageUrl:'http://s7d2.scene7.com/is/image/'});
            // Image
            // cObj.openModal('http://placehold.it/400x400',{media:'image'});
            // Virtual Tour
            // cObj.openModal('http://www.motion-vr.net/mgmgrand/tour.aspx?tn=1710',{media:'virtual-tour'});
            createMediaContent: function( options, source ) {

                var mediaElement
                    , videoObject
                    , mediaParent  = $( '<div class="media-parent"></div>' )
                    ;

                if ( mediaObject ) {

                    this.destroyMediaContent( mediaObject );
                }

                mediaObject = {};

                switch( options.media ) {

                case 'mixed-media':

                    mediaElement = source;

                    break;

                case 'image':

                    mediaElement = $( '<img src="' + source + '" />' );

                    break;

                case 'virtual-tour':

                    mediaElement = $( '<iframe src="'+ source +'"/>');

                    break;

                case 'video':
					require(['modules/video-manager'],function(videoManager) {
						videoObject = videoManager.loadVideo( {
							source: source,
							videoUrl: options.videoUrl,
							imageUrl: options.imageUrl,
							onPlayerInit: function() {
							
								videoObject.play();
							}
						});

						mediaElement = videoObject.videoElement;
						mediaObject.videoObject = videoObject;
						
						pubsub( 'canvas/video/async' ).publish( mediaElement );
					});
                    break;

                default:

                    mediaElement = $( '<div></div>' );

                    break;

                }

                mediaParent.addClass( options.media );		
				
                if( mediaElement ){
					mediaParent.append( mediaElement );
				}
				
				pubsub( 'canvas/video/async' ).subscribe(function(value){
					mediaParent.append( mediaElement );
				});
				
                mediaObject.options = options;
                mediaObject.element = mediaParent[ 0 ];
				
                return mediaObject;
            },

            destroyMediaContent: function() {

                if ( mediaObject !== false ) {

                    switch( mediaObject.options.media ) {

                    case 'video':

                        if ( mediaObject.videoObject && !!mediaObject.videoObject.remove ) {

                            mediaObject.videoObject.remove();
                        }

                        break;
                    }
                }

                mediaObject = false;
            },

            stopPropagation: function( event ) {

                event.stopPropagation();
                event.stopImmediatePropagation();

                return false;
            },

            replaceElem: function( component, elemHidden ) {

                var   self = this
                    , scopePrefix = 'parseContent/' + component
                    , elem = self.cache( scopePrefix + '/elem' )
                    , pNode = self.cache( scopePrefix + '/parentNode' )
                    , siblingNode = self.cache( scopePrefix + '/siblingNode' )
                    ;

                function resetCache() {

                    self.cache( scopePrefix + '/elem', 'undefined' );
                    self.cache( scopePrefix + '/parentNode', 'undefined' );
                    self.cache( scopePrefix + '/siblingNode', 'undefined' );
                }

                if ( !elem || !pNode ) {

                    resetCache();
                    return;
                }

                // Sibling node defined and is contained w/i parent node
                if ( siblingNode && $.contains( pNode, siblingNode ) ) {

                    pNode.insertBefore( elem, siblingNode );

                }
                else {

                    pNode.appendChild( elem );
                }

                if ( elemHidden ) {

                    elem.style.display = 'none';

                }
                else {

                    elem.style.display = '';
                }

                resetCache();
            },

            movePage: function( dest ) {

                var tweenOptions
                    , navMargin
                    , navDest
                    , self = this
                    , thisNav = ( pageNav ) ? pageNav : slimNav
                    , navPos = window.getComputedStyle( thisNav ).getPropertyValue( 'position' )
                    , dir = self.cache( 'openCanvas/dir' )
                    ;

                dest = '-' + dest;

                function postAnimCB() {

                    if ( pageWrapper.style.zIndex === '0' ) {

                        pageWrapper.style.zIndex = 'inherit'; //needed to override z-index set by CSSPlugin (TweenLite)
                    }
                }

                if ( pageNav ) {

                    self.cache( 'movePage/navPos', navPos );
                }

                if ( $( filterNav ).hasClass( 'fixed' ) ) {

                    if ( winState.width > siteMaxWidth ) {

                        navMargin = ( winState.width - siteMaxWidth ) / 2;

                        if ( parseInt( dest, 0 ) >= 0 ) {

                            navDest = parseInt( dest, 0 ) - navMargin;
                        }
                        else {

                            navDest = parseInt( dest, 0 ) + navMargin;
                        }

                    }
                    else {

                        navDest = dest;
                    }

                    TweenLite.to( filterNav, self.options.transTime, { left: navDest, ease: Quad.easeOut } );

                    self.cache( 'movePage/filterNav', true );
                }

                tweenOptions = { position: 'relative', ease: Quad.easeOut, onComplete: postAnimCB };

                if ( dir === 'left' ) {

                    tweenOptions.left = dest;

                }
                else {

                    tweenOptions.right = dest;
                }

                TweenLite.to( pageWrapper, self.options.transTime, tweenOptions );

                self.cache( 'movePage/pageMoved', true );
                pubsub( '/canvas/open' ).publish( true, self.options.transTime, dest );
            },

            resetPage: function() {

                var   self = this
                    , navPos = self.cache( 'movePage/navPos' )
                    , dir = self.cache( 'openCanvas/dir' )
                    , tweenOptions
                    , filterNavMoved = self.cache( 'movePage/filterNav' )
                    ;

                function postAnimCB() {

                    if ( slimNav ) {

                        if ( navPos === 'fixed' ) {

                            slimNav.style.position = 'fixed';

                            setStyles( slimNav2, {
                                width: '',
                                marginLeft: '',
                                position: ''
                            });
                        }
                    }

                    setStyles( pageWrapper, {
                        zIndex: '',
                        position: '',
                        left: '',
                        right: ''
                    });

                    if ( filterNavMoved ) {

                        setStyles( filterNav, {
                            width: '',
                            left: ''
                        });
                    }

                    self.cache( 'movePage/pageMoved', 'undefined' );
                    self.cache( 'movePage/navPos', 'undefined' );
                    self.cache( 'movePage/filterNav', 'undefined' );
                }

                if ( filterNavMoved ) {

                    TweenLite.to( filterNav, self.options.transTime, { left: 0, ease: Quad.easeIn } );
                }

                tweenOptions = { left: 0, ease: Quad.easeIn, onComplete: postAnimCB };

                if ( dir === 'left' ) {

                    tweenOptions.left = 0;

                }
                else {

                    tweenOptions.right = 0;
                }

                TweenLite.to( pageWrapper, self.options.transTime, tweenOptions );

                pubsub( '/canvas/open' ).publish( false, self.options.transTime );
            },

            openModal: function( content, optsObj ) {

                if ( this.state.modalOpen || typeof content === 'undefined' ) {

                    return;
                }

                var   modalChildren
                    , self = this
                    , curtain = self.curtain
                    , modal = self.modal
                    , options = extend( {}, self.options ) //create local instance of options object
                    , mediaElement = null
                    ;

                // Options object provided
                if ( optsObj && getObjType( optsObj ) === '[object Object]' ) {

                    extend( options, optsObj ); //extend locally created options object
                }

                if ( options.curtainClose || !!options.media ) {

                    addEvent( curtain, 'click', self.callbackCloseModal.bind( self ) );
                    addEvent( modal, 'click', self.stopPropagation );
                }

                if ( options.onDefaultClose && typeof options.onDefaultClose  === 'function' ) {

                    modalCloseCallback = options.onDefaultClose;

                }
                else {

                    modalCloseCallback = false;
                }

                if ( !!options.media ) {

                    mediaObject = self.createMediaContent( options, content );

                    mediaElement = mediaObject.element;

                    if ( !options.customClass.length ) {

                        options.customClass = '';
                    }

                    options.customClass += 'modal-media-container';
                }

                // Parse passed content
                var newElem = mediaElement || self.parseContent( content, 'modal' );

                if ( newElem && isElement( newElem ) ) {

                    modalChildren = modal.children;

                    // Clean out container, except for close button
                    for ( var i = modalChildren.length - 1; i > 0; i-- ) {

                        modal.removeChild( modalChildren[ i ] );
                    }

                    // If custom class defined, add it to container
                    if ( options.customClass.length > 0 ) {

                        modal.className += ' ' + options.customClass;
                    }

                    // Append HTML
                    modal.appendChild( newElem );
                    curtain.appendChild( modal );

                    if ( options.curtainClass ) {

                        curtain.className += ' ' + options.curtainClass;
                    }

                    // Add open modal class
                    toggleClass( doc.documentElement, modalOpenClass, true );

                    self.state.modalOpen = true;
                }

                pubsub( 'canvas/enforceFocus' ).publish( $(modal) );
            },

            callbackCloseModal: function( e ) {
                
                if( e ) {
                    e.preventDefault();
                } 

                if ( !!modalCloseCallback ) {

                    modalCloseCallback();
                }

                this.closeModal();
            },

            closeModal: function() {

                pubsub( 'canvas/enforceFocus/off' ).publish();

                if ( !this.state.modalOpen ) {
                    return;
                }

                this.destroyMediaContent();

                var   self = this
                    , curtain = self.curtain
                    , modal = self.modal
                    ;

                removeEvent( curtain, 'click', self.callbackCloseModal.bind( self ) );
                removeEvent( modal, 'click', self.stopPropagation );

                // Reset container class
                modal.className = modalSelector;

                // Reset curtain class
                curtain.className = curtainSelector;

                modal.style.maxHeight = '';

                // Remove open modal class
                toggleClass( doc.documentElement, modalOpenClass, false );

                curtain.removeChild( modal );

                // If DOM node was removed, put it back
                self.replaceElem( 'modal' );

                self.state.modalOpen = false;
            },

            openCanvas: function( content, dir, callback, optsObj ) {

                // Only run code if content passed and off-canvas container not already on screen
                if ( typeof content === 'undefined' || this.state.offcanvasOpen ) {

                    return;
                }

                var   dest
                    , newElem
                    , contentWidth
                    , self = this
                    , container = self.container
                    , options = extend( {}, self.options ) //create local instance of options object
                    , scrollContainer
					;

                function postAnimCB() {

                    self.state.offcanvasOpen = true;

                    setTimeout(function(){
                        toggleClass( doc.documentElement, offcanvasOpenedClass, true );
                    },self.options.transTime);

                    if ( callback && getObjType( callback ) === '[object Function]' ) {

                        callback();
                    }
                }
				
				scrollContainer = document.createElement( 'div' );
				scrollContainer.className = 'scrollContainer';
				
                // Parse passed content
                newElem = self.parseContent( content, 'canvas' );

                if ( optsObj && optsObj.heading && optsObj.title ) {

                    var titleWrapper = document.createElement( 'div' );
                    titleWrapper.className = 'offcanvas-detail-header';

                    var headButton = document.createElement( 'div' );
                    headButton.className = 'offcanvas-header-btn';
                    headButton.setAttribute('data-action', 'close');

                    var anchor = document.createElement( 'span' );
                    anchor.className = 'icon-arrow-back-black';
                    headButton.appendChild(anchor);

                    titleWrapper.appendChild(headButton);

                    var headerHeading = document.createElement( 'div' );
                    headerHeading.className = 'header-hdng';

                    var heading = document.createElement( 'h6' );
                    var t=document.createTextNode(optsObj.heading );
                    heading.appendChild(t);

                    var title=document.createElement( 'h3' );
                    var a=document.createTextNode(optsObj.title );
                    title.appendChild(a);

                    headerHeading.appendChild(heading);
                    headerHeading.appendChild(title);

                    titleWrapper.appendChild(headerHeading);

                    if( $( container ).find('.offcanvas-detail-header').length === 0 ){

                        container.appendChild( titleWrapper );						
                    }
                    
                }else{
					scrollContainer.classList.add('scroll-page');
				}

                // Only run code if valid element returned
                if ( !newElem || !isElement( newElem ) ) {

                    return;
                }

                // Options object provided
                if (
                    ( optsObj && getObjType( optsObj ) === '[object Object]' ) ||
                    ( callback && getObjType( callback ) === '[object Object]' )
                ) {

                    optsObj = ( optsObj && getObjType( optsObj ) === '[object Object]' ) ? optsObj : callback;
                    extend( options, optsObj ); //extend locally created options object
                }

                // Turn on display with visibility hidden in order to keep object hidden but accessible for below measurements
                container.style.display = 'block';

                // If custom class defined, add it to container
                if ( options.customClass.length > 0 ) {

                    container.className += ' ' + options.customClass;
                }
                
				
                // Append HTML element to scroll container
                scrollContainer.appendChild( newElem );
				
				//Append the scroll container to the off-canvas container
				container.appendChild(scrollContainer);
				
                // If new content is hidden, unhide it
                if ( window.getComputedStyle( newElem ).getPropertyValue( 'display' ) === 'none' ) {

                    var hidden = ( newElem.style.display === 'none' );

                    newElem.style.display = 'block';

                    self.cache( 'openCanvas/elemHidden', hidden );
                }


                contentWidth = winState.width;

                self.cache( 'window/scrollPos', window.pageYOffset );  //save window scroll position
                
                // If scrollbar present, add its width to container's
                // if ( self.doc.scrollbarWidth ) {

                //     contentWidth += self.doc.scrollbarWidth;
                // }

                // Transition Direction
                if ( dir === 'left' ) { //canvas comes in from right, traveling left

                    container.style.left = '100%';
                    container.style.top = '0';
                    dest = winState.width - contentWidth + 'px';

                }
                else if ( dir === 'top' ) {
                    var contentHeight = newElem.getBoundingClientRect();
                    container.style.top = '100%';
                    container.style.left = '0';
                    dest = winState.height - contentHeight.height + 'px';
                }
				else if ( dir === 'topZero'){
					container.style.top = '100%';
                    container.style.left = '0';
					dest = '0px';	
				}
                else { //canvas comes in from left, traveling right

                    container.style.left = '-100%';
                    container.style.top = '0';
                    dest = 0;
                }

                self.cache( 'openCanvas/dir', dir );

                // Add open canvas class
                toggleClass( doc.documentElement, offcanvasOpenClass, true );


                container.scrollTop = 0; //reset any prior scrolling
                
                if ( dir === 'top' || dir === 'topZero' ) {
                    TweenLite.to( container, self.options.transTime, { top: dest, ease: Quad.easeOut, onComplete: postAnimCB } );
                }
                else {
                    TweenLite.to( container, self.options.transTime, { left: dest, ease: Quad.easeOut, onComplete: postAnimCB } );
                }
                
            },

            openInnerCanvas: function( content, dir, callback, optsObj ) {

                var   dest
                    , newElem
                    , self = this
                    , container
                    , innerOffcanvasSelector = 'off-canvas-container multiOffCanvas'
                    ;

                container = doc.createElement( 'div' );
                container.setAttribute( 'id', innerOffcanvasSelector );
                container.setAttribute( 'class', innerOffcanvasSelector + ' tournament-offcanvas' );

                // Parse passed content
                newElem = self.parseContent( content, 'innercanvas' );

                self.cache( 'openInnerCanvas/dir', dir );

                if ( callback && getObjType( callback ) === '[object Function]' ) {

                    callback();
                }

                // Only run code if valid element returned
                if ( !newElem || !isElement( newElem ) ) {

                    return;
                }

                // Turn on display with visibility hidden in order to keep object hidden but accessible for below measurements
                container.style.display = 'block';

                // Append HTML element to off-canvas container
                container.appendChild( newElem );
                body.appendChild( container );

                // Transition Direction
                if ( dir === 'left' ) { //canvas comes in from right, traveling left

                    container.style.left = '100%';
                    container.style.top = '0';
                    dest = '0px';

                }

                function postAnimCB() {

                    setTimeout(function(){
                        toggleClass( doc.documentElement, offcanvasOpenedClass, true );
                    },self.options.transTime);
                }

                container.scrollTop = 0; //reset any prior scrolling

                TweenLite.to( container, self.options.transTime, { left: dest, ease: Quad.easeOut, onComplete: postAnimCB } );

            },

            closeCanvas: function( callback ) {

                var   dest
                    , self = this
                    , container = self.container
                    , elemHidden = self.cache( 'openCanvas/elemHidden' )
                    , dir = self.cache( 'openCanvas/dir' )
                    , scrollPos = self.cache( 'window/scrollPos' )
                    ;

                $( pageWrapper ).show();

                toggleClass( doc.documentElement, offcanvasOpenedClass, false );

                function postAnimCB() {

                    // Clean out container
                    while ( container.firstChild ) {

                        container.removeChild( container.firstChild );
                    }

                    // Remove open canvas class
                    toggleClass( doc.documentElement, offcanvasOpenClass, false );

                    // If DOM node was removed, put it back
                    self.replaceElem( 'canvas', elemHidden );

                    // Reset container class
                    container.className = offcanvasSelector;

                    // Reset element styles
                    setStyles( container, {
                        display: '',
                        left: '',
                        top: ''
                    });

                    // Close curtain if it's open
                    if ( self.state.curtainOpen ) {

                        self.closeCurtain();
                    }

                    if ( scrollPos ) {

                        window.scrollTo( 0, scrollPos );
                    }

                    self.cache( 'window/scrollPos', 'undefined' );

                    // Reset cache
                    self.cache( 'openCanvas/elemHidden', 'undefined' );
                    self.cache( 'openCanvas/dir', 'undefined' );

                    if ( callback && getObjType( callback ) === '[object Function]' ) {

                        callback();
                    }

                    self.state.offcanvasOpen = false;
                }

                // Only run code if off-canvas container is on screen
                if ( self.state.offcanvasOpen ) {

                    if ( dir !== 'top' && dir !== 'topZero') {

                        dest = ( dir === 'left' ) ? '100%' : '-100%';
                        TweenLite.to( container, self.options.transTime, { left: dest, ease: Quad.easeIn, onComplete: postAnimCB } );

                    }
                    else {

                        dest = '100%';
                        TweenLite.to( container, self.options.transTime, { top: dest, ease: Quad.easeIn, onComplete: postAnimCB } );

                    }    
                }
            },

            closeInnerCanvas: function( callback ) {

                var   dest = '100%'
                    , self = this
                    , elemHidden = self.cache( 'openInnerCanvas/elemHidden' )
                    , container = $( '.multiOffCanvas' )
                    ;

                // If DOM node was removed, put it back
                self.replaceElem( 'innercanvas', elemHidden );
                // Reset cache
                self.cache( 'openInnerCanvas/elemHidden', 'undefined' );
                self.cache( 'openInnerCanvas/dir', 'undefined' );

                toggleClass( doc.documentElement, offcanvasOpenedClass, false );

                function postInnerClose(){
                    
                    container.remove();
                }
                TweenLite.to( container, self.options.transTime, { left: dest, ease: Quad.easeIn, onComplete: postInnerClose  });

            },

            openCurtain: function( elems, customElemClass, optsObj ) {

                var   leftDiff
                    , elemClass
                    , self = this
                    , curtain = self.curtain
                    , elemData = []
                    , options = extend( {}, self.options ) //create local instance of options object
                    ;

                function posElem( elem ) {

                    elemClass = curtainElemClass;

                    if ( getObjType( customElemClass ) === '[object String]' && customElemClass.length > 0 ) {

                        elemClass += ' ' + customElemClass;

                        self.cache( 'openCurtain/customElemClass', customElemClass );
                    }

                    // Pop element above curtain
                    elem.className += ' ' + elemClass;

                    // Store current element, so it can be restored on close
                    elemData.push( elem );
                }

                // Options object provided
                if (
                    ( optsObj && getObjType( optsObj ) === '[object Object]' ) ||
                    ( customElemClass && getObjType( customElemClass ) === '[object Object]' )
                ) {

                    optsObj = ( optsObj && getObjType( optsObj ) === '[object Object]' ) ? optsObj : customElemClass;
                    extend( options, optsObj ); //extend locally created options object
                }

                // Elements data passed, pull them above curtain
                if ( typeof elems !== 'undefined' ) {

                    // Single element
                    if ( isElement( elems ) ) {

                        self.cache( 'openCurtain/elems', elems );

                        posElem( elems );

                        if ( elems.offsetLeft !== elems.parentNode.offsetLeft ) {

                            if ( elems.offsetLeft > elems.parentNode.offsetLeft ) {

                                leftDiff = elems.offsetLeft - elems.parentNode.offsetLeft;
                            }

                            elems.style.marginLeft = '-' + leftDiff + 'px';
                        }
                    }
                    // Elements array
                    else if ( getObjType( elems ) === '[object Array]' && elems.length > 0 ) {

                        self.cache( 'openCurtain/elems', elems );

                        for ( var i = 0; i < elems.length; i++ ) {

                            // Make sure this is a valid element
                            if ( isElement( elems[ i ] ) ) {

                                posElem( elems[ i ] );
                            }
                        }
                    }

                    // Cache element data for closeCurtain function
                    self.cache( 'openCurtain/elemData', elemData );
                }

                // If custom class defined, add it to container
                if ( options.customClass.length > 0 ) {

                    curtain.className += ' ' + options.customClass;
                }

                // Add open curtain class
                toggleClass( doc.documentElement, curtainOpenClass, true );

                //TweenLite.to( curtain, self.options.transTime, { className:'+=trans-white', ease:Quad.easeOut } );

                // If curtainClose set to true or undefined (default), add close event listener
                if ( options.curtainClose || typeof options.curtainClose === 'undefined' ) {

                    addEvent( curtain, 'click', self.funcs.closeCurtain );
                }

                self.state.curtainOpen = true;
            },

            closeCurtain: function() {
                var self = this
                    , curtain = self.curtain
                    , elemData = self.cache( 'openCurtain/elemData' )
                    , customElemClass = self.cache( 'openCurtain/customElemClass' )
                    ;

                // If off-canvas open, close it and reset affected elements' style
                if ( self.state.offcanvasOpen ) {

                    self.closeCanvas( function() {

                        self.resetPage();

                        self.closeCurtain();
                    });

                    return;
                }

                // If elements popped above curtain, reset them
                if ( elemData ) {

                    // Reset popped elements styling
                    for ( var i = 0; i < elemData.length; i++ ) {

                        toggleClass( elemData[ i ], curtainElemClass, false );

                        if ( customElemClass ) {

                            toggleClass( elemData[ i ], customElemClass, false );
                        }

                        elemData[ i ].style.marginLeft = '';
                    }
                }

                //TweenLite.to( curtain, self.options.transTime, { className:'-=trans-white', ease:Quad.easeIn } );

                // Reset container class
                curtain.className = curtainSelector;

                // Remove open curtain class
                toggleClass( doc.documentElement, curtainOpenClass, false );

                removeEvent( curtain, 'click', self.funcs.closeCurtain );

                // Clear cache
                self.cache( 'openCurtain/elemData', 'undefined' );
                self.cache( 'openCurtain/customElemClass', 'undefined' );

                self.state.curtainOpen = false;
            }
        };

        /**
         * bootstrap modal popup implimenation
         */
        pubsub( 'canvas/enforceFocus' ).subscribe( function ( modal ) {

            $( document )
                .off( 'focusin.canvas.modal' ) // guard against infinite focus loop
                .on( 'focusin.canvas.modal', function ( e ) {

                    if ( modal[ 0 ] !== e.target && !modal.has( e.target ).length ) {

                        modal.attr( 'tabindex', '-1' );
                        modal.focus();
                    }
                } );
        } );

        pubsub( 'canvas/enforceFocus/off' ).subscribe( function() {

            $( document ).off( 'focusin.canvas.modal' );
        } );

        return function( options ) {

            // If setup function already ran, return reference to core object
            if ( core.objSetup ) {

                return core;
            }
            // Otherwise run setup function and then return reference
            else {

                return core.setup( options );
            }
        };
    }
);