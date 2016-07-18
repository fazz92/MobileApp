/*!
 * Copyright 2015 Drifty Co.
 * http://drifty.com/
 *
 * Ionic, v1.3.1
 * A powerful HTML5 mobile app framework.
 * http://ionicframework.com/
 *
 * By @maxlynch, @benjsperry, @adamdbradley <3
 *
 * Licensed under the MIT license. Please see LICENSE for more information.
 *
 */

(function() {

// Create global ionic obj and its namespaces
// build processes may have already created an ionic obj
window.ionic = window.ionic || {};
window.ionic.views = {};
window.ionic.version = '1.3.1';

(function (ionic) {

  ionic.DelegateService = function(methodNames) {

    if (methodNames.indexOf('$getByHandle') > -1) {
      throw new Error("Method '$getByHandle' is implicitly added to each delegate service. Do not list it as a method.");
    }

    function trueFn() { return true; }

    return ['$log', function($log) {

      /*
       * Creates a new object that will have all the methodNames given,
       * and call them on the given the controller instance matching given
       * handle.
       * The reason we don't just let $getByHandle return the controller instance
       * itself is that the controller instance might not exist yet.
       *
       * We want people to be able to do
       * `var instance = $ionicScrollDelegate.$getByHandle('foo')` on controller
       * instantiation, but on controller instantiation a child directive
       * may not have been compiled yet!
       *
       * So this is our way of solving this problem: we create an object
       * that will only try to fetch the controller with given handle
       * once the methods are actually called.
       */
      function DelegateInstance(instances, handle) {
        this._instances = instances;
        this.handle = handle;
      }
      methodNames.forEach(function(methodName) {
        DelegateInstance.prototype[methodName] = instanceMethodCaller(methodName);
      });


      /**
       * The delegate service (eg $ionicNavBarDelegate) is just an instance
       * with a non-defined handle, a couple extra methods for registering
       * and narrowing down to a specific handle.
       */
      function DelegateService() {
        this._instances = [];
      }
      DelegateService.prototype = DelegateInstance.prototype;
      DelegateService.prototype._registerInstance = function(instance, handle, filterFn) {
        var instances = this._instances;
        instance.$$delegateHandle = handle;
        instance.$$filterFn = filterFn || trueFn;
        instances.push(instance);

        return function deregister() {
          var index = instances.indexOf(instance);
          if (index !== -1) {
            instances.splice(index, 1);
          }
        };
      };
      DelegateService.prototype.$getByHandle = function(handle) {
        return new DelegateInstance(this._instances, handle);
      };

      return new DelegateService();

      function instanceMethodCaller(methodName) {
        return function caller() {
          var handle = this.handle;
          var args = arguments;
          var foundInstancesCount = 0;
          var returnValue;

          this._instances.forEach(function(instance) {
            if ((!handle || handle == instance.$$delegateHandle) && instance.$$filterFn(instance)) {
              foundInstancesCount++;
              var ret = instance[methodName].apply(instance, args);
              //Only return the value from the first call
              if (foundInstancesCount === 1) {
                returnValue = ret;
              }
            }
          });

          if (!foundInstancesCount && handle) {
            return $log.warn(
              'Delegate for handle "' + handle + '" could not find a ' +
              'corresponding element with delegate-handle="' + handle + '"! ' +
              methodName + '() was not called!\n' +
              'Possible cause: If you are calling ' + methodName + '() immediately, and ' +
              'your element with delegate-handle="' + handle + '" is a child of your ' +
              'controller, then your element may not be compiled yet. Put a $timeout ' +
              'around your call to ' + methodName + '() and try again.'
            );
          }
          return returnValue;
        };
      }

    }];
  };

})(window.ionic);

(function(window, document, ionic) {

  var readyCallbacks = [];
  var isDomReady = document.readyState === 'complete' || document.readyState === 'interactive';

  function domReady() {
    isDomReady = true;
    for (var x = 0; x < readyCallbacks.length; x++) {
      ionic.requestAnimationFrame(readyCallbacks[x]);
    }
    readyCallbacks = [];
    document.removeEventListener('DOMContentLoaded', domReady);
  }
  if (!isDomReady) {
    document.addEventListener('DOMContentLoaded', domReady);
  }


  // From the man himself, Mr. Paul Irish.
  // The requestAnimationFrame polyfill
  // Put it on window just to preserve its context
  // without having to use .call
  window._rAF = (function() {
    return window.requestAnimationFrame ||
           window.webkitRequestAnimationFrame ||
           window.mozRequestAnimationFrame ||
           function(callback) {
             window.setTimeout(callback, 16);
           };
  })();

  var cancelAnimationFrame = window.cancelAnimationFrame ||
    window.webkitCancelAnimationFrame ||
    window.mozCancelAnimationFrame ||
    window.webkitCancelRequestAnimationFrame;

  /**
  * @ngdoc utility
  * @name ionic.DomUtil
  * @module ionic
  */
  ionic.DomUtil = {
    //Call with proper context
    /**
     * @ngdoc method
     * @name ionic.DomUtil#requestAnimationFrame
     * @alias ionic.requestAnimationFrame
     * @description Calls [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window.requestAnimationFrame), or a polyfill if not available.
     * @param {function} callback The function to call when the next frame
     * happens.
     */
    requestAnimationFrame: function(cb) {
      return window._rAF(cb);
    },

    cancelAnimationFrame: function(requestId) {
      cancelAnimationFrame(requestId);
    },

    /**
     * @ngdoc method
     * @name ionic.DomUtil#animationFrameThrottle
     * @alias ionic.animationFrameThrottle
     * @description
     * When given a callback, if that callback is called 100 times between
     * animation frames, adding Throttle will make it only run the last of
     * the 100 calls.
     *
     * @param {function} callback a function which will be throttled to
     * requestAnimationFrame
     * @returns {function} A function which will then call the passed in callback.
     * The passed in callback will receive the context the returned function is
     * called with.
     */
    animationFrameThrottle: function(cb) {
      var args, isQueued, context;
      return function() {
        args = arguments;
        context = this;
        if (!isQueued) {
          isQueued = true;
          ionic.requestAnimationFrame(function() {
            cb.apply(context, args);
            isQueued = false;
          });
        }
      };
    },

    contains: function(parentNode, otherNode) {
      var current = otherNode;
      while (current) {
        if (current === parentNode) return true;
        current = current.parentNode;
      }
    },

    /**
     * @ngdoc method
     * @name ionic.DomUtil#getPositionInParent
     * @description
     * Find an element's scroll offset within its container.
     * @param {DOMElement} element The element to find the offset of.
     * @returns {object} A position object with the following properties:
     *   - `{number}` `left` The left offset of the element.
     *   - `{number}` `top` The top offset of the element.
     */
    getPositionInParent: function(el) {
      return {
        left: el.offsetLeft,
        top: el.offsetTop
      };
    },

    getOffsetTop: function(el) {
      var curtop = 0;
      if (el.offsetParent) {
        do {
          curtop += el.offsetTop;
          el = el.offsetParent;
        } while (el)
        return curtop;
      }
    },

    /**
     * @ngdoc method
     * @name ionic.DomUtil#ready
     * @description
     * Call a function when the DOM is ready, or if it is already ready
     * call the function immediately.
     * @param {function} callback The function to be called.
     */
    ready: function(cb) {
      if (isDomReady) {
        ionic.requestAnimationFrame(cb);
      } else {
        readyCallbacks.push(cb);
      }
    },

    /**
     * @ngdoc method
     * @name ionic.DomUtil#getTextBounds
     * @description
     * Get a rect representing the bounds of the given textNode.
     * @param {DOMElement} textNode The textNode to find the bounds of.
     * @returns {object} An object representing the bounds of the node. Properties:
     *   - `{number}` `left` The left position of the textNode.
     *   - `{number}` `right` The right position of the textNode.
     *   - `{number}` `top` The top position of the textNode.
     *   - `{number}` `bottom` The bottom position of the textNode.
     *   - `{number}` `width` The width of the textNode.
     *   - `{number}` `height` The height of the textNode.
     */
    getTextBounds: function(textNode) {
      if (document.createRange) {
        var range = document.createRange();
        range.selectNodeContents(textNode);
        if (range.getBoundingClientRect) {
          var rect = range.getBoundingClientRect();
          if (rect) {
            var sx = window.scrollX;
            var sy = window.scrollY;

            return {
              top: rect.top + sy,
              left: rect.left + sx,
              right: rect.left + sx + rect.width,
              bottom: rect.top + sy + rect.height,
              width: rect.width,
              height: rect.height
            };
          }
        }
      }
      return null;
    },

    /**
     * @ngdoc method
     * @name ionic.DomUtil#getChildIndex
     * @description
     * Get the first index of a child node within the given element of the
     * specified type.
     * @param {DOMElement} element The element to find the index of.
     * @param {string} type The nodeName to match children of element against.
     * @returns {number} The index, or -1, of a child with nodeName matching type.
     */
    getChildIndex: function(element, type) {
      if (type) {
        var ch = element.parentNode.children;
        var c;
        for (var i = 0, k = 0, j = ch.length; i < j; i++) {
          c = ch[i];
          if (c.nodeName && c.nodeName.toLowerCase() == type) {
            if (c == element) {
              return k;
            }
            k++;
          }
        }
      }
      return Array.prototype.slice.call(element.parentNode.children).indexOf(element);
    },

    /**
     * @private
     */
    swapNodes: function(src, dest) {
      dest.parentNode.insertBefore(src, dest);
    },

    elementIsDescendant: function(el, parent, stopAt) {
      var current = el;
      do {
        if (current === parent) return true;
        current = current.parentNode;
      } while (current && current !== stopAt);
      return false;
    },

    /**
     * @ngdoc method
     * @name ionic.DomUtil#getParentWithClass
     * @param {DOMElement} element
     * @param {string} className
     * @returns {DOMElement} The closest parent of element matching the
     * className, or null.
     */
    getParentWithClass: function(e, className, depth) {
      depth = depth || 10;
      while (e.parentNode && depth--) {
        if (e.parentNode.classList && e.parentNode.classList.contains(className)) {
          return e.parentNode;
        }
        e = e.parentNode;
      }
      return null;
    },
    /**
     * @ngdoc method
     * @name ionic.DomUtil#getParentOrSelfWithClass
     * @param {DOMElement} element
     * @param {string} className
     * @returns {DOMElement} The closest parent or self matching the
     * className, or null.
     */
    getParentOrSelfWithClass: function(e, className, depth) {
      depth = depth || 10;
      while (e && depth--) {
        if (e.classList && e.classList.contains(className)) {
          return e;
        }
        e = e.parentNode;
      }
      return null;
    },

    /**
     * @ngdoc method
     * @name ionic.DomUtil#rectContains
     * @param {number} x
     * @param {number} y
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @returns {boolean} Whether {x,y} fits within the rectangle defined by
     * {x1,y1,x2,y2}.
     */
    rectContains: function(x, y, x1, y1, x2, y2) {
      if (x < x1 || x > x2) return false;
      if (y < y1 || y > y2) return false;
      return true;
    },

    /**
     * @ngdoc method
     * @name ionic.DomUtil#blurAll
     * @description
     * Blurs any currently focused input element
     * @returns {DOMElement} The element blurred or null
     */
    blurAll: function() {
      if (document.activeElement && document.activeElement != document.body) {
        document.activeElement.blur();
        return document.activeElement;
      }
      return null;
    },

    cachedAttr: function(ele, key, value) {
      ele = ele && ele.length && ele[0] || ele;
      if (ele && ele.setAttribute) {
        var dataKey = '$attr-' + key;
        if (arguments.length > 2) {
          if (ele[dataKey] !== value) {
            ele.setAttribute(key, value);
            ele[dataKey] = value;
          }
        } else if (typeof ele[dataKey] == 'undefined') {
          ele[dataKey] = ele.getAttribute(key);
        }
        return ele[dataKey];
      }
    },

    cachedStyles: function(ele, styles) {
      ele = ele && ele.length && ele[0] || ele;
      if (ele && ele.style) {
        for (var prop in styles) {
          if (ele['$style-' + prop] !== styles[prop]) {
            ele.style[prop] = ele['$style-' + prop] = styles[prop];
          }
        }
      }
    }

  };

  //Shortcuts
  ionic.requestAnimationFrame = ionic.DomUtil.requestAnimationFrame;
  ionic.cancelAnimationFrame = ionic.DomUtil.cancelAnimationFrame;
  ionic.animationFrameThrottle = ionic.DomUtil.animationFrameThrottle;

})(window, document, ionic);

/**
 * ion-events.js
 *
 * Author: Max Lynch <max@drifty.com>
 *
 * Framework events handles various mobile browser events, and
 * detects special events like tap/swipe/etc. and emits them
 * as custom events that can be used in an app.
 *
 * Portions lovingly adapted from github.com/maker/ratchet and github.com/alexgibson/tap.js - thanks guys!
 */

(function(ionic) {

  // Custom event polyfill
  ionic.CustomEvent = (function() {
    if( typeof window.CustomEvent === 'function' ) return CustomEvent;

    var customEvent = function(event, params) {
      var evt;
      params = params || {
        bubbles: false,
        cancelable: false,
        detail: undefined
      };
      try {
        evt = document.createEvent("CustomEvent");
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
      } catch (error) {
        // fallback for browsers that don't support createEvent('CustomEvent')
        evt = document.createEvent("Event");
        for (var param in params) {
          evt[param] = params[param];
        }
        evt.initEvent(event, params.bubbles, params.cancelable);
      }
      return evt;
    };
    customEvent.prototype = window.Event.prototype;
    return customEvent;
  })();


  /**
   * @ngdoc utility
   * @name ionic.EventController
   * @module ionic
   */
  ionic.EventController = {
    VIRTUALIZED_EVENTS: ['tap', 'swipe', 'swiperight', 'swipeleft', 'drag', 'hold', 'release'],

    /**
     * @ngdoc method
     * @name ionic.EventController#trigger
     * @alias ionic.trigger
     * @param {string} eventType The event to trigger.
     * @param {object} data The data for the event. Hint: pass in
     * `{target: targetElement}`
     * @param {boolean=} bubbles Whether the event should bubble up the DOM.
     * @param {boolean=} cancelable Whether the event should be cancelable.
     */
    // Trigger a new event
    trigger: function(eventType, data, bubbles, cancelable) {
      var event = new ionic.CustomEvent(eventType, {
        detail: data,
        bubbles: !!bubbles,
        cancelable: !!cancelable
      });

      // Make sure to trigger the event on the given target, or dispatch it from
      // the window if we don't have an event target
      data && data.target && data.target.dispatchEvent && data.target.dispatchEvent(event) || window.dispatchEvent(event);
    },

    /**
     * @ngdoc method
     * @name ionic.EventController#on
     * @alias ionic.on
     * @description Listen to an event on an element.
     * @param {string} type The event to listen for.
     * @param {function} callback The listener to be called.
     * @param {DOMElement} element The element to listen for the event on.
     */
    on: function(type, callback, element) {
      var e = element || window;

      // Bind a gesture if it's a virtual event
      for(var i = 0, j = this.VIRTUALIZED_EVENTS.length; i < j; i++) {
        if(type == this.VIRTUALIZED_EVENTS[i]) {
          var gesture = new ionic.Gesture(element);
          gesture.on(type, callback);
          return gesture;
        }
      }

      // Otherwise bind a normal event
      e.addEventListener(type, callback);
    },

    /**
     * @ngdoc method
     * @name ionic.EventController#off
     * @alias ionic.off
     * @description Remove an event listener.
     * @param {string} type
     * @param {function} callback
     * @param {DOMElement} element
     */
    off: function(type, callback, element) {
      element.removeEventListener(type, callback);
    },

    /**
     * @ngdoc method
     * @name ionic.EventController#onGesture
     * @alias ionic.onGesture
     * @description Add an event listener for a gesture on an element.
     *
     * Available eventTypes (from [hammer.js](http://eightmedia.github.io/hammer.js/)):
     *
     * `hold`, `tap`, `doubletap`, `drag`, `dragstart`, `dragend`, `dragup`, `dragdown`, <br/>
     * `dragleft`, `dragright`, `swipe`, `swipeup`, `swipedown`, `swipeleft`, `swiperight`, <br/>
     * `transform`, `transformstart`, `transformend`, `rotate`, `pinch`, `pinchin`, `pinchout`, <br/>
     * `touch`, `release`
     *
     * @param {string} eventType The gesture event to listen for.
     * @param {function(e)} callback The function to call when the gesture
     * happens.
     * @param {DOMElement} element The angular element to listen for the event on.
     * @param {object} options object.
     * @returns {ionic.Gesture} The gesture object (use this to remove the gesture later on).
     */
    onGesture: function(type, callback, element, options) {
      var gesture = new ionic.Gesture(element, options);
      gesture.on(type, callback);
      return gesture;
    },

    /**
     * @ngdoc method
     * @name ionic.EventController#offGesture
     * @alias ionic.offGesture
     * @description Remove an event listener for a gesture created on an element.
     * @param {ionic.Gesture} gesture The gesture that should be removed.
     * @param {string} eventType The gesture event to remove the listener for.
     * @param {function(e)} callback The listener to remove.

     */
    offGesture: function(gesture, type, callback) {
      gesture && gesture.off(type, callback);
    },

    handlePopState: function() {}
  };


  // Map some convenient top-level functions for event handling
  ionic.on = function() { ionic.EventController.on.apply(ionic.EventController, arguments); };
  ionic.off = function() { ionic.EventController.off.apply(ionic.EventController, arguments); };
  ionic.trigger = ionic.EventController.trigger;//function() { ionic.EventController.trigger.apply(ionic.EventController.trigger, arguments); };
  ionic.onGesture = function() { return ionic.EventController.onGesture.apply(ionic.EventController.onGesture, arguments); };
  ionic.offGesture = function() { return ionic.EventController.offGesture.apply(ionic.EventController.offGesture, arguments); };

})(window.ionic);

/* eslint camelcase:0 */
/**
  * Simple gesture controllers with some common gestures that emit
  * gesture events.
  *
  * Ported from github.com/EightMedia/hammer.js Gestures - thanks!
  */
(function(ionic) {

  /**
   * ionic.Gestures
   * use this to create instances
   * @param   {HTMLElement}   element
   * @param   {Object}        options
   * @returns {ionic.Gestures.Instance}
   * @constructor
   */
  ionic.Gesture = function(element, options) {
    return new ionic.Gestures.Instance(element, options || {});
  };

  ionic.Gestures = {};

  // default settings
  ionic.Gestures.defaults = {
    // add css to the element to prevent the browser from doing
    // its native behavior. this doesnt prevent the scrolling,
    // but cancels the contextmenu, tap highlighting etc
    // set to false to disable this
    stop_browser_behavior: 'disable-user-behavior'
  };

  // detect touchevents
  ionic.Gestures.HAS_POINTEREVENTS = window.navigator.pointerEnabled || window.navigator.msPointerEnabled;
  ionic.Gestures.HAS_TOUCHEVENTS = ('ontouchstart' in window);

  // dont use mouseevents on mobile devices
  ionic.Gestures.MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android|silk/i;
  ionic.Gestures.NO_MOUSEEVENTS = ionic.Gestures.HAS_TOUCHEVENTS && window.navigator.userAgent.match(ionic.Gestures.MOBILE_REGEX);

  // eventtypes per touchevent (start, move, end)
  // are filled by ionic.Gestures.event.determineEventTypes on setup
  ionic.Gestures.EVENT_TYPES = {};

  // direction defines
  ionic.Gestures.DIRECTION_DOWN = 'down';
  ionic.Gestures.DIRECTION_LEFT = 'left';
  ionic.Gestures.DIRECTION_UP = 'up';
  ionic.Gestures.DIRECTION_RIGHT = 'right';

  // pointer type
  ionic.Gestures.POINTER_MOUSE = 'mouse';
  ionic.Gestures.POINTER_TOUCH = 'touch';
  ionic.Gestures.POINTER_PEN = 'pen';

  // touch event defines
  ionic.Gestures.EVENT_START = 'start';
  ionic.Gestures.EVENT_MOVE = 'move';
  ionic.Gestures.EVENT_END = 'end';

  // hammer document where the base events are added at
  ionic.Gestures.DOCUMENT = window.document;

  // plugins namespace
  ionic.Gestures.plugins = {};

  // if the window events are set...
  ionic.Gestures.READY = false;

  /**
   * setup events to detect gestures on the document
   */
  function setup() {
    if(ionic.Gestures.READY) {
      return;
    }

    // find what eventtypes we add listeners to
    ionic.Gestures.event.determineEventTypes();

    // Register all gestures inside ionic.Gestures.gestures
    for(var name in ionic.Gestures.gestures) {
      if(ionic.Gestures.gestures.hasOwnProperty(name)) {
        ionic.Gestures.detection.register(ionic.Gestures.gestures[name]);
      }
    }

    // Add touch events on the document
    ionic.Gestures.event.onTouch(ionic.Gestures.DOCUMENT, ionic.Gestures.EVENT_MOVE, ionic.Gestures.detection.detect);
    ionic.Gestures.event.onTouch(ionic.Gestures.DOCUMENT, ionic.Gestures.EVENT_END, ionic.Gestures.detection.detect);

    // ionic.Gestures is ready...!
    ionic.Gestures.READY = true;
  }

  /**
   * create new hammer instance
   * all methods should return the instance itself, so it is chainable.
   * @param   {HTMLElement}       element
   * @param   {Object}            [options={}]
   * @returns {ionic.Gestures.Instance}
   * @name Gesture.Instance
   * @constructor
   */
  ionic.Gestures.Instance = function(element, options) {
    var self = this;

    // A null element was passed into the instance, which means
    // whatever lookup was done to find this element failed to find it
    // so we can't listen for events on it.
    if(element === null) {
      void 0;
      return this;
    }

    // setup ionic.GesturesJS window events and register all gestures
    // this also sets up the default options
    setup();

    this.element = element;

    // start/stop detection option
    this.enabled = true;

    // merge options
    this.options = ionic.Gestures.utils.extend(
        ionic.Gestures.utils.extend({}, ionic.Gestures.defaults),
        options || {});

    // add some css to the element to prevent the browser from doing its native behavoir
    if(this.options.stop_browser_behavior) {
      ionic.Gestures.utils.stopDefaultBrowserBehavior(this.element, this.options.stop_browser_behavior);
    }

    // start detection on touchstart
    ionic.Gestures.event.onTouch(element, ionic.Gestures.EVENT_START, function(ev) {
      if(self.enabled) {
        ionic.Gestures.detection.startDetect(self, ev);
      }
    });

    // return instance
    return this;
  };


  ionic.Gestures.Instance.prototype = {
    /**
     * bind events to the instance
     * @param   {String}      gesture
     * @param   {Function}    handler
     * @returns {ionic.Gestures.Instance}
     */
    on: function onEvent(gesture, handler){
      var gestures = gesture.split(' ');
      for(var t = 0; t < gestures.length; t++) {
        this.element.addEventListener(gestures[t], handler, false);
      }
      return this;
    },


    /**
     * unbind events to the instance
     * @param   {String}      gesture
     * @param   {Function}    handler
     * @returns {ionic.Gestures.Instance}
     */
    off: function offEvent(gesture, handler){
      var gestures = gesture.split(' ');
      for(var t = 0; t < gestures.length; t++) {
        this.element.removeEventListener(gestures[t], handler, false);
      }
      return this;
    },


    /**
     * trigger gesture event
     * @param   {String}      gesture
     * @param   {Object}      eventData
     * @returns {ionic.Gestures.Instance}
     */
    trigger: function triggerEvent(gesture, eventData){
      // create DOM event
      var event = ionic.Gestures.DOCUMENT.createEvent('Event');
      event.initEvent(gesture, true, true);
      event.gesture = eventData;

      // trigger on the target if it is in the instance element,
      // this is for event delegation tricks
      var element = this.element;
      if(ionic.Gestures.utils.hasParent(eventData.target, element)) {
        element = eventData.target;
      }

      element.dispatchEvent(event);
      return this;
    },


    /**
     * enable of disable hammer.js detection
     * @param   {Boolean}   state
     * @returns {ionic.Gestures.Instance}
     */
    enable: function enable(state) {
      this.enabled = state;
      return this;
    }
  };

  /**
   * this holds the last move event,
   * used to fix empty touchend issue
   * see the onTouch event for an explanation
   * type {Object}
   */
  var last_move_event = null;


  /**
   * when the mouse is hold down, this is true
   * type {Boolean}
   */
  var enable_detect = false;


  /**
   * when touch events have been fired, this is true
   * type {Boolean}
   */
  var touch_triggered = false;


  ionic.Gestures.event = {
    /**
     * simple addEventListener
     * @param   {HTMLElement}   element
     * @param   {String}        type
     * @param   {Function}      handler
     */
    bindDom: function(element, type, handler) {
      var types = type.split(' ');
      for(var t = 0; t < types.length; t++) {
        element.addEventListener(types[t], handler, false);
      }
    },


    /**
     * touch events with mouse fallback
     * @param   {HTMLElement}   element
     * @param   {String}        eventType        like ionic.Gestures.EVENT_MOVE
     * @param   {Function}      handler
     */
    onTouch: function onTouch(element, eventType, handler) {
      var self = this;

      this.bindDom(element, ionic.Gestures.EVENT_TYPES[eventType], function bindDomOnTouch(ev) {
        var sourceEventType = ev.type.toLowerCase();

        // onmouseup, but when touchend has been fired we do nothing.
        // this is for touchdevices which also fire a mouseup on touchend
        if(sourceEventType.match(/mouse/) && touch_triggered) {
          return;
        }

        // mousebutton must be down or a touch event
        else if( sourceEventType.match(/touch/) ||   // touch events are always on screen
          sourceEventType.match(/pointerdown/) || // pointerevents touch
          (sourceEventType.match(/mouse/) && ev.which === 1)   // mouse is pressed
          ){
            enable_detect = true;
          }

        // mouse isn't pressed
        else if(sourceEventType.match(/mouse/) && ev.which !== 1) {
          enable_detect = false;
        }


        // we are in a touch event, set the touch triggered bool to true,
        // this for the conflicts that may occur on ios and android
        if(sourceEventType.match(/touch|pointer/)) {
          touch_triggered = true;
        }

        // count the total touches on the screen
        var count_touches = 0;

        // when touch has been triggered in this detection session
        // and we are now handling a mouse event, we stop that to prevent conflicts
        if(enable_detect) {
          // update pointerevent
          if(ionic.Gestures.HAS_POINTEREVENTS && eventType != ionic.Gestures.EVENT_END) {
            count_touches = ionic.Gestures.PointerEvent.updatePointer(eventType, ev);
          }
          // touch
          else if(sourceEventType.match(/touch/)) {
            count_touches = ev.touches.length;
          }
          // mouse
          else if(!touch_triggered) {
            count_touches = sourceEventType.match(/up/) ? 0 : 1;
          }

          // if we are in a end event, but when we remove one touch and
          // we still have enough, set eventType to move
          if(count_touches > 0 && eventType == ionic.Gestures.EVENT_END) {
            eventType = ionic.Gestures.EVENT_MOVE;
          }
          // no touches, force the end event
          else if(!count_touches) {
            eventType = ionic.Gestures.EVENT_END;
          }

          // store the last move event
          if(count_touches || last_move_event === null) {
            last_move_event = ev;
          }

          // trigger the handler
          handler.call(ionic.Gestures.detection, self.collectEventData(element, eventType, self.getTouchList(last_move_event, eventType), ev));

          // remove pointerevent from list
          if(ionic.Gestures.HAS_POINTEREVENTS && eventType == ionic.Gestures.EVENT_END) {
            count_touches = ionic.Gestures.PointerEvent.updatePointer(eventType, ev);
          }
        }

        //debug(sourceEventType +" "+ eventType);

        // on the end we reset everything
        if(!count_touches) {
          last_move_event = null;
          enable_detect = false;
          touch_triggered = false;
          ionic.Gestures.PointerEvent.reset();
        }
      });
    },


    /**
     * we have different events for each device/browser
     * determine what we need and set them in the ionic.Gestures.EVENT_TYPES constant
     */
    determineEventTypes: function determineEventTypes() {
      // determine the eventtype we want to set
      var types;

      // pointerEvents magic
      if(ionic.Gestures.HAS_POINTEREVENTS) {
        types = ionic.Gestures.PointerEvent.getEvents();
      }
      // on Android, iOS, blackberry, windows mobile we dont want any mouseevents
      else if(ionic.Gestures.NO_MOUSEEVENTS) {
        types = [
          'touchstart',
          'touchmove',
          'touchend touchcancel'];
      }
      // for non pointer events browsers and mixed browsers,
      // like chrome on windows8 touch laptop
      else {
        types = [
          'touchstart mousedown',
          'touchmove mousemove',
          'touchend touchcancel mouseup'];
      }

      ionic.Gestures.EVENT_TYPES[ionic.Gestures.EVENT_START] = types[0];
      ionic.Gestures.EVENT_TYPES[ionic.Gestures.EVENT_MOVE] = types[1];
      ionic.Gestures.EVENT_TYPES[ionic.Gestures.EVENT_END] = types[2];
    },


    /**
     * create touchlist depending on the event
     * @param   {Object}    ev
     * @param   {String}    eventType   used by the fakemultitouch plugin
     */
    getTouchList: function getTouchList(ev/*, eventType*/) {
      // get the fake pointerEvent touchlist
      if(ionic.Gestures.HAS_POINTEREVENTS) {
        return ionic.Gestures.PointerEvent.getTouchList();
      }
      // get the touchlist
      else if(ev.touches) {
        return ev.touches;
      }
      // make fake touchlist from mouse position
      else {
        ev.identifier = 1;
        return [ev];
      }
    },


    /**
     * collect event data for ionic.Gestures js
     * @param   {HTMLElement}   element
     * @param   {String}        eventType        like ionic.Gestures.EVENT_MOVE
     * @param   {Object}        eventData
     */
    collectEventData: function collectEventData(element, eventType, touches, ev) {

      // find out pointerType
      var pointerType = ionic.Gestures.POINTER_TOUCH;
      if(ev.type.match(/mouse/) || ionic.Gestures.PointerEvent.matchType(ionic.Gestures.POINTER_MOUSE, ev)) {
        pointerType = ionic.Gestures.POINTER_MOUSE;
      }

      return {
        center: ionic.Gestures.utils.getCenter(touches),
        timeStamp: new Date().getTime(),
        target: ev.target,
        touches: touches,
        eventType: eventType,
        pointerType: pointerType,
        srcEvent: ev,

        /**
         * prevent the browser default actions
         * mostly used to disable scrolling of the browser
         */
        preventDefault: function() {
          if(this.srcEvent.preventManipulation) {
            this.srcEvent.preventManipulation();
          }

          if(this.srcEvent.preventDefault) {
            // this.srcEvent.preventDefault();
          }
        },

        /**
         * stop bubbling the event up to its parents
         */
        stopPropagation: function() {
          this.srcEvent.stopPropagation();
        },

        /**
         * immediately stop gesture detection
         * might be useful after a swipe was detected
         * @return {*}
         */
        stopDetect: function() {
          return ionic.Gestures.detection.stopDetect();
        }
      };
    }
  };

  ionic.Gestures.PointerEvent = {
    /**
     * holds all pointers
     * type {Object}
     */
    pointers: {},

    /**
     * get a list of pointers
     * @returns {Array}     touchlist
     */
    getTouchList: function() {
      var self = this;
      var touchlist = [];

      // we can use forEach since pointerEvents only is in IE10
      Object.keys(self.pointers).sort().forEach(function(id) {
        touchlist.push(self.pointers[id]);
      });
      return touchlist;
    },

    /**
     * update the position of a pointer
     * @param   {String}   type             ionic.Gestures.EVENT_END
     * @param   {Object}   pointerEvent
     */
    updatePointer: function(type, pointerEvent) {
      if(type == ionic.Gestures.EVENT_END) {
        this.pointers = {};
      }
      else {
        pointerEvent.identifier = pointerEvent.pointerId;
        this.pointers[pointerEvent.pointerId] = pointerEvent;
      }

      return Object.keys(this.pointers).length;
    },

    /**
     * check if ev matches pointertype
     * @param   {String}        pointerType     ionic.Gestures.POINTER_MOUSE
     * @param   {PointerEvent}  ev
     */
    matchType: function(pointerType, ev) {
      if(!ev.pointerType) {
        return false;
      }

      var types = {};
      types[ionic.Gestures.POINTER_MOUSE] = (ev.pointerType == ev.MSPOINTER_TYPE_MOUSE || ev.pointerType == ionic.Gestures.POINTER_MOUSE);
      types[ionic.Gestures.POINTER_TOUCH] = (ev.pointerType == ev.MSPOINTER_TYPE_TOUCH || ev.pointerType == ionic.Gestures.POINTER_TOUCH);
      types[ionic.Gestures.POINTER_PEN] = (ev.pointerType == ev.MSPOINTER_TYPE_PEN || ev.pointerType == ionic.Gestures.POINTER_PEN);
      return types[pointerType];
    },


    /**
     * get events
     */
    getEvents: function() {
      return [
        'pointerdown MSPointerDown',
      'pointermove MSPointerMove',
      'pointerup pointercancel MSPointerUp MSPointerCancel'
        ];
    },

    /**
     * reset the list
     */
    reset: function() {
      this.pointers = {};
    }
  };


  ionic.Gestures.utils = {
    /**
     * extend method,
     * also used for cloning when dest is an empty object
     * @param   {Object}    dest
     * @param   {Object}    src
     * @param	{Boolean}	merge		do a merge
     * @returns {Object}    dest
     */
    extend: function extend(dest, src, merge) {
      for (var key in src) {
        if(dest[key] !== undefined && merge) {
          continue;
        }
        dest[key] = src[key];
      }
      return dest;
    },


    /**
     * find if a node is in the given parent
     * used for event delegation tricks
     * @param   {HTMLElement}   node
     * @param   {HTMLElement}   parent
     * @returns {boolean}       has_parent
     */
    hasParent: function(node, parent) {
      while(node){
        if(node == parent) {
          return true;
        }
        node = node.parentNode;
      }
      return false;
    },


    /**
     * get the center of all the touches
     * @param   {Array}     touches
     * @returns {Object}    center
     */
    getCenter: function getCenter(touches) {
      var valuesX = [], valuesY = [];

      for(var t = 0, len = touches.length; t < len; t++) {
        valuesX.push(touches[t].pageX);
        valuesY.push(touches[t].pageY);
      }

      return {
        pageX: ((Math.min.apply(Math, valuesX) + Math.max.apply(Math, valuesX)) / 2),
          pageY: ((Math.min.apply(Math, valuesY) + Math.max.apply(Math, valuesY)) / 2)
      };
    },


    /**
     * calculate the velocity between two points
     * @param   {Number}    delta_time
     * @param   {Number}    delta_x
     * @param   {Number}    delta_y
     * @returns {Object}    velocity
     */
    getVelocity: function getVelocity(delta_time, delta_x, delta_y) {
      return {
        x: Math.abs(delta_x / delta_time) || 0,
        y: Math.abs(delta_y / delta_time) || 0
      };
    },


    /**
     * calculate the angle between two coordinates
     * @param   {Touch}     touch1
     * @param   {Touch}     touch2
     * @returns {Number}    angle
     */
    getAngle: function getAngle(touch1, touch2) {
      var y = touch2.pageY - touch1.pageY,
      x = touch2.pageX - touch1.pageX;
      return Math.atan2(y, x) * 180 / Math.PI;
    },


    /**
     * angle to direction define
     * @param   {Touch}     touch1
     * @param   {Touch}     touch2
     * @returns {String}    direction constant, like ionic.Gestures.DIRECTION_LEFT
     */
    getDirection: function getDirection(touch1, touch2) {
      var x = Math.abs(touch1.pageX - touch2.pageX),
      y = Math.abs(touch1.pageY - touch2.pageY);

      if(x >= y) {
        return touch1.pageX - touch2.pageX > 0 ? ionic.Gestures.DIRECTION_LEFT : ionic.Gestures.DIRECTION_RIGHT;
      }
      else {
        return touch1.pageY - touch2.pageY > 0 ? ionic.Gestures.DIRECTION_UP : ionic.Gestures.DIRECTION_DOWN;
      }
    },


    /**
     * calculate the distance between two touches
     * @param   {Touch}     touch1
     * @param   {Touch}     touch2
     * @returns {Number}    distance
     */
    getDistance: function getDistance(touch1, touch2) {
      var x = touch2.pageX - touch1.pageX,
      y = touch2.pageY - touch1.pageY;
      return Math.sqrt((x * x) + (y * y));
    },


    /**
     * calculate the scale factor between two touchLists (fingers)
     * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
     * @param   {Array}     start
     * @param   {Array}     end
     * @returns {Number}    scale
     */
    getScale: function getScale(start, end) {
      // need two fingers...
      if(start.length >= 2 && end.length >= 2) {
        return this.getDistance(end[0], end[1]) /
          this.getDistance(start[0], start[1]);
      }
      return 1;
    },


    /**
     * calculate the rotation degrees between two touchLists (fingers)
     * @param   {Array}     start
     * @param   {Array}     end
     * @returns {Number}    rotation
     */
    getRotation: function getRotation(start, end) {
      // need two fingers
      if(start.length >= 2 && end.length >= 2) {
        return this.getAngle(end[1], end[0]) -
          this.getAngle(start[1], start[0]);
      }
      return 0;
    },


    /**
     * boolean if the direction is vertical
     * @param    {String}    direction
     * @returns  {Boolean}   is_vertical
     */
    isVertical: function isVertical(direction) {
      return (direction == ionic.Gestures.DIRECTION_UP || direction == ionic.Gestures.DIRECTION_DOWN);
    },


    /**
     * stop browser default behavior with css class
     * @param   {HtmlElement}   element
     * @param   {Object}        css_class
     */
    stopDefaultBrowserBehavior: function stopDefaultBrowserBehavior(element, css_class) {
      // changed from making many style changes to just adding a preset classname
      // less DOM manipulations, less code, and easier to control in the CSS side of things
      // hammer.js doesn't come with CSS, but ionic does, which is why we prefer this method
      if(element && element.classList) {
        element.classList.add(css_class);
        element.onselectstart = function() {
          return false;
        };
      }
    }
  };


  ionic.Gestures.detection = {
    // contains all registred ionic.Gestures.gestures in the correct order
    gestures: [],

    // data of the current ionic.Gestures.gesture detection session
    current: null,

    // the previous ionic.Gestures.gesture session data
    // is a full clone of the previous gesture.current object
    previous: null,

    // when this becomes true, no gestures are fired
    stopped: false,


    /**
     * start ionic.Gestures.gesture detection
     * @param   {ionic.Gestures.Instance}   inst
     * @param   {Object}            eventData
     */
    startDetect: function startDetect(inst, eventData) {
      // already busy with a ionic.Gestures.gesture detection on an element
      if(this.current) {
        return;
      }

      this.stopped = false;

      this.current = {
        inst: inst, // reference to ionic.GesturesInstance we're working for
        startEvent: ionic.Gestures.utils.extend({}, eventData), // start eventData for distances, timing etc
        lastEvent: false, // last eventData
        name: '' // current gesture we're in/detected, can be 'tap', 'hold' etc
      };

      this.detect(eventData);
    },


    /**
     * ionic.Gestures.gesture detection
     * @param   {Object}    eventData
     */
    detect: function detect(eventData) {
      if(!this.current || this.stopped) {
        return null;
      }

      // extend event data with calculations about scale, distance etc
      eventData = this.extendEventData(eventData);

      // instance options
      var inst_options = this.current.inst.options;

      // call ionic.Gestures.gesture handlers
      for(var g = 0, len = this.gestures.length; g < len; g++) {
        var gesture = this.gestures[g];

        // only when the instance options have enabled this gesture
        if(!this.stopped && inst_options[gesture.name] !== false) {
          // if a handler returns false, we stop with the detection
          if(gesture.handler.call(gesture, eventData, this.current.inst) === false) {
            this.stopDetect();
            break;
          }
        }
      }

      // store as previous event event
      if(this.current) {
        this.current.lastEvent = eventData;
      }

      // endevent, but not the last touch, so dont stop
      if(eventData.eventType == ionic.Gestures.EVENT_END && !eventData.touches.length - 1) {
        this.stopDetect();
      }

      return eventData;
    },


    /**
     * clear the ionic.Gestures.gesture vars
     * this is called on endDetect, but can also be used when a final ionic.Gestures.gesture has been detected
     * to stop other ionic.Gestures.gestures from being fired
     */
    stopDetect: function stopDetect() {
      // clone current data to the store as the previous gesture
      // used for the double tap gesture, since this is an other gesture detect session
      this.previous = ionic.Gestures.utils.extend({}, this.current);

      // reset the current
      this.current = null;

      // stopped!
      this.stopped = true;
    },


    /**
     * extend eventData for ionic.Gestures.gestures
     * @param   {Object}   ev
     * @returns {Object}   ev
     */
    extendEventData: function extendEventData(ev) {
      var startEv = this.current.startEvent;

      // if the touches change, set the new touches over the startEvent touches
      // this because touchevents don't have all the touches on touchstart, or the
      // user must place his fingers at the EXACT same time on the screen, which is not realistic
      // but, sometimes it happens that both fingers are touching at the EXACT same time
      if(startEv && (ev.touches.length != startEv.touches.length || ev.touches === startEv.touches)) {
        // extend 1 level deep to get the touchlist with the touch objects
        startEv.touches = [];
        for(var i = 0, len = ev.touches.length; i < len; i++) {
          startEv.touches.push(ionic.Gestures.utils.extend({}, ev.touches[i]));
        }
      }

      var delta_time = ev.timeStamp - startEv.timeStamp,
          delta_x = ev.center.pageX - startEv.center.pageX,
          delta_y = ev.center.pageY - startEv.center.pageY,
          velocity = ionic.Gestures.utils.getVelocity(delta_time, delta_x, delta_y);

      ionic.Gestures.utils.extend(ev, {
        deltaTime: delta_time,
        deltaX: delta_x,
        deltaY: delta_y,

        velocityX: velocity.x,
        velocityY: velocity.y,

        distance: ionic.Gestures.utils.getDistance(startEv.center, ev.center),
        angle: ionic.Gestures.utils.getAngle(startEv.center, ev.center),
        direction: ionic.Gestures.utils.getDirection(startEv.center, ev.center),

        scale: ionic.Gestures.utils.getScale(startEv.touches, ev.touches),
        rotation: ionic.Gestures.utils.getRotation(startEv.touches, ev.touches),

        startEvent: startEv
      });

      return ev;
    },


    /**
     * register new gesture
     * @param   {Object}    gesture object, see gestures.js for documentation
     * @returns {Array}     gestures
     */
    register: function register(gesture) {
      // add an enable gesture options if there is no given
      var options = gesture.defaults || {};
      if(options[gesture.name] === undefined) {
        options[gesture.name] = true;
      }

      // extend ionic.Gestures default options with the ionic.Gestures.gesture options
      ionic.Gestures.utils.extend(ionic.Gestures.defaults, options, true);

      // set its index
      gesture.index = gesture.index || 1000;

      // add ionic.Gestures.gesture to the list
      this.gestures.push(gesture);

      // sort the list by index
      this.gestures.sort(function(a, b) {
        if (a.index < b.index) {
          return -1;
        }
        if (a.index > b.index) {
          return 1;
        }
        return 0;
      });

      return this.gestures;
    }
  };


  ionic.Gestures.gestures = ionic.Gestures.gestures || {};

  /**
   * Custom gestures
   * ==============================
   *
   * Gesture object
   * --------------------
   * The object structure of a gesture:
   *
   * { name: 'mygesture',
   *   index: 1337,
   *   defaults: {
   *     mygesture_option: true
   *   }
   *   handler: function(type, ev, inst) {
   *     // trigger gesture event
   *     inst.trigger(this.name, ev);
   *   }
   * }

   * @param   {String}    name
   * this should be the name of the gesture, lowercase
   * it is also being used to disable/enable the gesture per instance config.
   *
   * @param   {Number}    [index=1000]
   * the index of the gesture, where it is going to be in the stack of gestures detection
   * like when you build an gesture that depends on the drag gesture, it is a good
   * idea to place it after the index of the drag gesture.
   *
   * @param   {Object}    [defaults={}]
   * the default settings of the gesture. these are added to the instance settings,
   * and can be overruled per instance. you can also add the name of the gesture,
   * but this is also added by default (and set to true).
   *
   * @param   {Function}  handler
   * this handles the gesture detection of your custom gesture and receives the
   * following arguments:
   *
   *      @param  {Object}    eventData
   *      event data containing the following properties:
   *          timeStamp   {Number}        time the event occurred
   *          target      {HTMLElement}   target element
   *          touches     {Array}         touches (fingers, pointers, mouse) on the screen
   *          pointerType {String}        kind of pointer that was used. matches ionic.Gestures.POINTER_MOUSE|TOUCH
   *          center      {Object}        center position of the touches. contains pageX and pageY
   *          deltaTime   {Number}        the total time of the touches in the screen
   *          deltaX      {Number}        the delta on x axis we haved moved
   *          deltaY      {Number}        the delta on y axis we haved moved
   *          velocityX   {Number}        the velocity on the x
   *          velocityY   {Number}        the velocity on y
   *          angle       {Number}        the angle we are moving
   *          direction   {String}        the direction we are moving. matches ionic.Gestures.DIRECTION_UP|DOWN|LEFT|RIGHT
   *          distance    {Number}        the distance we haved moved
   *          scale       {Number}        scaling of the touches, needs 2 touches
   *          rotation    {Number}        rotation of the touches, needs 2 touches *
   *          eventType   {String}        matches ionic.Gestures.EVENT_START|MOVE|END
   *          srcEvent    {Object}        the source event, like TouchStart or MouseDown *
   *          startEvent  {Object}        contains the same properties as above,
   *                                      but from the first touch. this is used to calculate
   *                                      distances, deltaTime, scaling etc
   *
   *      @param  {ionic.Gestures.Instance}    inst
   *      the instance we are doing the detection for. you can get the options from
   *      the inst.options object and trigger the gesture event by calling inst.trigger
   *
   *
   * Handle gestures
   * --------------------
   * inside the handler you can get/set ionic.Gestures.detectionic.current. This is the current
   * detection sessionic. It has the following properties
   *      @param  {String}    name
   *      contains the name of the gesture we have detected. it has not a real function,
   *      only to check in other gestures if something is detected.
   *      like in the drag gesture we set it to 'drag' and in the swipe gesture we can
   *      check if the current gesture is 'drag' by accessing ionic.Gestures.detectionic.current.name
   *
   *      readonly
   *      @param  {ionic.Gestures.Instance}    inst
   *      the instance we do the detection for
   *
   *      readonly
   *      @param  {Object}    startEvent
   *      contains the properties of the first gesture detection in this sessionic.
   *      Used for calculations about timing, distance, etc.
   *
   *      readonly
   *      @param  {Object}    lastEvent
   *      contains all the properties of the last gesture detect in this sessionic.
   *
   * after the gesture detection session has been completed (user has released the screen)
   * the ionic.Gestures.detectionic.current object is copied into ionic.Gestures.detectionic.previous,
   * this is usefull for gestures like doubletap, where you need to know if the
   * previous gesture was a tap
   *
   * options that have been set by the instance can be received by calling inst.options
   *
   * You can trigger a gesture event by calling inst.trigger("mygesture", event).
   * The first param is the name of your gesture, the second the event argument
   *
   *
   * Register gestures
   * --------------------
   * When an gesture is added to the ionic.Gestures.gestures object, it is auto registered
   * at the setup of the first ionic.Gestures instance. You can also call ionic.Gestures.detectionic.register
   * manually and pass your gesture object as a param
   *
   */

  /**
   * Hold
   * Touch stays at the same place for x time
   * events  hold
   */
  ionic.Gestures.gestures.Hold = {
    name: 'hold',
    index: 10,
    defaults: {
      hold_timeout: 500,
      hold_threshold: 9
    },
    timer: null,
    handler: function holdGesture(ev, inst) {
      switch(ev.eventType) {
        case ionic.Gestures.EVENT_START:
          // clear any running timers
          clearTimeout(this.timer);

          // set the gesture so we can check in the timeout if it still is
          ionic.Gestures.detection.current.name = this.name;

          // set timer and if after the timeout it still is hold,
          // we trigger the hold event
          this.timer = setTimeout(function() {
            if(ionic.Gestures.detection.current.name == 'hold') {
              ionic.tap.cancelClick();
              inst.trigger('hold', ev);
            }
          }, inst.options.hold_timeout);
          break;

          // when you move or end we clear the timer
        case ionic.Gestures.EVENT_MOVE:
          if(ev.distance > inst.options.hold_threshold) {
            clearTimeout(this.timer);
          }
          break;

        case ionic.Gestures.EVENT_END:
          clearTimeout(this.timer);
          break;
      }
    }
  };


  /**
   * Tap/DoubleTap
   * Quick touch at a place or double at the same place
   * events  tap, doubletap
   */
  ionic.Gestures.gestures.Tap = {
    name: 'tap',
    index: 100,
    defaults: {
      tap_max_touchtime: 250,
      tap_max_distance: 10,
      tap_always: true,
      doubletap_distance: 20,
      doubletap_interval: 300
    },
    handler: function tapGesture(ev, inst) {
      if(ev.eventType == ionic.Gestures.EVENT_END && ev.srcEvent.type != 'touchcancel') {
        // previous gesture, for the double tap since these are two different gesture detections
        var prev = ionic.Gestures.detection.previous,
        did_doubletap = false;

        // when the touchtime is higher then the max touch time
        // or when the moving distance is too much
        if(ev.deltaTime > inst.options.tap_max_touchtime ||
            ev.distance > inst.options.tap_max_distance) {
              return;
            }

        // check if double tap
        if(prev && prev.name == 'tap' &&
            (ev.timeStamp - prev.lastEvent.timeStamp) < inst.options.doubletap_interval &&
            ev.distance < inst.options.doubletap_distance) {
              inst.trigger('doubletap', ev);
              did_doubletap = true;
            }

        // do a single tap
        if(!did_doubletap || inst.options.tap_always) {
          ionic.Gestures.detection.current.name = 'tap';
          inst.trigger('tap', ev);
        }
      }
    }
  };


  /**
   * Swipe
   * triggers swipe events when the end velocity is above the threshold
   * events  swipe, swipeleft, swiperight, swipeup, swipedown
   */
  ionic.Gestures.gestures.Swipe = {
    name: 'swipe',
    index: 40,
    defaults: {
      // set 0 for unlimited, but this can conflict with transform
      swipe_max_touches: 1,
      swipe_velocity: 0.4
    },
    handler: function swipeGesture(ev, inst) {
      if(ev.eventType == ionic.Gestures.EVENT_END) {
        // max touches
        if(inst.options.swipe_max_touches > 0 &&
            ev.touches.length > inst.options.swipe_max_touches) {
              return;
            }

        // when the distance we moved is too small we skip this gesture
        // or we can be already in dragging
        if(ev.velocityX > inst.options.swipe_velocity ||
            ev.velocityY > inst.options.swipe_velocity) {
              // trigger swipe events
              inst.trigger(this.name, ev);
              inst.trigger(this.name + ev.direction, ev);
            }
      }
    }
  };


  /**
   * Drag
   * Move with x fingers (default 1) around on the page. Blocking the scrolling when
   * moving left and right is a good practice. When all the drag events are blocking
   * you disable scrolling on that area.
   * events  drag, drapleft, dragright, dragup, dragdown
   */
  ionic.Gestures.gestures.Drag = {
    name: 'drag',
    index: 50,
    defaults: {
      drag_min_distance: 10,
      // Set correct_for_drag_min_distance to true to make the starting point of the drag
      // be calculated from where the drag was triggered, not from where the touch started.
      // Useful to avoid a jerk-starting drag, which can make fine-adjustments
      // through dragging difficult, and be visually unappealing.
      correct_for_drag_min_distance: true,
      // set 0 for unlimited, but this can conflict with transform
      drag_max_touches: 1,
      // prevent default browser behavior when dragging occurs
      // be careful with it, it makes the element a blocking element
      // when you are using the drag gesture, it is a good practice to set this true
      drag_block_horizontal: true,
      drag_block_vertical: true,
      // drag_lock_to_axis keeps the drag gesture on the axis that it started on,
      // It disallows vertical directions if the initial direction was horizontal, and vice versa.
      drag_lock_to_axis: false,
      // drag lock only kicks in when distance > drag_lock_min_distance
      // This way, locking occurs only when the distance has become large enough to reliably determine the direction
      drag_lock_min_distance: 25,
      // prevent default if the gesture is going the given direction
      prevent_default_directions: []
    },
    triggered: false,
    handler: function dragGesture(ev, inst) {
      if (ev.srcEvent.type == 'touchstart' || ev.srcEvent.type == 'touchend') {
        this.preventedFirstMove = false;

      } else if (!this.preventedFirstMove && ev.srcEvent.type == 'touchmove') {
        // Prevent gestures that are not intended for this event handler from firing subsequent times
        if (inst.options.prevent_default_directions.length > 0
            && inst.options.prevent_default_directions.indexOf(ev.direction) != -1) {
          ev.srcEvent.preventDefault();
        }
        this.preventedFirstMove = true;
      }

      // current gesture isnt drag, but dragged is true
      // this means an other gesture is busy. now call dragend
      if(ionic.Gestures.detection.current.name != this.name && this.triggered) {
        inst.trigger(this.name + 'end', ev);
        this.triggered = false;
        return;
      }

      // max touches
      if(inst.options.drag_max_touches > 0 &&
          ev.touches.length > inst.options.drag_max_touches) {
            return;
          }

      switch(ev.eventType) {
        case ionic.Gestures.EVENT_START:
          this.triggered = false;
          break;

        case ionic.Gestures.EVENT_MOVE:
          // when the distance we moved is too small we skip this gesture
          // or we can be already in dragging
          if(ev.distance < inst.options.drag_min_distance &&
              ionic.Gestures.detection.current.name != this.name) {
                return;
              }

          // we are dragging!
          if(ionic.Gestures.detection.current.name != this.name) {
            ionic.Gestures.detection.current.name = this.name;
            if (inst.options.correct_for_drag_min_distance) {
              // When a drag is triggered, set the event center to drag_min_distance pixels from the original event center.
              // Without this correction, the dragged distance would jumpstart at drag_min_distance pixels instead of at 0.
              // It might be useful to save the original start point somewhere
              var factor = Math.abs(inst.options.drag_min_distance / ev.distance);
              ionic.Gestures.detection.current.startEvent.center.pageX += ev.deltaX * factor;
              ionic.Gestures.detection.current.startEvent.center.pageY += ev.deltaY * factor;

              // recalculate event data using new start point
              ev = ionic.Gestures.detection.extendEventData(ev);
            }
          }

          // lock drag to axis?
          if(ionic.Gestures.detection.current.lastEvent.drag_locked_to_axis || (inst.options.drag_lock_to_axis && inst.options.drag_lock_min_distance <= ev.distance)) {
            ev.drag_locked_to_axis = true;
          }
          var last_direction = ionic.Gestures.detection.current.lastEvent.direction;
          if(ev.drag_locked_to_axis && last_direction !== ev.direction) {
            // keep direction on the axis that the drag gesture started on
            if(ionic.Gestures.utils.isVertical(last_direction)) {
              ev.direction = (ev.deltaY < 0) ? ionic.Gestures.DIRECTION_UP : ionic.Gestures.DIRECTION_DOWN;
            }
            else {
              ev.direction = (ev.deltaX < 0) ? ionic.Gestures.DIRECTION_LEFT : ionic.Gestures.DIRECTION_RIGHT;
            }
          }

          // first time, trigger dragstart event
          if(!this.triggered) {
            inst.trigger(this.name + 'start', ev);
            this.triggered = true;
          }

          // trigger normal event
          inst.trigger(this.name, ev);

          // direction event, like dragdown
          inst.trigger(this.name + ev.direction, ev);

          // block the browser events
          if( (inst.options.drag_block_vertical && ionic.Gestures.utils.isVertical(ev.direction)) ||
              (inst.options.drag_block_horizontal && !ionic.Gestures.utils.isVertical(ev.direction))) {
                ev.preventDefault();
              }
          break;

        case ionic.Gestures.EVENT_END:
          // trigger dragend
          if(this.triggered) {
            inst.trigger(this.name + 'end', ev);
          }

          this.triggered = false;
          break;
      }
    }
  };


  /**
   * Transform
   * User want to scale or rotate with 2 fingers
   * events  transform, pinch, pinchin, pinchout, rotate
   */
  ionic.Gestures.gestures.Transform = {
    name: 'transform',
    index: 45,
    defaults: {
      // factor, no scale is 1, zoomin is to 0 and zoomout until higher then 1
      transform_min_scale: 0.01,
      // rotation in degrees
      transform_min_rotation: 1,
      // prevent default browser behavior when two touches are on the screen
      // but it makes the element a blocking element
      // when you are using the transform gesture, it is a good practice to set this true
      transform_always_block: false
    },
    triggered: false,
    handler: function transformGesture(ev, inst) {
      // current gesture isnt drag, but dragged is true
      // this means an other gesture is busy. now call dragend
      if(ionic.Gestures.detection.current.name != this.name && this.triggered) {
        inst.trigger(this.name + 'end', ev);
        this.triggered = false;
        return;
      }

      // atleast multitouch
      if(ev.touches.length < 2) {
        return;
      }

      // prevent default when two fingers are on the screen
      if(inst.options.transform_always_block) {
        ev.preventDefault();
      }

      switch(ev.eventType) {
        case ionic.Gestures.EVENT_START:
          this.triggered = false;
          break;

        case ionic.Gestures.EVENT_MOVE:
          var scale_threshold = Math.abs(1 - ev.scale);
          var rotation_threshold = Math.abs(ev.rotation);

          // when the distance we moved is too small we skip this gesture
          // or we can be already in dragging
          if(scale_threshold < inst.options.transform_min_scale &&
              rotation_threshold < inst.options.transform_min_rotation) {
                return;
              }

          // we are transforming!
          ionic.Gestures.detection.current.name = this.name;

          // first time, trigger dragstart event
          if(!this.triggered) {
            inst.trigger(this.name + 'start', ev);
            this.triggered = true;
          }

          inst.trigger(this.name, ev); // basic transform event

          // trigger rotate event
          if(rotation_threshold > inst.options.transform_min_rotation) {
            inst.trigger('rotate', ev);
          }

          // trigger pinch event
          if(scale_threshold > inst.options.transform_min_scale) {
            inst.trigger('pinch', ev);
            inst.trigger('pinch' + ((ev.scale < 1) ? 'in' : 'out'), ev);
          }
          break;

        case ionic.Gestures.EVENT_END:
          // trigger dragend
          if(this.triggered) {
            inst.trigger(this.name + 'end', ev);
          }

          this.triggered = false;
          break;
      }
    }
  };


  /**
   * Touch
   * Called as first, tells the user has touched the screen
   * events  touch
   */
  ionic.Gestures.gestures.Touch = {
    name: 'touch',
    index: -Infinity,
    defaults: {
      // call preventDefault at touchstart, and makes the element blocking by
      // disabling the scrolling of the page, but it improves gestures like
      // transforming and dragging.
      // be careful with using this, it can be very annoying for users to be stuck
      // on the page
      prevent_default: false,

      // disable mouse events, so only touch (or pen!) input triggers events
      prevent_mouseevents: false
    },
    handler: function touchGesture(ev, inst) {
      if(inst.options.prevent_mouseevents && ev.pointerType == ionic.Gestures.POINTER_MOUSE) {
        ev.stopDetect();
        return;
      }

      if(inst.options.prevent_default) {
        ev.preventDefault();
      }

      if(ev.eventType == ionic.Gestures.EVENT_START) {
        inst.trigger(this.name, ev);
      }
    }
  };


  /**
   * Release
   * Called as last, tells the user has released the screen
   * events  release
   */
  ionic.Gestures.gestures.Release = {
    name: 'release',
    index: Infinity,
    handler: function releaseGesture(ev, inst) {
      if(ev.eventType == ionic.Gestures.EVENT_END) {
        inst.trigger(this.name, ev);
      }
    }
  };
})(window.ionic);

(function(window, document, ionic) {

  function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }

  var IOS = 'ios';
  var ANDROID = 'android';
  var WINDOWS_PHONE = 'windowsphone';
  var EDGE = 'edge';
  var CROSSWALK = 'crosswalk';
  var requestAnimationFrame = ionic.requestAnimationFrame;

  /**
   * @ngdoc utility
   * @name ionic.Platform
   * @module ionic
   * @description
   * A set of utility methods that can be used to retrieve the device ready state and
   * various other information such as what kind of platform the app is currently installed on.
   *
   * @usage
   * ```js
   * angular.module('PlatformApp', ['ionic'])
   * .controller('PlatformCtrl', function($scope) {
   *
   *   ionic.Platform.ready(function(){
   *     // will execute when device is ready, or immediately if the device is already ready.
   *   });
   *
   *   var deviceInformation = ionic.Platform.device();
   *
   *   var isWebView = ionic.Platform.isWebView();
   *   var isIPad = ionic.Platform.isIPad();
   *   var isIOS = ionic.Platform.isIOS();
   *   var isAndroid = ionic.Platform.isAndroid();
   *   var isWindowsPhone = ionic.Platform.isWindowsPhone();
   *
   *   var currentPlatform = ionic.Platform.platform();
   *   var currentPlatformVersion = ionic.Platform.version();
   *
   *   ionic.Platform.exitApp(); // stops the app
   * });
   * ```
   */
  var self = ionic.Platform = {

    // Put navigator on platform so it can be mocked and set
    // the browser does not allow window.navigator to be set
    navigator: window.navigator,

    /**
     * @ngdoc property
     * @name ionic.Platform#isReady
     * @returns {boolean} Whether the device is ready.
     */
    isReady: false,
    /**
     * @ngdoc property
     * @name ionic.Platform#isFullScreen
     * @returns {boolean} Whether the device is fullscreen.
     */
    isFullScreen: false,
    /**
     * @ngdoc property
     * @name ionic.Platform#platforms
     * @returns {Array(string)} An array of all platforms found.
     */
    platforms: null,
    /**
     * @ngdoc property
     * @name ionic.Platform#grade
     * @returns {string} What grade the current platform is.
     */
    grade: null,
    /**
     * @ngdoc property
     * @name ionic.Platform#ua
     * @returns {string} What User Agent is.
     */
    ua: navigator.userAgent,

    /**
     * @ngdoc method
     * @name ionic.Platform#ready
     * @description
     * Trigger a callback once the device is ready, or immediately
     * if the device is already ready. This method can be run from
     * anywhere and does not need to be wrapped by any additonal methods.
     * When the app is within a WebView (Cordova), it'll fire
     * the callback once the device is ready. If the app is within
     * a web browser, it'll fire the callback after `window.load`.
     * Please remember that Cordova features (Camera, FileSystem, etc) still
     * will not work in a web browser.
     * @param {function} callback The function to call.
     */
    ready: function(cb) {
      // run through tasks to complete now that the device is ready
      if (self.isReady) {
        cb();
      } else {
        // the platform isn't ready yet, add it to this array
        // which will be called once the platform is ready
        readyCallbacks.push(cb);
      }
    },

    /**
     * @private
     */
    detect: function() {
      self._checkPlatforms();

      requestAnimationFrame(function() {
        // only add to the body class if we got platform info
        for (var i = 0; i < self.platforms.length; i++) {
          document.body.classList.add('platform-' + self.platforms[i]);
        }
      });
    },

    /**
     * @ngdoc method
     * @name ionic.Platform#setGrade
     * @description Set the grade of the device: 'a', 'b', or 'c'. 'a' is the best
     * (most css features enabled), 'c' is the worst.  By default, sets the grade
     * depending on the current device.
     * @param {string} grade The new grade to set.
     */
    setGrade: function(grade) {
      var oldGrade = self.grade;
      self.grade = grade;
      requestAnimationFrame(function() {
        if (oldGrade) {
          document.body.classList.remove('grade-' + oldGrade);
        }
        document.body.classList.add('grade-' + grade);
      });
    },

    /**
     * @ngdoc method
     * @name ionic.Platform#device
     * @description Return the current device (given by cordova).
     * @returns {object} The device object.
     */
    device: function() {
      return window.device || {};
    },

    _checkPlatforms: function() {
      self.platforms = [];
      var grade = 'a';

      if (self.isWebView()) {
        self.platforms.push('webview');
        if (!(!window.cordova && !window.PhoneGap && !window.phonegap)) {
          self.platforms.push('cordova');
        } else if (typeof window.forge === 'object') {
          self.platforms.push('trigger');
        }
      } else {
        self.platforms.push('browser');
      }
      if (self.isIPad()) self.platforms.push('ipad');

      var platform = self.platform();
      if (platform) {
        self.platforms.push(platform);

        var version = self.version();
        if (version) {
          var v = version.toString();
          if (v.indexOf('.') > 0) {
            v = v.replace('.', '_');
          } else {
            v += '_0';
          }
          self.platforms.push(platform + v.split('_')[0]);
          self.platforms.push(platform + v);

          if (self.isAndroid() && version < 4.4) {
            grade = (version < 4 ? 'c' : 'b');
          } else if (self.isWindowsPhone()) {
            grade = 'b';
          }
        }
      }

      self.setGrade(grade);
    },

    /**
     * @ngdoc method
     * @name ionic.Platform#isWebView
     * @returns {boolean} Check if we are running within a WebView (such as Cordova).
     */
    isWebView: function() {
      return !(!window.cordova && !window.PhoneGap && !window.phonegap && window.forge !== 'object');
    },
    /**
     * @ngdoc method
     * @name ionic.Platform#isIPad
     * @returns {boolean} Whether we are running on iPad.
     */
    isIPad: function() {
      if (/iPad/i.test(self.navigator.platform)) {
        return true;
      }
      return /iPad/i.test(self.ua);
    },
    /**
     * @ngdoc method
     * @name ionic.Platform#isIOS
     * @returns {boolean} Whether we are running on iOS.
     */
    isIOS: function() {
      return self.is(IOS);
    },
    /**
     * @ngdoc method
     * @name ionic.Platform#isAndroid
     * @returns {boolean} Whether we are running on Android.
     */
    isAndroid: function() {
      return self.is(ANDROID);
    },
    /**
     * @ngdoc method
     * @name ionic.Platform#isWindowsPhone
     * @returns {boolean} Whether we are running on Windows Phone.
     */
    isWindowsPhone: function() {
      return self.is(WINDOWS_PHONE);
    },
    /**
     * @ngdoc method
     * @name ionic.Platform#isEdge
     * @returns {boolean} Whether we are running on MS Edge/Windows 10 (inc. Phone)
     */
    isEdge: function() {
      return self.is(EDGE);
    },

    isCrosswalk: function() {
      return self.is(CROSSWALK);
    },

    /**
     * @ngdoc method
     * @name ionic.Platform#platform
     * @returns {string} The name of the current platform.
     */
    platform: function() {
      // singleton to get the platform name
      if (platformName === null) self.setPlatform(self.device().platform);
      return platformName;
    },

    /**
     * @private
     */
    setPlatform: function(n) {
      if (typeof n != 'undefined' && n !== null && n.length) {
        platformName = n.toLowerCase();
      } else if (getParameterByName('ionicplatform')) {
        platformName = getParameterByName('ionicplatform');
      } else if (self.ua.indexOf('Edge') > -1) {
        platformName = EDGE;
      } else if (self.ua.indexOf('Windows Phone') > -1) {
        platformName = WINDOWS_PHONE;
      } else if (self.ua.indexOf('Android') > 0) {
        platformName = ANDROID;
      } else if (/iPhone|iPad|iPod/.test(self.ua)) {
        platformName = IOS;
      } else {
        platformName = self.navigator.platform && navigator.platform.toLowerCase().split(' ')[0] || '';
      }
    },

    /**
     * @ngdoc method
     * @name ionic.Platform#version
     * @returns {number} The version of the current device platform.
     */
    version: function() {
      // singleton to get the platform version
      if (platformVersion === null) self.setVersion(self.device().version);
      return platformVersion;
    },

    /**
     * @private
     */
    setVersion: function(v) {
      if (typeof v != 'undefined' && v !== null) {
        v = v.split('.');
        v = parseFloat(v[0] + '.' + (v.length > 1 ? v[1] : 0));
        if (!isNaN(v)) {
          platformVersion = v;
          return;
        }
      }

      platformVersion = 0;

      // fallback to user-agent checking
      var pName = self.platform();
      var versionMatch = {
        'android': /Android (\d+).(\d+)?/,
        'ios': /OS (\d+)_(\d+)?/,
        'windowsphone': /Windows Phone (\d+).(\d+)?/
      };
      if (versionMatch[pName]) {
        v = self.ua.match(versionMatch[pName]);
        if (v && v.length > 2) {
          platformVersion = parseFloat(v[1] + '.' + v[2]);
        }
      }
    },

    /**
     * @ngdoc method
     * @name ionic.Platform#is
     * @param {string} Platform name.
     * @returns {boolean} Whether the platform name provided is detected.
     */
    is: function(type) {
      type = type.toLowerCase();
      // check if it has an array of platforms
      if (self.platforms) {
        for (var x = 0; x < self.platforms.length; x++) {
          if (self.platforms[x] === type) return true;
        }
      }
      // exact match
      var pName = self.platform();
      if (pName) {
        return pName === type.toLowerCase();
      }

      // A quick hack for to check userAgent
      return self.ua.toLowerCase().indexOf(type) >= 0;
    },

    /**
     * @ngdoc method
     * @name ionic.Platform#exitApp
     * @description Exit the app.
     */
    exitApp: function() {
      self.ready(function() {
        navigator.app && navigator.app.exitApp && navigator.app.exitApp();
      });
    },

    /**
     * @ngdoc method
     * @name ionic.Platform#showStatusBar
     * @description Shows or hides the device status bar (in Cordova). Requires `cordova plugin add org.apache.cordova.statusbar`
     * @param {boolean} shouldShow Whether or not to show the status bar.
     */
    showStatusBar: function(val) {
      // Only useful when run within cordova
      self._showStatusBar = val;
      self.ready(function() {
        // run this only when or if the platform (cordova) is ready
        requestAnimationFrame(function() {
          if (self._showStatusBar) {
            // they do not want it to be full screen
            window.StatusBar && window.StatusBar.show();
            document.body.classList.remove('status-bar-hide');
          } else {
            // it should be full screen
            window.StatusBar && window.StatusBar.hide();
            document.body.classList.add('status-bar-hide');
          }
        });
      });
    },

    /**
     * @ngdoc method
     * @name ionic.Platform#fullScreen
     * @description
     * Sets whether the app is fullscreen or not (in Cordova).
     * @param {boolean=} showFullScreen Whether or not to set the app to fullscreen. Defaults to true. Requires `cordova plugin add org.apache.cordova.statusbar`
     * @param {boolean=} showStatusBar Whether or not to show the device's status bar. Defaults to false.
     */
    fullScreen: function(showFullScreen, showStatusBar) {
      // showFullScreen: default is true if no param provided
      self.isFullScreen = (showFullScreen !== false);

      // add/remove the fullscreen classname to the body
      ionic.DomUtil.ready(function() {
        // run this only when or if the DOM is ready
        requestAnimationFrame(function() {
          if (self.isFullScreen) {
            document.body.classList.add('fullscreen');
          } else {
            document.body.classList.remove('fullscreen');
          }
        });
        // showStatusBar: default is false if no param provided
        self.showStatusBar((showStatusBar === true));
      });
    }

  };

  var platformName = null, // just the name, like iOS or Android
  platformVersion = null, // a float of the major and minor, like 7.1
  readyCallbacks = [],
  windowLoadListenderAttached,
  platformReadyTimer = 2000; // How long to wait for platform ready before emitting a warning

  verifyPlatformReady();

  // Warn the user if deviceready did not fire in a reasonable amount of time, and how to fix it.
  function verifyPlatformReady() {
    setTimeout(function() {
      if(!self.isReady && self.isWebView()) {
        void 0;
      }
    }, platformReadyTimer);
  }

  // setup listeners to know when the device is ready to go
  function onWindowLoad() {
    if (self.isWebView()) {
      // the window and scripts are fully loaded, and a cordova/phonegap
      // object exists then let's listen for the deviceready
      document.addEventListener("deviceready", onPlatformReady, false);
    } else {
      // the window and scripts are fully loaded, but the window object doesn't have the
      // cordova/phonegap object, so its just a browser, not a webview wrapped w/ cordova
      onPlatformReady();
    }
    if (windowLoadListenderAttached) {
      window.removeEventListener("load", onWindowLoad, false);
    }
  }
  if (document.readyState === 'complete') {
    onWindowLoad();
  } else {
    windowLoadListenderAttached = true;
    window.addEventListener("load", onWindowLoad, false);
  }

  function onPlatformReady() {
    // the device is all set to go, init our own stuff then fire off our event
    self.isReady = true;
    self.detect();
    for (var x = 0; x < readyCallbacks.length; x++) {
      // fire off all the callbacks that were added before the platform was ready
      readyCallbacks[x]();
    }
    readyCallbacks = [];
    ionic.trigger('platformready', { target: document });

    requestAnimationFrame(function() {
      document.body.classList.add('platform-ready');
    });
  }

})(window, document, ionic);

(function(document, ionic) {
  'use strict';

  // Ionic CSS polyfills
  ionic.CSS = {};
  ionic.CSS.TRANSITION = [];
  ionic.CSS.TRANSFORM = [];

  ionic.EVENTS = {};

  (function() {

    // transform
    var i, keys = ['webkitTransform', 'transform', '-webkit-transform', 'webkit-transform',
                   '-moz-transform', 'moz-transform', 'MozTransform', 'mozTransform', 'msTransform'];

    for (i = 0; i < keys.length; i++) {
      if (document.documentElement.style[keys[i]] !== undefined) {
        ionic.CSS.TRANSFORM = keys[i];
        break;
      }
    }

    // transition
    keys = ['webkitTransition', 'mozTransition', 'msTransition', 'transition'];
    for (i = 0; i < keys.length; i++) {
      if (document.documentElement.style[keys[i]] !== undefined) {
        ionic.CSS.TRANSITION = keys[i];
        break;
      }
    }

    // Fallback in case the keys don't exist at all
    ionic.CSS.TRANSITION = ionic.CSS.TRANSITION || 'transition';

    // The only prefix we care about is webkit for transitions.
    var isWebkit = ionic.CSS.TRANSITION.indexOf('webkit') > -1;

    // transition duration
    ionic.CSS.TRANSITION_DURATION = (isWebkit ? '-webkit-' : '') + 'transition-duration';

    // To be sure transitionend works everywhere, include *both* the webkit and non-webkit events
    ionic.CSS.TRANSITIONEND = (isWebkit ? 'webkitTransitionEnd ' : '') + 'transitionend';
  })();

  (function() {
      var touchStartEvent = 'touchstart';
      var touchMoveEvent = 'touchmove';
      var touchEndEvent = 'touchend';
      var touchCancelEvent = 'touchcancel';

      if (window.navigator.pointerEnabled) {
        touchStartEvent = 'pointerdown';
        touchMoveEvent = 'pointermove';
        touchEndEvent = 'pointerup';
        touchCancelEvent = 'pointercancel';
      } else if (window.navigator.msPointerEnabled) {
        touchStartEvent = 'MSPointerDown';
        touchMoveEvent = 'MSPointerMove';
        touchEndEvent = 'MSPointerUp';
        touchCancelEvent = 'MSPointerCancel';
      }

      ionic.EVENTS.touchstart = touchStartEvent;
      ionic.EVENTS.touchmove = touchMoveEvent;
      ionic.EVENTS.touchend = touchEndEvent;
      ionic.EVENTS.touchcancel = touchCancelEvent;
  })();

  // classList polyfill for them older Androids
  // https://gist.github.com/devongovett/1381839
  if (!("classList" in document.documentElement) && Object.defineProperty && typeof HTMLElement !== 'undefined') {
    Object.defineProperty(HTMLElement.prototype, 'classList', {
      get: function() {
        var self = this;
        function update(fn) {
          return function() {
            var x, classes = self.className.split(/\s+/);

            for (x = 0; x < arguments.length; x++) {
              fn(classes, classes.indexOf(arguments[x]), arguments[x]);
            }

            self.className = classes.join(" ");
          };
        }

        return {
          add: update(function(classes, index, value) {
            ~index || classes.push(value);
          }),

          remove: update(function(classes, index) {
            ~index && classes.splice(index, 1);
          }),

          toggle: update(function(classes, index, value) {
            ~index ? classes.splice(index, 1) : classes.push(value);
          }),

          contains: function(value) {
            return !!~self.className.split(/\s+/).indexOf(value);
          },

          item: function(i) {
            return self.className.split(/\s+/)[i] || null;
          }
        };

      }
    });
  }

})(document, ionic);


/**
 * @ngdoc page
 * @name tap
 * @module ionic
 * @description
 * On touch devices such as a phone or tablet, some browsers implement a 300ms delay between
 * the time the user stops touching the display and the moment the browser executes the
 * click. This delay was initially introduced so the browser can know whether the user wants to
 * double-tap to zoom in on the webpage.  Basically, the browser waits roughly 300ms to see if
 * the user is double-tapping, or just tapping on the display once.
 *
 * Out of the box, Ionic automatically removes the 300ms delay in order to make Ionic apps
 * feel more "native" like. Resultingly, other solutions such as
 * [fastclick](https://github.com/ftlabs/fastclick) and Angular's
 * [ngTouch](https://docs.angularjs.org/api/ngTouch) should not be included, to avoid conflicts.
 *
 * Some browsers already remove the delay with certain settings, such as the CSS property
 * `touch-events: none` or with specific meta tag viewport values. However, each of these
 * browsers still handle clicks differently, such as when to fire off or cancel the event
 * (like scrolling when the target is a button, or holding a button down).
 * For browsers that already remove the 300ms delay, consider Ionic's tap system as a way to
 * normalize how clicks are handled across the various devices so there's an expected response
 * no matter what the device, platform or version. Additionally, Ionic will prevent
 * ghostclicks which even browsers that remove the delay still experience.
 *
 * In some cases, third-party libraries may also be working with touch events which can interfere
 * with the tap system. For example, mapping libraries like Google or Leaflet Maps often implement
 * a touch detection system which conflicts with Ionic's tap system.
 *
 * ### Disabling the tap system
 *
 * To disable the tap for an element and all of its children elements,
 * add the attribute `data-tap-disabled="true"`.
 *
 * ```html
 * <div data-tap-disabled="true">
 *     <div id="google-map"></div>
 * </div>
 * ```
 *
 * ### Additional Notes:
 *
 * - Ionic tap  works with Ionic's JavaScript scrolling
 * - Elements can come and go from the DOM and Ionic tap doesn't keep adding and removing
 *   listeners
 * - No "tap delay" after the first "tap" (you can tap as fast as you want, they all click)
 * - Minimal events listeners, only being added to document
 * - Correct focus in/out on each input type (select, textearea, range) on each platform/device
 * - Shows and hides virtual keyboard correctly for each platform/device
 * - Works with labels surrounding inputs
 * - Does not fire off a click if the user moves the pointer too far
 * - Adds and removes an 'activated' css class
 * - Multiple [unit tests](https://github.com/driftyco/ionic/blob/master/test/unit/utils/tap.unit.js) for each scenario
 *
 */
/*

 IONIC TAP
 ---------------
 - Both touch and mouse events are added to the document.body on DOM ready
 - If a touch event happens, it does not use mouse event listeners
 - On touchend, if the distance between start and end was small, trigger a click
 - In the triggered click event, add a 'isIonicTap' property
 - The triggered click receives the same x,y coordinates as as the end event
 - On document.body click listener (with useCapture=true), only allow clicks with 'isIonicTap'
 - Triggering clicks with mouse events work the same as touch, except with mousedown/mouseup
 - Tapping inputs is disabled during scrolling
*/

var tapDoc; // the element which the listeners are on (document.body)
var tapActiveEle; // the element which is active (probably has focus)
var tapEnabledTouchEvents;
var tapMouseResetTimer;
var tapPointerMoved;
var tapPointerStart;
var tapTouchFocusedInput;
var tapLastTouchTarget;
var tapTouchMoveListener = 'touchmove';

// how much the coordinates can be off between start/end, but still a click
var TAP_RELEASE_TOLERANCE = 12; // default tolerance
var TAP_RELEASE_BUTTON_TOLERANCE = 50; // button elements should have a larger tolerance

var tapEventListeners = {
  'click': tapClickGateKeeper,

  'mousedown': tapMouseDown,
  'mouseup': tapMouseUp,
  'mousemove': tapMouseMove,

  'touchstart': tapTouchStart,
  'touchend': tapTouchEnd,
  'touchcancel': tapTouchCancel,
  'touchmove': tapTouchMove,

  'pointerdown': tapTouchStart,
  'pointerup': tapTouchEnd,
  'pointercancel': tapTouchCancel,
  'pointermove': tapTouchMove,

  'MSPointerDown': tapTouchStart,
  'MSPointerUp': tapTouchEnd,
  'MSPointerCancel': tapTouchCancel,
  'MSPointerMove': tapTouchMove,

  'focusin': tapFocusIn,
  'focusout': tapFocusOut
};

ionic.tap = {

  register: function(ele) {
    tapDoc = ele;

    tapEventListener('click', true, true);
    tapEventListener('mouseup');
    tapEventListener('mousedown');

    if (window.navigator.pointerEnabled) {
      tapEventListener('pointerdown');
      tapEventListener('pointerup');
      tapEventListener('pointercancel');
      tapTouchMoveListener = 'pointermove';

    } else if (window.navigator.msPointerEnabled) {
      tapEventListener('MSPointerDown');
      tapEventListener('MSPointerUp');
      tapEventListener('MSPointerCancel');
      tapTouchMoveListener = 'MSPointerMove';

    } else {
      tapEventListener('touchstart');
      tapEventListener('touchend');
      tapEventListener('touchcancel');
    }

    tapEventListener('focusin');
    tapEventListener('focusout');

    return function() {
      for (var type in tapEventListeners) {
        tapEventListener(type, false);
      }
      tapDoc = null;
      tapActiveEle = null;
      tapEnabledTouchEvents = false;
      tapPointerMoved = false;
      tapPointerStart = null;
    };
  },

  ignoreScrollStart: function(e) {
    return (e.defaultPrevented) ||  // defaultPrevented has been assigned by another component handling the event
           (/^(file|range)$/i).test(e.target.type) ||
           (e.target.dataset ? e.target.dataset.preventScroll : e.target.getAttribute('data-prevent-scroll')) == 'true' || // manually set within an elements attributes
           (!!(/^(object|embed)$/i).test(e.target.tagName)) ||  // flash/movie/object touches should not try to scroll
           ionic.tap.isElementTapDisabled(e.target); // check if this element, or an ancestor, has `data-tap-disabled` attribute
  },

  isTextInput: function(ele) {
    return !!ele &&
           (ele.tagName == 'TEXTAREA' ||
            ele.contentEditable === 'true' ||
            (ele.tagName == 'INPUT' && !(/^(radio|checkbox|range|file|submit|reset|color|image|button)$/i).test(ele.type)));
  },

  isDateInput: function(ele) {
    return !!ele &&
            (ele.tagName == 'INPUT' && (/^(date|time|datetime-local|month|week)$/i).test(ele.type));
  },

  isVideo: function(ele) {
    return !!ele &&
            (ele.tagName == 'VIDEO');
  },

  isKeyboardElement: function(ele) {
    if ( !ionic.Platform.isIOS() || ionic.Platform.isIPad() ) {
      return ionic.tap.isTextInput(ele) && !ionic.tap.isDateInput(ele);
    } else {
      return ionic.tap.isTextInput(ele) || ( !!ele && ele.tagName == "SELECT");
    }
  },

  isLabelWithTextInput: function(ele) {
    var container = tapContainingElement(ele, false);

    return !!container &&
           ionic.tap.isTextInput(tapTargetElement(container));
  },

  containsOrIsTextInput: function(ele) {
    return ionic.tap.isTextInput(ele) || ionic.tap.isLabelWithTextInput(ele);
  },

  cloneFocusedInput: function(container) {
    if (ionic.tap.hasCheckedClone) return;
    ionic.tap.hasCheckedClone = true;

    ionic.requestAnimationFrame(function() {
      var focusInput = container.querySelector(':focus');
      if (ionic.tap.isTextInput(focusInput) && !ionic.tap.isDateInput(focusInput)) {
        var clonedInput = focusInput.cloneNode(true);

        clonedInput.value = focusInput.value;
        clonedInput.classList.add('cloned-text-input');
        clonedInput.readOnly = true;
        if (focusInput.isContentEditable) {
          clonedInput.contentEditable = focusInput.contentEditable;
          clonedInput.innerHTML = focusInput.innerHTML;
        }
        focusInput.parentElement.insertBefore(clonedInput, focusInput);
        focusInput.classList.add('previous-input-focus');

        clonedInput.scrollTop = focusInput.scrollTop;
      }
    });
  },

  hasCheckedClone: false,

  removeClonedInputs: function(container) {
    ionic.tap.hasCheckedClone = false;

    ionic.requestAnimationFrame(function() {
      var clonedInputs = container.querySelectorAll('.cloned-text-input');
      var previousInputFocus = container.querySelectorAll('.previous-input-focus');
      var x;

      for (x = 0; x < clonedInputs.length; x++) {
        clonedInputs[x].parentElement.removeChild(clonedInputs[x]);
      }

      for (x = 0; x < previousInputFocus.length; x++) {
        previousInputFocus[x].classList.remove('previous-input-focus');
        previousInputFocus[x].style.top = '';
        if ( ionic.keyboard.isOpen && !ionic.keyboard.isClosing ) previousInputFocus[x].focus();
      }
    });
  },

  requiresNativeClick: function(ele) {
    if (ionic.Platform.isWindowsPhone() && (ele.tagName == 'A' || ele.tagName == 'BUTTON' || ele.hasAttribute('ng-click') || (ele.tagName == 'INPUT' && (ele.type == 'button' || ele.type == 'submit')))) {
      return true; //Windows Phone edge case, prevent ng-click (and similar) events from firing twice on this platform
    }
    if (!ele || ele.disabled || (/^(file|range)$/i).test(ele.type) || (/^(object|video)$/i).test(ele.tagName) || ionic.tap.isLabelContainingFileInput(ele)) {
      return true;
    }
    return ionic.tap.isElementTapDisabled(ele);
  },

  isLabelContainingFileInput: function(ele) {
    var lbl = tapContainingElement(ele);
    if (lbl.tagName !== 'LABEL') return false;
    var fileInput = lbl.querySelector('input[type=file]');
    if (fileInput && fileInput.disabled === false) return true;
    return false;
  },

  isElementTapDisabled: function(ele) {
    if (ele && ele.nodeType === 1) {
      var element = ele;
      while (element) {
        if (element.getAttribute && element.getAttribute('data-tap-disabled') == 'true') {
          return true;
        }
        element = element.parentElement;
      }
    }
    return false;
  },

  setTolerance: function(releaseTolerance, releaseButtonTolerance) {
    TAP_RELEASE_TOLERANCE = releaseTolerance;
    TAP_RELEASE_BUTTON_TOLERANCE = releaseButtonTolerance;
  },

  cancelClick: function() {
    // used to cancel any simulated clicks which may happen on a touchend/mouseup
    // gestures uses this method within its tap and hold events
    tapPointerMoved = true;
  },

  pointerCoord: function(event) {
    // This method can get coordinates for both a mouse click
    // or a touch depending on the given event
    var c = { x: 0, y: 0 };
    if (event) {
      var touches = event.touches && event.touches.length ? event.touches : [event];
      var e = (event.changedTouches && event.changedTouches[0]) || touches[0];
      if (e) {
        c.x = e.clientX || e.pageX || 0;
        c.y = e.clientY || e.pageY || 0;
      }
    }
    return c;
  }

};

function tapEventListener(type, enable, useCapture) {
  if (enable !== false) {
    tapDoc.addEventListener(type, tapEventListeners[type], useCapture);
  } else {
    tapDoc.removeEventListener(type, tapEventListeners[type]);
  }
}

function tapClick(e) {
  // simulate a normal click by running the element's click method then focus on it
  var container = tapContainingElement(e.target);
  var ele = tapTargetElement(container);

  if (ionic.tap.requiresNativeClick(ele) || tapPointerMoved) return false;

  var c = ionic.tap.pointerCoord(e);

  //console.log('tapClick', e.type, ele.tagName, '('+c.x+','+c.y+')');
  triggerMouseEvent('click', ele, c.x, c.y);

  // if it's an input, focus in on the target, otherwise blur
  tapHandleFocus(ele);
}

function triggerMouseEvent(type, ele, x, y) {
  // using initMouseEvent instead of MouseEvent for our Android friends
  var clickEvent = document.createEvent("MouseEvents");
  clickEvent.initMouseEvent(type, true, true, window, 1, 0, 0, x, y, false, false, false, false, 0, null);
  clickEvent.isIonicTap = true;
  ele.dispatchEvent(clickEvent);
}

function tapClickGateKeeper(e) {
  //console.log('click ' + Date.now() + ' isIonicTap: ' + (e.isIonicTap ? true : false));
  if (e.target.type == 'submit' && e.detail === 0) {
    // do not prevent click if it came from an "Enter" or "Go" keypress submit
    return null;
  }

  // do not allow through any click events that were not created by ionic.tap
  if ((ionic.scroll.isScrolling && ionic.tap.containsOrIsTextInput(e.target)) ||
      (!e.isIonicTap && !ionic.tap.requiresNativeClick(e.target))) {
    //console.log('clickPrevent', e.target.tagName);
    e.stopPropagation();

    if (!ionic.tap.isLabelWithTextInput(e.target)) {
      // labels clicks from native should not preventDefault othersize keyboard will not show on input focus
      e.preventDefault();
    }
    return false;
  }
}

// MOUSE
function tapMouseDown(e) {
  //console.log('mousedown ' + Date.now());
  if (e.isIonicTap || tapIgnoreEvent(e)) return null;

  if (tapEnabledTouchEvents) {
    //console.log('mousedown', 'stop event');
    e.stopPropagation();

    if (!ionic.Platform.isEdge() && (!ionic.tap.isTextInput(e.target) || tapLastTouchTarget !== e.target) &&
      !isSelectOrOption(e.target.tagName) && !ionic.tap.isVideo(e.target)) {
      // If you preventDefault on a text input then you cannot move its text caret/cursor.
      // Allow through only the text input default. However, without preventDefault on an
      // input the 300ms delay can change focus on inputs after the keyboard shows up.
      // The focusin event handles the chance of focus changing after the keyboard shows.
      // Windows Phone - if you preventDefault on a video element then you cannot operate
      // its native controls.
      e.preventDefault();
    }

    return false;
  }

  tapPointerMoved = false;
  tapPointerStart = ionic.tap.pointerCoord(e);

  tapEventListener('mousemove');
  ionic.activator.start(e);
}

function tapMouseUp(e) {
  //console.log("mouseup " + Date.now());
  if (tapEnabledTouchEvents) {
    e.stopPropagation();
    e.preventDefault();
    return false;
  }

  if (tapIgnoreEvent(e) || isSelectOrOption(e.target.tagName)) return false;

  if (!tapHasPointerMoved(e)) {
    tapClick(e);
  }
  tapEventListener('mousemove', false);
  ionic.activator.end();
  tapPointerMoved = false;
}

function tapMouseMove(e) {
  if (tapHasPointerMoved(e)) {
    tapEventListener('mousemove', false);
    ionic.activator.end();
    tapPointerMoved = true;
    return false;
  }
}


// TOUCH
function tapTouchStart(e) {
  //console.log("touchstart " + Date.now());
  if (tapIgnoreEvent(e)) return;

  tapPointerMoved = false;

  tapEnableTouchEvents();
  tapPointerStart = ionic.tap.pointerCoord(e);

  tapEventListener(tapTouchMoveListener);
  ionic.activator.start(e);

  if (ionic.Platform.isIOS() && ionic.tap.isLabelWithTextInput(e.target)) {
    // if the tapped element is a label, which has a child input
    // then preventDefault so iOS doesn't ugly auto scroll to the input
    // but do not prevent default on Android or else you cannot move the text caret
    // and do not prevent default on Android or else no virtual keyboard shows up

    var textInput = tapTargetElement(tapContainingElement(e.target));
    if (textInput !== tapActiveEle) {
      // don't preventDefault on an already focused input or else iOS's text caret isn't usable
      //console.log('Would prevent default here');
      e.preventDefault();
    }
  }
}

function tapTouchEnd(e) {
  //console.log('touchend ' + Date.now());
  if (tapIgnoreEvent(e)) return;

  tapEnableTouchEvents();
  if (!tapHasPointerMoved(e)) {
    tapClick(e);

    if (isSelectOrOption(e.target.tagName)) {
      e.preventDefault();
    }
  }

  tapLastTouchTarget = e.target;
  tapTouchCancel();
}

function tapTouchMove(e) {
  if (tapHasPointerMoved(e)) {
    tapPointerMoved = true;
    tapEventListener(tapTouchMoveListener, false);
    ionic.activator.end();
    return false;
  }
}

function tapTouchCancel() {
  tapEventListener(tapTouchMoveListener, false);
  ionic.activator.end();
  tapPointerMoved = false;
}

function tapEnableTouchEvents() {
  tapEnabledTouchEvents = true;
  clearTimeout(tapMouseResetTimer);
  tapMouseResetTimer = setTimeout(function() {
    tapEnabledTouchEvents = false;
  }, 600);
}

function tapIgnoreEvent(e) {
  if (e.isTapHandled) return true;
  e.isTapHandled = true;

  if(ionic.tap.isElementTapDisabled(e.target)) {
    return true;
  }

  if (ionic.scroll.isScrolling && ionic.tap.containsOrIsTextInput(e.target)) {
    e.preventDefault();
    return true;
  }
}

function tapHandleFocus(ele) {
  tapTouchFocusedInput = null;

  var triggerFocusIn = false;

  if (ele.tagName == 'SELECT') {
    // trick to force Android options to show up
    triggerMouseEvent('mousedown', ele, 0, 0);
    ele.focus && ele.focus();
    triggerFocusIn = true;

  } else if (tapActiveElement() === ele) {
    // already is the active element and has focus
    triggerFocusIn = true;

  } else if ((/^(input|textarea|ion-label)$/i).test(ele.tagName) || ele.isContentEditable) {
    triggerFocusIn = true;
    ele.focus && ele.focus();
    ele.value = ele.value;
    if (tapEnabledTouchEvents) {
      tapTouchFocusedInput = ele;
    }

  } else {
    tapFocusOutActive();
  }

  if (triggerFocusIn) {
    tapActiveElement(ele);
    ionic.trigger('ionic.focusin', {
      target: ele
    }, true);
  }
}

function tapFocusOutActive() {
  var ele = tapActiveElement();
  if (ele && ((/^(input|textarea|select)$/i).test(ele.tagName) || ele.isContentEditable)) {
    //console.log('tapFocusOutActive', ele.tagName);
    ele.blur();
  }
  tapActiveElement(null);
}

function tapFocusIn(e) {
  //console.log('focusin ' + Date.now());
  // Because a text input doesn't preventDefault (so the caret still works) there's a chance
  // that its mousedown event 300ms later will change the focus to another element after
  // the keyboard shows up.

  if (tapEnabledTouchEvents &&
      ionic.tap.isTextInput(tapActiveElement()) &&
      ionic.tap.isTextInput(tapTouchFocusedInput) &&
      tapTouchFocusedInput !== e.target) {

    // 1) The pointer is from touch events
    // 2) There is an active element which is a text input
    // 3) A text input was just set to be focused on by a touch event
    // 4) A new focus has been set, however the target isn't the one the touch event wanted
    //console.log('focusin', 'tapTouchFocusedInput');
    tapTouchFocusedInput.focus();
    tapTouchFocusedInput = null;
  }
  ionic.scroll.isScrolling = false;
}

function tapFocusOut() {
  //console.log("focusout");
  tapActiveElement(null);
}

function tapActiveElement(ele) {
  if (arguments.length) {
    tapActiveEle = ele;
  }
  return tapActiveEle || document.activeElement;
}

function tapHasPointerMoved(endEvent) {
  if (!endEvent || endEvent.target.nodeType !== 1 || !tapPointerStart || (tapPointerStart.x === 0 && tapPointerStart.y === 0)) {
    return false;
  }
  var endCoordinates = ionic.tap.pointerCoord(endEvent);

  var hasClassList = !!(endEvent.target.classList && endEvent.target.classList.contains &&
    typeof endEvent.target.classList.contains === 'function');
  var releaseTolerance = hasClassList && endEvent.target.classList.contains('button') ?
    TAP_RELEASE_BUTTON_TOLERANCE :
    TAP_RELEASE_TOLERANCE;

  return Math.abs(tapPointerStart.x - endCoordinates.x) > releaseTolerance ||
         Math.abs(tapPointerStart.y - endCoordinates.y) > releaseTolerance;
}

function tapContainingElement(ele, allowSelf) {
  var climbEle = ele;
  for (var x = 0; x < 6; x++) {
    if (!climbEle) break;
    if (climbEle.tagName === 'LABEL') return climbEle;
    climbEle = climbEle.parentElement;
  }
  if (allowSelf !== false) return ele;
}

function tapTargetElement(ele) {
  if (ele && ele.tagName === 'LABEL') {
    if (ele.control) return ele.control;

    // older devices do not support the "control" property
    if (ele.querySelector) {
      var control = ele.querySelector('input,textarea,select');
      if (control) return control;
    }
  }
  return ele;
}

function isSelectOrOption(tagName){
  return (/^(select|option)$/i).test(tagName);
}

ionic.DomUtil.ready(function() {
  var ng = typeof angular !== 'undefined' ? angular : null;
  //do nothing for e2e tests
  if (!ng || (ng && !ng.scenario)) {
    ionic.tap.register(document);
  }
});

(function(document, ionic) {
  'use strict';

  var queueElements = {};   // elements that should get an active state in XX milliseconds
  var activeElements = {};  // elements that are currently active
  var keyId = 0;            // a counter for unique keys for the above ojects
  var ACTIVATED_CLASS = 'activated';

  ionic.activator = {

    start: function(e) {
      var hitX = ionic.tap.pointerCoord(e).x;
      if (hitX > 0 && hitX < 30) {
        return;
      }

      // when an element is touched/clicked, it climbs up a few
      // parents to see if it is an .item or .button element
      ionic.requestAnimationFrame(function() {
        if ((ionic.scroll && ionic.scroll.isScrolling) || ionic.tap.requiresNativeClick(e.target)) return;
        var ele = e.target;
        var eleToActivate;

        for (var x = 0; x < 6; x++) {
          if (!ele || ele.nodeType !== 1) break;
          if (eleToActivate && ele.classList && ele.classList.contains('item')) {
            eleToActivate = ele;
            break;
          }
          if (ele.tagName == 'A' || ele.tagName == 'BUTTON' || ele.hasAttribute('ng-click')) {
            eleToActivate = ele;
            break;
          }
          if (ele.classList && ele.classList.contains('button')) {
            eleToActivate = ele;
            break;
          }
          // no sense climbing past these
          if (ele.tagName == 'ION-CONTENT' || (ele.classList && ele.classList.contains('pane')) || ele.tagName == 'BODY') {
            break;
          }
          ele = ele.parentElement;
        }

        if (eleToActivate) {
          // queue that this element should be set to active
          queueElements[keyId] = eleToActivate;

          // on the next frame, set the queued elements to active
          ionic.requestAnimationFrame(activateElements);

          keyId = (keyId > 29 ? 0 : keyId + 1);
        }

      });
    },

    end: function() {
      // clear out any active/queued elements after XX milliseconds
      setTimeout(clear, 200);
    }

  };

  function clear() {
    // clear out any elements that are queued to be set to active
    queueElements = {};

    // in the next frame, remove the active class from all active elements
    ionic.requestAnimationFrame(deactivateElements);
  }

  function activateElements() {
    // activate all elements in the queue
    for (var key in queueElements) {
      if (queueElements[key]) {
        queueElements[key].classList.add(ACTIVATED_CLASS);
        activeElements[key] = queueElements[key];
      }
    }
    queueElements = {};
  }

  function deactivateElements() {
    if (ionic.transition && ionic.transition.isActive) {
      setTimeout(deactivateElements, 400);
      return;
    }

    for (var key in activeElements) {
      if (activeElements[key]) {
        activeElements[key].classList.remove(ACTIVATED_CLASS);
        delete activeElements[key];
      }
    }
  }

})(document, ionic);

(function(ionic) {
  /* for nextUid function below */
  var nextId = 0;

  /**
   * Various utilities used throughout Ionic
   *
   * Some of these are adopted from underscore.js and backbone.js, both also MIT licensed.
   */
  ionic.Utils = {

    arrayMove: function(arr, oldIndex, newIndex) {
      if (newIndex >= arr.length) {
        var k = newIndex - arr.length;
        while ((k--) + 1) {
          arr.push(undefined);
        }
      }
      arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0]);
      return arr;
    },

    /**
     * Return a function that will be called with the given context
     */
    proxy: function(func, context) {
      var args = Array.prototype.slice.call(arguments, 2);
      return function() {
        return func.apply(context, args.concat(Array.prototype.slice.call(arguments)));
      };
    },

    /**
     * Only call a function once in the given interval.
     *
     * @param func {Function} the function to call
     * @param wait {int} how long to wait before/after to allow function calls
     * @param immediate {boolean} whether to call immediately or after the wait interval
     */
     debounce: function(func, wait, immediate) {
      var timeout, args, context, timestamp, result;
      return function() {
        context = this;
        args = arguments;
        timestamp = new Date();
        var later = function() {
          var last = (new Date()) - timestamp;
          if (last < wait) {
            timeout = setTimeout(later, wait - last);
          } else {
            timeout = null;
            if (!immediate) result = func.apply(context, args);
          }
        };
        var callNow = immediate && !timeout;
        if (!timeout) {
          timeout = setTimeout(later, wait);
        }
        if (callNow) result = func.apply(context, args);
        return result;
      };
    },

    /**
     * Throttle the given fun, only allowing it to be
     * called at most every `wait` ms.
     */
    throttle: function(func, wait, options) {
      var context, args, result;
      var timeout = null;
      var previous = 0;
      options || (options = {});
      var later = function() {
        previous = options.leading === false ? 0 : Date.now();
        timeout = null;
        result = func.apply(context, args);
      };
      return function() {
        var now = Date.now();
        if (!previous && options.leading === false) previous = now;
        var remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0) {
          clearTimeout(timeout);
          timeout = null;
          previous = now;
          result = func.apply(context, args);
        } else if (!timeout && options.trailing !== false) {
          timeout = setTimeout(later, remaining);
        }
        return result;
      };
    },
     // Borrowed from Backbone.js's extend
     // Helper function to correctly set up the prototype chain, for subclasses.
     // Similar to `goog.inherits`, but uses a hash of prototype properties and
     // class properties to be extended.
    inherit: function(protoProps, staticProps) {
      var parent = this;
      var child;

      // The constructor function for the new subclass is either defined by you
      // (the "constructor" property in your `extend` definition), or defaulted
      // by us to simply call the parent's constructor.
      if (protoProps && protoProps.hasOwnProperty('constructor')) {
        child = protoProps.constructor;
      } else {
        child = function() { return parent.apply(this, arguments); };
      }

      // Add static properties to the constructor function, if supplied.
      ionic.extend(child, parent, staticProps);

      // Set the prototype chain to inherit from `parent`, without calling
      // `parent`'s constructor function.
      var Surrogate = function() { this.constructor = child; };
      Surrogate.prototype = parent.prototype;
      child.prototype = new Surrogate();

      // Add prototype properties (instance properties) to the subclass,
      // if supplied.
      if (protoProps) ionic.extend(child.prototype, protoProps);

      // Set a convenience property in case the parent's prototype is needed
      // later.
      child.__super__ = parent.prototype;

      return child;
    },

    // Extend adapted from Underscore.js
    extend: function(obj) {
       var args = Array.prototype.slice.call(arguments, 1);
       for (var i = 0; i < args.length; i++) {
         var source = args[i];
         if (source) {
           for (var prop in source) {
             obj[prop] = source[prop];
           }
         }
       }
       return obj;
    },

    nextUid: function() {
      return 'ion' + (nextId++);
    },

    disconnectScope: function disconnectScope(scope) {
      if (!scope) return;

      if (scope.$root === scope) {
        return; // we can't disconnect the root node;
      }
      var parent = scope.$parent;
      scope.$$disconnected = true;
      scope.$broadcast('$ionic.disconnectScope', scope);

      // See Scope.$destroy
      if (parent.$$childHead === scope) {
        parent.$$childHead = scope.$$nextSibling;
      }
      if (parent.$$childTail === scope) {
        parent.$$childTail = scope.$$prevSibling;
      }
      if (scope.$$prevSibling) {
        scope.$$prevSibling.$$nextSibling = scope.$$nextSibling;
      }
      if (scope.$$nextSibling) {
        scope.$$nextSibling.$$prevSibling = scope.$$prevSibling;
      }
      scope.$$nextSibling = scope.$$prevSibling = null;
    },

    reconnectScope: function reconnectScope(scope) {
      if (!scope) return;

      if (scope.$root === scope) {
        return; // we can't disconnect the root node;
      }
      if (!scope.$$disconnected) {
        return;
      }
      var parent = scope.$parent;
      scope.$$disconnected = false;
      scope.$broadcast('$ionic.reconnectScope', scope);
      // See Scope.$new for this logic...
      scope.$$prevSibling = parent.$$childTail;
      if (parent.$$childHead) {
        parent.$$childTail.$$nextSibling = scope;
        parent.$$childTail = scope;
      } else {
        parent.$$childHead = parent.$$childTail = scope;
      }
    },

    isScopeDisconnected: function(scope) {
      var climbScope = scope;
      while (climbScope) {
        if (climbScope.$$disconnected) return true;
        climbScope = climbScope.$parent;
      }
      return false;
    }
  };

  // Bind a few of the most useful functions to the ionic scope
  ionic.inherit = ionic.Utils.inherit;
  ionic.extend = ionic.Utils.extend;
  ionic.throttle = ionic.Utils.throttle;
  ionic.proxy = ionic.Utils.proxy;
  ionic.debounce = ionic.Utils.debounce;

})(window.ionic);

/**
 * @ngdoc page
 * @name keyboard
 * @module ionic
 * @description
 * On both Android and iOS, Ionic will attempt to prevent the keyboard from
 * obscuring inputs and focusable elements when it appears by scrolling them
 * into view.  In order for this to work, any focusable elements must be within
 * a [Scroll View](http://ionicframework.com/docs/api/directive/ionScroll/)
 * or a directive such as [Content](http://ionicframework.com/docs/api/directive/ionContent/)
 * that has a Scroll View.
 *
 * It will also attempt to prevent the native overflow scrolling on focus,
 * which can cause layout issues such as pushing headers up and out of view.
 *
 * The keyboard fixes work best in conjunction with the
 * [Ionic Keyboard Plugin](https://github.com/driftyco/ionic-plugins-keyboard),
 * although it will perform reasonably well without.  However, if you are using
 * Cordova there is no reason not to use the plugin.
 *
 * ### Hide when keyboard shows
 *
 * To hide an element when the keyboard is open, add the class `hide-on-keyboard-open`.
 *
 * ```html
 * <div class="hide-on-keyboard-open">
 *   <div id="google-map"></div>
 * </div>
 * ```
 *
 * Note: For performance reasons, elements will not be hidden for 400ms after the start of the `native.keyboardshow` event
 * from the Ionic Keyboard plugin. If you would like them to disappear immediately, you could do something
 * like:
 *
 * ```js
 *   window.addEventListener('native.keyboardshow', function(){
 *     document.body.classList.add('keyboard-open');
 *   });
 * ```
 * This adds the same `keyboard-open` class that is normally added by Ionic 400ms after the keyboard
 * opens. However, bear in mind that adding this class to the body immediately may cause jank in any
 * animations on Android that occur when the keyboard opens (for example, scrolling any obscured inputs into view).
 *
 * ----------
 *
 * ### Plugin Usage
 * Information on using the plugin can be found at
 * [https://github.com/driftyco/ionic-plugins-keyboard](https://github.com/driftyco/ionic-plugins-keyboard).
 *
 * ----------
 *
 * ### Android Notes
 * - If your app is running in fullscreen, i.e. you have
 *   `<preference name="Fullscreen" value="true" />` in your `config.xml` file
 *   you will need to set `ionic.Platform.isFullScreen = true` manually.
 *
 * - You can configure the behavior of the web view when the keyboard shows by setting
 *   [android:windowSoftInputMode](http://developer.android.com/reference/android/R.attr.html#windowSoftInputMode)
 *   to either `adjustPan`, `adjustResize` or `adjustNothing` in your app's
 *   activity in `AndroidManifest.xml`. `adjustResize` is the recommended setting
 *   for Ionic, but if for some reason you do use `adjustPan` you will need to
 *   set `ionic.Platform.isFullScreen = true`.
 *
 *   ```xml
 *   <activity android:windowSoftInputMode="adjustResize">
 *
 *   ```
 *
 * ### iOS Notes
 * - If the content of your app (including the header) is being pushed up and
 *   out of view on input focus, try setting `cordova.plugins.Keyboard.disableScroll(true)`.
 *   This does **not** disable scrolling in the Ionic scroll view, rather it
 *   disables the native overflow scrolling that happens automatically as a
 *   result of focusing on inputs below the keyboard.
 *
 */

/**
 * The current viewport height.
 */
var keyboardCurrentViewportHeight = 0;

/**
 * The viewport height when in portrait orientation.
 */
var keyboardPortraitViewportHeight = 0;

/**
 * The viewport height when in landscape orientation.
 */
var keyboardLandscapeViewportHeight = 0;

/**
 * The currently focused input.
 */
var keyboardActiveElement;

/**
 * The previously focused input used to reset keyboard after focusing on a
 * new non-keyboard element
 */
var lastKeyboardActiveElement;

/**
 * The scroll view containing the currently focused input.
 */
var scrollView;

/**
 * Timer for the setInterval that polls window.innerHeight to determine whether
 * the layout has updated for the keyboard showing/hiding.
 */
var waitForResizeTimer;

/**
 * Sometimes when switching inputs or orientations, focusout will fire before
 * focusin, so this timer is for the small setTimeout to determine if we should
 * really focusout/hide the keyboard.
 */
var keyboardFocusOutTimer;

/**
 * on Android, orientationchange will fire before the keyboard plugin notifies
 * the browser that the keyboard will show/is showing, so this flag indicates
 * to nativeShow that there was an orientationChange and we should update
 * the viewport height with an accurate keyboard height value
 */
var wasOrientationChange = false;

/**
 * CSS class added to the body indicating the keyboard is open.
 */
var KEYBOARD_OPEN_CSS = 'keyboard-open';

/**
 * CSS class that indicates a scroll container.
 */
var SCROLL_CONTAINER_CSS = 'scroll-content';

/**
 * Debounced keyboardFocusIn function
 */
var debouncedKeyboardFocusIn = ionic.debounce(keyboardFocusIn, 200, true);

/**
 * Debounced keyboardNativeShow function
 */
var debouncedKeyboardNativeShow = ionic.debounce(keyboardNativeShow, 100, true);

/**
 * Ionic keyboard namespace.
 * @namespace keyboard
 */
ionic.keyboard = {

  /**
   * Whether the keyboard is open or not.
   */
  isOpen: false,

  /**
   * Whether the keyboard is closing or not.
   */
  isClosing: false,

  /**
   * Whether the keyboard is opening or not.
   */
  isOpening: false,

  /**
   * The height of the keyboard in pixels, as reported by the keyboard plugin.
   * If the plugin is not available, calculated as the difference in
   * window.innerHeight after the keyboard has shown.
   */
  height: 0,

  /**
   * Whether the device is in landscape orientation or not.
   */
  isLandscape: false,

  /**
   * Whether the keyboard event listeners have been added or not
   */
  isInitialized: false,

  /**
   * Hide the keyboard, if it is open.
   */
  hide: function() {
    if (keyboardHasPlugin()) {
      cordova.plugins.Keyboard.close();
    }
    keyboardActiveElement && keyboardActiveElement.blur();
  },

  /**
   * An alias for cordova.plugins.Keyboard.show(). If the keyboard plugin
   * is installed, show the keyboard.
   */
  show: function() {
    if (keyboardHasPlugin()) {
      cordova.plugins.Keyboard.show();
    }
  },

  /**
   * Remove all keyboard related event listeners, effectively disabling Ionic's
   * keyboard adjustments.
   */
  disable: function() {
    if (keyboardHasPlugin()) {
      window.removeEventListener('native.keyboardshow', debouncedKeyboardNativeShow );
      window.removeEventListener('native.keyboardhide', keyboardFocusOut);
    } else {
      document.body.removeEventListener('focusout', keyboardFocusOut);
    }

    document.body.removeEventListener('ionic.focusin', debouncedKeyboardFocusIn);
    document.body.removeEventListener('focusin', debouncedKeyboardFocusIn);

    window.removeEventListener('orientationchange', keyboardOrientationChange);

    if ( window.navigator.msPointerEnabled ) {
      document.removeEventListener("MSPointerDown", keyboardInit);
    } else {
      document.removeEventListener('touchstart', keyboardInit);
    }
    ionic.keyboard.isInitialized = false;
  },

  /**
   * Alias for keyboardInit, initialize all keyboard related event listeners.
   */
  enable: function() {
    keyboardInit();
  }
};

// Initialize the viewport height (after ionic.keyboard.height has been
// defined).
keyboardCurrentViewportHeight = getViewportHeight();


                             /* Event handlers */
/* ------------------------------------------------------------------------- */

/**
 * Event handler for first touch event, initializes all event listeners
 * for keyboard related events. Also aliased by ionic.keyboard.enable.
 */
function keyboardInit() {

  if (ionic.keyboard.isInitialized) return;

  if (keyboardHasPlugin()) {
    window.addEventListener('native.keyboardshow', debouncedKeyboardNativeShow);
    window.addEventListener('native.keyboardhide', keyboardFocusOut);
  } else {
    document.body.addEventListener('focusout', keyboardFocusOut);
  }

  document.body.addEventListener('ionic.focusin', debouncedKeyboardFocusIn);
  document.body.addEventListener('focusin', debouncedKeyboardFocusIn);

  if (window.navigator.msPointerEnabled) {
    document.removeEventListener("MSPointerDown", keyboardInit);
  } else {
    document.removeEventListener('touchstart', keyboardInit);
  }

  ionic.keyboard.isInitialized = true;
}

/**
 * Event handler for 'native.keyboardshow' event, sets keyboard.height to the
 * reported height and keyboard.isOpening to true. Then calls
 * keyboardWaitForResize with keyboardShow or keyboardUpdateViewportHeight as
 * the callback depending on whether the event was triggered by a focusin or
 * an orientationchange.
 */
function keyboardNativeShow(e) {
  clearTimeout(keyboardFocusOutTimer);
  //console.log("keyboardNativeShow fired at: " + Date.now());
  //console.log("keyboardNativeshow window.innerHeight: " + window.innerHeight);

  if (!ionic.keyboard.isOpen || ionic.keyboard.isClosing) {
    ionic.keyboard.isOpening = true;
    ionic.keyboard.isClosing = false;
  }

  ionic.keyboard.height = e.keyboardHeight;
  //console.log('nativeshow keyboard height:' + e.keyboardHeight);

  if (wasOrientationChange) {
    keyboardWaitForResize(keyboardUpdateViewportHeight, true);
  } else {
    keyboardWaitForResize(keyboardShow, true);
  }
}

/**
 * Event handler for 'focusin' and 'ionic.focusin' events. Initializes
 * keyboard state (keyboardActiveElement and keyboard.isOpening) for the
 * appropriate adjustments once the window has resized.  If not using the
 * keyboard plugin, calls keyboardWaitForResize with keyboardShow as the
 * callback or keyboardShow right away if the keyboard is already open.  If
 * using the keyboard plugin does nothing and lets keyboardNativeShow handle
 * adjustments with a more accurate keyboard height.
 */
function keyboardFocusIn(e) {
  clearTimeout(keyboardFocusOutTimer);
  //console.log("keyboardFocusIn from: " + e.type + " at: " + Date.now());

  if (!e.target ||
      e.target.readOnly ||
      !ionic.tap.isKeyboardElement(e.target) ||
      !(scrollView = ionic.DomUtil.getParentWithClass(e.target, SCROLL_CONTAINER_CSS))) {
    if (keyboardActiveElement) {
        lastKeyboardActiveElement = keyboardActiveElement;
    }
    keyboardActiveElement = null;
    return;
  }

  keyboardActiveElement = e.target;

  // if using JS scrolling, undo the effects of native overflow scroll so the
  // scroll view is positioned correctly
  if (!scrollView.classList.contains("overflow-scroll")) {
    document.body.scrollTop = 0;
    scrollView.scrollTop = 0;
    ionic.requestAnimationFrame(function(){
      document.body.scrollTop = 0;
      scrollView.scrollTop = 0;
    });

    // any showing part of the document that isn't within the scroll the user
    // could touchmove and cause some ugly changes to the app, so disable
    // any touchmove events while the keyboard is open using e.preventDefault()
    if (window.navigator.msPointerEnabled) {
      document.addEventListener("MSPointerMove", keyboardPreventDefault, false);
    } else {
      document.addEventListener('touchmove', keyboardPreventDefault, false);
    }
  }

  if (!ionic.keyboard.isOpen || ionic.keyboard.isClosing) {
    ionic.keyboard.isOpening = true;
    ionic.keyboard.isClosing = false;
  }

  // attempt to prevent browser from natively scrolling input into view while
  // we are trying to do the same (while we are scrolling) if the user taps the
  // keyboard
  document.addEventListener('keydown', keyboardOnKeyDown, false);



  // if we aren't using the plugin and the keyboard isn't open yet, wait for the
  // window to resize so we can get an accurate estimate of the keyboard size,
  // otherwise we do nothing and let nativeShow call keyboardShow once we have
  // an exact keyboard height
  // if the keyboard is already open, go ahead and scroll the input into view
  // if necessary
  if (!ionic.keyboard.isOpen && !keyboardHasPlugin()) {
    keyboardWaitForResize(keyboardShow, true);

  } else if (ionic.keyboard.isOpen) {
    keyboardShow();
  }
}

/**
 * Event handler for 'focusout' events. Sets keyboard.isClosing to true and
 * calls keyboardWaitForResize with keyboardHide as the callback after a small
 * timeout.
 */
function keyboardFocusOut() {
  clearTimeout(keyboardFocusOutTimer);
  //console.log("keyboardFocusOut fired at: " + Date.now());
  //console.log("keyboardFocusOut event type: " + e.type);

  if (ionic.keyboard.isOpen || ionic.keyboard.isOpening) {
    ionic.keyboard.isClosing = true;
    ionic.keyboard.isOpening = false;
  }

  // Call keyboardHide with a slight delay because sometimes on focus or
  // orientation change focusin is called immediately after, so we give it time
  // to cancel keyboardHide
  keyboardFocusOutTimer = setTimeout(function() {
    ionic.requestAnimationFrame(function() {
      // focusOut during or right after an orientationchange, so we didn't get
      // a chance to update the viewport height yet, do it and keyboardHide
      //console.log("focusOut, wasOrientationChange: " + wasOrientationChange);
      if (wasOrientationChange) {
        keyboardWaitForResize(function(){
          keyboardUpdateViewportHeight();
          keyboardHide();
        }, false);
      } else {
        keyboardWaitForResize(keyboardHide, false);
      }
    });
  }, 50);
}

/**
 * Event handler for 'orientationchange' events. If using the keyboard plugin
 * and the keyboard is open on Android, sets wasOrientationChange to true so
 * nativeShow can update the viewport height with an accurate keyboard height.
 * If the keyboard isn't open or keyboard plugin isn't being used,
 * waits for the window to resize before updating the viewport height.
 *
 * On iOS, where orientationchange fires after the keyboard has already shown,
 * updates the viewport immediately, regardless of if the keyboard is already
 * open.
 */
function keyboardOrientationChange() {
  //console.log("orientationchange fired at: " + Date.now());
  //console.log("orientation was: " + (ionic.keyboard.isLandscape ? "landscape" : "portrait"));

  // toggle orientation
  ionic.keyboard.isLandscape = !ionic.keyboard.isLandscape;
  // //console.log("now orientation is: " + (ionic.keyboard.isLandscape ? "landscape" : "portrait"));

  // no need to wait for resizing on iOS, and orientationchange always fires
  // after the keyboard has opened, so it doesn't matter if it's open or not
  if (ionic.Platform.isIOS()) {
    keyboardUpdateViewportHeight();
  }

  // On Android, if the keyboard isn't open or we aren't using the keyboard
  // plugin, update the viewport height once everything has resized. If the
  // keyboard is open and we are using the keyboard plugin do nothing and let
  // nativeShow handle it using an accurate keyboard height.
  if ( ionic.Platform.isAndroid()) {
    if (!ionic.keyboard.isOpen || !keyboardHasPlugin()) {
      keyboardWaitForResize(keyboardUpdateViewportHeight, false);
    } else {
      wasOrientationChange = true;
    }
  }
}

/**
 * Event handler for 'keydown' event. Tries to prevent browser from natively
 * scrolling an input into view when a user taps the keyboard while we are
 * scrolling the input into view ourselves with JS.
 */
function keyboardOnKeyDown(e) {
  if (ionic.scroll.isScrolling) {
    keyboardPreventDefault(e);
  }
}

/**
 * Event for 'touchmove' or 'MSPointerMove'. Prevents native scrolling on
 * elements outside the scroll view while the keyboard is open.
 */
function keyboardPreventDefault(e) {
  if (e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
  }
}

                              /* Private API */
/* -------------------------------------------------------------------------- */

/**
 * Polls window.innerHeight until it has updated to an expected value (or
 * sufficient time has passed) before calling the specified callback function.
 * Only necessary for non-fullscreen Android which sometimes reports multiple
 * window.innerHeight values during interim layouts while it is resizing.
 *
 * On iOS, the window.innerHeight will already be updated, but we use the 50ms
 * delay as essentially a timeout so that scroll view adjustments happen after
 * the keyboard has shown so there isn't a white flash from us resizing too
 * quickly.
 *
 * @param {Function} callback the function to call once the window has resized
 * @param {boolean} isOpening whether the resize is from the keyboard opening
 * or not
 */
function keyboardWaitForResize(callback, isOpening) {
  clearInterval(waitForResizeTimer);
  var count = 0;
  var maxCount;
  var initialHeight = getViewportHeight();
  var viewportHeight = initialHeight;

  //console.log("waitForResize initial viewport height: " + viewportHeight);
  //var start = Date.now();
  //console.log("start: " + start);

  // want to fail relatively quickly on modern android devices, since it's much
  // more likely we just have a bad keyboard height
  if (ionic.Platform.isAndroid() && ionic.Platform.version() < 4.4) {
    maxCount = 30;
  } else if (ionic.Platform.isAndroid()) {
    maxCount = 10;
  } else {
    maxCount = 1;
  }

  // poll timer
  waitForResizeTimer = setInterval(function(){
    viewportHeight = getViewportHeight();

    // height hasn't updated yet, try again in 50ms
    // if not using plugin, wait for maxCount to ensure we have waited long enough
    // to get an accurate keyboard height
    if (++count < maxCount &&
        ((!isPortraitViewportHeight(viewportHeight) &&
         !isLandscapeViewportHeight(viewportHeight)) ||
         !ionic.keyboard.height)) {
      return;
    }

    // infer the keyboard height from the resize if not using the keyboard plugin
    if (!keyboardHasPlugin()) {
      ionic.keyboard.height = Math.abs(initialHeight - window.innerHeight);
    }

    // set to true if we were waiting for the keyboard to open
    ionic.keyboard.isOpen = isOpening;

    clearInterval(waitForResizeTimer);
    //var end = Date.now();
    //console.log("waitForResize count: " + count);
    //console.log("end: " + end);
    //console.log("difference: " + ( end - start ) + "ms");

    //console.log("callback: " + callback.name);
    callback();

  }, 50);

  return maxCount; //for tests
}

/**
 * On keyboard close sets keyboard state to closed, resets the scroll view,
 * removes CSS from body indicating keyboard was open, removes any event
 * listeners for when the keyboard is open and on Android blurs the active
 * element (which in some cases will still have focus even if the keyboard
 * is closed and can cause it to reappear on subsequent taps).
 */
function keyboardHide() {
  clearTimeout(keyboardFocusOutTimer);
  //console.log("keyboardHide");

  ionic.keyboard.isOpen = false;
  ionic.keyboard.isClosing = false;

  if (keyboardActiveElement || lastKeyboardActiveElement) {
    ionic.trigger('resetScrollView', {
      target: keyboardActiveElement || lastKeyboardActiveElement
    }, true);
  }

  ionic.requestAnimationFrame(function(){
    document.body.classList.remove(KEYBOARD_OPEN_CSS);
  });

  // the keyboard is gone now, remove the touchmove that disables native scroll
  if (window.navigator.msPointerEnabled) {
    document.removeEventListener("MSPointerMove", keyboardPreventDefault);
  } else {
    document.removeEventListener('touchmove', keyboardPreventDefault);
  }
  document.removeEventListener('keydown', keyboardOnKeyDown);

  if (ionic.Platform.isAndroid()) {
    // on android closing the keyboard with the back/dismiss button won't remove
    // focus and keyboard can re-appear on subsequent taps (like scrolling)
    if (keyboardHasPlugin()) cordova.plugins.Keyboard.close();
    keyboardActiveElement && keyboardActiveElement.blur();
  }

  keyboardActiveElement = null;
  lastKeyboardActiveElement = null;
}

/**
 * On keyboard open sets keyboard state to open, adds CSS to the body
 * indicating the keyboard is open and tells the scroll view to resize and
 * the currently focused input into view if necessary.
 */
function keyboardShow() {

  ionic.keyboard.isOpen = true;
  ionic.keyboard.isOpening = false;

  var details = {
    keyboardHeight: keyboardGetHeight(),
    viewportHeight: keyboardCurrentViewportHeight
  };

  if (keyboardActiveElement) {
    details.target = keyboardActiveElement;

    var elementBounds = keyboardActiveElement.getBoundingClientRect();

    details.elementTop = Math.round(elementBounds.top);
    details.elementBottom = Math.round(elementBounds.bottom);

    details.windowHeight = details.viewportHeight - details.keyboardHeight;
    //console.log("keyboardShow viewportHeight: " + details.viewportHeight +
    //", windowHeight: " + details.windowHeight +
    //", keyboardHeight: " + details.keyboardHeight);

    // figure out if the element is under the keyboard
    details.isElementUnderKeyboard = (details.elementBottom > details.windowHeight);
    //console.log("isUnderKeyboard: " + details.isElementUnderKeyboard);
    //console.log("elementBottom: " + details.elementBottom);

    // send event so the scroll view adjusts
    ionic.trigger('scrollChildIntoView', details, true);
  }

  setTimeout(function(){
    document.body.classList.add(KEYBOARD_OPEN_CSS);
  }, 400);

  return details; //for testing
}

/* eslint no-unused-vars:0 */
function keyboardGetHeight() {
  // check if we already have a keyboard height from the plugin or resize calculations
  if (ionic.keyboard.height) {
    return ionic.keyboard.height;
  }

  if (ionic.Platform.isAndroid()) {
    // should be using the plugin, no way to know how big the keyboard is, so guess
    if ( ionic.Platform.isFullScreen ) {
      return 275;
    }
    // otherwise just calculate it
    var contentHeight = window.innerHeight;
    if (contentHeight < keyboardCurrentViewportHeight) {
      return keyboardCurrentViewportHeight - contentHeight;
    } else {
      return 0;
    }
  }

  // fallback for when it's the webview without the plugin
  // or for just the standard web browser
  // TODO: have these be based on device
  if (ionic.Platform.isIOS()) {
    if (ionic.keyboard.isLandscape) {
      return 206;
    }

    if (!ionic.Platform.isWebView()) {
      return 216;
    }

    return 260;
  }

  // safe guess
  return 275;
}

function isPortraitViewportHeight(viewportHeight) {
  return !!(!ionic.keyboard.isLandscape &&
         keyboardPortraitViewportHeight &&
         (Math.abs(keyboardPortraitViewportHeight - viewportHeight) < 2));
}

function isLandscapeViewportHeight(viewportHeight) {
  return !!(ionic.keyboard.isLandscape &&
         keyboardLandscapeViewportHeight &&
         (Math.abs(keyboardLandscapeViewportHeight - viewportHeight) < 2));
}

function keyboardUpdateViewportHeight() {
  wasOrientationChange = false;
  keyboardCurrentViewportHeight = getViewportHeight();

  if (ionic.keyboard.isLandscape && !keyboardLandscapeViewportHeight) {
    //console.log("saved landscape: " + keyboardCurrentViewportHeight);
    keyboardLandscapeViewportHeight = keyboardCurrentViewportHeight;

  } else if (!ionic.keyboard.isLandscape && !keyboardPortraitViewportHeight) {
    //console.log("saved portrait: " + keyboardCurrentViewportHeight);
    keyboardPortraitViewportHeight = keyboardCurrentViewportHeight;
  }

  if (keyboardActiveElement) {
    ionic.trigger('resetScrollView', {
      target: keyboardActiveElement
    }, true);
  }

  if (ionic.keyboard.isOpen && ionic.tap.isTextInput(keyboardActiveElement)) {
    keyboardShow();
  }
}

function keyboardInitViewportHeight() {
  var viewportHeight = getViewportHeight();
  //console.log("Keyboard init VP: " + viewportHeight + " " + window.innerWidth);
  // can't just use window.innerHeight in case the keyboard is opened immediately
  if ((viewportHeight / window.innerWidth) < 1) {
    ionic.keyboard.isLandscape = true;
  }
  //console.log("ionic.keyboard.isLandscape is: " + ionic.keyboard.isLandscape);

  // initialize or update the current viewport height values
  keyboardCurrentViewportHeight = viewportHeight;
  if (ionic.keyboard.isLandscape && !keyboardLandscapeViewportHeight) {
    keyboardLandscapeViewportHeight = keyboardCurrentViewportHeight;
  } else if (!ionic.keyboard.isLandscape && !keyboardPortraitViewportHeight) {
    keyboardPortraitViewportHeight = keyboardCurrentViewportHeight;
  }
}

function getViewportHeight() {
  var windowHeight = window.innerHeight;
  //console.log('window.innerHeight is: ' + windowHeight);
  //console.log('kb height is: ' + ionic.keyboard.height);
  //console.log('kb isOpen: ' + ionic.keyboard.isOpen);

  //TODO: add iPad undocked/split kb once kb plugin supports it
  // the keyboard overlays the window on Android fullscreen
  if (!(ionic.Platform.isAndroid() && ionic.Platform.isFullScreen) &&
      (ionic.keyboard.isOpen || ionic.keyboard.isOpening) &&
      !ionic.keyboard.isClosing) {

     return windowHeight + keyboardGetHeight();
  }
  return windowHeight;
}

function keyboardHasPlugin() {
  return !!(window.cordova && cordova.plugins && cordova.plugins.Keyboard);
}

ionic.Platform.ready(function() {
  keyboardInitViewportHeight();

  window.addEventListener('orientationchange', keyboardOrientationChange);

  // if orientation changes while app is in background, update on resuming
  /*
  if ( ionic.Platform.isWebView() ) {
    document.addEventListener('resume', keyboardInitViewportHeight);

    if (ionic.Platform.isAndroid()) {
      //TODO: onbackpressed to detect keyboard close without focusout or plugin
    }
  }
  */

  // if orientation changes while app is in background, update on resuming
/*  if ( ionic.Platform.isWebView() ) {
    document.addEventListener('pause', function() {
      window.removeEventListener('orientationchange', keyboardOrientationChange);
    })
    document.addEventListener('resume', function() {
      keyboardInitViewportHeight();
      window.addEventListener('orientationchange', keyboardOrientationChange)
    });
  }*/

  // Android sometimes reports bad innerHeight on window.load
  // try it again in a lil bit to play it safe
  setTimeout(keyboardInitViewportHeight, 999);

  // only initialize the adjustments for the virtual keyboard
  // if a touchstart event happens
  if (window.navigator.msPointerEnabled) {
    document.addEventListener("MSPointerDown", keyboardInit, false);
  } else {
    document.addEventListener('touchstart', keyboardInit, false);
  }
});



var viewportTag;
var viewportProperties = {};

ionic.viewport = {
  orientation: function() {
    // 0 = Portrait
    // 90 = Landscape
    // not using window.orientation because each device has a different implementation
    return (window.innerWidth > window.innerHeight ? 90 : 0);
  }
};

function viewportLoadTag() {
  var x;

  for (x = 0; x < document.head.children.length; x++) {
    if (document.head.children[x].name == 'viewport') {
      viewportTag = document.head.children[x];
      break;
    }
  }

  if (viewportTag) {
    var props = viewportTag.content.toLowerCase().replace(/\s+/g, '').split(',');
    var keyValue;
    for (x = 0; x < props.length; x++) {
      if (props[x]) {
        keyValue = props[x].split('=');
        viewportProperties[ keyValue[0] ] = (keyValue.length > 1 ? keyValue[1] : '_');
      }
    }
    viewportUpdate();
  }
}

function viewportUpdate() {
  // unit tests in viewport.unit.js

  var initWidth = viewportProperties.width;
  var initHeight = viewportProperties.height;
  var p = ionic.Platform;
  var version = p.version();
  var DEVICE_WIDTH = 'device-width';
  var DEVICE_HEIGHT = 'device-height';
  var orientation = ionic.viewport.orientation();

  // Most times we're removing the height and adding the width
  // So this is the default to start with, then modify per platform/version/oreintation
  delete viewportProperties.height;
  viewportProperties.width = DEVICE_WIDTH;

  if (p.isIPad()) {
    // iPad

    if (version > 7) {
      // iPad >= 7.1
      // https://issues.apache.org/jira/browse/CB-4323
      delete viewportProperties.width;

    } else {
      // iPad <= 7.0

      if (p.isWebView()) {
        // iPad <= 7.0 WebView

        if (orientation == 90) {
          // iPad <= 7.0 WebView Landscape
          viewportProperties.height = '0';

        } else if (version == 7) {
          // iPad <= 7.0 WebView Portait
          viewportProperties.height = DEVICE_HEIGHT;
        }
      } else {
        // iPad <= 6.1 Browser
        if (version < 7) {
          viewportProperties.height = '0';
        }
      }
    }

  } else if (p.isIOS()) {
    // iPhone

    if (p.isWebView()) {
      // iPhone WebView

      if (version > 7) {
        // iPhone >= 7.1 WebView
        delete viewportProperties.width;

      } else if (version < 7) {
        // iPhone <= 6.1 WebView
        // if height was set it needs to get removed with this hack for <= 6.1
        if (initHeight) viewportProperties.height = '0';

      } else if (version == 7) {
        //iPhone == 7.0 WebView
        viewportProperties.height = DEVICE_HEIGHT;
      }

    } else {
      // iPhone Browser

      if (version < 7) {
        // iPhone <= 6.1 Browser
        // if height was set it needs to get removed with this hack for <= 6.1
        if (initHeight) viewportProperties.height = '0';
      }
    }

  }

  // only update the viewport tag if there was a change
  if (initWidth !== viewportProperties.width || initHeight !== viewportProperties.height) {
    viewportTagUpdate();
  }
}

function viewportTagUpdate() {
  var key, props = [];
  for (key in viewportProperties) {
    if (viewportProperties[key]) {
      props.push(key + (viewportProperties[key] == '_' ? '' : '=' + viewportProperties[key]));
    }
  }

  viewportTag.content = props.join(', ');
}

ionic.Platform.ready(function() {
  viewportLoadTag();

  window.addEventListener("orientationchange", function() {
    setTimeout(viewportUpdate, 1000);
  }, false);
});

(function(ionic) {
'use strict';
  ionic.views.View = function() {
    this.initialize.apply(this, arguments);
  };

  ionic.views.View.inherit = ionic.inherit;

  ionic.extend(ionic.views.View.prototype, {
    initialize: function() {}
  });

})(window.ionic);

/*
 * Scroller
 * http://github.com/zynga/scroller
 *
 * Copyright 2011, Zynga Inc.
 * Licensed under the MIT License.
 * https://raw.github.com/zynga/scroller/master/MIT-LICENSE.txt
 *
 * Based on the work of: Unify Project (unify-project.org)
 * http://unify-project.org
 * Copyright 2011, Deutsche Telekom AG
 * License: MIT + Apache (V2)
 */

/* jshint eqnull: true */

/**
 * Generic animation class with support for dropped frames both optional easing and duration.
 *
 * Optional duration is useful when the lifetime is defined by another condition than time
 * e.g. speed of an animating object, etc.
 *
 * Dropped frame logic allows to keep using the same updater logic independent from the actual
 * rendering. This eases a lot of cases where it might be pretty complex to break down a state
 * based on the pure time difference.
 */
var zyngaCore = { effect: {} };
(function(global) {
  var time = Date.now || function() {
    return +new Date();
  };
  var desiredFrames = 60;
  var millisecondsPerSecond = 1000;
  var running = {};
  var counter = 1;

  zyngaCore.effect.Animate = {

    /**
     * A requestAnimationFrame wrapper / polyfill.
     *
     * @param callback {Function} The callback to be invoked before the next repaint.
     * @param root {HTMLElement} The root element for the repaint
     */
    requestAnimationFrame: (function() {

      // Check for request animation Frame support
      var requestFrame = global.requestAnimationFrame || global.webkitRequestAnimationFrame || global.mozRequestAnimationFrame || global.oRequestAnimationFrame;
      var isNative = !!requestFrame;

      if (requestFrame && !/requestAnimationFrame\(\)\s*\{\s*\[native code\]\s*\}/i.test(requestFrame.toString())) {
        isNative = false;
      }

      if (isNative) {
        return function(callback, root) {
          requestFrame(callback, root);
        };
      }

      var TARGET_FPS = 60;
      var requests = {};
      var requestCount = 0;
      var rafHandle = 1;
      var intervalHandle = null;
      var lastActive = +new Date();

      return function(callback) {
        var callbackHandle = rafHandle++;

        // Store callback
        requests[callbackHandle] = callback;
        requestCount++;

        // Create timeout at first request
        if (intervalHandle === null) {

          intervalHandle = setInterval(function() {

            var time = +new Date();
            var currentRequests = requests;

            // Reset data structure before executing callbacks
            requests = {};
            requestCount = 0;

            for(var key in currentRequests) {
              if (currentRequests.hasOwnProperty(key)) {
                currentRequests[key](time);
                lastActive = time;
              }
            }

            // Disable the timeout when nothing happens for a certain
            // period of time
            if (time - lastActive > 2500) {
              clearInterval(intervalHandle);
              intervalHandle = null;
            }

          }, 1000 / TARGET_FPS);
        }

        return callbackHandle;
      };

    })(),


    /**
     * Stops the given animation.
     *
     * @param id {Integer} Unique animation ID
     * @return {Boolean} Whether the animation was stopped (aka, was running before)
     */
    stop: function(id) {
      var cleared = running[id] != null;
      if (cleared) {
        running[id] = null;
      }

      return cleared;
    },


    /**
     * Whether the given animation is still running.
     *
     * @param id {Integer} Unique animation ID
     * @return {Boolean} Whether the animation is still running
     */
    isRunning: function(id) {
      return running[id] != null;
    },


    /**
     * Start the animation.
     *
     * @param stepCallback {Function} Pointer to function which is executed on every step.
     *   Signature of the method should be `function(percent, now, virtual) { return continueWithAnimation; }`
     * @param verifyCallback {Function} Executed before every animation step.
     *   Signature of the method should be `function() { return continueWithAnimation; }`
     * @param completedCallback {Function}
     *   Signature of the method should be `function(droppedFrames, finishedAnimation) {}`
     * @param duration {Integer} Milliseconds to run the animation
     * @param easingMethod {Function} Pointer to easing function
     *   Signature of the method should be `function(percent) { return modifiedValue; }`
     * @param root {Element} Render root, when available. Used for internal
     *   usage of requestAnimationFrame.
     * @return {Integer} Identifier of animation. Can be used to stop it any time.
     */
    start: function(stepCallback, verifyCallback, completedCallback, duration, easingMethod, root) {

      var start = time();
      var lastFrame = start;
      var percent = 0;
      var dropCounter = 0;
      var id = counter++;

      if (!root) {
        root = document.body;
      }

      // Compacting running db automatically every few new animations
      if (id % 20 === 0) {
        var newRunning = {};
        for (var usedId in running) {
          newRunning[usedId] = true;
        }
        running = newRunning;
      }

      // This is the internal step method which is called every few milliseconds
      var step = function(virtual) {

        // Normalize virtual value
        var render = virtual !== true;

        // Get current time
        var now = time();

        // Verification is executed before next animation step
        if (!running[id] || (verifyCallback && !verifyCallback(id))) {

          running[id] = null;
          completedCallback && completedCallback(desiredFrames - (dropCounter / ((now - start) / millisecondsPerSecond)), id, false);
          return;

        }

        // For the current rendering to apply let's update omitted steps in memory.
        // This is important to bring internal state variables up-to-date with progress in time.
        if (render) {

          var droppedFrames = Math.round((now - lastFrame) / (millisecondsPerSecond / desiredFrames)) - 1;
          for (var j = 0; j < Math.min(droppedFrames, 4); j++) {
            step(true);
            dropCounter++;
          }

        }

        // Compute percent value
        if (duration) {
          percent = (now - start) / duration;
          if (percent > 1) {
            percent = 1;
          }
        }

        // Execute step callback, then...
        var value = easingMethod ? easingMethod(percent) : percent;
        if ((stepCallback(value, now, render) === false || percent === 1) && render) {
          running[id] = null;
          completedCallback && completedCallback(desiredFrames - (dropCounter / ((now - start) / millisecondsPerSecond)), id, percent === 1 || duration == null);
        } else if (render) {
          lastFrame = now;
          zyngaCore.effect.Animate.requestAnimationFrame(step, root);
        }
      };

      // Mark as running
      running[id] = true;

      // Init first step
      zyngaCore.effect.Animate.requestAnimationFrame(step, root);

      // Return unique animation ID
      return id;
    }
  };
})(window);

/*
 * Scroller
 * http://github.com/zynga/scroller
 *
 * Copyright 2011, Zynga Inc.
 * Licensed under the MIT License.
 * https://raw.github.com/zynga/scroller/master/MIT-LICENSE.txt
 *
 * Based on the work of: Unify Project (unify-project.org)
 * http://unify-project.org
 * Copyright 2011, Deutsche Telekom AG
 * License: MIT + Apache (V2)
 */

(function(ionic) {
  var NOOP = function(){};

  // Easing Equations (c) 2003 Robert Penner, all rights reserved.
  // Open source under the BSD License.

  /**
   * @param pos {Number} position between 0 (start of effect) and 1 (end of effect)
  **/
  var easeOutCubic = function(pos) {
    return (Math.pow((pos - 1), 3) + 1);
  };

  /**
   * @param pos {Number} position between 0 (start of effect) and 1 (end of effect)
  **/
  var easeInOutCubic = function(pos) {
    if ((pos /= 0.5) < 1) {
      return 0.5 * Math.pow(pos, 3);
    }

    return 0.5 * (Math.pow((pos - 2), 3) + 2);
  };


/**
 * ionic.views.Scroll
 * A powerful scroll view with support for bouncing, pull to refresh, and paging.
 * @param   {Object}        options options for the scroll view
 * @class A scroll view system
 * @memberof ionic.views
 */
ionic.views.Scroll = ionic.views.View.inherit({
  initialize: function(options) {
    var self = this;

    self.__container = options.el;
    self.__content = options.el.firstElementChild;

    //Remove any scrollTop attached to these elements; they are virtual scroll now
    //This also stops on-load-scroll-to-window.location.hash that the browser does
    setTimeout(function() {
      if (self.__container && self.__content) {
        self.__container.scrollTop = 0;
        self.__content.scrollTop = 0;
      }
    });

    self.options = {

      /** Disable scrolling on x-axis by default */
      scrollingX: false,
      scrollbarX: true,

      /** Enable scrolling on y-axis */
      scrollingY: true,
      scrollbarY: true,

      startX: 0,
      startY: 0,

      /** The amount to dampen mousewheel events */
      wheelDampen: 6,

      /** The minimum size the scrollbars scale to while scrolling */
      minScrollbarSizeX: 5,
      minScrollbarSizeY: 5,

      /** Scrollbar fading after scrolling */
      scrollbarsFade: true,
      scrollbarFadeDelay: 300,
      /** The initial fade delay when the pane is resized or initialized */
      scrollbarResizeFadeDelay: 1000,

      /** Enable animations for deceleration, snap back, zooming and scrolling */
      animating: true,

      /** duration for animations triggered by scrollTo/zoomTo */
      animationDuration: 250,

      /** The velocity required to make the scroll view "slide" after touchend */
      decelVelocityThreshold: 4,

      /** The velocity required to make the scroll view "slide" after touchend when using paging */
      decelVelocityThresholdPaging: 4,

      /** Enable bouncing (content can be slowly moved outside and jumps back after releasing) */
      bouncing: true,

      /** Enable locking to the main axis if user moves only slightly on one of them at start */
      locking: true,

      /** Enable pagination mode (switching between full page content panes) */
      paging: false,

      /** Enable snapping of content to a configured pixel grid */
      snapping: false,

      /** Enable zooming of content via API, fingers and mouse wheel */
      zooming: false,

      /** Minimum zoom level */
      minZoom: 0.5,

      /** Maximum zoom level */
      maxZoom: 3,

      /** Multiply or decrease scrolling speed **/
      speedMultiplier: 1,

      deceleration: 0.97,

      /** Whether to prevent default on a scroll operation to capture drag events **/
      preventDefault: false,

      /** Callback that is fired on the later of touch end or deceleration end,
        provided that another scrolling action has not begun. Used to know
        when to fade out a scrollbar. */
      scrollingComplete: NOOP,

      /** This configures the amount of change applied to deceleration when reaching boundaries  **/
      penetrationDeceleration: 0.03,

      /** This configures the amount of change applied to acceleration when reaching boundaries  **/
      penetrationAcceleration: 0.08,

      // The ms interval for triggering scroll events
      scrollEventInterval: 10,

      freeze: false,

      getContentWidth: function() {
        return Math.max(self.__content.scrollWidth, self.__content.offsetWidth);
      },
      getContentHeight: function() {
        return Math.max(self.__content.scrollHeight, self.__content.offsetHeight + (self.__content.offsetTop * 2));
      }
    };

    for (var key in options) {
      self.options[key] = options[key];
    }

    self.hintResize = ionic.debounce(function() {
      self.resize();
    }, 1000, true);

    self.onScroll = function() {

      if (!ionic.scroll.isScrolling) {
        setTimeout(self.setScrollStart, 50);
      } else {
        clearTimeout(self.scrollTimer);
        self.scrollTimer = setTimeout(self.setScrollStop, 80);
      }

    };

    self.freeze = function(shouldFreeze) {
      if (arguments.length) {
        self.options.freeze = shouldFreeze;
      }
      return self.options.freeze;
    };

    // We can just use the standard freeze pop in our mouth
    self.freezeShut = self.freeze;

    self.setScrollStart = function() {
      ionic.scroll.isScrolling = Math.abs(ionic.scroll.lastTop - self.__scrollTop) > 1;
      clearTimeout(self.scrollTimer);
      self.scrollTimer = setTimeout(self.setScrollStop, 80);
    };

    self.setScrollStop = function() {
      ionic.scroll.isScrolling = false;
      ionic.scroll.lastTop = self.__scrollTop;
    };

    self.triggerScrollEvent = ionic.throttle(function() {
      self.onScroll();
      ionic.trigger('scroll', {
        scrollTop: self.__scrollTop,
        scrollLeft: self.__scrollLeft,
        target: self.__container
      });
    }, self.options.scrollEventInterval);

    self.triggerScrollEndEvent = function() {
      ionic.trigger('scrollend', {
        scrollTop: self.__scrollTop,
        scrollLeft: self.__scrollLeft,
        target: self.__container
      });
    };

    self.__scrollLeft = self.options.startX;
    self.__scrollTop = self.options.startY;

    // Get the render update function, initialize event handlers,
    // and calculate the size of the scroll container
    self.__callback = self.getRenderFn();
    self.__initEventHandlers();
    self.__createScrollbars();

  },

  run: function() {
    this.resize();

    // Fade them out
    this.__fadeScrollbars('out', this.options.scrollbarResizeFadeDelay);
  },



  /*
  ---------------------------------------------------------------------------
    INTERNAL FIELDS :: STATUS
  ---------------------------------------------------------------------------
  */

  /** Whether only a single finger is used in touch handling */
  __isSingleTouch: false,

  /** Whether a touch event sequence is in progress */
  __isTracking: false,

  /** Whether a deceleration animation went to completion. */
  __didDecelerationComplete: false,

  /**
   * Whether a gesture zoom/rotate event is in progress. Activates when
   * a gesturestart event happens. This has higher priority than dragging.
   */
  __isGesturing: false,

  /**
   * Whether the user has moved by such a distance that we have enabled
   * dragging mode. Hint: It's only enabled after some pixels of movement to
   * not interrupt with clicks etc.
   */
  __isDragging: false,

  /**
   * Not touching and dragging anymore, and smoothly animating the
   * touch sequence using deceleration.
   */
  __isDecelerating: false,

  /**
   * Smoothly animating the currently configured change
   */
  __isAnimating: false,



  /*
  ---------------------------------------------------------------------------
    INTERNAL FIELDS :: DIMENSIONS
  ---------------------------------------------------------------------------
  */

  /** Available outer left position (from document perspective) */
  __clientLeft: 0,

  /** Available outer top position (from document perspective) */
  __clientTop: 0,

  /** Available outer width */
  __clientWidth: 0,

  /** Available outer height */
  __clientHeight: 0,

  /** Outer width of content */
  __contentWidth: 0,

  /** Outer height of content */
  __contentHeight: 0,

  /** Snapping width for content */
  __snapWidth: 100,

  /** Snapping height for content */
  __snapHeight: 100,

  /** Height to assign to refresh area */
  __refreshHeight: null,

  /** Whether the refresh process is enabled when the event is released now */
  __refreshActive: false,

  /** Callback to execute on activation. This is for signalling the user about a refresh is about to happen when he release */
  __refreshActivate: null,

  /** Callback to execute on deactivation. This is for signalling the user about the refresh being cancelled */
  __refreshDeactivate: null,

  /** Callback to execute to start the actual refresh. Call {@link #refreshFinish} when done */
  __refreshStart: null,

  /** Zoom level */
  __zoomLevel: 1,

  /** Scroll position on x-axis */
  __scrollLeft: 0,

  /** Scroll position on y-axis */
  __scrollTop: 0,

  /** Maximum allowed scroll position on x-axis */
  __maxScrollLeft: 0,

  /** Maximum allowed scroll position on y-axis */
  __maxScrollTop: 0,

  /* Scheduled left position (final position when animating) */
  __scheduledLeft: 0,

  /* Scheduled top position (final position when animating) */
  __scheduledTop: 0,

  /* Scheduled zoom level (final scale when animating) */
  __scheduledZoom: 0,



  /*
  ---------------------------------------------------------------------------
    INTERNAL FIELDS :: LAST POSITIONS
  ---------------------------------------------------------------------------
  */

  /** Left position of finger at start */
  __lastTouchLeft: null,

  /** Top position of finger at start */
  __lastTouchTop: null,

  /** Timestamp of last move of finger. Used to limit tracking range for deceleration speed. */
  __lastTouchMove: null,

  /** List of positions, uses three indexes for each state: left, top, timestamp */
  __positions: null,



  /*
  ---------------------------------------------------------------------------
    INTERNAL FIELDS :: DECELERATION SUPPORT
  ---------------------------------------------------------------------------
  */

  /** Minimum left scroll position during deceleration */
  __minDecelerationScrollLeft: null,

  /** Minimum top scroll position during deceleration */
  __minDecelerationScrollTop: null,

  /** Maximum left scroll position during deceleration */
  __maxDecelerationScrollLeft: null,

  /** Maximum top scroll position during deceleration */
  __maxDecelerationScrollTop: null,

  /** Current factor to modify horizontal scroll position with on every step */
  __decelerationVelocityX: null,

  /** Current factor to modify vertical scroll position with on every step */
  __decelerationVelocityY: null,


  /** the browser-specific property to use for transforms */
  __transformProperty: null,
  __perspectiveProperty: null,

  /** scrollbar indicators */
  __indicatorX: null,
  __indicatorY: null,

  /** Timeout for scrollbar fading */
  __scrollbarFadeTimeout: null,

  /** whether we've tried to wait for size already */
  __didWaitForSize: null,
  __sizerTimeout: null,

  __initEventHandlers: function() {
    var self = this;

    // Event Handler
    var container = self.__container;

    // save height when scroll view is shrunk so we don't need to reflow
    var scrollViewOffsetHeight;

    /**
     * Shrink the scroll view when the keyboard is up if necessary and if the
     * focused input is below the bottom of the shrunk scroll view, scroll it
     * into view.
     */
    self.scrollChildIntoView = function(e) {
      //console.log("scrollChildIntoView at: " + Date.now());

      // D
      var scrollBottomOffsetToTop = container.getBoundingClientRect().bottom;
      // D - A
      scrollViewOffsetHeight = container.offsetHeight;
      var alreadyShrunk = self.isShrunkForKeyboard;

      var isModal = container.parentNode.classList.contains('modal');
      // 680px is when the media query for 60% modal width kicks in
      var isInsetModal = isModal && window.innerWidth >= 680;

     /*
      *  _______
      * |---A---| <- top of scroll view
      * |       |
      * |---B---| <- keyboard
      * |   C   | <- input
      * |---D---| <- initial bottom of scroll view
      * |___E___| <- bottom of viewport
      *
      *  All commented calculations relative to the top of the viewport (ie E
      *  is the viewport height, not 0)
      */
      if (!alreadyShrunk) {
        // shrink scrollview so we can actually scroll if the input is hidden
        // if it isn't shrink so we can scroll to inputs under the keyboard
        // inset modals won't shrink on Android on their own when the keyboard appears
        if ( ionic.Platform.isIOS() || ionic.Platform.isFullScreen || isInsetModal ) {
          // if there are things below the scroll view account for them and
          // subtract them from the keyboard height when resizing
          // E - D                         E                         D
          var scrollBottomOffsetToBottom = e.detail.viewportHeight - scrollBottomOffsetToTop;

          // 0 or D - B if D > B           E - B                     E - D
          var keyboardOffset = Math.max(0, e.detail.keyboardHeight - scrollBottomOffsetToBottom);

          ionic.requestAnimationFrame(function(){
            // D - A or B - A if D > B       D - A             max(0, D - B)
            scrollViewOffsetHeight = scrollViewOffsetHeight - keyboardOffset;
            container.style.height = scrollViewOffsetHeight + "px";
            container.style.overflow = "visible";

            //update scroll view
            self.resize();
          });
        }

        self.isShrunkForKeyboard = true;
      }

      /*
       *  _______
       * |---A---| <- top of scroll view
       * |   *   | <- where we want to scroll to
       * |--B-D--| <- keyboard, bottom of scroll view
       * |   C   | <- input
       * |       |
       * |___E___| <- bottom of viewport
       *
       *  All commented calculations relative to the top of the viewport (ie E
       *  is the viewport height, not 0)
       */
      // if the element is positioned under the keyboard scroll it into view
      if (e.detail.isElementUnderKeyboard) {

        ionic.requestAnimationFrame(function(){
          container.scrollTop = 0;
          // update D if we shrunk
          if (self.isShrunkForKeyboard && !alreadyShrunk) {
            scrollBottomOffsetToTop = container.getBoundingClientRect().bottom;
          }

          // middle of the scrollview, this is where we want to scroll to
          // (D - A) / 2
          var scrollMidpointOffset = scrollViewOffsetHeight * 0.5;
          //console.log("container.offsetHeight: " + scrollViewOffsetHeight);

          // middle of the input we want to scroll into view
          // C
          var inputMidpoint = ((e.detail.elementBottom + e.detail.elementTop) / 2);

          // distance from middle of input to the bottom of the scroll view
          // C - D                                C               D
          var inputMidpointOffsetToScrollBottom = inputMidpoint - scrollBottomOffsetToTop;

          //C - D + (D - A)/2          C - D                     (D - A)/ 2
          var scrollTop = inputMidpointOffsetToScrollBottom + scrollMidpointOffset;

          if ( scrollTop > 0) {
            if (ionic.Platform.isIOS()) ionic.tap.cloneFocusedInput(container, self);
            self.scrollBy(0, scrollTop, true);
            self.onScroll();
          }
        });
      }

      // Only the first scrollView parent of the element that broadcasted this event
      // (the active element that needs to be shown) should receive this event
      e.stopPropagation();
    };

    self.resetScrollView = function() {
      //return scrollview to original height once keyboard has hidden
      if ( self.isShrunkForKeyboard ) {
        self.isShrunkForKeyboard = false;
        container.style.height = "";
        container.style.overflow = "";
      }
      self.resize();
    };

    //Broadcasted when keyboard is shown on some platforms.
    //See js/utils/keyboard.js
    container.addEventListener('scrollChildIntoView', self.scrollChildIntoView);

    // Listen on document because container may not have had the last
    // keyboardActiveElement, for example after closing a modal with a focused
    // input and returning to a previously resized scroll view in an ion-content.
    // Since we can only resize scroll views that are currently visible, just resize
    // the current scroll view when the keyboard is closed.
    document.addEventListener('resetScrollView', self.resetScrollView);

    function getEventTouches(e) {
      return e.touches && e.touches.length ? e.touches : [{
        pageX: e.pageX,
        pageY: e.pageY
      }];
    }

    self.touchStart = function(e) {
      self.startCoordinates = ionic.tap.pointerCoord(e);

      if ( ionic.tap.ignoreScrollStart(e) ) {
        return;
      }

      self.__isDown = true;

      if ( ionic.tap.containsOrIsTextInput(e.target) || e.target.tagName === 'SELECT' ) {
        // do not start if the target is a text input
        // if there is a touchmove on this input, then we can start the scroll
        self.__hasStarted = false;
        return;
      }

      self.__isSelectable = true;
      self.__enableScrollY = true;
      self.__hasStarted = true;
      self.doTouchStart(getEventTouches(e), e.timeStamp);
      e.preventDefault();
    };

    self.touchMove = function(e) {
      if (self.options.freeze || !self.__isDown ||
        (!self.__isDown && e.defaultPrevented) ||
        (e.target.tagName === 'TEXTAREA' && e.target.parentElement.querySelector(':focus')) ) {
        return;
      }

      if ( !self.__hasStarted && ( ionic.tap.containsOrIsTextInput(e.target) || e.target.tagName === 'SELECT' ) ) {
        // the target is a text input and scroll has started
        // since the text input doesn't start on touchStart, do it here
        self.__hasStarted = true;
        self.doTouchStart(getEventTouches(e), e.timeStamp);
        e.preventDefault();
        return;
      }

      if (self.startCoordinates) {
        // we have start coordinates, so get this touch move's current coordinates
        var currentCoordinates = ionic.tap.pointerCoord(e);

        if ( self.__isSelectable &&
            ionic.tap.isTextInput(e.target) &&
            Math.abs(self.startCoordinates.x - currentCoordinates.x) > 20 ) {
          // user slid the text input's caret on its x axis, disable any future y scrolling
          self.__enableScrollY = false;
          self.__isSelectable = true;
        }

        if ( self.__enableScrollY && Math.abs(self.startCoordinates.y - currentCoordinates.y) > 10 ) {
          // user scrolled the entire view on the y axis
          // disabled being able to select text on an input
          // hide the input which has focus, and show a cloned one that doesn't have focus
          self.__isSelectable = false;
          ionic.tap.cloneFocusedInput(container, self);
        }
      }

      self.doTouchMove(getEventTouches(e), e.timeStamp, e.scale);
      self.__isDown = true;
    };

    self.touchMoveBubble = function(e) {
      if(self.__isDown && self.options.preventDefault) {
        e.preventDefault();
      }
    };

    self.touchEnd = function(e) {
      if (!self.__isDown) return;

      self.doTouchEnd(e, e.timeStamp);
      self.__isDown = false;
      self.__hasStarted = false;
      self.__isSelectable = true;
      self.__enableScrollY = true;

      if ( !self.__isDragging && !self.__isDecelerating && !self.__isAnimating ) {
        ionic.tap.removeClonedInputs(container, self);
      }
    };

    self.mouseWheel = ionic.animationFrameThrottle(function(e) {
      var scrollParent = ionic.DomUtil.getParentOrSelfWithClass(e.target, 'ionic-scroll');
      if (!self.options.freeze && scrollParent === self.__container) {

        self.hintResize();
        self.scrollBy(
          (e.wheelDeltaX || e.deltaX || 0) / self.options.wheelDampen,
          (-e.wheelDeltaY || e.deltaY || 0) / self.options.wheelDampen
        );

        self.__fadeScrollbars('in');
        clearTimeout(self.__wheelHideBarTimeout);
        self.__wheelHideBarTimeout = setTimeout(function() {
          self.__fadeScrollbars('out');
        }, 100);
      }
    });

    if ('ontouchstart' in window) {
      // Touch Events
      container.addEventListener("touchstart", self.touchStart, false);
      if(self.options.preventDefault) container.addEventListener("touchmove", self.touchMoveBubble, false);
      document.addEventListener("touchmove", self.touchMove, false);
      document.addEventListener("touchend", self.touchEnd, false);
      document.addEventListener("touchcancel", self.touchEnd, false);
      document.addEventListener("wheel", self.mouseWheel, false);

    } else if (window.navigator.pointerEnabled) {
      // Pointer Events
      container.addEventListener("pointerdown", self.touchStart, false);
      if(self.options.preventDefault) container.addEventListener("pointermove", self.touchMoveBubble, false);
      document.addEventListener("pointermove", self.touchMove, false);
      document.addEventListener("pointerup", self.touchEnd, false);
      document.addEventListener("pointercancel", self.touchEnd, false);
      document.addEventListener("wheel", self.mouseWheel, false);

    } else if (window.navigator.msPointerEnabled) {
      // IE10, WP8 (Pointer Events)
      container.addEventListener("MSPointerDown", self.touchStart, false);
      if(self.options.preventDefault) container.addEventListener("MSPointerMove", self.touchMoveBubble, false);
      document.addEventListener("MSPointerMove", self.touchMove, false);
      document.addEventListener("MSPointerUp", self.touchEnd, false);
      document.addEventListener("MSPointerCancel", self.touchEnd, false);
      document.addEventListener("wheel", self.mouseWheel, false);

    } else {
      // Mouse Events
      var mousedown = false;

      self.mouseDown = function(e) {
        if ( ionic.tap.ignoreScrollStart(e) || e.target.tagName === 'SELECT' ) {
          return;
        }
        self.doTouchStart(getEventTouches(e), e.timeStamp);

        if ( !ionic.tap.isTextInput(e.target) ) {
          e.preventDefault();
        }
        mousedown = true;
      };

      self.mouseMove = function(e) {
        if (self.options.freeze || !mousedown || (!mousedown && e.defaultPrevented)) {
          return;
        }

        self.doTouchMove(getEventTouches(e), e.timeStamp);

        mousedown = true;
      };

      self.mouseMoveBubble = function(e) {
        if (mousedown && self.options.preventDefault) {
          e.preventDefault();
        }
      };

      self.mouseUp = function(e) {
        if (!mousedown) {
          return;
        }

        self.doTouchEnd(e, e.timeStamp);

        mousedown = false;
      };

      container.addEventListener("mousedown", self.mouseDown, false);
      if(self.options.preventDefault) container.addEventListener("mousemove", self.mouseMoveBubble, false);
      document.addEventListener("mousemove", self.mouseMove, false);
      document.addEventListener("mouseup", self.mouseUp, false);
      document.addEventListener('mousewheel', self.mouseWheel, false);
      document.addEventListener('wheel', self.mouseWheel, false);
    }
  },

  __cleanup: function() {
    var self = this;
    var container = self.__container;

    container.removeEventListener('touchstart', self.touchStart);
    container.removeEventListener('touchmove', self.touchMoveBubble);
    document.removeEventListener('touchmove', self.touchMove);
    document.removeEventListener('touchend', self.touchEnd);
    document.removeEventListener('touchcancel', self.touchEnd);

    container.removeEventListener("pointerdown", self.touchStart);
    container.removeEventListener("pointermove", self.touchMoveBubble);
    document.removeEventListener("pointermove", self.touchMove);
    document.removeEventListener("pointerup", self.touchEnd);
    document.removeEventListener("pointercancel", self.touchEnd);

    container.removeEventListener("MSPointerDown", self.touchStart);
    container.removeEventListener("MSPointerMove", self.touchMoveBubble);
    document.removeEventListener("MSPointerMove", self.touchMove);
    document.removeEventListener("MSPointerUp", self.touchEnd);
    document.removeEventListener("MSPointerCancel", self.touchEnd);

    container.removeEventListener("mousedown", self.mouseDown);
    container.removeEventListener("mousemove", self.mouseMoveBubble);
    document.removeEventListener("mousemove", self.mouseMove);
    document.removeEventListener("mouseup", self.mouseUp);
    document.removeEventListener('mousewheel', self.mouseWheel);
    document.removeEventListener('wheel', self.mouseWheel);

    container.removeEventListener('scrollChildIntoView', self.scrollChildIntoView);
    document.removeEventListener('resetScrollView', self.resetScrollView);

    ionic.tap.removeClonedInputs(container, self);

    delete self.__container;
    delete self.__content;
    delete self.__indicatorX;
    delete self.__indicatorY;
    delete self.options.el;

    self.__callback = self.scrollChildIntoView = self.resetScrollView = NOOP;

    self.mouseMove = self.mouseDown = self.mouseUp = self.mouseWheel =
      self.touchStart = self.touchMove = self.touchEnd = self.touchCancel = NOOP;

    self.resize = self.scrollTo = self.zoomTo =
      self.__scrollingComplete = NOOP;
    container = null;
  },

  /** Create a scroll bar div with the given direction **/
  __createScrollbar: function(direction) {
    var bar = document.createElement('div'),
      indicator = document.createElement('div');

    indicator.className = 'scroll-bar-indicator scroll-bar-fade-out';

    if (direction == 'h') {
      bar.className = 'scroll-bar scroll-bar-h';
    } else {
      bar.className = 'scroll-bar scroll-bar-v';
    }

    bar.appendChild(indicator);
    return bar;
  },

  __createScrollbars: function() {
    var self = this;
    var indicatorX, indicatorY;

    if (self.options.scrollingX) {
      indicatorX = {
        el: self.__createScrollbar('h'),
        sizeRatio: 1
      };
      indicatorX.indicator = indicatorX.el.children[0];

      if (self.options.scrollbarX) {
        self.__container.appendChild(indicatorX.el);
      }
      self.__indicatorX = indicatorX;
    }

    if (self.options.scrollingY) {
      indicatorY = {
        el: self.__createScrollbar('v'),
        sizeRatio: 1
      };
      indicatorY.indicator = indicatorY.el.children[0];

      if (self.options.scrollbarY) {
        self.__container.appendChild(indicatorY.el);
      }
      self.__indicatorY = indicatorY;
    }
  },

  __resizeScrollbars: function() {
    var self = this;

    // Update horiz bar
    if (self.__indicatorX) {
      var width = Math.max(Math.round(self.__clientWidth * self.__clientWidth / (self.__contentWidth)), 20);
      if (width > self.__contentWidth) {
        width = 0;
      }
      if (width !== self.__indicatorX.size) {
        ionic.requestAnimationFrame(function(){
          self.__indicatorX.indicator.style.width = width + 'px';
        });
      }
      self.__indicatorX.size = width;
      self.__indicatorX.minScale = self.options.minScrollbarSizeX / width;
      self.__indicatorX.maxPos = self.__clientWidth - width;
      self.__indicatorX.sizeRatio = self.__maxScrollLeft ? self.__indicatorX.maxPos / self.__maxScrollLeft : 1;
    }

    // Update vert bar
    if (self.__indicatorY) {
      var height = Math.max(Math.round(self.__clientHeight * self.__clientHeight / (self.__contentHeight)), 20);
      if (height > self.__contentHeight) {
        height = 0;
      }
      if (height !== self.__indicatorY.size) {
        ionic.requestAnimationFrame(function(){
          self.__indicatorY && (self.__indicatorY.indicator.style.height = height + 'px');
        });
      }
      self.__indicatorY.size = height;
      self.__indicatorY.minScale = self.options.minScrollbarSizeY / height;
      self.__indicatorY.maxPos = self.__clientHeight - height;
      self.__indicatorY.sizeRatio = self.__maxScrollTop ? self.__indicatorY.maxPos / self.__maxScrollTop : 1;
    }
  },

  /**
   * Move and scale the scrollbars as the page scrolls.
   */
  __repositionScrollbars: function() {
    var self = this,
        heightScale, widthScale,
        widthDiff, heightDiff,
        x, y,
        xstop = 0, ystop = 0;

    if (self.__indicatorX) {
      // Handle the X scrollbar

      // Don't go all the way to the right if we have a vertical scrollbar as well
      if (self.__indicatorY) xstop = 10;

      x = Math.round(self.__indicatorX.sizeRatio * self.__scrollLeft) || 0;

      // The the difference between the last content X position, and our overscrolled one
      widthDiff = self.__scrollLeft - (self.__maxScrollLeft - xstop);

      if (self.__scrollLeft < 0) {

        widthScale = Math.max(self.__indicatorX.minScale,
            (self.__indicatorX.size - Math.abs(self.__scrollLeft)) / self.__indicatorX.size);

        // Stay at left
        x = 0;

        // Make sure scale is transformed from the left/center origin point
        self.__indicatorX.indicator.style[self.__transformOriginProperty] = 'left center';
      } else if (widthDiff > 0) {

        widthScale = Math.max(self.__indicatorX.minScale,
            (self.__indicatorX.size - widthDiff) / self.__indicatorX.size);

        // Stay at the furthest x for the scrollable viewport
        x = self.__indicatorX.maxPos - xstop;

        // Make sure scale is transformed from the right/center origin point
        self.__indicatorX.indicator.style[self.__transformOriginProperty] = 'right center';

      } else {

        // Normal motion
        x = Math.min(self.__maxScrollLeft, Math.max(0, x));
        widthScale = 1;

      }

      var translate3dX = 'translate3d(' + x + 'px, 0, 0) scaleX(' + widthScale + ')';
      if (self.__indicatorX.transformProp !== translate3dX) {
        self.__indicatorX.indicator.style[self.__transformProperty] = translate3dX;
        self.__indicatorX.transformProp = translate3dX;
      }
    }

    if (self.__indicatorY) {

      y = Math.round(self.__indicatorY.sizeRatio * self.__scrollTop) || 0;

      // Don't go all the way to the right if we have a vertical scrollbar as well
      if (self.__indicatorX) ystop = 10;

      heightDiff = self.__scrollTop - (self.__maxScrollTop - ystop);

      if (self.__scrollTop < 0) {

        heightScale = Math.max(self.__indicatorY.minScale, (self.__indicatorY.size - Math.abs(self.__scrollTop)) / self.__indicatorY.size);

        // Stay at top
        y = 0;

        // Make sure scale is transformed from the center/top origin point
        if (self.__indicatorY.originProp !== 'center top') {
          self.__indicatorY.indicator.style[self.__transformOriginProperty] = 'center top';
          self.__indicatorY.originProp = 'center top';
        }

      } else if (heightDiff > 0) {

        heightScale = Math.max(self.__indicatorY.minScale, (self.__indicatorY.size - heightDiff) / self.__indicatorY.size);

        // Stay at bottom of scrollable viewport
        y = self.__indicatorY.maxPos - ystop;

        // Make sure scale is transformed from the center/bottom origin point
        if (self.__indicatorY.originProp !== 'center bottom') {
          self.__indicatorY.indicator.style[self.__transformOriginProperty] = 'center bottom';
          self.__indicatorY.originProp = 'center bottom';
        }

      } else {

        // Normal motion
        y = Math.min(self.__maxScrollTop, Math.max(0, y));
        heightScale = 1;

      }

      var translate3dY = 'translate3d(0,' + y + 'px, 0) scaleY(' + heightScale + ')';
      if (self.__indicatorY.transformProp !== translate3dY) {
        self.__indicatorY.indicator.style[self.__transformProperty] = translate3dY;
        self.__indicatorY.transformProp = translate3dY;
      }
    }
  },

  __fadeScrollbars: function(direction, delay) {
    var self = this;

    if (!self.options.scrollbarsFade) {
      return;
    }

    var className = 'scroll-bar-fade-out';

    if (self.options.scrollbarsFade === true) {
      clearTimeout(self.__scrollbarFadeTimeout);

      if (direction == 'in') {
        if (self.__indicatorX) { self.__indicatorX.indicator.classList.remove(className); }
        if (self.__indicatorY) { self.__indicatorY.indicator.classList.remove(className); }
      } else {
        self.__scrollbarFadeTimeout = setTimeout(function() {
          if (self.__indicatorX) { self.__indicatorX.indicator.classList.add(className); }
          if (self.__indicatorY) { self.__indicatorY.indicator.classList.add(className); }
        }, delay || self.options.scrollbarFadeDelay);
      }
    }
  },

  __scrollingComplete: function() {
    this.options.scrollingComplete();
    ionic.tap.removeClonedInputs(this.__container, this);
    this.__fadeScrollbars('out');
  },

  resize: function(continueScrolling) {
    var self = this;
    if (!self.__container || !self.options) return;

    // Update Scroller dimensions for changed content
    // Add padding to bottom of content
    self.setDimensions(
      self.__container.clientWidth,
      self.__container.clientHeight,
      self.options.getContentWidth(),
      self.options.getContentHeight(),
      continueScrolling
    );
  },
  /*
  ---------------------------------------------------------------------------
    PUBLIC API
  ---------------------------------------------------------------------------
  */

  getRenderFn: function() {
    var self = this;

    var content = self.__content;

    var docStyle = document.documentElement.style;

    var engine;
    if ('MozAppearance' in docStyle) {
      engine = 'gecko';
    } else if ('WebkitAppearance' in docStyle) {
      engine = 'webkit';
    } else if (typeof navigator.cpuClass === 'string') {
      engine = 'trident';
    }

    var vendorPrefix = {
      trident: 'ms',
      gecko: 'Moz',
      webkit: 'Webkit',
      presto: 'O'
    }[engine];

    var helperElem = document.createElement("div");
    var undef;

    var perspectiveProperty = vendorPrefix + "Perspective";
    var transformProperty = vendorPrefix + "Transform";
    var transformOriginProperty = vendorPrefix + 'TransformOrigin';

    self.__perspectiveProperty = transformProperty;
    self.__transformProperty = transformProperty;
    self.__transformOriginProperty = transformOriginProperty;

    if (helperElem.style[perspectiveProperty] !== undef) {

      return function(left, top, zoom, wasResize) {
        var translate3d = 'translate3d(' + (-left) + 'px,' + (-top) + 'px,0) scale(' + zoom + ')';
        if (translate3d !== self.contentTransform) {
          content.style[transformProperty] = translate3d;
          self.contentTransform = translate3d;
        }
        self.__repositionScrollbars();
        if (!wasResize) {
          self.triggerScrollEvent();
        }
      };

    } else if (helperElem.style[transformProperty] !== undef) {

      return function(left, top, zoom, wasResize) {
        content.style[transformProperty] = 'translate(' + (-left) + 'px,' + (-top) + 'px) scale(' + zoom + ')';
        self.__repositionScrollbars();
        if (!wasResize) {
          self.triggerScrollEvent();
        }
      };

    } else {

      return function(left, top, zoom, wasResize) {
        content.style.marginLeft = left ? (-left / zoom) + 'px' : '';
        content.style.marginTop = top ? (-top / zoom) + 'px' : '';
        content.style.zoom = zoom || '';
        self.__repositionScrollbars();
        if (!wasResize) {
          self.triggerScrollEvent();
        }
      };

    }
  },


  /**
   * Configures the dimensions of the client (outer) and content (inner) elements.
   * Requires the available space for the outer element and the outer size of the inner element.
   * All values which are falsy (null or zero etc.) are ignored and the old value is kept.
   *
   * @param clientWidth {Integer} Inner width of outer element
   * @param clientHeight {Integer} Inner height of outer element
   * @param contentWidth {Integer} Outer width of inner element
   * @param contentHeight {Integer} Outer height of inner element
   */
  setDimensions: function(clientWidth, clientHeight, contentWidth, contentHeight, continueScrolling) {
    var self = this;

    if (!clientWidth && !clientHeight && !contentWidth && !contentHeight) {
      // this scrollview isn't rendered, don't bother
      return;
    }

    // Only update values which are defined
    if (clientWidth === +clientWidth) {
      self.__clientWidth = clientWidth;
    }

    if (clientHeight === +clientHeight) {
      self.__clientHeight = clientHeight;
    }

    if (contentWidth === +contentWidth) {
      self.__contentWidth = contentWidth;
    }

    if (contentHeight === +contentHeight) {
      self.__contentHeight = contentHeight;
    }

    // Refresh maximums
    self.__computeScrollMax();
    self.__resizeScrollbars();

    // Refresh scroll position
    if (!continueScrolling) {
      self.scrollTo(self.__scrollLeft, self.__scrollTop, true, null, true);
    }

  },


  /**
   * Sets the client coordinates in relation to the document.
   *
   * @param left {Integer} Left position of outer element
   * @param top {Integer} Top position of outer element
   */
  setPosition: function(left, top) {
    this.__clientLeft = left || 0;
    this.__clientTop = top || 0;
  },


  /**
   * Configures the snapping (when snapping is active)
   *
   * @param width {Integer} Snapping width
   * @param height {Integer} Snapping height
   */
  setSnapSize: function(width, height) {
    this.__snapWidth = width;
    this.__snapHeight = height;
  },


  /**
   * Activates pull-to-refresh. A special zone on the top of the list to start a list refresh whenever
   * the user event is released during visibility of this zone. This was introduced by some apps on iOS like
   * the official Twitter client.
   *
   * @param height {Integer} Height of pull-to-refresh zone on top of rendered list
   * @param activateCallback {Function} Callback to execute on activation. This is for signalling the user about a refresh is about to happen when he release.
   * @param deactivateCallback {Function} Callback to execute on deactivation. This is for signalling the user about the refresh being cancelled.
   * @param startCallback {Function} Callback to execute to start the real async refresh action. Call {@link #finishPullToRefresh} after finish of refresh.
   * @param showCallback {Function} Callback to execute when the refresher should be shown. This is for showing the refresher during a negative scrollTop.
   * @param hideCallback {Function} Callback to execute when the refresher should be hidden. This is for hiding the refresher when it's behind the nav bar.
   * @param tailCallback {Function} Callback to execute just before the refresher returns to it's original state. This is for zooming out the refresher.
   * @param pullProgressCallback Callback to state the progress while pulling to refresh
   */
  activatePullToRefresh: function(height, refresherMethods) {
    var self = this;

    self.__refreshHeight = height;
    self.__refreshActivate = function() { ionic.requestAnimationFrame(refresherMethods.activate); };
    self.__refreshDeactivate = function() { ionic.requestAnimationFrame(refresherMethods.deactivate); };
    self.__refreshStart = function() { ionic.requestAnimationFrame(refresherMethods.start); };
    self.__refreshShow = function() { ionic.requestAnimationFrame(refresherMethods.show); };
    self.__refreshHide = function() { ionic.requestAnimationFrame(refresherMethods.hide); };
    self.__refreshTail = function() { ionic.requestAnimationFrame(refresherMethods.tail); };
    self.__refreshTailTime = 100;
    self.__minSpinTime = 600;
  },


  /**
   * Starts pull-to-refresh manually.
   */
  triggerPullToRefresh: function() {
    // Use publish instead of scrollTo to allow scrolling to out of boundary position
    // We don't need to normalize scrollLeft, zoomLevel, etc. here because we only y-scrolling when pull-to-refresh is enabled
    this.__publish(this.__scrollLeft, -this.__refreshHeight, this.__zoomLevel, true);

    var d = new Date();
    this.refreshStartTime = d.getTime();

    if (this.__refreshStart) {
      this.__refreshStart();
    }
  },


  /**
   * Signalizes that pull-to-refresh is finished.
   */
  finishPullToRefresh: function() {
    var self = this;
    // delay to make sure the spinner has a chance to spin for a split second before it's dismissed
    var d = new Date();
    var delay = 0;
    if (self.refreshStartTime + self.__minSpinTime > d.getTime()) {
      delay = self.refreshStartTime + self.__minSpinTime - d.getTime();
    }
    setTimeout(function() {
      if (self.__refreshTail) {
        self.__refreshTail();
      }
      setTimeout(function() {
        self.__refreshActive = false;
        if (self.__refreshDeactivate) {
          self.__refreshDeactivate();
        }
        if (self.__refreshHide) {
          self.__refreshHide();
        }

        self.scrollTo(self.__scrollLeft, self.__scrollTop, true);
      }, self.__refreshTailTime);
    }, delay);
  },


  /**
   * Returns the scroll position and zooming values
   *
   * @return {Map} `left` and `top` scroll position and `zoom` level
   */
  getValues: function() {
    return {
      left: this.__scrollLeft,
      top: this.__scrollTop,
      zoom: this.__zoomLevel
    };
  },


  /**
   * Returns the maximum scroll values
   *
   * @return {Map} `left` and `top` maximum scroll values
   */
  getScrollMax: function() {
    return {
      left: this.__maxScrollLeft,
      top: this.__maxScrollTop
    };
  },


  /**
   * Zooms to the given level. Supports optional animation. Zooms
   * the center when no coordinates are given.
   *
   * @param level {Number} Level to zoom to
   * @param animate {Boolean} Whether to use animation
   * @param originLeft {Number} Zoom in at given left coordinate
   * @param originTop {Number} Zoom in at given top coordinate
   */
  zoomTo: function(level, animate, originLeft, originTop) {
    var self = this;

    if (!self.options.zooming) {
      throw new Error("Zooming is not enabled!");
    }

    // Stop deceleration
    if (self.__isDecelerating) {
      zyngaCore.effect.Animate.stop(self.__isDecelerating);
      self.__isDecelerating = false;
    }

    var oldLevel = self.__zoomLevel;

    // Normalize input origin to center of viewport if not defined
    if (originLeft == null) {
      originLeft = self.__clientWidth / 2;
    }

    if (originTop == null) {
      originTop = self.__clientHeight / 2;
    }

    // Limit level according to configuration
    level = Math.max(Math.min(level, self.options.maxZoom), self.options.minZoom);

    // Recompute maximum values while temporary tweaking maximum scroll ranges
    self.__computeScrollMax(level);

    // Recompute left and top coordinates based on new zoom level
    var left = ((originLeft + self.__scrollLeft) * level / oldLevel) - originLeft;
    var top = ((originTop + self.__scrollTop) * level / oldLevel) - originTop;

    // Limit x-axis
    if (left > self.__maxScrollLeft) {
      left = self.__maxScrollLeft;
    } else if (left < 0) {
      left = 0;
    }

    // Limit y-axis
    if (top > self.__maxScrollTop) {
      top = self.__maxScrollTop;
    } else if (top < 0) {
      top = 0;
    }

    // Push values out
    self.__publish(left, top, level, animate);

  },


  /**
   * Zooms the content by the given factor.
   *
   * @param factor {Number} Zoom by given factor
   * @param animate {Boolean} Whether to use animation
   * @param originLeft {Number} Zoom in at given left coordinate
   * @param originTop {Number} Zoom in at given top coordinate
   */
  zoomBy: function(factor, animate, originLeft, originTop) {
    this.zoomTo(this.__zoomLevel * factor, animate, originLeft, originTop);
  },


  /**
   * Scrolls to the given position. Respect limitations and snapping automatically.
   *
   * @param left {Number} Horizontal scroll position, keeps current if value is <code>null</code>
   * @param top {Number} Vertical scroll position, keeps current if value is <code>null</code>
   * @param animate {Boolean} Whether the scrolling should happen using an animation
   * @param zoom {Number} Zoom level to go to
   */
  scrollTo: function(left, top, animate, zoom, wasResize) {
    var self = this;

    // Stop deceleration
    if (self.__isDecelerating) {
      zyngaCore.effect.Animate.stop(self.__isDecelerating);
      self.__isDecelerating = false;
    }

    // Correct coordinates based on new zoom level
    if (zoom != null && zoom !== self.__zoomLevel) {

      if (!self.options.zooming) {
        throw new Error("Zooming is not enabled!");
      }

      left *= zoom;
      top *= zoom;

      // Recompute maximum values while temporary tweaking maximum scroll ranges
      self.__computeScrollMax(zoom);

    } else {

      // Keep zoom when not defined
      zoom = self.__zoomLevel;

    }

    if (!self.options.scrollingX) {

      left = self.__scrollLeft;

    } else {

      if (self.options.paging) {
        left = Math.round(left / self.__clientWidth) * self.__clientWidth;
      } else if (self.options.snapping) {
        left = Math.round(left / self.__snapWidth) * self.__snapWidth;
      }

    }

    if (!self.options.scrollingY) {

      top = self.__scrollTop;

    } else {

      if (self.options.paging) {
        top = Math.round(top / self.__clientHeight) * self.__clientHeight;
      } else if (self.options.snapping) {
        top = Math.round(top / self.__snapHeight) * self.__snapHeight;
      }

    }

    // Limit for allowed ranges
    left = Math.max(Math.min(self.__maxScrollLeft, left), 0);
    top = Math.max(Math.min(self.__maxScrollTop, top), 0);

    // Don't animate when no change detected, still call publish to make sure
    // that rendered position is really in-sync with internal data
    if (left === self.__scrollLeft && top === self.__scrollTop) {
      animate = false;
    }

    // Publish new values
    self.__publish(left, top, zoom, animate, wasResize);

  },


  /**
   * Scroll by the given offset
   *
   * @param left {Number} Scroll x-axis by given offset
   * @param top {Number} Scroll y-axis by given offset
   * @param animate {Boolean} Whether to animate the given change
   */
  scrollBy: function(left, top, animate) {
    var self = this;

    var startLeft = self.__isAnimating ? self.__scheduledLeft : self.__scrollLeft;
    var startTop = self.__isAnimating ? self.__scheduledTop : self.__scrollTop;

    self.scrollTo(startLeft + (left || 0), startTop + (top || 0), animate);
  },



  /*
  ---------------------------------------------------------------------------
    EVENT CALLBACKS
  ---------------------------------------------------------------------------
  */

  /**
   * Mouse wheel handler for zooming support
   */
  doMouseZoom: function(wheelDelta, timeStamp, pageX, pageY) {
    var change = wheelDelta > 0 ? 0.97 : 1.03;
    return this.zoomTo(this.__zoomLevel * change, false, pageX - this.__clientLeft, pageY - this.__clientTop);
  },

  /**
   * Touch start handler for scrolling support
   */
  doTouchStart: function(touches, timeStamp) {
    var self = this;

    // remember if the deceleration was just stopped
    self.__decStopped = !!(self.__isDecelerating || self.__isAnimating);

    self.hintResize();

    if (timeStamp instanceof Date) {
      timeStamp = timeStamp.valueOf();
    }
    if (typeof timeStamp !== "number") {
      timeStamp = Date.now();
    }

    // Reset interruptedAnimation flag
    self.__interruptedAnimation = true;

    // Stop deceleration
    if (self.__isDecelerating) {
      zyngaCore.effect.Animate.stop(self.__isDecelerating);
      self.__isDecelerating = false;
      self.__interruptedAnimation = true;
    }

    // Stop animation
    if (self.__isAnimating) {
      zyngaCore.effect.Animate.stop(self.__isAnimating);
      self.__isAnimating = false;
      self.__interruptedAnimation = true;
    }

    // Use center point when dealing with two fingers
    var currentTouchLeft, currentTouchTop;
    var isSingleTouch = touches.length === 1;
    if (isSingleTouch) {
      currentTouchLeft = touches[0].pageX;
      currentTouchTop = touches[0].pageY;
    } else {
      currentTouchLeft = Math.abs(touches[0].pageX + touches[1].pageX) / 2;
      currentTouchTop = Math.abs(touches[0].pageY + touches[1].pageY) / 2;
    }

    // Store initial positions
    self.__initialTouchLeft = currentTouchLeft;
    self.__initialTouchTop = currentTouchTop;

    // Store initial touchList for scale calculation
    self.__initialTouches = touches;

    // Store current zoom level
    self.__zoomLevelStart = self.__zoomLevel;

    // Store initial touch positions
    self.__lastTouchLeft = currentTouchLeft;
    self.__lastTouchTop = currentTouchTop;

    // Store initial move time stamp
    self.__lastTouchMove = timeStamp;

    // Reset initial scale
    self.__lastScale = 1;

    // Reset locking flags
    self.__enableScrollX = !isSingleTouch && self.options.scrollingX;
    self.__enableScrollY = !isSingleTouch && self.options.scrollingY;

    // Reset tracking flag
    self.__isTracking = true;

    // Reset deceleration complete flag
    self.__didDecelerationComplete = false;

    // Dragging starts directly with two fingers, otherwise lazy with an offset
    self.__isDragging = !isSingleTouch;

    // Some features are disabled in multi touch scenarios
    self.__isSingleTouch = isSingleTouch;

    // Clearing data structure
    self.__positions = [];

  },


  /**
   * Touch move handler for scrolling support
   */
  doTouchMove: function(touches, timeStamp, scale) {
    if (timeStamp instanceof Date) {
      timeStamp = timeStamp.valueOf();
    }
    if (typeof timeStamp !== "number") {
      timeStamp = Date.now();
    }

    var self = this;

    // Ignore event when tracking is not enabled (event might be outside of element)
    if (!self.__isTracking) {
      return;
    }

    var currentTouchLeft, currentTouchTop;

    // Compute move based around of center of fingers
    if (touches.length === 2) {
      currentTouchLeft = Math.abs(touches[0].pageX + touches[1].pageX) / 2;
      currentTouchTop = Math.abs(touches[0].pageY + touches[1].pageY) / 2;

      // Calculate scale when not present and only when touches are used
      if (!scale && self.options.zooming) {
        scale = self.__getScale(self.__initialTouches, touches);
      }
    } else {
      currentTouchLeft = touches[0].pageX;
      currentTouchTop = touches[0].pageY;
    }

    var positions = self.__positions;

    // Are we already is dragging mode?
    if (self.__isDragging) {
        self.__decStopped = false;

      // Compute move distance
      var moveX = currentTouchLeft - self.__lastTouchLeft;
      var moveY = currentTouchTop - self.__lastTouchTop;

      // Read previous scroll position and zooming
      var scrollLeft = self.__scrollLeft;
      var scrollTop = self.__scrollTop;
      var level = self.__zoomLevel;

      // Work with scaling
      if (scale != null && self.options.zooming) {

        var oldLevel = level;

        // Recompute level based on previous scale and new scale
        level = level / self.__lastScale * scale;

        // Limit level according to configuration
        level = Math.max(Math.min(level, self.options.maxZoom), self.options.minZoom);

        // Only do further compution when change happened
        if (oldLevel !== level) {

          // Compute relative event position to container
          var currentTouchLeftRel = currentTouchLeft - self.__clientLeft;
          var currentTouchTopRel = currentTouchTop - self.__clientTop;

          // Recompute left and top coordinates based on new zoom level
          scrollLeft = ((currentTouchLeftRel + scrollLeft) * level / oldLevel) - currentTouchLeftRel;
          scrollTop = ((currentTouchTopRel + scrollTop) * level / oldLevel) - currentTouchTopRel;

          // Recompute max scroll values
          self.__computeScrollMax(level);

        }
      }

      if (self.__enableScrollX) {

        scrollLeft -= moveX * self.options.speedMultiplier;
        var maxScrollLeft = self.__maxScrollLeft;

        if (scrollLeft > maxScrollLeft || scrollLeft < 0) {

          // Slow down on the edges
          if (self.options.bouncing) {

            scrollLeft += (moveX / 2 * self.options.speedMultiplier);

          } else if (scrollLeft > maxScrollLeft) {

            scrollLeft = maxScrollLeft;

          } else {

            scrollLeft = 0;

          }
        }
      }

      // Compute new vertical scroll position
      if (self.__enableScrollY) {

        scrollTop -= moveY * self.options.speedMultiplier;
        var maxScrollTop = self.__maxScrollTop;

        if (scrollTop > maxScrollTop || scrollTop < 0) {

          // Slow down on the edges
          if (self.options.bouncing || (self.__refreshHeight && scrollTop < 0)) {

            scrollTop += (moveY / 2 * self.options.speedMultiplier);

            // Support pull-to-refresh (only when only y is scrollable)
            if (!self.__enableScrollX && self.__refreshHeight != null) {

              // hide the refresher when it's behind the header bar in case of header transparency
              if (scrollTop < 0) {
                self.__refreshHidden = false;
                self.__refreshShow();
              } else {
                self.__refreshHide();
                self.__refreshHidden = true;
              }

              if (!self.__refreshActive && scrollTop <= -self.__refreshHeight) {

                self.__refreshActive = true;
                if (self.__refreshActivate) {
                  self.__refreshActivate();
                }

              } else if (self.__refreshActive && scrollTop > -self.__refreshHeight) {

                self.__refreshActive = false;
                if (self.__refreshDeactivate) {
                  self.__refreshDeactivate();
                }

              }
            }

          } else if (scrollTop > maxScrollTop) {

            scrollTop = maxScrollTop;

          } else {

            scrollTop = 0;

          }
        } else if (self.__refreshHeight && !self.__refreshHidden) {
          // if a positive scroll value and the refresher is still not hidden, hide it
          self.__refreshHide();
          self.__refreshHidden = true;
        }
      }

      // Keep list from growing infinitely (holding min 10, max 20 measure points)
      if (positions.length > 60) {
        positions.splice(0, 30);
      }

      // Track scroll movement for decleration
      positions.push(scrollLeft, scrollTop, timeStamp);

      // Sync scroll position
      self.__publish(scrollLeft, scrollTop, level);

    // Otherwise figure out whether we are switching into dragging mode now.
    } else {

      var minimumTrackingForScroll = self.options.locking ? 3 : 0;
      var minimumTrackingForDrag = 5;

      var distanceX = Math.abs(currentTouchLeft - self.__initialTouchLeft);
      var distanceY = Math.abs(currentTouchTop - self.__initialTouchTop);

      self.__enableScrollX = self.options.scrollingX && distanceX >= minimumTrackingForScroll;
      self.__enableScrollY = self.options.scrollingY && distanceY >= minimumTrackingForScroll;

      positions.push(self.__scrollLeft, self.__scrollTop, timeStamp);

      self.__isDragging = (self.__enableScrollX || self.__enableScrollY) && (distanceX >= minimumTrackingForDrag || distanceY >= minimumTrackingForDrag);
      if (self.__isDragging) {
        self.__interruptedAnimation = false;
        self.__fadeScrollbars('in');
      }

    }

    // Update last touch positions and time stamp for next event
    self.__lastTouchLeft = currentTouchLeft;
    self.__lastTouchTop = currentTouchTop;
    self.__lastTouchMove = timeStamp;
    self.__lastScale = scale;

  },


  /**
   * Touch end handler for scrolling support
   */
  doTouchEnd: function(e, timeStamp) {
    if (timeStamp instanceof Date) {
      timeStamp = timeStamp.valueOf();
    }
    if (typeof timeStamp !== "number") {
      timeStamp = Date.now();
    }

    var self = this;

    // Ignore event when tracking is not enabled (no touchstart event on element)
    // This is required as this listener ('touchmove') sits on the document and not on the element itself.
    if (!self.__isTracking) {
      return;
    }

    // Not touching anymore (when two finger hit the screen there are two touch end events)
    self.__isTracking = false;

    // Be sure to reset the dragging flag now. Here we also detect whether
    // the finger has moved fast enough to switch into a deceleration animation.
    if (self.__isDragging) {

      // Reset dragging flag
      self.__isDragging = false;

      // Start deceleration
      // Verify that the last move detected was in some relevant time frame
      if (self.__isSingleTouch && self.options.animating && (timeStamp - self.__lastTouchMove) <= 100) {

        // Then figure out what the scroll position was about 100ms ago
        var positions = self.__positions;
        var endPos = positions.length - 1;
        var startPos = endPos;

        // Move pointer to position measured 100ms ago
        for (var i = endPos; i > 0 && positions[i] > (self.__lastTouchMove - 100); i -= 3) {
          startPos = i;
        }

        // If start and stop position is identical in a 100ms timeframe,
        // we cannot compute any useful deceleration.
        if (startPos !== endPos) {

          // Compute relative movement between these two points
          var timeOffset = positions[endPos] - positions[startPos];
          var movedLeft = self.__scrollLeft - positions[startPos - 2];
          var movedTop = self.__scrollTop - positions[startPos - 1];

          // Based on 50ms compute the movement to apply for each render step
          self.__decelerationVelocityX = movedLeft / timeOffset * (1000 / 60);
          self.__decelerationVelocityY = movedTop / timeOffset * (1000 / 60);

          // How much velocity is required to start the deceleration
          var minVelocityToStartDeceleration = self.options.paging || self.options.snapping ? self.options.decelVelocityThresholdPaging : self.options.decelVelocityThreshold;

          // Verify that we have enough velocity to start deceleration
          if (Math.abs(self.__decelerationVelocityX) > minVelocityToStartDeceleration || Math.abs(self.__decelerationVelocityY) > minVelocityToStartDeceleration) {

            // Deactivate pull-to-refresh when decelerating
            if (!self.__refreshActive) {
              self.__startDeceleration(timeStamp);
            }
          }
        } else {
          self.__scrollingComplete();
        }
      } else if ((timeStamp - self.__lastTouchMove) > 100) {
        self.__scrollingComplete();
      }

    } else if (self.__decStopped) {
      // the deceleration was stopped
      // user flicked the scroll fast, and stop dragging, then did a touchstart to stop the srolling
      // tell the touchend event code to do nothing, we don't want to actually send a click
      e.isTapHandled = true;
      self.__decStopped = false;
    }

    // If this was a slower move it is per default non decelerated, but this
    // still means that we want snap back to the bounds which is done here.
    // This is placed outside the condition above to improve edge case stability
    // e.g. touchend fired without enabled dragging. This should normally do not
    // have modified the scroll positions or even showed the scrollbars though.
    if (!self.__isDecelerating) {

      if (self.__refreshActive && self.__refreshStart) {

        // Use publish instead of scrollTo to allow scrolling to out of boundary position
        // We don't need to normalize scrollLeft, zoomLevel, etc. here because we only y-scrolling when pull-to-refresh is enabled
        self.__publish(self.__scrollLeft, -self.__refreshHeight, self.__zoomLevel, true);

        var d = new Date();
        self.refreshStartTime = d.getTime();

        if (self.__refreshStart) {
          self.__refreshStart();
        }
        // for iOS-ey style scrolling
        if (!ionic.Platform.isAndroid())self.__startDeceleration();
      } else {

        if (self.__interruptedAnimation || self.__isDragging) {
          self.__scrollingComplete();
        }
        self.scrollTo(self.__scrollLeft, self.__scrollTop, true, self.__zoomLevel);

        // Directly signalize deactivation (nothing todo on refresh?)
        if (self.__refreshActive) {

          self.__refreshActive = false;
          if (self.__refreshDeactivate) {
            self.__refreshDeactivate();
          }

        }
      }
    }

    // Fully cleanup list
    self.__positions.length = 0;

  },



  /*
  ---------------------------------------------------------------------------
    PRIVATE API
  ---------------------------------------------------------------------------
  */

  /**
   * Applies the scroll position to the content element
   *
   * @param left {Number} Left scroll position
   * @param top {Number} Top scroll position
   * @param animate {Boolean} Whether animation should be used to move to the new coordinates
   */
  __publish: function(left, top, zoom, animate, wasResize) {

    var self = this;

    // Remember whether we had an animation, then we try to continue based on the current "drive" of the animation
    var wasAnimating = self.__isAnimating;
    if (wasAnimating) {
      zyngaCore.effect.Animate.stop(wasAnimating);
      self.__isAnimating = false;
    }

    if (animate && self.options.animating) {

      // Keep scheduled positions for scrollBy/zoomBy functionality
      self.__scheduledLeft = left;
      self.__scheduledTop = top;
      self.__scheduledZoom = zoom;

      var oldLeft = self.__scrollLeft;
      var oldTop = self.__scrollTop;
      var oldZoom = self.__zoomLevel;

      var diffLeft = left - oldLeft;
      var diffTop = top - oldTop;
      var diffZoom = zoom - oldZoom;

      var step = function(percent, now, render) {

        if (render) {

          self.__scrollLeft = oldLeft + (diffLeft * percent);
          self.__scrollTop = oldTop + (diffTop * percent);
          self.__zoomLevel = oldZoom + (diffZoom * percent);

          // Push values out
          if (self.__callback) {
            self.__callback(self.__scrollLeft, self.__scrollTop, self.__zoomLevel, wasResize);
          }

        }
      };

      var verify = function(id) {
        return self.__isAnimating === id;
      };

      var completed = function(renderedFramesPerSecond, animationId, wasFinished) {
        if (animationId === self.__isAnimating) {
          self.__isAnimating = false;
        }
        if (self.__didDecelerationComplete || wasFinished) {
          self.__scrollingComplete();
        }

        if (self.options.zooming) {
          self.__computeScrollMax();
        }
      };

      // When continuing based on previous animation we choose an ease-out animation instead of ease-in-out
      self.__isAnimating = zyngaCore.effect.Animate.start(step, verify, completed, self.options.animationDuration, wasAnimating ? easeOutCubic : easeInOutCubic);

    } else {

      self.__scheduledLeft = self.__scrollLeft = left;
      self.__scheduledTop = self.__scrollTop = top;
      self.__scheduledZoom = self.__zoomLevel = zoom;

      // Push values out
      if (self.__callback) {
        self.__callback(left, top, zoom, wasResize);
      }

      // Fix max scroll ranges
      if (self.options.zooming) {
        self.__computeScrollMax();
      }
    }
  },


  /**
   * Recomputes scroll minimum values based on client dimensions and content dimensions.
   */
  __computeScrollMax: function(zoomLevel) {
    var self = this;

    if (zoomLevel == null) {
      zoomLevel = self.__zoomLevel;
    }

    self.__maxScrollLeft = Math.max((self.__contentWidth * zoomLevel) - self.__clientWidth, 0);
    self.__maxScrollTop = Math.max((self.__contentHeight * zoomLevel) - self.__clientHeight, 0);

    if (!self.__didWaitForSize && !self.__maxScrollLeft && !self.__maxScrollTop) {
      self.__didWaitForSize = true;
      self.__waitForSize();
    }
  },


  /**
   * If the scroll view isn't sized correctly on start, wait until we have at least some size
   */
  __waitForSize: function() {
    var self = this;

    clearTimeout(self.__sizerTimeout);

    var sizer = function() {
      self.resize(true);
    };

    sizer();
    self.__sizerTimeout = setTimeout(sizer, 500);
  },

  /*
  ---------------------------------------------------------------------------
    ANIMATION (DECELERATION) SUPPORT
  ---------------------------------------------------------------------------
  */

  /**
   * Called when a touch sequence end and the speed of the finger was high enough
   * to switch into deceleration mode.
   */
  __startDeceleration: function() {
    var self = this;

    if (self.options.paging) {

      var scrollLeft = Math.max(Math.min(self.__scrollLeft, self.__maxScrollLeft), 0);
      var scrollTop = Math.max(Math.min(self.__scrollTop, self.__maxScrollTop), 0);
      var clientWidth = self.__clientWidth;
      var clientHeight = self.__clientHeight;

      // We limit deceleration not to the min/max values of the allowed range, but to the size of the visible client area.
      // Each page should have exactly the size of the client area.
      self.__minDecelerationScrollLeft = Math.floor(scrollLeft / clientWidth) * clientWidth;
      self.__minDecelerationScrollTop = Math.floor(scrollTop / clientHeight) * clientHeight;
      self.__maxDecelerationScrollLeft = Math.ceil(scrollLeft / clientWidth) * clientWidth;
      self.__maxDecelerationScrollTop = Math.ceil(scrollTop / clientHeight) * clientHeight;

    } else {

      self.__minDecelerationScrollLeft = 0;
      self.__minDecelerationScrollTop = 0;
      self.__maxDecelerationScrollLeft = self.__maxScrollLeft;
      self.__maxDecelerationScrollTop = self.__maxScrollTop;
      if (self.__refreshActive) self.__minDecelerationScrollTop = self.__refreshHeight * -1;
    }

    // Wrap class method
    var step = function(percent, now, render) {
      self.__stepThroughDeceleration(render);
    };

    // How much velocity is required to keep the deceleration running
    self.__minVelocityToKeepDecelerating = self.options.snapping ? 4 : 0.1;

    // Detect whether it's still worth to continue animating steps
    // If we are already slow enough to not being user perceivable anymore, we stop the whole process here.
    var verify = function() {
      var shouldContinue = Math.abs(self.__decelerationVelocityX) >= self.__minVelocityToKeepDecelerating ||
        Math.abs(self.__decelerationVelocityY) >= self.__minVelocityToKeepDecelerating;
      if (!shouldContinue) {
        self.__didDecelerationComplete = true;

        //Make sure the scroll values are within the boundaries after a bounce,
        //not below 0 or above maximum
        if (self.options.bouncing && !self.__refreshActive) {
          self.scrollTo(
            Math.min( Math.max(self.__scrollLeft, 0), self.__maxScrollLeft ),
            Math.min( Math.max(self.__scrollTop, 0), self.__maxScrollTop ),
            self.__refreshActive
          );
        }
      }
      return shouldContinue;
    };

    var completed = function() {
      self.__isDecelerating = false;
      if (self.__didDecelerationComplete) {
        self.__scrollingComplete();
      }

      // Animate to grid when snapping is active, otherwise just fix out-of-boundary positions
      if (self.options.paging) {
        self.scrollTo(self.__scrollLeft, self.__scrollTop, self.options.snapping);
      }
    };

    // Start animation and switch on flag
    self.__isDecelerating = zyngaCore.effect.Animate.start(step, verify, completed);

  },


  /**
   * Called on every step of the animation
   *
   * @param inMemory {Boolean} Whether to not render the current step, but keep it in memory only. Used internally only!
   */
  __stepThroughDeceleration: function(render) {
    var self = this;


    //
    // COMPUTE NEXT SCROLL POSITION
    //

    // Add deceleration to scroll position
    var scrollLeft = self.__scrollLeft + self.__decelerationVelocityX;// * self.options.deceleration);
    var scrollTop = self.__scrollTop + self.__decelerationVelocityY;// * self.options.deceleration);


    //
    // HARD LIMIT SCROLL POSITION FOR NON BOUNCING MODE
    //

    if (!self.options.bouncing) {

      var scrollLeftFixed = Math.max(Math.min(self.__maxDecelerationScrollLeft, scrollLeft), self.__minDecelerationScrollLeft);
      if (scrollLeftFixed !== scrollLeft) {
        scrollLeft = scrollLeftFixed;
        self.__decelerationVelocityX = 0;
      }

      var scrollTopFixed = Math.max(Math.min(self.__maxDecelerationScrollTop, scrollTop), self.__minDecelerationScrollTop);
      if (scrollTopFixed !== scrollTop) {
        scrollTop = scrollTopFixed;
        self.__decelerationVelocityY = 0;
      }

    }


    //
    // UPDATE SCROLL POSITION
    //

    if (render) {

      self.__publish(scrollLeft, scrollTop, self.__zoomLevel);

    } else {

      self.__scrollLeft = scrollLeft;
      self.__scrollTop = scrollTop;

    }


    //
    // SLOW DOWN
    //

    // Slow down velocity on every iteration
    if (!self.options.paging) {

      // This is the factor applied to every iteration of the animation
      // to slow down the process. This should emulate natural behavior where
      // objects slow down when the initiator of the movement is removed
      var frictionFactor = self.options.deceleration;

      self.__decelerationVelocityX *= frictionFactor;
      self.__decelerationVelocityY *= frictionFactor;

    }


    //
    // BOUNCING SUPPORT
    //

    if (self.options.bouncing) {

      var scrollOutsideX = 0;
      var scrollOutsideY = 0;

      // This configures the amount of change applied to deceleration/acceleration when reaching boundaries
      var penetrationDeceleration = self.options.penetrationDeceleration;
      var penetrationAcceleration = self.options.penetrationAcceleration;

      // Check limits
      if (scrollLeft < self.__minDecelerationScrollLeft) {
        scrollOutsideX = self.__minDecelerationScrollLeft - scrollLeft;
      } else if (scrollLeft > self.__maxDecelerationScrollLeft) {
        scrollOutsideX = self.__maxDecelerationScrollLeft - scrollLeft;
      }

      if (scrollTop < self.__minDecelerationScrollTop) {
        scrollOutsideY = self.__minDecelerationScrollTop - scrollTop;
      } else if (scrollTop > self.__maxDecelerationScrollTop) {
        scrollOutsideY = self.__maxDecelerationScrollTop - scrollTop;
      }

      // Slow down until slow enough, then flip back to snap position
      if (scrollOutsideX !== 0) {
        var isHeadingOutwardsX = scrollOutsideX * self.__decelerationVelocityX <= self.__minDecelerationScrollLeft;
        if (isHeadingOutwardsX) {
          self.__decelerationVelocityX += scrollOutsideX * penetrationDeceleration;
        }
        var isStoppedX = Math.abs(self.__decelerationVelocityX) <= self.__minVelocityToKeepDecelerating;
        //If we're not heading outwards, or if the above statement got us below minDeceleration, go back towards bounds
        if (!isHeadingOutwardsX || isStoppedX) {
          self.__decelerationVelocityX = scrollOutsideX * penetrationAcceleration;
        }
      }

      if (scrollOutsideY !== 0) {
        var isHeadingOutwardsY = scrollOutsideY * self.__decelerationVelocityY <= self.__minDecelerationScrollTop;
        if (isHeadingOutwardsY) {
          self.__decelerationVelocityY += scrollOutsideY * penetrationDeceleration;
        }
        var isStoppedY = Math.abs(self.__decelerationVelocityY) <= self.__minVelocityToKeepDecelerating;
        //If we're not heading outwards, or if the above statement got us below minDeceleration, go back towards bounds
        if (!isHeadingOutwardsY || isStoppedY) {
          self.__decelerationVelocityY = scrollOutsideY * penetrationAcceleration;
        }
      }
    }
  },


  /**
   * calculate the distance between two touches
   * @param   {Touch}     touch1
   * @param   {Touch}     touch2
   * @returns {Number}    distance
   */
  __getDistance: function getDistance(touch1, touch2) {
    var x = touch2.pageX - touch1.pageX,
    y = touch2.pageY - touch1.pageY;
    return Math.sqrt((x * x) + (y * y));
  },


  /**
   * calculate the scale factor between two touchLists (fingers)
   * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
   * @param   {Array}     start
   * @param   {Array}     end
   * @returns {Number}    scale
   */
  __getScale: function getScale(start, end) {
    // need two fingers...
    if (start.length >= 2 && end.length >= 2) {
      return this.__getDistance(end[0], end[1]) /
        this.__getDistance(start[0], start[1]);
    }
    return 1;
  }
});

ionic.scroll = {
  isScrolling: false,
  lastTop: 0
};

})(ionic);

(function(ionic) {
  var NOOP = function() {};
  var deprecated = function(name) {
    void 0;
  };
  ionic.views.ScrollNative = ionic.views.View.inherit({

    initialize: function(options) {
      var self = this;
      self.__container = self.el = options.el;
      self.__content = options.el.firstElementChild;
      // Whether scrolling is frozen or not
      self.__frozen = false;
      self.isNative = true;

      self.__scrollTop = self.el.scrollTop;
      self.__scrollLeft = self.el.scrollLeft;
      self.__clientHeight = self.__content.clientHeight;
      self.__clientWidth = self.__content.clientWidth;
      self.__maxScrollTop = Math.max((self.__contentHeight) - self.__clientHeight, 0);
      self.__maxScrollLeft = Math.max((self.__contentWidth) - self.__clientWidth, 0);

      if(options.startY >= 0 || options.startX >= 0) {
        ionic.requestAnimationFrame(function() {
          self.el.scrollTop = options.startY || 0;
          self.el.scrollLeft = options.startX || 0;

          self.__scrollTop = self.el.scrollTop;
          self.__scrollLeft = self.el.scrollLeft;
        });
      }

      self.options = {

        freeze: false,

        getContentWidth: function() {
          return Math.max(self.__content.scrollWidth, self.__content.offsetWidth);
        },

        getContentHeight: function() {
          return Math.max(self.__content.scrollHeight, self.__content.offsetHeight + (self.__content.offsetTop * 2));
        }

      };

      for (var key in options) {
        self.options[key] = options[key];
      }

      /**
       * Sets isScrolling to true, and automatically deactivates if not called again in 80ms.
       */
      self.onScroll = function() {
        if (!ionic.scroll.isScrolling) {
          ionic.scroll.isScrolling = true;
        }

        clearTimeout(self.scrollTimer);
        self.scrollTimer = setTimeout(function() {
          ionic.scroll.isScrolling = false;
        }, 80);
      };

      self.freeze = function(shouldFreeze) {
        self.__frozen = shouldFreeze;
      };
      // A more powerful freeze pop that dominates all other freeze pops
      self.freezeShut = function(shouldFreezeShut) {
        self.__frozenShut = shouldFreezeShut;
      };

      self.__initEventHandlers();
    },

    /**  Methods not used in native scrolling */
    __callback: function() { deprecated('__callback'); },
    zoomTo: function() { deprecated('zoomTo'); },
    zoomBy: function() { deprecated('zoomBy'); },
    activatePullToRefresh: function() { deprecated('activatePullToRefresh'); },

    /**
     * Returns the scroll position and zooming values
     *
     * @return {Map} `left` and `top` scroll position and `zoom` level
     */
    resize: function(continueScrolling) {
      var self = this;
      if (!self.__container || !self.options) return;

      // Update Scroller dimensions for changed content
      // Add padding to bottom of content
      self.setDimensions(
        self.__container.clientWidth,
        self.__container.clientHeight,
        self.options.getContentWidth(),
        self.options.getContentHeight(),
        continueScrolling
      );
    },

    /**
     * Initialize the scrollview
     * In native scrolling, this only means we need to gather size information
     */
    run: function() {
      this.resize();
    },

    /**
     * Returns the scroll position and zooming values
     *
     * @return {Map} `left` and `top` scroll position and `zoom` level
     */
    getValues: function() {
      var self = this;
      self.update();
      return {
        left: self.__scrollLeft,
        top: self.__scrollTop,
        zoom: 1
      };
    },

    /**
     * Updates the __scrollLeft and __scrollTop values to el's current value
     */
    update: function() {
      var self = this;
      self.__scrollLeft = self.el.scrollLeft;
      self.__scrollTop = self.el.scrollTop;
    },

    /**
     * Configures the dimensions of the client (outer) and content (inner) elements.
     * Requires the available space for the outer element and the outer size of the inner element.
     * All values which are falsy (null or zero etc.) are ignored and the old value is kept.
     *
     * @param clientWidth {Integer} Inner width of outer element
     * @param clientHeight {Integer} Inner height of outer element
     * @param contentWidth {Integer} Outer width of inner element
     * @param contentHeight {Integer} Outer height of inner element
     */
    setDimensions: function(clientWidth, clientHeight, contentWidth, contentHeight) {
      var self = this;

      if (!clientWidth && !clientHeight && !contentWidth && !contentHeight) {
        // this scrollview isn't rendered, don't bother
        return;
      }

      // Only update values which are defined
      if (clientWidth === +clientWidth) {
        self.__clientWidth = clientWidth;
      }

      if (clientHeight === +clientHeight) {
        self.__clientHeight = clientHeight;
      }

      if (contentWidth === +contentWidth) {
        self.__contentWidth = contentWidth;
      }

      if (contentHeight === +contentHeight) {
        self.__contentHeight = contentHeight;
      }

      // Refresh maximums
      self.__computeScrollMax();
    },

    /**
     * Returns the maximum scroll values
     *
     * @return {Map} `left` and `top` maximum scroll values
     */
    getScrollMax: function() {
      return {
        left: this.__maxScrollLeft,
        top: this.__maxScrollTop
      };
    },

    /**
     * Scrolls by the given amount in px.
     *
     * @param left {Number} Horizontal scroll position, keeps current if value is <code>null</code>
     * @param top {Number} Vertical scroll position, keeps current if value is <code>null</code>
     * @param animate {Boolean} Whether the scrolling should happen using an animation
     */

    scrollBy: function(left, top, animate) {
      var self = this;

      // update scroll vars before refferencing them
      self.update();

      var startLeft = self.__isAnimating ? self.__scheduledLeft : self.__scrollLeft;
      var startTop = self.__isAnimating ? self.__scheduledTop : self.__scrollTop;

      self.scrollTo(startLeft + (left || 0), startTop + (top || 0), animate);
    },

    /**
     * Scrolls to the given position in px.
     *
     * @param left {Number} Horizontal scroll position, keeps current if value is <code>null</code>
     * @param top {Number} Vertical scroll position, keeps current if value is <code>null</code>
     * @param animate {Boolean} Whether the scrolling should happen using an animation
     */
    scrollTo: function(left, top, animate) {
      var self = this;
      if (!animate) {
        self.el.scrollTop = top;
        self.el.scrollLeft = left;
        self.resize();
        return;
      }

      var oldOverflowX = self.el.style.overflowX;
      var oldOverflowY = self.el.style.overflowY;

      clearTimeout(self.__scrollToCleanupTimeout);
      self.__scrollToCleanupTimeout = setTimeout(function() {
        self.el.style.overflowX = oldOverflowX;
        self.el.style.overflowY = oldOverflowY;
      }, 500);

      self.el.style.overflowY = 'hidden';
      self.el.style.overflowX = 'hidden';

      animateScroll(top, left);

      function animateScroll(Y, X) {
        // scroll animation loop w/ easing
        // credit https://gist.github.com/dezinezync/5487119
        var start = Date.now(),
          duration = 250, //milliseconds
          fromY = self.el.scrollTop,
          fromX = self.el.scrollLeft;

        if (fromY === Y && fromX === X) {
          self.el.style.overflowX = oldOverflowX;
          self.el.style.overflowY = oldOverflowY;
          self.resize();
          return; /* Prevent scrolling to the Y point if already there */
        }

        // decelerating to zero velocity
        function easeOutCubic(t) {
          return (--t) * t * t + 1;
        }

        // scroll loop
        function animateScrollStep() {
          var currentTime = Date.now(),
            time = Math.min(1, ((currentTime - start) / duration)),
          // where .5 would be 50% of time on a linear scale easedT gives a
          // fraction based on the easing method
            easedT = easeOutCubic(time);

          if (fromY != Y) {
            self.el.scrollTop = parseInt((easedT * (Y - fromY)) + fromY, 10);
          }
          if (fromX != X) {
            self.el.scrollLeft = parseInt((easedT * (X - fromX)) + fromX, 10);
          }

          if (time < 1) {
            ionic.requestAnimationFrame(animateScrollStep);

          } else {
            // done
            ionic.tap.removeClonedInputs(self.__container, self);
            self.el.style.overflowX = oldOverflowX;
            self.el.style.overflowY = oldOverflowY;
            self.resize();
          }
        }

        // start scroll loop
        ionic.requestAnimationFrame(animateScrollStep);
      }
    },



    /*
     ---------------------------------------------------------------------------
     PRIVATE API
     ---------------------------------------------------------------------------
     */

    /**
     * If the scroll view isn't sized correctly on start, wait until we have at least some size
     */
    __waitForSize: function() {
      var self = this;

      clearTimeout(self.__sizerTimeout);

      var sizer = function() {
        self.resize(true);
      };

      sizer();
      self.__sizerTimeout = setTimeout(sizer, 500);
    },


    /**
     * Recomputes scroll minimum values based on client dimensions and content dimensions.
     */
    __computeScrollMax: function() {
      var self = this;

      self.__maxScrollLeft = Math.max((self.__contentWidth) - self.__clientWidth, 0);
      self.__maxScrollTop = Math.max((self.__contentHeight) - self.__clientHeight, 0);

      if (!self.__didWaitForSize && !self.__maxScrollLeft && !self.__maxScrollTop) {
        self.__didWaitForSize = true;
        self.__waitForSize();
      }
    },

    __initEventHandlers: function() {
      var self = this;

      // Event Handler
      var container = self.__container;
      // save height when scroll view is shrunk so we don't need to reflow
      var scrollViewOffsetHeight;

      var lastKeyboardHeight;

      /**
       * Shrink the scroll view when the keyboard is up if necessary and if the
       * focused input is below the bottom of the shrunk scroll view, scroll it
       * into view.
       */
      self.scrollChildIntoView = function(e) {
        var rect = container.getBoundingClientRect();
        if(!self.__originalContainerHeight) {
          self.__originalContainerHeight = rect.height;
        }

        // D
        //var scrollBottomOffsetToTop = rect.bottom;
        // D - A
        scrollViewOffsetHeight = self.__originalContainerHeight;
        //console.log('Scroll view offset height', scrollViewOffsetHeight);
        //console.dir(container);
        var alreadyShrunk = self.isShrunkForKeyboard;

        var isModal = container.parentNode.classList.contains('modal');
        var isPopover = container.parentNode.classList.contains('popover');
        // 680px is when the media query for 60% modal width kicks in
        var isInsetModal = isModal && window.innerWidth >= 680;

       /*
        *  _______
        * |---A---| <- top of scroll view
        * |       |
        * |---B---| <- keyboard
        * |   C   | <- input
        * |---D---| <- initial bottom of scroll view
        * |___E___| <- bottom of viewport
        *
        *  All commented calculations relative to the top of the viewport (ie E
        *  is the viewport height, not 0)
        */


        var changedKeyboardHeight = lastKeyboardHeight && (lastKeyboardHeight !== e.detail.keyboardHeight);

        if (!alreadyShrunk || changedKeyboardHeight) {
          // shrink scrollview so we can actually scroll if the input is hidden
          // if it isn't shrink so we can scroll to inputs under the keyboard
          // inset modals won't shrink on Android on their own when the keyboard appears
          if ( !isPopover && (ionic.Platform.isIOS() || ionic.Platform.isFullScreen || isInsetModal) ) {
            // if there are things below the scroll view account for them and
            // subtract them from the keyboard height when resizing
            // E - D                         E                         D
            //var scrollBottomOffsetToBottom = e.detail.viewportHeight - scrollBottomOffsetToTop;

            // 0 or D - B if D > B           E - B                     E - D
            //var keyboardOffset = e.detail.keyboardHeight - scrollBottomOffsetToBottom;

            ionic.requestAnimationFrame(function(){
              // D - A or B - A if D > B       D - A             max(0, D - B)
              scrollViewOffsetHeight = Math.max(0, Math.min(self.__originalContainerHeight, self.__originalContainerHeight - (e.detail.keyboardHeight - 43)));//keyboardOffset >= 0 ? scrollViewOffsetHeight - keyboardOffset : scrollViewOffsetHeight + keyboardOffset;

              //console.log('Old container height', self.__originalContainerHeight, 'New container height', scrollViewOffsetHeight, 'Keyboard height', e.detail.keyboardHeight);

              container.style.height = scrollViewOffsetHeight + "px";

              /*
              if (ionic.Platform.isIOS()) {
                // Force redraw to avoid disappearing content
                var disp = container.style.display;
                container.style.display = 'none';
                var trick = container.offsetHeight;
                container.style.display = disp;
              }
              */
              container.classList.add('keyboard-up');
              //update scroll view
              self.resize();
            });
          }

          self.isShrunkForKeyboard = true;
        }

        lastKeyboardHeight = e.detail.keyboardHeight;

        /*
         *  _______
         * |---A---| <- top of scroll view
         * |   *   | <- where we want to scroll to
         * |--B-D--| <- keyboard, bottom of scroll view
         * |   C   | <- input
         * |       |
         * |___E___| <- bottom of viewport
         *
         *  All commented calculations relative to the top of the viewport (ie E
         *  is the viewport height, not 0)
         */
        // if the element is positioned under the keyboard scroll it into view
        if (e.detail.isElementUnderKeyboard) {

          ionic.requestAnimationFrame(function(){
            var pos = ionic.DomUtil.getOffsetTop(e.detail.target);
            setTimeout(function() {
              if (ionic.Platform.isIOS()) {
                ionic.tap.cloneFocusedInput(container, self);
              }
              // Scroll the input into view, with a 100px buffer
              self.scrollTo(0, pos - (rect.top + 100), true);
              self.onScroll();
            }, 32);

            /*
            // update D if we shrunk
            if (self.isShrunkForKeyboard && !alreadyShrunk) {
              scrollBottomOffsetToTop = container.getBoundingClientRect().bottom;
              console.log('Scroll bottom', scrollBottomOffsetToTop);
            }

            // middle of the scrollview, this is where we want to scroll to
            // (D - A) / 2
            var scrollMidpointOffset = scrollViewOffsetHeight * 0.5;
            console.log('Midpoint', scrollMidpointOffset);
            //console.log("container.offsetHeight: " + scrollViewOffsetHeight);

            // middle of the input we want to scroll into view
            // C
            var inputMidpoint = ((e.detail.elementBottom + e.detail.elementTop) / 2);
            console.log('Input midpoint');

            // distance from middle of input to the bottom of the scroll view
            // C - D                                C               D
            var inputMidpointOffsetToScrollBottom = inputMidpoint - scrollBottomOffsetToTop;
            console.log('Input midpoint offset', inputMidpointOffsetToScrollBottom);

            //C - D + (D - A)/2          C - D                     (D - A)/ 2
            var scrollTop = inputMidpointOffsetToScrollBottom + scrollMidpointOffset;
            console.log('Scroll top', scrollTop);

            if ( scrollTop > 0) {
              if (ionic.Platform.isIOS()) {
                //just shrank scroll view, give it some breathing room before scrolling
                setTimeout(function(){
                  ionic.tap.cloneFocusedInput(container, self);
                  self.scrollBy(0, scrollTop, true);
                  self.onScroll();
                }, 32);
              } else {
                self.scrollBy(0, scrollTop, true);
                self.onScroll();
              }
            }
            */
          });
        }

        // Only the first scrollView parent of the element that broadcasted this event
        // (the active element that needs to be shown) should receive this event
        e.stopPropagation();
      };

      self.resetScrollView = function() {
        //return scrollview to original height once keyboard has hidden
        if (self.isShrunkForKeyboard) {
          self.isShrunkForKeyboard = false;
          container.style.height = "";

          /*
          if (ionic.Platform.isIOS()) {
            // Force redraw to avoid disappearing content
            var disp = container.style.display;
            container.style.display = 'none';
            var trick = container.offsetHeight;
            container.style.display = disp;
          }
          */

          self.__originalContainerHeight = container.getBoundingClientRect().height;

          if (ionic.Platform.isIOS()) {
            ionic.requestAnimationFrame(function() {
              container.classList.remove('keyboard-up');
            });
          }

        }
        self.resize();
      };

      self.handleTouchMove = function(e) {
        if (self.__frozenShut) {
          e.preventDefault();
          e.stopPropagation();
          return false;

        } else if ( self.__frozen ){
          e.preventDefault();
          // let it propagate so other events such as drag events can happen,
          // but don't let it actually scroll
          return false;
        }
        return true;
      };

      container.addEventListener('scroll', self.onScroll);

      //Broadcasted when keyboard is shown on some platforms.
      //See js/utils/keyboard.js
      container.addEventListener('scrollChildIntoView', self.scrollChildIntoView);

      container.addEventListener(ionic.EVENTS.touchstart, self.handleTouchMove);
      container.addEventListener(ionic.EVENTS.touchmove, self.handleTouchMove);

      // Listen on document because container may not have had the last
      // keyboardActiveElement, for example after closing a modal with a focused
      // input and returning to a previously resized scroll view in an ion-content.
      // Since we can only resize scroll views that are currently visible, just resize
      // the current scroll view when the keyboard is closed.
      document.addEventListener('resetScrollView', self.resetScrollView);
    },

    __cleanup: function() {
      var self = this;
      var container = self.__container;

      container.removeEventListener('resetScrollView', self.resetScrollView);
      container.removeEventListener('scroll', self.onScroll);

      container.removeEventListener('scrollChildIntoView', self.scrollChildIntoView);
      container.removeEventListener('resetScrollView', self.resetScrollView);

      container.removeEventListener(ionic.EVENTS.touchstart, self.handleTouchMove);
      container.removeEventListener(ionic.EVENTS.touchmove, self.handleTouchMove);

      ionic.tap.removeClonedInputs(container, self);

      delete self.__container;
      delete self.__content;
      delete self.__indicatorX;
      delete self.__indicatorY;
      delete self.options.el;

      self.resize = self.scrollTo = self.onScroll = self.resetScrollView = NOOP;
      self.scrollChildIntoView = NOOP;
      container = null;
    }
  });

})(ionic);

(function(ionic) {
'use strict';

  var ITEM_CLASS = 'item';
  var ITEM_CONTENT_CLASS = 'item-content';
  var ITEM_SLIDING_CLASS = 'item-sliding';
  var ITEM_OPTIONS_CLASS = 'item-options';
  var ITEM_PLACEHOLDER_CLASS = 'item-placeholder';
  var ITEM_REORDERING_CLASS = 'item-reordering';
  var ITEM_REORDER_BTN_CLASS = 'item-reorder';

  var DragOp = function() {};
  DragOp.prototype = {
    start: function(){},
    drag: function(){},
    end: function(){},
    isSameItem: function() {
      return false;
    }
  };

  var SlideDrag = function(opts) {
    this.dragThresholdX = opts.dragThresholdX || 10;
    this.el = opts.el;
    this.item = opts.item;
    this.canSwipe = opts.canSwipe;
  };

  SlideDrag.prototype = new DragOp();

  SlideDrag.prototype.start = function(e) {
    var content, buttons, offsetX, buttonsWidth;

    if (!this.canSwipe()) {
      return;
    }

    if (e.target.classList.contains(ITEM_CONTENT_CLASS)) {
      content = e.target;
    } else if (e.target.classList.contains(ITEM_CLASS)) {
      content = e.target.querySelector('.' + ITEM_CONTENT_CLASS);
    } else {
      content = ionic.DomUtil.getParentWithClass(e.target, ITEM_CONTENT_CLASS);
    }

    // If we don't have a content area as one of our children (or ourselves), skip
    if (!content) {
      return;
    }

    // Make sure we aren't animating as we slide
    content.classList.remove(ITEM_SLIDING_CLASS);

    // Grab the starting X point for the item (for example, so we can tell whether it is open or closed to start)
    offsetX = parseFloat(content.style[ionic.CSS.TRANSFORM].replace('translate3d(', '').split(',')[0]) || 0;

    // Grab the buttons
    buttons = content.parentNode.querySelector('.' + ITEM_OPTIONS_CLASS);
    if (!buttons) {
      return;
    }
    buttons.classList.remove('invisible');

    buttonsWidth = buttons.offsetWidth;

    this._currentDrag = {
      buttons: buttons,
      buttonsWidth: buttonsWidth,
      content: content,
      startOffsetX: offsetX
    };
  };

  /**
   * Check if this is the same item that was previously dragged.
   */
  SlideDrag.prototype.isSameItem = function(op) {
    if (op._lastDrag && this._currentDrag) {
      return this._currentDrag.content == op._lastDrag.content;
    }
    return false;
  };

  SlideDrag.prototype.clean = function(isInstant) {
    var lastDrag = this._lastDrag;

    if (!lastDrag || !lastDrag.content) return;

    lastDrag.content.style[ionic.CSS.TRANSITION] = '';
    lastDrag.content.style[ionic.CSS.TRANSFORM] = '';
    if (isInstant) {
      lastDrag.content.style[ionic.CSS.TRANSITION] = 'none';
      makeInvisible();
      ionic.requestAnimationFrame(function() {
        lastDrag.content.style[ionic.CSS.TRANSITION] = '';
      });
    } else {
      ionic.requestAnimationFrame(function() {
        setTimeout(makeInvisible, 250);
      });
    }
    function makeInvisible() {
      lastDrag.buttons && lastDrag.buttons.classList.add('invisible');
    }
  };

  SlideDrag.prototype.drag = ionic.animationFrameThrottle(function(e) {
    var buttonsWidth;

    // We really aren't dragging
    if (!this._currentDrag) {
      return;
    }

    // Check if we should start dragging. Check if we've dragged past the threshold,
    // or we are starting from the open state.
    if (!this._isDragging &&
        ((Math.abs(e.gesture.deltaX) > this.dragThresholdX) ||
        (Math.abs(this._currentDrag.startOffsetX) > 0))) {
      this._isDragging = true;
    }

    if (this._isDragging) {
      buttonsWidth = this._currentDrag.buttonsWidth;

      // Grab the new X point, capping it at zero
      var newX = Math.min(0, this._currentDrag.startOffsetX + e.gesture.deltaX);

      // If the new X position is past the buttons, we need to slow down the drag (rubber band style)
      if (newX < -buttonsWidth) {
        // Calculate the new X position, capped at the top of the buttons
        newX = Math.min(-buttonsWidth, -buttonsWidth + (((e.gesture.deltaX + buttonsWidth) * 0.4)));
      }

      this._currentDrag.content.$$ionicOptionsOpen = newX !== 0;

      this._currentDrag.content.style[ionic.CSS.TRANSFORM] = 'translate3d(' + newX + 'px, 0, 0)';
      this._currentDrag.content.style[ionic.CSS.TRANSITION] = 'none';
    }
  });

  SlideDrag.prototype.end = function(e, doneCallback) {
    var self = this;

    // There is no drag, just end immediately
    if (!self._currentDrag) {
      doneCallback && doneCallback();
      return;
    }

    // If we are currently dragging, we want to snap back into place
    // The final resting point X will be the width of the exposed buttons
    var restingPoint = -self._currentDrag.buttonsWidth;

    // Check if the drag didn't clear the buttons mid-point
    // and we aren't moving fast enough to swipe open
    if (e.gesture.deltaX > -(self._currentDrag.buttonsWidth / 2)) {

      // If we are going left but too slow, or going right, go back to resting
      if (e.gesture.direction == "left" && Math.abs(e.gesture.velocityX) < 0.3) {
        restingPoint = 0;

      } else if (e.gesture.direction == "right") {
        restingPoint = 0;
      }

    }

    ionic.requestAnimationFrame(function() {
      if (restingPoint === 0) {
        self._currentDrag.content.style[ionic.CSS.TRANSFORM] = '';
        var buttons = self._currentDrag.buttons;
        setTimeout(function() {
          buttons && buttons.classList.add('invisible');
        }, 250);
      } else {
        self._currentDrag.content.style[ionic.CSS.TRANSFORM] = 'translate3d(' + restingPoint + 'px,0,0)';
      }
      self._currentDrag.content.style[ionic.CSS.TRANSITION] = '';


      // Kill the current drag
      if (!self._lastDrag) {
        self._lastDrag = {};
      }
      ionic.extend(self._lastDrag, self._currentDrag);
      if (self._currentDrag) {
        self._currentDrag.buttons = null;
        self._currentDrag.content = null;
      }
      self._currentDrag = null;

      // We are done, notify caller
      doneCallback && doneCallback();
    });
  };

  var ReorderDrag = function(opts) {
    var self = this;

    self.dragThresholdY = opts.dragThresholdY || 0;
    self.onReorder = opts.onReorder;
    self.listEl = opts.listEl;
    self.el = self.item = opts.el;
    self.scrollEl = opts.scrollEl;
    self.scrollView = opts.scrollView;
    // Get the True Top of the list el http://www.quirksmode.org/js/findpos.html
    self.listElTrueTop = 0;
    if (self.listEl.offsetParent) {
      var obj = self.listEl;
      do {
        self.listElTrueTop += obj.offsetTop;
        obj = obj.offsetParent;
      } while (obj);
    }
  };

  ReorderDrag.prototype = new DragOp();

  ReorderDrag.prototype._moveElement = function(e) {
    var y = e.gesture.center.pageY +
      this.scrollView.getValues().top -
      (this._currentDrag.elementHeight / 2) -
      this.listElTrueTop;
    this.el.style[ionic.CSS.TRANSFORM] = 'translate3d(0, ' + y + 'px, 0)';
  };

  ReorderDrag.prototype.deregister = function() {
    this.listEl = this.el = this.scrollEl = this.scrollView = null;
  };

  ReorderDrag.prototype.start = function(e) {

    var startIndex = ionic.DomUtil.getChildIndex(this.el, this.el.nodeName.toLowerCase());
    var elementHeight = this.el.scrollHeight;
    var placeholder = this.el.cloneNode(true);

    placeholder.classList.add(ITEM_PLACEHOLDER_CLASS);

    this.el.parentNode.insertBefore(placeholder, this.el);
    this.el.classList.add(ITEM_REORDERING_CLASS);

    this._currentDrag = {
      elementHeight: elementHeight,
      startIndex: startIndex,
      placeholder: placeholder,
      scrollHeight: scroll,
      list: placeholder.parentNode
    };

    this._moveElement(e);
  };

  ReorderDrag.prototype.drag = ionic.animationFrameThrottle(function(e) {
    // We really aren't dragging
    var self = this;
    if (!this._currentDrag) {
      return;
    }

    var scrollY = 0;
    var pageY = e.gesture.center.pageY;
    var offset = this.listElTrueTop;

    //If we have a scrollView, check scroll boundaries for dragged element and scroll if necessary
    if (this.scrollView) {

      var container = this.scrollView.__container;
      scrollY = this.scrollView.getValues().top;

      var containerTop = container.offsetTop;
      var pixelsPastTop = containerTop - pageY + this._currentDrag.elementHeight / 2;
      var pixelsPastBottom = pageY + this._currentDrag.elementHeight / 2 - containerTop - container.offsetHeight;

      if (e.gesture.deltaY < 0 && pixelsPastTop > 0 && scrollY > 0) {
        this.scrollView.scrollBy(null, -pixelsPastTop);
        //Trigger another drag so the scrolling keeps going
        ionic.requestAnimationFrame(function() {
          self.drag(e);
        });
      }
      if (e.gesture.deltaY > 0 && pixelsPastBottom > 0) {
        if (scrollY < this.scrollView.getScrollMax().top) {
          this.scrollView.scrollBy(null, pixelsPastBottom);
          //Trigger another drag so the scrolling keeps going
          ionic.requestAnimationFrame(function() {
            self.drag(e);
          });
        }
      }
    }

    // Check if we should start dragging. Check if we've dragged past the threshold,
    // or we are starting from the open state.
    if (!this._isDragging && Math.abs(e.gesture.deltaY) > this.dragThresholdY) {
      this._isDragging = true;
    }

    if (this._isDragging) {
      this._moveElement(e);

      this._currentDrag.currentY = scrollY + pageY - offset;

      // this._reorderItems();
    }
  });

  // When an item is dragged, we need to reorder any items for sorting purposes
  ReorderDrag.prototype._getReorderIndex = function() {
    var self = this;

    var siblings = Array.prototype.slice.call(self._currentDrag.placeholder.parentNode.children)
      .filter(function(el) {
        return el.nodeName === self.el.nodeName && el !== self.el;
      });

    var dragOffsetTop = self._currentDrag.currentY;
    var el;
    for (var i = 0, len = siblings.length; i < len; i++) {
      el = siblings[i];
      if (i === len - 1) {
        if (dragOffsetTop > el.offsetTop) {
          return i;
        }
      } else if (i === 0) {
        if (dragOffsetTop < el.offsetTop + el.offsetHeight) {
          return i;
        }
      } else if (dragOffsetTop > el.offsetTop - el.offsetHeight / 2 &&
                 dragOffsetTop < el.offsetTop + el.offsetHeight) {
        return i;
      }
    }
    return self._currentDrag.startIndex;
  };

  ReorderDrag.prototype.end = function(e, doneCallback) {
    if (!this._currentDrag) {
      doneCallback && doneCallback();
      return;
    }

    var placeholder = this._currentDrag.placeholder;
    var finalIndex = this._getReorderIndex();

    // Reposition the element
    this.el.classList.remove(ITEM_REORDERING_CLASS);
    this.el.style[ionic.CSS.TRANSFORM] = '';

    placeholder.parentNode.insertBefore(this.el, placeholder);
    placeholder.parentNode.removeChild(placeholder);

    this.onReorder && this.onReorder(this.el, this._currentDrag.startIndex, finalIndex);

    this._currentDrag = {
      placeholder: null,
      content: null
    };
    this._currentDrag = null;
    doneCallback && doneCallback();
  };



  /**
   * The ListView handles a list of items. It will process drag animations, edit mode,
   * and other operations that are common on mobile lists or table views.
   */
  ionic.views.ListView = ionic.views.View.inherit({
    initialize: function(opts) {
      var self = this;

      opts = ionic.extend({
        onReorder: function() {},
        virtualRemoveThreshold: -200,
        virtualAddThreshold: 200,
        canSwipe: function() {
          return true;
        }
      }, opts);

      ionic.extend(self, opts);

      if (!self.itemHeight && self.listEl) {
        self.itemHeight = self.listEl.children[0] && parseInt(self.listEl.children[0].style.height, 10);
      }

      self.onRefresh = opts.onRefresh || function() {};
      self.onRefreshOpening = opts.onRefreshOpening || function() {};
      self.onRefreshHolding = opts.onRefreshHolding || function() {};

      var gestureOpts = {};
      // don't prevent native scrolling
      if (ionic.DomUtil.getParentOrSelfWithClass(self.el, 'overflow-scroll')) {
        gestureOpts.prevent_default_directions = ['left', 'right'];
      }

      window.ionic.onGesture('release', function(e) {
        self._handleEndDrag(e);
      }, self.el, gestureOpts);

      window.ionic.onGesture('drag', function(e) {
        self._handleDrag(e);
      }, self.el, gestureOpts);
      // Start the drag states
      self._initDrag();
    },

    /**
     * Be sure to cleanup references.
     */
    deregister: function() {
      this.el = this.listEl = this.scrollEl = this.scrollView = null;

      // ensure no scrolls have been left frozen
      if (this.isScrollFreeze) {
        self.scrollView.freeze(false);
      }
    },

    /**
     * Called to tell the list to stop refreshing. This is useful
     * if you are refreshing the list and are done with refreshing.
     */
    stopRefreshing: function() {
      var refresher = this.el.querySelector('.list-refresher');
      refresher.style.height = '0';
    },

    /**
     * If we scrolled and have virtual mode enabled, compute the window
     * of active elements in order to figure out the viewport to render.
     */
    didScroll: function(e) {
      var self = this;

      if (self.isVirtual) {
        var itemHeight = self.itemHeight;

        // Grab the total height of the list
        var scrollHeight = e.target.scrollHeight;

        // Get the viewport height
        var viewportHeight = self.el.parentNode.offsetHeight;

        // High water is the pixel position of the first element to include (everything before
        // that will be removed)
        var highWater = Math.max(0, e.scrollTop + self.virtualRemoveThreshold);

        // Low water is the pixel position of the last element to include (everything after
        // that will be removed)
        var lowWater = Math.min(scrollHeight, Math.abs(e.scrollTop) + viewportHeight + self.virtualAddThreshold);

        // Get the first and last elements in the list based on how many can fit
        // between the pixel range of lowWater and highWater
        var first = parseInt(Math.abs(highWater / itemHeight), 10);
        var last = parseInt(Math.abs(lowWater / itemHeight), 10);

        // Get the items we need to remove
        self._virtualItemsToRemove = Array.prototype.slice.call(self.listEl.children, 0, first);

        self.renderViewport && self.renderViewport(highWater, lowWater, first, last);
      }
    },

    didStopScrolling: function() {
      if (this.isVirtual) {
        for (var i = 0; i < this._virtualItemsToRemove.length; i++) {
          //el.parentNode.removeChild(el);
          this.didHideItem && this.didHideItem(i);
        }
        // Once scrolling stops, check if we need to remove old items

      }
    },

    /**
     * Clear any active drag effects on the list.
     */
    clearDragEffects: function(isInstant) {
      if (this._lastDragOp) {
        this._lastDragOp.clean && this._lastDragOp.clean(isInstant);
        this._lastDragOp.deregister && this._lastDragOp.deregister();
        this._lastDragOp = null;
      }
    },

    _initDrag: function() {
      // Store the last one
      if (this._lastDragOp) {
        this._lastDragOp.deregister && this._lastDragOp.deregister();
      }
      this._lastDragOp = this._dragOp;

      this._dragOp = null;
    },

    // Return the list item from the given target
    _getItem: function(target) {
      while (target) {
        if (target.classList && target.classList.contains(ITEM_CLASS)) {
          return target;
        }
        target = target.parentNode;
      }
      return null;
    },


    _startDrag: function(e) {
      var self = this;

      self._isDragging = false;

      var lastDragOp = self._lastDragOp;
      var item;

      // If we have an open SlideDrag and we're scrolling the list. Clear it.
      if (self._didDragUpOrDown && lastDragOp instanceof SlideDrag) {
          lastDragOp.clean && lastDragOp.clean();
      }

      // Check if this is a reorder drag
      if (ionic.DomUtil.getParentOrSelfWithClass(e.target, ITEM_REORDER_BTN_CLASS) && (e.gesture.direction == 'up' || e.gesture.direction == 'down')) {
        item = self._getItem(e.target);

        if (item) {
          self._dragOp = new ReorderDrag({
            listEl: self.el,
            el: item,
            scrollEl: self.scrollEl,
            scrollView: self.scrollView,
            onReorder: function(el, start, end) {
              self.onReorder && self.onReorder(el, start, end);
            }
          });
          self._dragOp.start(e);
          e.preventDefault();
        }
      }

      // Or check if this is a swipe to the side drag
      else if (!self._didDragUpOrDown && (e.gesture.direction == 'left' || e.gesture.direction == 'right') && Math.abs(e.gesture.deltaX) > 5) {

        // Make sure this is an item with buttons
        item = self._getItem(e.target);
        if (item && item.querySelector('.item-options')) {
          self._dragOp = new SlideDrag({
            el: self.el,
            item: item,
            canSwipe: self.canSwipe
          });
          self._dragOp.start(e);
          e.preventDefault();
          self.isScrollFreeze = self.scrollView.freeze(true);
        }
      }

      // If we had a last drag operation and this is a new one on a different item, clean that last one
      if (lastDragOp && self._dragOp && !self._dragOp.isSameItem(lastDragOp) && e.defaultPrevented) {
        lastDragOp.clean && lastDragOp.clean();
      }
    },


    _handleEndDrag: function(e) {
      var self = this;

      if (self.scrollView) {
        self.isScrollFreeze = self.scrollView.freeze(false);
      }

      self._didDragUpOrDown = false;

      if (!self._dragOp) {
        return;
      }

      self._dragOp.end(e, function() {
        self._initDrag();
      });
    },

    /**
     * Process the drag event to move the item to the left or right.
     */
    _handleDrag: function(e) {
      var self = this;

      if (Math.abs(e.gesture.deltaY) > 5) {
        self._didDragUpOrDown = true;
      }

      // If we get a drag event, make sure we aren't in another drag, then check if we should
      // start one
      if (!self.isDragging && !self._dragOp) {
        self._startDrag(e);
      }

      // No drag still, pass it up
      if (!self._dragOp) {
        return;
      }

      e.gesture.srcEvent.preventDefault();
      self._dragOp.drag(e);
    }

  });

})(ionic);

(function(ionic) {
'use strict';

  ionic.views.Modal = ionic.views.View.inherit({
    initialize: function(opts) {
      opts = ionic.extend({
        focusFirstInput: false,
        unfocusOnHide: true,
        focusFirstDelay: 600,
        backdropClickToClose: true,
        hardwareBackButtonClose: true,
      }, opts);

      ionic.extend(this, opts);

      this.el = opts.el;
    },
    show: function() {
      var self = this;

      if(self.focusFirstInput) {
        // Let any animations run first
        window.setTimeout(function() {
          var input = self.el.querySelector('input, textarea');
          input && input.focus && input.focus();
        }, self.focusFirstDelay);
      }
    },
    hide: function() {
      // Unfocus all elements
      if(this.unfocusOnHide) {
        var inputs = this.el.querySelectorAll('input, textarea');
        // Let any animations run first
        window.setTimeout(function() {
          for(var i = 0; i < inputs.length; i++) {
            inputs[i].blur && inputs[i].blur();
          }
        });
      }
    }
  });

})(ionic);

(function(ionic) {
'use strict';

  /**
   * The side menu view handles one of the side menu's in a Side Menu Controller
   * configuration.
   * It takes a DOM reference to that side menu element.
   */
  ionic.views.SideMenu = ionic.views.View.inherit({
    initialize: function(opts) {
      this.el = opts.el;
      this.isEnabled = (typeof opts.isEnabled === 'undefined') ? true : opts.isEnabled;
      this.setWidth(opts.width);
    },
    getFullWidth: function() {
      return this.width;
    },
    setWidth: function(width) {
      this.width = width;
      this.el.style.width = width + 'px';
    },
    setIsEnabled: function(isEnabled) {
      this.isEnabled = isEnabled;
    },
    bringUp: function() {
      if(this.el.style.zIndex !== '0') {
        this.el.style.zIndex = '0';
      }
    },
    pushDown: function() {
      if(this.el.style.zIndex !== '-1') {
        this.el.style.zIndex = '-1';
      }
    }
  });

  ionic.views.SideMenuContent = ionic.views.View.inherit({
    initialize: function(opts) {
      ionic.extend(this, {
        animationClass: 'menu-animated',
        onDrag: function() {},
        onEndDrag: function() {}
      }, opts);

      ionic.onGesture('drag', ionic.proxy(this._onDrag, this), this.el);
      ionic.onGesture('release', ionic.proxy(this._onEndDrag, this), this.el);
    },
    _onDrag: function(e) {
      this.onDrag && this.onDrag(e);
    },
    _onEndDrag: function(e) {
      this.onEndDrag && this.onEndDrag(e);
    },
    disableAnimation: function() {
      this.el.classList.remove(this.animationClass);
    },
    enableAnimation: function() {
      this.el.classList.add(this.animationClass);
    },
    getTranslateX: function() {
      return parseFloat(this.el.style[ionic.CSS.TRANSFORM].replace('translate3d(', '').split(',')[0]);
    },
    setTranslateX: ionic.animationFrameThrottle(function(x) {
      this.el.style[ionic.CSS.TRANSFORM] = 'translate3d(' + x + 'px, 0, 0)';
    })
  });

})(ionic);

/*
 * Adapted from Swipe.js 2.0
 *
 * Brad Birdsall
 * Copyright 2013, MIT License
 *
*/

(function(ionic) {
'use strict';

ionic.views.Slider = ionic.views.View.inherit({
  initialize: function (options) {
    var slider = this;

    var touchStartEvent, touchMoveEvent, touchEndEvent;
    if (window.navigator.pointerEnabled) {
      touchStartEvent = 'pointerdown';
      touchMoveEvent = 'pointermove';
      touchEndEvent = 'pointerup';
    } else if (window.navigator.msPointerEnabled) {
      touchStartEvent = 'MSPointerDown';
      touchMoveEvent = 'MSPointerMove';
      touchEndEvent = 'MSPointerUp';
    } else {
      touchStartEvent = 'touchstart';
      touchMoveEvent = 'touchmove';
      touchEndEvent = 'touchend';
    }

    var mouseStartEvent = 'mousedown';
    var mouseMoveEvent = 'mousemove';
    var mouseEndEvent = 'mouseup';

    // utilities
    var noop = function() {}; // simple no operation function
    var offloadFn = function(fn) { setTimeout(fn || noop, 0); }; // offload a functions execution

    // check browser capabilities
    var browser = {
      addEventListener: !!window.addEventListener,
      transitions: (function(temp) {
        var props = ['transitionProperty', 'WebkitTransition', 'MozTransition', 'OTransition', 'msTransition'];
        for ( var i in props ) if (temp.style[ props[i] ] !== undefined) return true;
        return false;
      })(document.createElement('swipe'))
    };


    var container = options.el;

    // quit if no root element
    if (!container) return;
    var element = container.children[0];
    var slides, slidePos, width, length;
    options = options || {};
    var index = parseInt(options.startSlide, 10) || 0;
    var speed = options.speed || 300;
    options.continuous = options.continuous !== undefined ? options.continuous : true;

    function setup() {

      // do not setup if the container has no width
      if (!container.offsetWidth) {
        return;
      }

      // cache slides
      slides = element.children;
      length = slides.length;

      // set continuous to false if only one slide
      if (slides.length < 2) options.continuous = false;

      //special case if two slides
      if (browser.transitions && options.continuous && slides.length < 3) {
        element.appendChild(slides[0].cloneNode(true));
        element.appendChild(element.children[1].cloneNode(true));
        slides = element.children;
      }

      // create an array to store current positions of each slide
      slidePos = new Array(slides.length);

      // determine width of each slide
      width = container.offsetWidth || container.getBoundingClientRect().width;

      element.style.width = (slides.length * width) + 'px';

      // stack elements
      var pos = slides.length;
      while(pos--) {

        var slide = slides[pos];

        slide.style.width = width + 'px';
        slide.setAttribute('data-index', pos);

        if (browser.transitions) {
          slide.style.left = (pos * -width) + 'px';
          move(pos, index > pos ? -width : (index < pos ? width : 0), 0);
        }

      }

      // reposition elements before and after index
      if (options.continuous && browser.transitions) {
        move(circle(index - 1), -width, 0);
        move(circle(index + 1), width, 0);
      }

      if (!browser.transitions) element.style.left = (index * -width) + 'px';

      container.style.visibility = 'visible';

      options.slidesChanged && options.slidesChanged();
    }

    function prev(slideSpeed) {

      if (options.continuous) slide(index - 1, slideSpeed);
      else if (index) slide(index - 1, slideSpeed);

    }

    function next(slideSpeed) {

      if (options.continuous) slide(index + 1, slideSpeed);
      else if (index < slides.length - 1) slide(index + 1, slideSpeed);

    }

    function circle(index) {

      // a simple positive modulo using slides.length
      return (slides.length + (index % slides.length)) % slides.length;

    }

    function slide(to, slideSpeed) {

      // do nothing if already on requested slide
      if (index == to) return;

      if (!slides) {
        index = to;
        return;
      }

      if (browser.transitions) {

        var direction = Math.abs(index - to) / (index - to); // 1: backward, -1: forward

        // get the actual position of the slide
        if (options.continuous) {
          var naturalDirection = direction;
          direction = -slidePos[circle(to)] / width;

          // if going forward but to < index, use to = slides.length + to
          // if going backward but to > index, use to = -slides.length + to
          if (direction !== naturalDirection) to = -direction * slides.length + to;

        }

        var diff = Math.abs(index - to) - 1;

        // move all the slides between index and to in the right direction
        while (diff--) move( circle((to > index ? to : index) - diff - 1), width * direction, 0);

        to = circle(to);

        move(index, width * direction, slideSpeed || speed);
        move(to, 0, slideSpeed || speed);

        if (options.continuous) move(circle(to - direction), -(width * direction), 0); // we need to get the next in place

      } else {

        to = circle(to);
        animate(index * -width, to * -width, slideSpeed || speed);
        //no fallback for a circular continuous if the browser does not accept transitions
      }

      index = to;
      offloadFn(options.callback && options.callback(index, slides[index]));
    }

    function move(index, dist, speed) {

      translate(index, dist, speed);
      slidePos[index] = dist;

    }

    function translate(index, dist, speed) {

      var slide = slides[index];
      var style = slide && slide.style;

      if (!style) return;

      style.webkitTransitionDuration =
      style.MozTransitionDuration =
      style.msTransitionDuration =
      style.OTransitionDuration =
      style.transitionDuration = speed + 'ms';

      style.webkitTransform = 'translate(' + dist + 'px,0)' + 'translateZ(0)';
      style.msTransform =
      style.MozTransform =
      style.OTransform = 'translateX(' + dist + 'px)';

    }

    function animate(from, to, speed) {

      // if not an animation, just reposition
      if (!speed) {

        element.style.left = to + 'px';
        return;

      }

      var start = +new Date();

      var timer = setInterval(function() {

        var timeElap = +new Date() - start;

        if (timeElap > speed) {

          element.style.left = to + 'px';

          if (delay) begin();

          options.transitionEnd && options.transitionEnd.call(event, index, slides[index]);

          clearInterval(timer);
          return;

        }

        element.style.left = (( (to - from) * (Math.floor((timeElap / speed) * 100) / 100) ) + from) + 'px';

      }, 4);

    }

    // setup auto slideshow
    var delay = options.auto || 0;
    var interval;

    function begin() {

      interval = setTimeout(next, delay);

    }

    function stop() {

      delay = options.auto || 0;
      clearTimeout(interval);

    }


    // setup initial vars
    var start = {};
    var delta = {};
    var isScrolling;

    // setup event capturing
    var events = {

      handleEvent: function(event) {
        if(!event.touches && event.pageX && event.pageY) {
          event.touches = [{
            pageX: event.pageX,
            pageY: event.pageY
          }];
        }

        switch (event.type) {
          case touchStartEvent: this.start(event); break;
          case mouseStartEvent: this.start(event); break;
          case touchMoveEvent: this.touchmove(event); break;
          case mouseMoveEvent: this.touchmove(event); break;
          case touchEndEvent: offloadFn(this.end(event)); break;
          case mouseEndEvent: offloadFn(this.end(event)); break;
          case 'webkitTransitionEnd':
          case 'msTransitionEnd':
          case 'oTransitionEnd':
          case 'otransitionend':
          case 'transitionend': offloadFn(this.transitionEnd(event)); break;
          case 'resize': offloadFn(setup); break;
        }

        if (options.stopPropagation) event.stopPropagation();

      },
      start: function(event) {

        // prevent to start if there is no valid event
        if (!event.touches) {
          return;
        }

        var touches = event.touches[0];

        // measure start values
        start = {

          // get initial touch coords
          x: touches.pageX,
          y: touches.pageY,

          // store time to determine touch duration
          time: +new Date()

        };

        // used for testing first move event
        isScrolling = undefined;

        // reset delta and end measurements
        delta = {};

        // attach touchmove and touchend listeners
        element.addEventListener(touchMoveEvent, this, false);
        element.addEventListener(mouseMoveEvent, this, false);

        element.addEventListener(touchEndEvent, this, false);
        element.addEventListener(mouseEndEvent, this, false);

        document.addEventListener(touchEndEvent, this, false);
        document.addEventListener(mouseEndEvent, this, false);
      },
      touchmove: function(event) {

        // ensure there is a valid event
        // ensure swiping with one touch and not pinching
        // ensure sliding is enabled
        if (!event.touches ||
            event.touches.length > 1 ||
            event.scale && event.scale !== 1 ||
            slider.slideIsDisabled) {
          return;
        }

        if (options.disableScroll) event.preventDefault();

        var touches = event.touches[0];

        // measure change in x and y
        delta = {
          x: touches.pageX - start.x,
          y: touches.pageY - start.y
        };

        // determine if scrolling test has run - one time test
        if ( typeof isScrolling == 'undefined') {
          isScrolling = !!( isScrolling || Math.abs(delta.x) < Math.abs(delta.y) );
        }

        // if user is not trying to scroll vertically
        if (!isScrolling) {

          // prevent native scrolling
          event.preventDefault();

          // stop slideshow
          stop();

          // increase resistance if first or last slide
          if (options.continuous) { // we don't add resistance at the end

            translate(circle(index - 1), delta.x + slidePos[circle(index - 1)], 0);
            translate(index, delta.x + slidePos[index], 0);
            translate(circle(index + 1), delta.x + slidePos[circle(index + 1)], 0);

          } else {
            // If the slider bounces, do the bounce!
            if(options.bouncing) {
              delta.x =
               delta.x /
                 ( (!index && delta.x > 0 ||         // if first slide and sliding left
                   index == slides.length - 1 &&     // or if last slide and sliding right
                   delta.x < 0                       // and if sliding at all
                 ) ?
                 ( Math.abs(delta.x) / width + 1 )      // determine resistance level
                 : 1 );                                 // no resistance if false
             } else {
               if(width * index - delta.x < 0) {               //We are trying scroll past left boundary
                 delta.x = Math.min(delta.x, width * index);  //Set delta.x so we don't go past left screen
               }
               if(Math.abs(delta.x) > width * (slides.length - index - 1)){         //We are trying to scroll past right bondary
                 delta.x = Math.max( -width * (slides.length - index - 1), delta.x);  //Set delta.x so we don't go past right screen
               }
             }

            // translate 1:1
            translate(index - 1, delta.x + slidePos[index - 1], 0);
            translate(index, delta.x + slidePos[index], 0);
            translate(index + 1, delta.x + slidePos[index + 1], 0);
          }

          options.onDrag && options.onDrag();
        }

      },
      end: function() {

        // measure duration
        var duration = +new Date() - start.time;

        // determine if slide attempt triggers next/prev slide
        var isValidSlide =
              Number(duration) < 250 &&         // if slide duration is less than 250ms
              Math.abs(delta.x) > 20 ||         // and if slide amt is greater than 20px
              Math.abs(delta.x) > width / 2;      // or if slide amt is greater than half the width

        // determine if slide attempt is past start and end
        var isPastBounds = (!index && delta.x > 0) ||      // if first slide and slide amt is greater than 0
              (index == slides.length - 1 && delta.x < 0); // or if last slide and slide amt is less than 0

        if (options.continuous) isPastBounds = false;

        // determine direction of swipe (true:right, false:left)
        var direction = delta.x < 0;

        // if not scrolling vertically
        if (!isScrolling) {

          if (isValidSlide && !isPastBounds) {

            if (direction) {

              if (options.continuous) { // we need to get the next in this direction in place

                move(circle(index - 1), -width, 0);
                move(circle(index + 2), width, 0);

              } else {
                move(index - 1, -width, 0);
              }

              move(index, slidePos[index] - width, speed);
              move(circle(index + 1), slidePos[circle(index + 1)] - width, speed);
              index = circle(index + 1);

            } else {
              if (options.continuous) { // we need to get the next in this direction in place

                move(circle(index + 1), width, 0);
                move(circle(index - 2), -width, 0);

              } else {
                move(index + 1, width, 0);
              }

              move(index, slidePos[index] + width, speed);
              move(circle(index - 1), slidePos[circle(index - 1)] + width, speed);
              index = circle(index - 1);

            }

            options.callback && options.callback(index, slides[index]);

          } else {

            if (options.continuous) {

              move(circle(index - 1), -width, speed);
              move(index, 0, speed);
              move(circle(index + 1), width, speed);

            } else {

              move(index - 1, -width, speed);
              move(index, 0, speed);
              move(index + 1, width, speed);
            }

          }

        }

        // kill touchmove and touchend event listeners until touchstart called again
        element.removeEventListener(touchMoveEvent, events, false);
        element.removeEventListener(mouseMoveEvent, events, false);

        element.removeEventListener(touchEndEvent, events, false);
        element.removeEventListener(mouseEndEvent, events, false);

        document.removeEventListener(touchEndEvent, events, false);
        document.removeEventListener(mouseEndEvent, events, false);

        options.onDragEnd && options.onDragEnd();
      },
      transitionEnd: function(event) {

        if (parseInt(event.target.getAttribute('data-index'), 10) == index) {

          if (delay) begin();

          options.transitionEnd && options.transitionEnd.call(event, index, slides[index]);

        }

      }

    };

    // Public API
    this.update = function() {
      setTimeout(setup);
    };
    this.setup = function() {
      setup();
    };

    this.loop = function(value) {
      if (arguments.length) options.continuous = !!value;
      return options.continuous;
    };

    this.enableSlide = function(shouldEnable) {
      if (arguments.length) {
        this.slideIsDisabled = !shouldEnable;
      }
      return !this.slideIsDisabled;
    };

    this.slide = this.select = function(to, speed) {
      // cancel slideshow
      stop();

      slide(to, speed);
    };

    this.prev = this.previous = function() {
      // cancel slideshow
      stop();

      prev();
    };

    this.next = function() {
      // cancel slideshow
      stop();

      next();
    };

    this.stop = function() {
      // cancel slideshow
      stop();
    };

    this.start = function() {
      begin();
    };

    this.autoPlay = function(newDelay) {
      if (!delay || delay < 0) {
        stop();
      } else {
        delay = newDelay;
        begin();
      }
    };

    this.currentIndex = this.selected = function() {
      // return current index position
      return index;
    };

    this.slidesCount = this.count = function() {
      // return total number of slides
      return length;
    };

    this.kill = function() {
      // cancel slideshow
      stop();

      // reset element
      element.style.width = '';
      element.style.left = '';

      // reset slides so no refs are held on to
      slides && (slides = []);

      // removed event listeners
      if (browser.addEventListener) {

        // remove current event listeners
        element.removeEventListener(touchStartEvent, events, false);
        element.removeEventListener(mouseStartEvent, events, false);
        element.removeEventListener('webkitTransitionEnd', events, false);
        element.removeEventListener('msTransitionEnd', events, false);
        element.removeEventListener('oTransitionEnd', events, false);
        element.removeEventListener('otransitionend', events, false);
        element.removeEventListener('transitionend', events, false);
        window.removeEventListener('resize', events, false);

      }
      else {

        window.onresize = null;

      }
    };

    this.load = function() {
      // trigger setup
      setup();

      // start auto slideshow if applicable
      if (delay) begin();


      // add event listeners
      if (browser.addEventListener) {

        // set touchstart event on element
        element.addEventListener(touchStartEvent, events, false);
        element.addEventListener(mouseStartEvent, events, false);

        if (browser.transitions) {
          element.addEventListener('webkitTransitionEnd', events, false);
          element.addEventListener('msTransitionEnd', events, false);
          element.addEventListener('oTransitionEnd', events, false);
          element.addEventListener('otransitionend', events, false);
          element.addEventListener('transitionend', events, false);
        }

        // set resize event on window
        window.addEventListener('resize', events, false);

      } else {

        window.onresize = function () { setup(); }; // to play nice with old IE

      }
    };

  }
});

})(ionic);

/*eslint space-after-keywords: 0*/

/**
 * Swiper 3.2.7
 * Most modern mobile touch slider and framework with hardware accelerated transitions
 *
 * http://www.idangero.us/swiper/
 *
 * Copyright 2015, Vladimir Kharlampidi
 * The iDangero.us
 * http://www.idangero.us/
 *
 * Licensed under MIT
 *
 * Released on: December 7, 2015
 */
(function () {
    'use strict';
    var $;
    /*===========================
    Swiper
    ===========================*/
    var Swiper = function (container, params, _scope, $compile) {

        if (!(this instanceof Swiper)) return new Swiper(container, params);

        var defaults = {
            direction: 'horizontal',
            touchEventsTarget: 'container',
            initialSlide: 0,
            speed: 300,
            // autoplay
            autoplay: false,
            autoplayDisableOnInteraction: true,
            // To support iOS's swipe-to-go-back gesture (when being used in-app, with UIWebView).
            iOSEdgeSwipeDetection: false,
            iOSEdgeSwipeThreshold: 20,
            // Free mode
            freeMode: false,
            freeModeMomentum: true,
            freeModeMomentumRatio: 1,
            freeModeMomentumBounce: true,
            freeModeMomentumBounceRatio: 1,
            freeModeSticky: false,
            freeModeMinimumVelocity: 0.02,
            // Autoheight
            autoHeight: false,
            // Set wrapper width
            setWrapperSize: false,
            // Virtual Translate
            virtualTranslate: false,
            // Effects
            effect: 'slide', // 'slide' or 'fade' or 'cube' or 'coverflow'
            coverflow: {
                rotate: 50,
                stretch: 0,
                depth: 100,
                modifier: 1,
                slideShadows : true
            },
            cube: {
                slideShadows: true,
                shadow: true,
                shadowOffset: 20,
                shadowScale: 0.94
            },
            fade: {
                crossFade: false
            },
            // Parallax
            parallax: false,
            // Scrollbar
            scrollbar: null,
            scrollbarHide: true,
            scrollbarDraggable: false,
            scrollbarSnapOnRelease: false,
            // Keyboard Mousewheel
            keyboardControl: false,
            mousewheelControl: false,
            mousewheelReleaseOnEdges: false,
            mousewheelInvert: false,
            mousewheelForceToAxis: false,
            mousewheelSensitivity: 1,
            // Hash Navigation
            hashnav: false,
            // Breakpoints
            breakpoints: undefined,
            // Slides grid
            spaceBetween: 0,
            slidesPerView: 1,
            slidesPerColumn: 1,
            slidesPerColumnFill: 'column',
            slidesPerGroup: 1,
            centeredSlides: false,
            slidesOffsetBefore: 0, // in px
            slidesOffsetAfter: 0, // in px
            // Round length
            roundLengths: false,
            // Touches
            touchRatio: 1,
            touchAngle: 45,
            simulateTouch: true,
            shortSwipes: true,
            longSwipes: true,
            longSwipesRatio: 0.5,
            longSwipesMs: 300,
            followFinger: true,
            onlyExternal: false,
            threshold: 0,
            touchMoveStopPropagation: true,
            // Pagination
            pagination: null,
            paginationElement: 'span',
            paginationClickable: false,
            paginationHide: false,
            paginationBulletRender: null,
            // Resistance
            resistance: true,
            resistanceRatio: 0.85,
            // Next/prev buttons
            nextButton: null,
            prevButton: null,
            // Progress
            watchSlidesProgress: false,
            watchSlidesVisibility: false,
            // Cursor
            grabCursor: false,
            // Clicks
            preventClicks: true,
            preventClicksPropagation: true,
            slideToClickedSlide: false,
            // Lazy Loading
            lazyLoading: false,
            lazyLoadingInPrevNext: false,
            lazyLoadingOnTransitionStart: false,
            // Images
            preloadImages: true,
            updateOnImagesReady: true,
            // loop
            loop: false,
            loopAdditionalSlides: 0,
            loopedSlides: null,
            // Control
            control: undefined,
            controlInverse: false,
            controlBy: 'slide', //or 'container'
            // Swiping/no swiping
            allowSwipeToPrev: true,
            allowSwipeToNext: true,
            swipeHandler: null, //'.swipe-handler',
            noSwiping: true,
            noSwipingClass: 'swiper-no-swiping',
            // NS
            slideClass: 'swiper-slide',
            slideActiveClass: 'swiper-slide-active',
            slideVisibleClass: 'swiper-slide-visible',
            slideDuplicateClass: 'swiper-slide-duplicate',
            slideNextClass: 'swiper-slide-next',
            slidePrevClass: 'swiper-slide-prev',
            wrapperClass: 'swiper-wrapper',
            bulletClass: 'swiper-pagination-bullet',
            bulletActiveClass: 'swiper-pagination-bullet-active',
            buttonDisabledClass: 'swiper-button-disabled',
            paginationHiddenClass: 'swiper-pagination-hidden',
            // Observer
            observer: false,
            observeParents: false,
            // Accessibility
            a11y: false,
            prevSlideMessage: 'Previous slide',
            nextSlideMessage: 'Next slide',
            firstSlideMessage: 'This is the first slide',
            lastSlideMessage: 'This is the last slide',
            paginationBulletMessage: 'Go to slide {{index}}',
            // Callbacks
            runCallbacksOnInit: true
            /*
            Callbacks:
            onInit: function (swiper)
            onDestroy: function (swiper)
            onClick: function (swiper, e)
            onTap: function (swiper, e)
            onDoubleTap: function (swiper, e)
            onSliderMove: function (swiper, e)
            onSlideChangeStart: function (swiper)
            onSlideChangeEnd: function (swiper)
            onTransitionStart: function (swiper)
            onTransitionEnd: function (swiper)
            onImagesReady: function (swiper)
            onProgress: function (swiper, progress)
            onTouchStart: function (swiper, e)
            onTouchMove: function (swiper, e)
            onTouchMoveOpposite: function (swiper, e)
            onTouchEnd: function (swiper, e)
            onReachBeginning: function (swiper)
            onReachEnd: function (swiper)
            onSetTransition: function (swiper, duration)
            onSetTranslate: function (swiper, translate)
            onAutoplayStart: function (swiper)
            onAutoplayStop: function (swiper),
            onLazyImageLoad: function (swiper, slide, image)
            onLazyImageReady: function (swiper, slide, image)
            */

        };
        var initialVirtualTranslate = params && params.virtualTranslate;

        params = params || {};
        var originalParams = {};
        for (var param in params) {
            if (typeof params[param] === 'object' && !(params[param].nodeType || params[param] === window || params[param] === document || (typeof Dom7 !== 'undefined' && params[param] instanceof Dom7) || (typeof jQuery !== 'undefined' && params[param] instanceof jQuery))) {
                originalParams[param] = {};
                for (var deepParam in params[param]) {
                    originalParams[param][deepParam] = params[param][deepParam];
                }
            }
            else {
                originalParams[param] = params[param];
            }
        }
        for (var def in defaults) {
            if (typeof params[def] === 'undefined') {
                params[def] = defaults[def];
            }
            else if (typeof params[def] === 'object') {
                for (var deepDef in defaults[def]) {
                    if (typeof params[def][deepDef] === 'undefined') {
                        params[def][deepDef] = defaults[def][deepDef];
                    }
                }
            }
        }

        // Swiper
        var s = this;

        // Params
        s.params = params;
        s.originalParams = originalParams;

        // Classname
        s.classNames = [];
        /*=========================
          Dom Library and plugins
          ===========================*/
        if (typeof $ !== 'undefined' && typeof Dom7 !== 'undefined'){
            $ = Dom7;
        }
        if (typeof $ === 'undefined') {
            if (typeof Dom7 === 'undefined') {
                $ = window.Dom7 || window.Zepto || window.jQuery;
            }
            else {
                $ = Dom7;
            }
            if (!$) return;
        }
        // Export it to Swiper instance
        s.$ = $;

        /*=========================
          Breakpoints
          ===========================*/
        s.currentBreakpoint = undefined;
        s.getActiveBreakpoint = function () {
            //Get breakpoint for window width
            if (!s.params.breakpoints) return false;
            var breakpoint = false;
            var points = [], point;
            for ( point in s.params.breakpoints ) {
                if (s.params.breakpoints.hasOwnProperty(point)) {
                    points.push(point);
                }
            }
            points.sort(function (a, b) {
                return parseInt(a, 10) > parseInt(b, 10);
            });
            for (var i = 0; i < points.length; i++) {
                point = points[i];
                if (point >= window.innerWidth && !breakpoint) {
                    breakpoint = point;
                }
            }
            return breakpoint || 'max';
        };
        s.setBreakpoint = function () {
            //Set breakpoint for window width and update parameters
            var breakpoint = s.getActiveBreakpoint();
            if (breakpoint && s.currentBreakpoint !== breakpoint) {
                var breakPointsParams = breakpoint in s.params.breakpoints ? s.params.breakpoints[breakpoint] : s.originalParams;
                for ( var param in breakPointsParams ) {
                    s.params[param] = breakPointsParams[param];
                }
                s.currentBreakpoint = breakpoint;
            }
        };
        // Set breakpoint on load
        if (s.params.breakpoints) {
            s.setBreakpoint();
        }

        /*=========================
          Preparation - Define Container, Wrapper and Pagination
          ===========================*/
        s.container = $(container);
        if (s.container.length === 0) return;
        if (s.container.length > 1) {
            s.container.each(function () {
                new Swiper(this, params);
            });
            return;
        }

        // Save instance in container HTML Element and in data
        s.container[0].swiper = s;
        s.container.data('swiper', s);

        s.classNames.push('swiper-container-' + s.params.direction);

        if (s.params.freeMode) {
            s.classNames.push('swiper-container-free-mode');
        }
        if (!s.support.flexbox) {
            s.classNames.push('swiper-container-no-flexbox');
            s.params.slidesPerColumn = 1;
        }
        if (s.params.autoHeight) {
            s.classNames.push('swiper-container-autoheight');
        }
        // Enable slides progress when required
        if (s.params.parallax || s.params.watchSlidesVisibility) {
            s.params.watchSlidesProgress = true;
        }
        // Coverflow / 3D
        if (['cube', 'coverflow'].indexOf(s.params.effect) >= 0) {
            if (s.support.transforms3d) {
                s.params.watchSlidesProgress = true;
                s.classNames.push('swiper-container-3d');
            }
            else {
                s.params.effect = 'slide';
            }
        }
        if (s.params.effect !== 'slide') {
            s.classNames.push('swiper-container-' + s.params.effect);
        }
        if (s.params.effect === 'cube') {
            s.params.resistanceRatio = 0;
            s.params.slidesPerView = 1;
            s.params.slidesPerColumn = 1;
            s.params.slidesPerGroup = 1;
            s.params.centeredSlides = false;
            s.params.spaceBetween = 0;
            s.params.virtualTranslate = true;
            s.params.setWrapperSize = false;
        }
        if (s.params.effect === 'fade') {
            s.params.slidesPerView = 1;
            s.params.slidesPerColumn = 1;
            s.params.slidesPerGroup = 1;
            s.params.watchSlidesProgress = true;
            s.params.spaceBetween = 0;
            if (typeof initialVirtualTranslate === 'undefined') {
                s.params.virtualTranslate = true;
            }
        }

        // Grab Cursor
        if (s.params.grabCursor && s.support.touch) {
            s.params.grabCursor = false;
        }

        // Wrapper
        s.wrapper = s.container.children('.' + s.params.wrapperClass);

        // Pagination
        if (s.params.pagination) {
            s.paginationContainer = $(s.params.pagination);
            if (s.params.paginationClickable) {
                s.paginationContainer.addClass('swiper-pagination-clickable');
            }
        }

        // Is Horizontal
        function isH() {
            return s.params.direction === 'horizontal';
        }

        // RTL
        s.rtl = isH() && (s.container[0].dir.toLowerCase() === 'rtl' || s.container.css('direction') === 'rtl');
        if (s.rtl) {
            s.classNames.push('swiper-container-rtl');
        }

        // Wrong RTL support
        if (s.rtl) {
            s.wrongRTL = s.wrapper.css('display') === '-webkit-box';
        }

        // Columns
        if (s.params.slidesPerColumn > 1) {
            s.classNames.push('swiper-container-multirow');
        }

        // Check for Android
        if (s.device.android) {
            s.classNames.push('swiper-container-android');
        }

        // Add classes
        s.container.addClass(s.classNames.join(' '));

        // Translate
        s.translate = 0;

        // Progress
        s.progress = 0;

        // Velocity
        s.velocity = 0;

        /*=========================
          Locks, unlocks
          ===========================*/
        s.lockSwipeToNext = function () {
            s.params.allowSwipeToNext = false;
        };
        s.lockSwipeToPrev = function () {
            s.params.allowSwipeToPrev = false;
        };
        s.lockSwipes = function () {
            s.params.allowSwipeToNext = s.params.allowSwipeToPrev = false;
        };
        s.unlockSwipeToNext = function () {
            s.params.allowSwipeToNext = true;
        };
        s.unlockSwipeToPrev = function () {
            s.params.allowSwipeToPrev = true;
        };
        s.unlockSwipes = function () {
            s.params.allowSwipeToNext = s.params.allowSwipeToPrev = true;
        };

        /*=========================
          Round helper
          ===========================*/
        function round(a) {
            return Math.floor(a);
        }
        /*=========================
          Set grab cursor
          ===========================*/
        if (s.params.grabCursor) {
            s.container[0].style.cursor = 'move';
            s.container[0].style.cursor = '-webkit-grab';
            s.container[0].style.cursor = '-moz-grab';
            s.container[0].style.cursor = 'grab';
        }
        /*=========================
          Update on Images Ready
          ===========================*/
        s.imagesToLoad = [];
        s.imagesLoaded = 0;

        s.loadImage = function (imgElement, src, srcset, checkForComplete, callback) {
            var image;
            function onReady () {
                if (callback) callback();
            }
            if (!imgElement.complete || !checkForComplete) {
                if (src) {
                    image = new window.Image();
                    image.onload = onReady;
                    image.onerror = onReady;
                    if (srcset) {
                        image.srcset = srcset;
                    }
                    if (src) {
                        image.src = src;
                    }
                } else {
                    onReady();
                }

            } else {//image already loaded...
                onReady();
            }
        };
        s.preloadImages = function () {
            s.imagesToLoad = s.container.find('img');
            function _onReady() {
                if (typeof s === 'undefined' || s === null) return;
                if (s.imagesLoaded !== undefined) s.imagesLoaded++;
                if (s.imagesLoaded === s.imagesToLoad.length) {
                    if (s.params.updateOnImagesReady) s.update();
                    s.emit('onImagesReady', s);
                }
            }
            for (var i = 0; i < s.imagesToLoad.length; i++) {
                s.loadImage(s.imagesToLoad[i], (s.imagesToLoad[i].currentSrc || s.imagesToLoad[i].getAttribute('src')), (s.imagesToLoad[i].srcset || s.imagesToLoad[i].getAttribute('srcset')), true, _onReady);
            }
        };

        /*=========================
          Autoplay
          ===========================*/
        s.autoplayTimeoutId = undefined;
        s.autoplaying = false;
        s.autoplayPaused = false;
        function autoplay() {
            s.autoplayTimeoutId = setTimeout(function () {
                if (s.params.loop) {
                    s.fixLoop();
                    s._slideNext();
                }
                else {
                    if (!s.isEnd) {
                        s._slideNext();
                    }
                    else {
                        if (!params.autoplayStopOnLast) {
                            s._slideTo(0);
                        }
                        else {
                            s.stopAutoplay();
                        }
                    }
                }
            }, s.params.autoplay);
        }
        s.startAutoplay = function () {
            if (typeof s.autoplayTimeoutId !== 'undefined') return false;
            if (!s.params.autoplay) return false;
            if (s.autoplaying) return false;
            s.autoplaying = true;
            s.emit('onAutoplayStart', s);
            autoplay();
        };
        s.stopAutoplay = function (internal) {
            if (!s.autoplayTimeoutId) return;
            if (s.autoplayTimeoutId) clearTimeout(s.autoplayTimeoutId);
            s.autoplaying = false;
            s.autoplayTimeoutId = undefined;
            s.emit('onAutoplayStop', s);
        };
        s.pauseAutoplay = function (speed) {
            if (s.autoplayPaused) return;
            if (s.autoplayTimeoutId) clearTimeout(s.autoplayTimeoutId);
            s.autoplayPaused = true;
            if (speed === 0) {
                s.autoplayPaused = false;
                autoplay();
            }
            else {
                s.wrapper.transitionEnd(function () {
                    if (!s) return;
                    s.autoplayPaused = false;
                    if (!s.autoplaying) {
                        s.stopAutoplay();
                    }
                    else {
                        autoplay();
                    }
                });
            }
        };
        /*=========================
          Min/Max Translate
          ===========================*/
        s.minTranslate = function () {
            return (-s.snapGrid[0]);
        };
        s.maxTranslate = function () {
            return (-s.snapGrid[s.snapGrid.length - 1]);
        };
        /*=========================
          Slider/slides sizes
          ===========================*/
        s.updateAutoHeight = function () {
            // Update Height
            var newHeight = s.slides.eq(s.activeIndex)[0].offsetHeight;
            if (newHeight) s.wrapper.css('height', s.slides.eq(s.activeIndex)[0].offsetHeight + 'px');
        };
        s.updateContainerSize = function () {
            var width, height;
            if (typeof s.params.width !== 'undefined') {
                width = s.params.width;
            }
            else {
                width = s.container[0].clientWidth;
            }
            if (typeof s.params.height !== 'undefined') {
                height = s.params.height;
            }
            else {
                height = s.container[0].clientHeight;
            }
            if (width === 0 && isH() || height === 0 && !isH()) {
                return;
            }

            //Subtract paddings
            width = width - parseInt(s.container.css('padding-left'), 10) - parseInt(s.container.css('padding-right'), 10);
            height = height - parseInt(s.container.css('padding-top'), 10) - parseInt(s.container.css('padding-bottom'), 10);

            // Store values
            s.width = width;
            s.height = height;
            s.size = isH() ? s.width : s.height;
        };

        s.updateSlidesSize = function () {
            s.slides = s.wrapper.children('.' + s.params.slideClass);
            s.snapGrid = [];
            s.slidesGrid = [];
            s.slidesSizesGrid = [];

            var spaceBetween = s.params.spaceBetween,
                slidePosition = -s.params.slidesOffsetBefore,
                i,
                prevSlideSize = 0,
                index = 0;
            if (typeof spaceBetween === 'string' && spaceBetween.indexOf('%') >= 0) {
                spaceBetween = parseFloat(spaceBetween.replace('%', '')) / 100 * s.size;
            }

            s.virtualSize = -spaceBetween;
            // reset margins
            if (s.rtl) s.slides.css({marginLeft: '', marginTop: ''});
            else s.slides.css({marginRight: '', marginBottom: ''});

            var slidesNumberEvenToRows;
            if (s.params.slidesPerColumn > 1) {
                if (Math.floor(s.slides.length / s.params.slidesPerColumn) === s.slides.length / s.params.slidesPerColumn) {
                    slidesNumberEvenToRows = s.slides.length;
                }
                else {
                    slidesNumberEvenToRows = Math.ceil(s.slides.length / s.params.slidesPerColumn) * s.params.slidesPerColumn;
                }
                if (s.params.slidesPerView !== 'auto' && s.params.slidesPerColumnFill === 'row') {
                    slidesNumberEvenToRows = Math.max(slidesNumberEvenToRows, s.params.slidesPerView * s.params.slidesPerColumn);
                }
            }

            // Calc slides
            var slideSize;
            var slidesPerColumn = s.params.slidesPerColumn;
            var slidesPerRow = slidesNumberEvenToRows / slidesPerColumn;
            var numFullColumns = slidesPerRow - (s.params.slidesPerColumn * slidesPerRow - s.slides.length);
            for (i = 0; i < s.slides.length; i++) {
                slideSize = 0;
                var slide = s.slides.eq(i);
                if (s.params.slidesPerColumn > 1) {
                    // Set slides order
                    var newSlideOrderIndex;
                    var column, row;
                    if (s.params.slidesPerColumnFill === 'column') {
                        column = Math.floor(i / slidesPerColumn);
                        row = i - column * slidesPerColumn;
                        if (column > numFullColumns || (column === numFullColumns && row === slidesPerColumn-1)) {
                            if (++row >= slidesPerColumn) {
                                row = 0;
                                column++;
                            }
                        }
                        newSlideOrderIndex = column + row * slidesNumberEvenToRows / slidesPerColumn;
                        slide
                            .css({
                                '-webkit-box-ordinal-group': newSlideOrderIndex,
                                '-moz-box-ordinal-group': newSlideOrderIndex,
                                '-ms-flex-order': newSlideOrderIndex,
                                '-webkit-order': newSlideOrderIndex,
                                'order': newSlideOrderIndex
                            });
                    }
                    else {
                        row = Math.floor(i / slidesPerRow);
                        column = i - row * slidesPerRow;
                    }
                    slide
                        .css({
                            'margin-top': (row !== 0 && s.params.spaceBetween) && (s.params.spaceBetween + 'px')
                        })
                        .attr('data-swiper-column', column)
                        .attr('data-swiper-row', row);

                }
                if (slide.css('display') === 'none') continue;
                if (s.params.slidesPerView === 'auto') {
                    slideSize = isH() ? slide.outerWidth(true) : slide.outerHeight(true);
                    if (s.params.roundLengths) slideSize = round(slideSize);
                }
                else {
                    slideSize = (s.size - (s.params.slidesPerView - 1) * spaceBetween) / s.params.slidesPerView;
                    if (s.params.roundLengths) slideSize = round(slideSize);

                    if (isH()) {
                        s.slides[i].style.width = slideSize + 'px';
                    }
                    else {
                        s.slides[i].style.height = slideSize + 'px';
                    }
                }
                s.slides[i].swiperSlideSize = slideSize;
                s.slidesSizesGrid.push(slideSize);


                if (s.params.centeredSlides) {
                    slidePosition = slidePosition + slideSize / 2 + prevSlideSize / 2 + spaceBetween;
                    if (i === 0) slidePosition = slidePosition - s.size / 2 - spaceBetween;
                    if (Math.abs(slidePosition) < 1 / 1000) slidePosition = 0;
                    if ((index) % s.params.slidesPerGroup === 0) s.snapGrid.push(slidePosition);
                    s.slidesGrid.push(slidePosition);
                }
                else {
                    if ((index) % s.params.slidesPerGroup === 0) s.snapGrid.push(slidePosition);
                    s.slidesGrid.push(slidePosition);
                    slidePosition = slidePosition + slideSize + spaceBetween;
                }

                s.virtualSize += slideSize + spaceBetween;

                prevSlideSize = slideSize;

                index ++;
            }
            s.virtualSize = Math.max(s.virtualSize, s.size) + s.params.slidesOffsetAfter;
            var newSlidesGrid;

            if (
                s.rtl && s.wrongRTL && (s.params.effect === 'slide' || s.params.effect === 'coverflow')) {
                s.wrapper.css({width: s.virtualSize + s.params.spaceBetween + 'px'});
            }
            if (!s.support.flexbox || s.params.setWrapperSize) {
                if (isH()) s.wrapper.css({width: s.virtualSize + s.params.spaceBetween + 'px'});
                else s.wrapper.css({height: s.virtualSize + s.params.spaceBetween + 'px'});
            }

            if (s.params.slidesPerColumn > 1) {
                s.virtualSize = (slideSize + s.params.spaceBetween) * slidesNumberEvenToRows;
                s.virtualSize = Math.ceil(s.virtualSize / s.params.slidesPerColumn) - s.params.spaceBetween;
                s.wrapper.css({width: s.virtualSize + s.params.spaceBetween + 'px'});
                if (s.params.centeredSlides) {
                    newSlidesGrid = [];
                    for (i = 0; i < s.snapGrid.length; i++) {
                        if (s.snapGrid[i] < s.virtualSize + s.snapGrid[0]) newSlidesGrid.push(s.snapGrid[i]);
                    }
                    s.snapGrid = newSlidesGrid;
                }
            }

            // Remove last grid elements depending on width
            if (!s.params.centeredSlides) {
                newSlidesGrid = [];
                for (i = 0; i < s.snapGrid.length; i++) {
                    if (s.snapGrid[i] <= s.virtualSize - s.size) {
                        newSlidesGrid.push(s.snapGrid[i]);
                    }
                }
                s.snapGrid = newSlidesGrid;
                if (Math.floor(s.virtualSize - s.size) > Math.floor(s.snapGrid[s.snapGrid.length - 1])) {
                    s.snapGrid.push(s.virtualSize - s.size);
                }
            }
            if (s.snapGrid.length === 0) s.snapGrid = [0];

            if (s.params.spaceBetween !== 0) {
                if (isH()) {
                    if (s.rtl) s.slides.css({marginLeft: spaceBetween + 'px'});
                    else s.slides.css({marginRight: spaceBetween + 'px'});
                }
                else s.slides.css({marginBottom: spaceBetween + 'px'});
            }
            if (s.params.watchSlidesProgress) {
                s.updateSlidesOffset();
            }
        };
        s.updateSlidesOffset = function () {
            for (var i = 0; i < s.slides.length; i++) {
                s.slides[i].swiperSlideOffset = isH() ? s.slides[i].offsetLeft : s.slides[i].offsetTop;
            }
        };

        /*=========================
          Slider/slides progress
          ===========================*/
        s.updateSlidesProgress = function (translate) {
            if (typeof translate === 'undefined') {
                translate = s.translate || 0;
            }
            if (s.slides.length === 0) return;
            if (typeof s.slides[0].swiperSlideOffset === 'undefined') s.updateSlidesOffset();

            var offsetCenter = -translate;
            if (s.rtl) offsetCenter = translate;

            // Visible Slides
            s.slides.removeClass(s.params.slideVisibleClass);
            for (var i = 0; i < s.slides.length; i++) {
                var slide = s.slides[i];
                var slideProgress = (offsetCenter - slide.swiperSlideOffset) / (slide.swiperSlideSize + s.params.spaceBetween);
                if (s.params.watchSlidesVisibility) {
                    var slideBefore = -(offsetCenter - slide.swiperSlideOffset);
                    var slideAfter = slideBefore + s.slidesSizesGrid[i];
                    var isVisible =
                        (slideBefore >= 0 && slideBefore < s.size) ||
                        (slideAfter > 0 && slideAfter <= s.size) ||
                        (slideBefore <= 0 && slideAfter >= s.size);
                    if (isVisible) {
                        s.slides.eq(i).addClass(s.params.slideVisibleClass);
                    }
                }
                slide.progress = s.rtl ? -slideProgress : slideProgress;
            }
        };
        s.updateProgress = function (translate) {
            if (typeof translate === 'undefined') {
                translate = s.translate || 0;
            }
            var translatesDiff = s.maxTranslate() - s.minTranslate();
            var wasBeginning = s.isBeginning;
            var wasEnd = s.isEnd;
            if (translatesDiff === 0) {
                s.progress = 0;
                s.isBeginning = s.isEnd = true;
            }
            else {
                s.progress = (translate - s.minTranslate()) / (translatesDiff);
                s.isBeginning = s.progress <= 0;
                s.isEnd = s.progress >= 1;
            }
            if (s.isBeginning && !wasBeginning) s.emit('onReachBeginning', s);
            if (s.isEnd && !wasEnd) s.emit('onReachEnd', s);

            if (s.params.watchSlidesProgress) s.updateSlidesProgress(translate);
            s.emit('onProgress', s, s.progress);
        };
        s.updateActiveIndex = function () {
            var translate = s.rtl ? s.translate : -s.translate;
            var newActiveIndex, i, snapIndex;
            for (i = 0; i < s.slidesGrid.length; i ++) {
                if (typeof s.slidesGrid[i + 1] !== 'undefined') {
                    if (translate >= s.slidesGrid[i] && translate < s.slidesGrid[i + 1] - (s.slidesGrid[i + 1] - s.slidesGrid[i]) / 2) {
                        newActiveIndex = i;
                    }
                    else if (translate >= s.slidesGrid[i] && translate < s.slidesGrid[i + 1]) {
                        newActiveIndex = i + 1;
                    }
                }
                else {
                    if (translate >= s.slidesGrid[i]) {
                        newActiveIndex = i;
                    }
                }
            }
            // Normalize slideIndex
            if (newActiveIndex < 0 || typeof newActiveIndex === 'undefined') newActiveIndex = 0;
            // for (i = 0; i < s.slidesGrid.length; i++) {
                // if (- translate >= s.slidesGrid[i]) {
                    // newActiveIndex = i;
                // }
            // }
            snapIndex = Math.floor(newActiveIndex / s.params.slidesPerGroup);
            if (snapIndex >= s.snapGrid.length) snapIndex = s.snapGrid.length - 1;

            if (newActiveIndex === s.activeIndex) {
                return;
            }
            s.snapIndex = snapIndex;
            s.previousIndex = s.activeIndex;
            s.activeIndex = newActiveIndex;
            s.updateClasses();
        };

        /*=========================
          Classes
          ===========================*/
        s.updateClasses = function () {
            s.slides.removeClass(s.params.slideActiveClass + ' ' + s.params.slideNextClass + ' ' + s.params.slidePrevClass);
            var activeSlide = s.slides.eq(s.activeIndex);
            // Active classes
            activeSlide.addClass(s.params.slideActiveClass);
            activeSlide.next('.' + s.params.slideClass).addClass(s.params.slideNextClass);
            activeSlide.prev('.' + s.params.slideClass).addClass(s.params.slidePrevClass);

            // Pagination
            if (s.bullets && s.bullets.length > 0) {
                s.bullets.removeClass(s.params.bulletActiveClass);
                var bulletIndex;
                if (s.params.loop) {
                    bulletIndex = Math.ceil(s.activeIndex - s.loopedSlides)/s.params.slidesPerGroup;
                    if (bulletIndex > s.slides.length - 1 - s.loopedSlides * 2) {
                        bulletIndex = bulletIndex - (s.slides.length - s.loopedSlides * 2);
                    }
                    if (bulletIndex > s.bullets.length - 1) bulletIndex = bulletIndex - s.bullets.length;
                }
                else {
                    if (typeof s.snapIndex !== 'undefined') {
                        bulletIndex = s.snapIndex;
                    }
                    else {
                        bulletIndex = s.activeIndex || 0;
                    }
                }
                if (s.paginationContainer.length > 1) {
                    s.bullets.each(function () {
                        if ($(this).index() === bulletIndex) $(this).addClass(s.params.bulletActiveClass);
                    });
                }
                else {
                    s.bullets.eq(bulletIndex).addClass(s.params.bulletActiveClass);
                }
            }

            // Next/active buttons
            if (!s.params.loop) {
                if (s.params.prevButton) {
                    if (s.isBeginning) {
                        $(s.params.prevButton).addClass(s.params.buttonDisabledClass);
                        if (s.params.a11y && s.a11y) s.a11y.disable($(s.params.prevButton));
                    }
                    else {
                        $(s.params.prevButton).removeClass(s.params.buttonDisabledClass);
                        if (s.params.a11y && s.a11y) s.a11y.enable($(s.params.prevButton));
                    }
                }
                if (s.params.nextButton) {
                    if (s.isEnd) {
                        $(s.params.nextButton).addClass(s.params.buttonDisabledClass);
                        if (s.params.a11y && s.a11y) s.a11y.disable($(s.params.nextButton));
                    }
                    else {
                        $(s.params.nextButton).removeClass(s.params.buttonDisabledClass);
                        if (s.params.a11y && s.a11y) s.a11y.enable($(s.params.nextButton));
                    }
                }
            }
        };

        /*=========================
          Pagination
          ===========================*/
        s.updatePagination = function () {
            if (!s.params.pagination) return;
            if (s.paginationContainer && s.paginationContainer.length > 0) {
                var bulletsHTML = '';
                var numberOfBullets = s.params.loop ? Math.ceil((s.slides.length - s.loopedSlides * 2) / s.params.slidesPerGroup) : s.snapGrid.length;
                for (var i = 0; i < numberOfBullets; i++) {
                    if (s.params.paginationBulletRender) {
                        bulletsHTML += s.params.paginationBulletRender(i, s.params.bulletClass);
                    }
                    else {
                        bulletsHTML += '<' + s.params.paginationElement+' class="' + s.params.bulletClass + '"></' + s.params.paginationElement + '>';
                    }
                }
                s.paginationContainer.html(bulletsHTML);
                s.bullets = s.paginationContainer.find('.' + s.params.bulletClass);
                if (s.params.paginationClickable && s.params.a11y && s.a11y) {
                    s.a11y.initPagination();
                }
            }
        };
        /*=========================
          Common update method
          ===========================*/
        s.update = function (updateTranslate) {
            s.updateContainerSize();
            s.updateSlidesSize();
            s.updateProgress();
            s.updatePagination();
            s.updateClasses();
            if (s.params.scrollbar && s.scrollbar) {
                s.scrollbar.set();
            }
            function forceSetTranslate() {
                newTranslate = Math.min(Math.max(s.translate, s.maxTranslate()), s.minTranslate());
                s.setWrapperTranslate(newTranslate);
                s.updateActiveIndex();
                s.updateClasses();
            }
            if (updateTranslate) {
                var translated, newTranslate;
                if (s.controller && s.controller.spline) {
                    s.controller.spline = undefined;
                }
                if (s.params.freeMode) {
                    forceSetTranslate();
                    if (s.params.autoHeight) {
                        s.updateAutoHeight();
                    }
                }
                else {
                    if ((s.params.slidesPerView === 'auto' || s.params.slidesPerView > 1) && s.isEnd && !s.params.centeredSlides) {
                        translated = s.slideTo(s.slides.length - 1, 0, false, true);
                    }
                    else {
                        translated = s.slideTo(s.activeIndex, 0, false, true);
                    }
                    if (!translated) {
                        forceSetTranslate();
                    }
                }
            }
            else if (s.params.autoHeight) {
                s.updateAutoHeight();
            }
        };

        /*=========================
          Resize Handler
          ===========================*/
        s.onResize = function (forceUpdatePagination) {
            //Breakpoints
            if (s.params.breakpoints) {
                s.setBreakpoint();
            }

            // Disable locks on resize
            var allowSwipeToPrev = s.params.allowSwipeToPrev;
            var allowSwipeToNext = s.params.allowSwipeToNext;
            s.params.allowSwipeToPrev = s.params.allowSwipeToNext = true;

            s.updateContainerSize();
            s.updateSlidesSize();
            if (s.params.slidesPerView === 'auto' || s.params.freeMode || forceUpdatePagination) s.updatePagination();
            if (s.params.scrollbar && s.scrollbar) {
                s.scrollbar.set();
            }
            if (s.controller && s.controller.spline) {
                s.controller.spline = undefined;
            }
            if (s.params.freeMode) {
                var newTranslate = Math.min(Math.max(s.translate, s.maxTranslate()), s.minTranslate());
                s.setWrapperTranslate(newTranslate);
                s.updateActiveIndex();
                s.updateClasses();

                if (s.params.autoHeight) {
                    s.updateAutoHeight();
                }
            }
            else {
                s.updateClasses();
                if ((s.params.slidesPerView === 'auto' || s.params.slidesPerView > 1) && s.isEnd && !s.params.centeredSlides) {
                    s.slideTo(s.slides.length - 1, 0, false, true);
                }
                else {
                    s.slideTo(s.activeIndex, 0, false, true);
                }
            }
            // Return locks after resize
            s.params.allowSwipeToPrev = allowSwipeToPrev;
            s.params.allowSwipeToNext = allowSwipeToNext;
        };

        /*=========================
          Events
          ===========================*/

        //Define Touch Events
        var desktopEvents = ['mousedown', 'mousemove', 'mouseup'];
        if (window.navigator.pointerEnabled) desktopEvents = ['pointerdown', 'pointermove', 'pointerup'];
        else if (window.navigator.msPointerEnabled) desktopEvents = ['MSPointerDown', 'MSPointerMove', 'MSPointerUp'];
        s.touchEvents = {
            start : s.support.touch || !s.params.simulateTouch  ? 'touchstart' : desktopEvents[0],
            move : s.support.touch || !s.params.simulateTouch ? 'touchmove' : desktopEvents[1],
            end : s.support.touch || !s.params.simulateTouch ? 'touchend' : desktopEvents[2]
        };


        // WP8 Touch Events Fix
        if (window.navigator.pointerEnabled || window.navigator.msPointerEnabled) {
            (s.params.touchEventsTarget === 'container' ? s.container : s.wrapper).addClass('swiper-wp8-' + s.params.direction);
        }

        // Attach/detach events
        s.initEvents = function (detach) {
            var actionDom = detach ? 'off' : 'on';
            var action = detach ? 'removeEventListener' : 'addEventListener';
            var touchEventsTarget = s.params.touchEventsTarget === 'container' ? s.container[0] : s.wrapper[0];
            var target = s.support.touch ? touchEventsTarget : document;

            var moveCapture = s.params.nested ? true : false;

            //Touch Events
            if (s.browser.ie) {
                touchEventsTarget[action](s.touchEvents.start, s.onTouchStart, false);
                target[action](s.touchEvents.move, s.onTouchMove, moveCapture);
                target[action](s.touchEvents.end, s.onTouchEnd, false);
            }
            else {
                if (s.support.touch) {
                    touchEventsTarget[action](s.touchEvents.start, s.onTouchStart, false);
                    touchEventsTarget[action](s.touchEvents.move, s.onTouchMove, moveCapture);
                    touchEventsTarget[action](s.touchEvents.end, s.onTouchEnd, false);
                }
                if (params.simulateTouch && !s.device.ios && !s.device.android) {
                    touchEventsTarget[action]('mousedown', s.onTouchStart, false);
                    document[action]('mousemove', s.onTouchMove, moveCapture);
                    document[action]('mouseup', s.onTouchEnd, false);
                }
            }
            window[action]('resize', s.onResize);

            // Next, Prev, Index
            if (s.params.nextButton) {
                $(s.params.nextButton)[actionDom]('click', s.onClickNext);
                if (s.params.a11y && s.a11y) $(s.params.nextButton)[actionDom]('keydown', s.a11y.onEnterKey);
            }
            if (s.params.prevButton) {
                $(s.params.prevButton)[actionDom]('click', s.onClickPrev);
                if (s.params.a11y && s.a11y) $(s.params.prevButton)[actionDom]('keydown', s.a11y.onEnterKey);
            }
            if (s.params.pagination && s.params.paginationClickable) {
                $(s.paginationContainer)[actionDom]('click', '.' + s.params.bulletClass, s.onClickIndex);
                if (s.params.a11y && s.a11y) $(s.paginationContainer)[actionDom]('keydown', '.' + s.params.bulletClass, s.a11y.onEnterKey);
            }

            // Prevent Links Clicks
            if (s.params.preventClicks || s.params.preventClicksPropagation) touchEventsTarget[action]('click', s.preventClicks, true);
        };
        s.attachEvents = function (detach) {
            s.initEvents();
        };
        s.detachEvents = function () {
            s.initEvents(true);
        };

        /*=========================
          Handle Clicks
          ===========================*/
        // Prevent Clicks
        s.allowClick = true;
        s.preventClicks = function (e) {
            if (!s.allowClick) {
                if (s.params.preventClicks) e.preventDefault();
                if (s.params.preventClicksPropagation && s.animating) {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
            }
        };
        // Clicks
        s.onClickNext = function (e) {
            e.preventDefault();
            if (s.isEnd && !s.params.loop) return;
            s.slideNext();
        };
        s.onClickPrev = function (e) {
            e.preventDefault();
            if (s.isBeginning && !s.params.loop) return;
            s.slidePrev();
        };
        s.onClickIndex = function (e) {
            e.preventDefault();
            var index = $(this).index() * s.params.slidesPerGroup;
            if (s.params.loop) index = index + s.loopedSlides;
            s.slideTo(index);
        };

        /*=========================
          Handle Touches
          ===========================*/
        function findElementInEvent(e, selector) {
            var el = $(e.target);
            if (!el.is(selector)) {
                if (typeof selector === 'string') {
                    el = el.parents(selector);
                }
                else if (selector.nodeType) {
                    var found;
                    el.parents().each(function (index, _el) {
                        if (_el === selector) found = selector;
                    });
                    if (!found) return undefined;
                    else return selector;
                }
            }
            if (el.length === 0) {
                return undefined;
            }
            return el[0];
        }
        s.updateClickedSlide = function (e) {
            var slide = findElementInEvent(e, '.' + s.params.slideClass);
            var slideFound = false;
            if (slide) {
                for (var i = 0; i < s.slides.length; i++) {
                    if (s.slides[i] === slide) slideFound = true;
                }
            }

            if (slide && slideFound) {
                s.clickedSlide = slide;
                s.clickedIndex = $(slide).index();
            }
            else {
                s.clickedSlide = undefined;
                s.clickedIndex = undefined;
                return;
            }
            if (s.params.slideToClickedSlide && s.clickedIndex !== undefined && s.clickedIndex !== s.activeIndex) {
                var slideToIndex = s.clickedIndex,
                    realIndex,
                    duplicatedSlides;
                if (s.params.loop) {
                    if (s.animating) return;
                    realIndex = $(s.clickedSlide).attr('data-swiper-slide-index');
                    if (s.params.centeredSlides) {
                        if ((slideToIndex < s.loopedSlides - s.params.slidesPerView/2) || (slideToIndex > s.slides.length - s.loopedSlides + s.params.slidesPerView/2)) {
                            s.fixLoop();
                            slideToIndex = s.wrapper.children('.' + s.params.slideClass + '[data-swiper-slide-index="' + realIndex + '"]:not(.swiper-slide-duplicate)').eq(0).index();
                            setTimeout(function () {
                                s.slideTo(slideToIndex);
                            }, 0);
                        }
                        else {
                            s.slideTo(slideToIndex);
                        }
                    }
                    else {
                        if (slideToIndex > s.slides.length - s.params.slidesPerView) {
                            s.fixLoop();
                            slideToIndex = s.wrapper.children('.' + s.params.slideClass + '[data-swiper-slide-index="' + realIndex + '"]:not(.swiper-slide-duplicate)').eq(0).index();
                            setTimeout(function () {
                                s.slideTo(slideToIndex);
                            }, 0);
                        }
                        else {
                            s.slideTo(slideToIndex);
                        }
                    }
                }
                else {
                    s.slideTo(slideToIndex);
                }
            }
        };

        var isTouched,
            isMoved,
            allowTouchCallbacks,
            touchStartTime,
            isScrolling,
            currentTranslate,
            startTranslate,
            allowThresholdMove,
            // Form elements to match
            formElements = 'input, select, textarea, button',
            // Last click time
            lastClickTime = Date.now(), clickTimeout,
            //Velocities
            velocities = [],
            allowMomentumBounce;

        // Animating Flag
        s.animating = false;

        // Touches information
        s.touches = {
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            diff: 0
        };

        // Touch handlers
        var isTouchEvent, startMoving;
        s.onTouchStart = function (e) {
            if (e.originalEvent) e = e.originalEvent;
            isTouchEvent = e.type === 'touchstart';
            if (!isTouchEvent && 'which' in e && e.which === 3) return;
            if (s.params.noSwiping && findElementInEvent(e, '.' + s.params.noSwipingClass)) {
                s.allowClick = true;
                return;
            }
            if (s.params.swipeHandler) {
                if (!findElementInEvent(e, s.params.swipeHandler)) return;
            }

            var startX = s.touches.currentX = e.type === 'touchstart' ? e.targetTouches[0].pageX : e.pageX;
            var startY = s.touches.currentY = e.type === 'touchstart' ? e.targetTouches[0].pageY : e.pageY;

            // Do NOT start if iOS edge swipe is detected. Otherwise iOS app (UIWebView) cannot swipe-to-go-back anymore
            if(s.device.ios && s.params.iOSEdgeSwipeDetection && startX <= s.params.iOSEdgeSwipeThreshold) {
                return;
            }

            isTouched = true;
            isMoved = false;
            allowTouchCallbacks = true;
            isScrolling = undefined;
            startMoving = undefined;
            s.touches.startX = startX;
            s.touches.startY = startY;
            touchStartTime = Date.now();
            s.allowClick = true;
            s.updateContainerSize();
            s.swipeDirection = undefined;
            if (s.params.threshold > 0) allowThresholdMove = false;
            if (e.type !== 'touchstart') {
                var preventDefault = true;
                if ($(e.target).is(formElements)) preventDefault = false;
                if (document.activeElement && $(document.activeElement).is(formElements)) {
                    document.activeElement.blur();
                }
                if (preventDefault) {
                    e.preventDefault();
                }
            }
            s.emit('onTouchStart', s, e);
        };

        s.onTouchMove = function (e) {
            if (e.originalEvent) e = e.originalEvent;
            if (isTouchEvent && e.type === 'mousemove') return;
            if (e.preventedByNestedSwiper) return;
            if (s.params.onlyExternal) {
                // isMoved = true;
                s.allowClick = false;
                if (isTouched) {
                    s.touches.startX = s.touches.currentX = e.type === 'touchmove' ? e.targetTouches[0].pageX : e.pageX;
                    s.touches.startY = s.touches.currentY = e.type === 'touchmove' ? e.targetTouches[0].pageY : e.pageY;
                    touchStartTime = Date.now();
                }
                return;
            }
            if (isTouchEvent && document.activeElement) {
                if (e.target === document.activeElement && $(e.target).is(formElements)) {
                    isMoved = true;
                    s.allowClick = false;
                    return;
                }
            }
            if (allowTouchCallbacks) {
                s.emit('onTouchMove', s, e);
            }
            if (e.targetTouches && e.targetTouches.length > 1) return;

            s.touches.currentX = e.type === 'touchmove' ? e.targetTouches[0].pageX : e.pageX;
            s.touches.currentY = e.type === 'touchmove' ? e.targetTouches[0].pageY : e.pageY;

            if (typeof isScrolling === 'undefined') {
                var touchAngle = Math.atan2(Math.abs(s.touches.currentY - s.touches.startY), Math.abs(s.touches.currentX - s.touches.startX)) * 180 / Math.PI;
                isScrolling = isH() ? touchAngle > s.params.touchAngle : (90 - touchAngle > s.params.touchAngle);
            }
            if (isScrolling) {
                s.emit('onTouchMoveOpposite', s, e);
            }
            if (typeof startMoving === 'undefined' && s.browser.ieTouch) {
                if (s.touches.currentX !== s.touches.startX || s.touches.currentY !== s.touches.startY) {
                    startMoving = true;
                }
            }
            if (!isTouched) return;
            if (isScrolling)  {
                isTouched = false;
                return;
            }
            if (!startMoving && s.browser.ieTouch) {
                return;
            }
            s.allowClick = false;
            s.emit('onSliderMove', s, e);
            e.preventDefault();
            if (s.params.touchMoveStopPropagation && !s.params.nested) {
                e.stopPropagation();
            }

            if (!isMoved) {
                if (params.loop) {
                    s.fixLoop();
                }
                startTranslate = s.getWrapperTranslate();
                s.setWrapperTransition(0);
                if (s.animating) {
                    s.wrapper.trigger('webkitTransitionEnd transitionend oTransitionEnd MSTransitionEnd msTransitionEnd');
                }
                if (s.params.autoplay && s.autoplaying) {
                    if (s.params.autoplayDisableOnInteraction) {
                        s.stopAutoplay();
                    }
                    else {
                        s.pauseAutoplay();
                    }
                }
                allowMomentumBounce = false;
                //Grab Cursor
                if (s.params.grabCursor) {
                    s.container[0].style.cursor = 'move';
                    s.container[0].style.cursor = '-webkit-grabbing';
                    s.container[0].style.cursor = '-moz-grabbin';
                    s.container[0].style.cursor = 'grabbing';
                }
            }
            isMoved = true;

            var diff = s.touches.diff = isH() ? s.touches.currentX - s.touches.startX : s.touches.currentY - s.touches.startY;

            diff = diff * s.params.touchRatio;
            if (s.rtl) diff = -diff;

            s.swipeDirection = diff > 0 ? 'prev' : 'next';
            currentTranslate = diff + startTranslate;

            var disableParentSwiper = true;
            if ((diff > 0 && currentTranslate > s.minTranslate())) {
                disableParentSwiper = false;
                if (s.params.resistance) currentTranslate = s.minTranslate() - 1 + Math.pow(-s.minTranslate() + startTranslate + diff, s.params.resistanceRatio);
            }
            else if (diff < 0 && currentTranslate < s.maxTranslate()) {
                disableParentSwiper = false;
                if (s.params.resistance) currentTranslate = s.maxTranslate() + 1 - Math.pow(s.maxTranslate() - startTranslate - diff, s.params.resistanceRatio);
            }

            if (disableParentSwiper) {
                e.preventedByNestedSwiper = true;
            }

            // Directions locks
            if (!s.params.allowSwipeToNext && s.swipeDirection === 'next' && currentTranslate < startTranslate) {
                currentTranslate = startTranslate;
            }
            if (!s.params.allowSwipeToPrev && s.swipeDirection === 'prev' && currentTranslate > startTranslate) {
                currentTranslate = startTranslate;
            }

            if (!s.params.followFinger) return;

            // Threshold
            if (s.params.threshold > 0) {
                if (Math.abs(diff) > s.params.threshold || allowThresholdMove) {
                    if (!allowThresholdMove) {
                        allowThresholdMove = true;
                        s.touches.startX = s.touches.currentX;
                        s.touches.startY = s.touches.currentY;
                        currentTranslate = startTranslate;
                        s.touches.diff = isH() ? s.touches.currentX - s.touches.startX : s.touches.currentY - s.touches.startY;
                        return;
                    }
                }
                else {
                    currentTranslate = startTranslate;
                    return;
                }
            }
            // Update active index in free mode
            if (s.params.freeMode || s.params.watchSlidesProgress) {
                s.updateActiveIndex();
            }
            if (s.params.freeMode) {
                //Velocity
                if (velocities.length === 0) {
                    velocities.push({
                        position: s.touches[isH() ? 'startX' : 'startY'],
                        time: touchStartTime
                    });
                }
                velocities.push({
                    position: s.touches[isH() ? 'currentX' : 'currentY'],
                    time: (new window.Date()).getTime()
                });
            }
            // Update progress
            s.updateProgress(currentTranslate);
            // Update translate
            s.setWrapperTranslate(currentTranslate);
        };
        s.onTouchEnd = function (e) {
            if (e.originalEvent) e = e.originalEvent;
            if (allowTouchCallbacks) {
                s.emit('onTouchEnd', s, e);
            }
            allowTouchCallbacks = false;
            if (!isTouched) return;
            //Return Grab Cursor
            if (s.params.grabCursor && isMoved && isTouched) {
                s.container[0].style.cursor = 'move';
                s.container[0].style.cursor = '-webkit-grab';
                s.container[0].style.cursor = '-moz-grab';
                s.container[0].style.cursor = 'grab';
            }

            // Time diff
            var touchEndTime = Date.now();
            var timeDiff = touchEndTime - touchStartTime;

            // Tap, doubleTap, Click
            if (s.allowClick) {
                s.updateClickedSlide(e);
                s.emit('onTap', s, e);
                if (timeDiff < 300 && (touchEndTime - lastClickTime) > 300) {
                    if (clickTimeout) clearTimeout(clickTimeout);
                    clickTimeout = setTimeout(function () {
                        if (!s) return;
                        if (s.params.paginationHide && s.paginationContainer.length > 0 && !$(e.target).hasClass(s.params.bulletClass)) {
                            s.paginationContainer.toggleClass(s.params.paginationHiddenClass);
                        }
                        s.emit('onClick', s, e);
                    }, 300);

                }
                if (timeDiff < 300 && (touchEndTime - lastClickTime) < 300) {
                    if (clickTimeout) clearTimeout(clickTimeout);
                    s.emit('onDoubleTap', s, e);
                }
            }

            lastClickTime = Date.now();
            setTimeout(function () {
                if (s) s.allowClick = true;
            }, 0);

            if (!isTouched || !isMoved || !s.swipeDirection || s.touches.diff === 0 || currentTranslate === startTranslate) {
                isTouched = isMoved = false;
                return;
            }
            isTouched = isMoved = false;

            var currentPos;
            if (s.params.followFinger) {
                currentPos = s.rtl ? s.translate : -s.translate;
            }
            else {
                currentPos = -currentTranslate;
            }
            if (s.params.freeMode) {
                if (currentPos < -s.minTranslate()) {
                    s.slideTo(s.activeIndex);
                    return;
                }
                else if (currentPos > -s.maxTranslate()) {
                    if (s.slides.length < s.snapGrid.length) {
                        s.slideTo(s.snapGrid.length - 1);
                    }
                    else {
                        s.slideTo(s.slides.length - 1);
                    }
                    return;
                }

                if (s.params.freeModeMomentum) {
                    if (velocities.length > 1) {
                        var lastMoveEvent = velocities.pop(), velocityEvent = velocities.pop();

                        var distance = lastMoveEvent.position - velocityEvent.position;
                        var time = lastMoveEvent.time - velocityEvent.time;
                        s.velocity = distance / time;
                        s.velocity = s.velocity / 2;
                        if (Math.abs(s.velocity) < s.params.freeModeMinimumVelocity) {
                            s.velocity = 0;
                        }
                        // this implies that the user stopped moving a finger then released.
                        // There would be no events with distance zero, so the last event is stale.
                        if (time > 150 || (new window.Date().getTime() - lastMoveEvent.time) > 300) {
                            s.velocity = 0;
                        }
                    } else {
                        s.velocity = 0;
                    }

                    velocities.length = 0;
                    var momentumDuration = 1000 * s.params.freeModeMomentumRatio;
                    var momentumDistance = s.velocity * momentumDuration;

                    var newPosition = s.translate + momentumDistance;
                    if (s.rtl) newPosition = - newPosition;
                    var doBounce = false;
                    var afterBouncePosition;
                    var bounceAmount = Math.abs(s.velocity) * 20 * s.params.freeModeMomentumBounceRatio;
                    if (newPosition < s.maxTranslate()) {
                        if (s.params.freeModeMomentumBounce) {
                            if (newPosition + s.maxTranslate() < -bounceAmount) {
                                newPosition = s.maxTranslate() - bounceAmount;
                            }
                            afterBouncePosition = s.maxTranslate();
                            doBounce = true;
                            allowMomentumBounce = true;
                        }
                        else {
                            newPosition = s.maxTranslate();
                        }
                    }
                    else if (newPosition > s.minTranslate()) {
                        if (s.params.freeModeMomentumBounce) {
                            if (newPosition - s.minTranslate() > bounceAmount) {
                                newPosition = s.minTranslate() + bounceAmount;
                            }
                            afterBouncePosition = s.minTranslate();
                            doBounce = true;
                            allowMomentumBounce = true;
                        }
                        else {
                            newPosition = s.minTranslate();
                        }
                    }
                    else if (s.params.freeModeSticky) {
                        var j = 0,
                            nextSlide;
                        for (j = 0; j < s.snapGrid.length; j += 1) {
                            if (s.snapGrid[j] > -newPosition) {
                                nextSlide = j;
                                break;
                            }

                        }
                        if (Math.abs(s.snapGrid[nextSlide] - newPosition) < Math.abs(s.snapGrid[nextSlide - 1] - newPosition) || s.swipeDirection === 'next') {
                            newPosition = s.snapGrid[nextSlide];
                        } else {
                            newPosition = s.snapGrid[nextSlide - 1];
                        }
                        if (!s.rtl) newPosition = - newPosition;
                    }
                    //Fix duration
                    if (s.velocity !== 0) {
                        if (s.rtl) {
                            momentumDuration = Math.abs((-newPosition - s.translate) / s.velocity);
                        }
                        else {
                            momentumDuration = Math.abs((newPosition - s.translate) / s.velocity);
                        }
                    }
                    else if (s.params.freeModeSticky) {
                        s.slideReset();
                        return;
                    }

                    if (s.params.freeModeMomentumBounce && doBounce) {
                        s.updateProgress(afterBouncePosition);
                        s.setWrapperTransition(momentumDuration);
                        s.setWrapperTranslate(newPosition);
                        s.onTransitionStart();
                        s.animating = true;
                        s.wrapper.transitionEnd(function () {
                            if (!s || !allowMomentumBounce) return;
                            s.emit('onMomentumBounce', s);

                            s.setWrapperTransition(s.params.speed);
                            s.setWrapperTranslate(afterBouncePosition);
                            s.wrapper.transitionEnd(function () {
                                if (!s) return;
                                s.onTransitionEnd();
                            });
                        });
                    } else if (s.velocity) {
                        s.updateProgress(newPosition);
                        s.setWrapperTransition(momentumDuration);
                        s.setWrapperTranslate(newPosition);
                        s.onTransitionStart();
                        if (!s.animating) {
                            s.animating = true;
                            s.wrapper.transitionEnd(function () {
                                if (!s) return;
                                s.onTransitionEnd();
                            });
                        }

                    } else {
                        s.updateProgress(newPosition);
                    }

                    s.updateActiveIndex();
                }
                if (!s.params.freeModeMomentum || timeDiff >= s.params.longSwipesMs) {
                    s.updateProgress();
                    s.updateActiveIndex();
                }
                return;
            }

            // Find current slide
            var i, stopIndex = 0, groupSize = s.slidesSizesGrid[0];
            for (i = 0; i < s.slidesGrid.length; i += s.params.slidesPerGroup) {
                if (typeof s.slidesGrid[i + s.params.slidesPerGroup] !== 'undefined') {
                    if (currentPos >= s.slidesGrid[i] && currentPos < s.slidesGrid[i + s.params.slidesPerGroup]) {
                        stopIndex = i;
                        groupSize = s.slidesGrid[i + s.params.slidesPerGroup] - s.slidesGrid[i];
                    }
                }
                else {
                    if (currentPos >= s.slidesGrid[i]) {
                        stopIndex = i;
                        groupSize = s.slidesGrid[s.slidesGrid.length - 1] - s.slidesGrid[s.slidesGrid.length - 2];
                    }
                }
            }

            // Find current slide size
            var ratio = (currentPos - s.slidesGrid[stopIndex]) / groupSize;

            if (timeDiff > s.params.longSwipesMs) {
                // Long touches
                if (!s.params.longSwipes) {
                    s.slideTo(s.activeIndex);
                    return;
                }
                if (s.swipeDirection === 'next') {
                    if (ratio >= s.params.longSwipesRatio) s.slideTo(stopIndex + s.params.slidesPerGroup);
                    else s.slideTo(stopIndex);

                }
                if (s.swipeDirection === 'prev') {
                    if (ratio > (1 - s.params.longSwipesRatio)) s.slideTo(stopIndex + s.params.slidesPerGroup);
                    else s.slideTo(stopIndex);
                }
            }
            else {
                // Short swipes
                if (!s.params.shortSwipes) {
                    s.slideTo(s.activeIndex);
                    return;
                }
                if (s.swipeDirection === 'next') {
                    s.slideTo(stopIndex + s.params.slidesPerGroup);

                }
                if (s.swipeDirection === 'prev') {
                    s.slideTo(stopIndex);
                }
            }
        };
        /*=========================
          Transitions
          ===========================*/
        s._slideTo = function (slideIndex, speed) {
            return s.slideTo(slideIndex, speed, true, true);
        };
        s.slideTo = function (slideIndex, speed, runCallbacks, internal) {
            if (typeof runCallbacks === 'undefined') runCallbacks = true;
            if (typeof slideIndex === 'undefined') slideIndex = 0;
            if (slideIndex < 0) slideIndex = 0;
            s.snapIndex = Math.floor(slideIndex / s.params.slidesPerGroup);
            if (s.snapIndex >= s.snapGrid.length) s.snapIndex = s.snapGrid.length - 1;

            var translate = - s.snapGrid[s.snapIndex];
            // Stop autoplay
            if (s.params.autoplay && s.autoplaying) {
                if (internal || !s.params.autoplayDisableOnInteraction) {
                    s.pauseAutoplay(speed);
                }
                else {
                    s.stopAutoplay();
                }
            }
            // Update progress
            s.updateProgress(translate);

            // Normalize slideIndex
            for (var i = 0; i < s.slidesGrid.length; i++) {
                if (- Math.floor(translate * 100) >= Math.floor(s.slidesGrid[i] * 100)) {
                    slideIndex = i;
                }
            }

            // Directions locks
            if (!s.params.allowSwipeToNext && translate < s.translate && translate < s.minTranslate()) {
                return false;
            }
            if (!s.params.allowSwipeToPrev && translate > s.translate && translate > s.maxTranslate()) {
                if ((s.activeIndex || 0) !== slideIndex ) return false;
            }

            // Update Index
            if (typeof speed === 'undefined') speed = s.params.speed;
            s.previousIndex = s.activeIndex || 0;
            s.activeIndex = slideIndex;

            if ((s.rtl && -translate === s.translate) || (!s.rtl && translate === s.translate)) {
                // Update Height
                if (s.params.autoHeight) {
                    s.updateAutoHeight();
                }
                s.updateClasses();
                if (s.params.effect !== 'slide') {
                    s.setWrapperTranslate(translate);
                }
                return false;
            }
            s.updateClasses();
            s.onTransitionStart(runCallbacks);

            if (speed === 0) {
                s.setWrapperTranslate(translate);
                s.setWrapperTransition(0);
                s.onTransitionEnd(runCallbacks);
            }
            else {
                s.setWrapperTranslate(translate);
                s.setWrapperTransition(speed);
                if (!s.animating) {
                    s.animating = true;
                    s.wrapper.transitionEnd(function () {
                        if (!s) return;
                        s.onTransitionEnd(runCallbacks);
                    });
                }

            }

            return true;
        };

        s.onTransitionStart = function (runCallbacks) {
            if (typeof runCallbacks === 'undefined') runCallbacks = true;
            if (s.params.autoHeight) {
                s.updateAutoHeight();
            }
            if (s.lazy) s.lazy.onTransitionStart();
            if (runCallbacks) {
                s.emit('onTransitionStart', s);
                if (s.activeIndex !== s.previousIndex) {
                    s.emit('onSlideChangeStart', s);
                    _scope.$emit("$ionicSlides.slideChangeStart", {
                      slider: s,
                      activeIndex: s.getSlideDataIndex(s.activeIndex),
                      previousIndex: s.getSlideDataIndex(s.previousIndex)
                    });
                    if (s.activeIndex > s.previousIndex) {
                        s.emit('onSlideNextStart', s);
                    }
                    else {
                        s.emit('onSlidePrevStart', s);
                    }
                }

            }
        };
        s.onTransitionEnd = function (runCallbacks) {
            s.animating = false;
            s.setWrapperTransition(0);
            if (typeof runCallbacks === 'undefined') runCallbacks = true;
            if (s.lazy) s.lazy.onTransitionEnd();
            if (runCallbacks) {
                s.emit('onTransitionEnd', s);
                if (s.activeIndex !== s.previousIndex) {
                    s.emit('onSlideChangeEnd', s);
                    _scope.$emit("$ionicSlides.slideChangeEnd", {
                      slider: s,
                      activeIndex: s.getSlideDataIndex(s.activeIndex),
                      previousIndex: s.getSlideDataIndex(s.previousIndex)
                    });
                    if (s.activeIndex > s.previousIndex) {
                        s.emit('onSlideNextEnd', s);
                    }
                    else {
                        s.emit('onSlidePrevEnd', s);
                    }
                }
            }
            if (s.params.hashnav && s.hashnav) {
                s.hashnav.setHash();
            }

        };
        s.slideNext = function (runCallbacks, speed, internal) {
            if (s.params.loop) {
                if (s.animating) return false;
                s.fixLoop();
                var clientLeft = s.container[0].clientLeft;
                return s.slideTo(s.activeIndex + s.params.slidesPerGroup, speed, runCallbacks, internal);
            }
            else return s.slideTo(s.activeIndex + s.params.slidesPerGroup, speed, runCallbacks, internal);
        };
        s._slideNext = function (speed) {
            return s.slideNext(true, speed, true);
        };
        s.slidePrev = function (runCallbacks, speed, internal) {
            if (s.params.loop) {
                if (s.animating) return false;
                s.fixLoop();
                var clientLeft = s.container[0].clientLeft;
                return s.slideTo(s.activeIndex - 1, speed, runCallbacks, internal);
            }
            else return s.slideTo(s.activeIndex - 1, speed, runCallbacks, internal);
        };
        s._slidePrev = function (speed) {
            return s.slidePrev(true, speed, true);
        };
        s.slideReset = function (runCallbacks, speed, internal) {
            return s.slideTo(s.activeIndex, speed, runCallbacks);
        };

        /*=========================
          Translate/transition helpers
          ===========================*/
        s.setWrapperTransition = function (duration, byController) {
            s.wrapper.transition(duration);
            if (s.params.effect !== 'slide' && s.effects[s.params.effect]) {
                s.effects[s.params.effect].setTransition(duration);
            }
            if (s.params.parallax && s.parallax) {
                s.parallax.setTransition(duration);
            }
            if (s.params.scrollbar && s.scrollbar) {
                s.scrollbar.setTransition(duration);
            }
            if (s.params.control && s.controller) {
                s.controller.setTransition(duration, byController);
            }
            s.emit('onSetTransition', s, duration);
        };
        s.setWrapperTranslate = function (translate, updateActiveIndex, byController) {
            var x = 0, y = 0, z = 0;
            if (isH()) {
                x = s.rtl ? -translate : translate;
            }
            else {
                y = translate;
            }

            if (s.params.roundLengths) {
                x = round(x);
                y = round(y);
            }

            if (!s.params.virtualTranslate) {
                if (s.support.transforms3d) s.wrapper.transform('translate3d(' + x + 'px, ' + y + 'px, ' + z + 'px)');
                else s.wrapper.transform('translate(' + x + 'px, ' + y + 'px)');
            }

            s.translate = isH() ? x : y;

            // Check if we need to update progress
            var progress;
            var translatesDiff = s.maxTranslate() - s.minTranslate();
            if (translatesDiff === 0) {
                progress = 0;
            }
            else {
                progress = (translate - s.minTranslate()) / (translatesDiff);
            }
            if (progress !== s.progress) {
                s.updateProgress(translate);
            }

            if (updateActiveIndex) s.updateActiveIndex();
            if (s.params.effect !== 'slide' && s.effects[s.params.effect]) {
                s.effects[s.params.effect].setTranslate(s.translate);
            }
            if (s.params.parallax && s.parallax) {
                s.parallax.setTranslate(s.translate);
            }
            if (s.params.scrollbar && s.scrollbar) {
                s.scrollbar.setTranslate(s.translate);
            }
            if (s.params.control && s.controller) {
                s.controller.setTranslate(s.translate, byController);
            }
            s.emit('onSetTranslate', s, s.translate);
        };

        s.getTranslate = function (el, axis) {
            var matrix, curTransform, curStyle, transformMatrix;

            // automatic axis detection
            if (typeof axis === 'undefined') {
                axis = 'x';
            }

            if (s.params.virtualTranslate) {
                return s.rtl ? -s.translate : s.translate;
            }

            curStyle = window.getComputedStyle(el, null);
            if (window.WebKitCSSMatrix) {
                curTransform = curStyle.transform || curStyle.webkitTransform;
                if (curTransform.split(',').length > 6) {
                    curTransform = curTransform.split(', ').map(function(a){
                        return a.replace(',','.');
                    }).join(', ');
                }
                // Some old versions of Webkit choke when 'none' is passed; pass
                // empty string instead in this case
                transformMatrix = new window.WebKitCSSMatrix(curTransform === 'none' ? '' : curTransform);
            }
            else {
                transformMatrix = curStyle.MozTransform || curStyle.OTransform || curStyle.MsTransform || curStyle.msTransform  || curStyle.transform || curStyle.getPropertyValue('transform').replace('translate(', 'matrix(1, 0, 0, 1,');
                matrix = transformMatrix.toString().split(',');
            }

            if (axis === 'x') {
                //Latest Chrome and webkits Fix
                if (window.WebKitCSSMatrix)
                    curTransform = transformMatrix.m41;
                //Crazy IE10 Matrix
                else if (matrix.length === 16)
                    curTransform = parseFloat(matrix[12]);
                //Normal Browsers
                else
                    curTransform = parseFloat(matrix[4]);
            }
            if (axis === 'y') {
                //Latest Chrome and webkits Fix
                if (window.WebKitCSSMatrix)
                    curTransform = transformMatrix.m42;
                //Crazy IE10 Matrix
                else if (matrix.length === 16)
                    curTransform = parseFloat(matrix[13]);
                //Normal Browsers
                else
                    curTransform = parseFloat(matrix[5]);
            }
            if (s.rtl && curTransform) curTransform = -curTransform;
            return curTransform || 0;
        };
        s.getWrapperTranslate = function (axis) {
            if (typeof axis === 'undefined') {
                axis = isH() ? 'x' : 'y';
            }
            return s.getTranslate(s.wrapper[0], axis);
        };

        /*=========================
          Observer
          ===========================*/
        s.observers = [];
        function initObserver(target, options) {
            options = options || {};
            // create an observer instance
            var ObserverFunc = window.MutationObserver || window.WebkitMutationObserver;
            var observer = new ObserverFunc(function (mutations) {
                mutations.forEach(function (mutation) {
                    s.onResize(true);
                    s.emit('onObserverUpdate', s, mutation);
                });
            });

            observer.observe(target, {
                attributes: typeof options.attributes === 'undefined' ? true : options.attributes,
                childList: typeof options.childList === 'undefined' ? true : options.childList,
                characterData: typeof options.characterData === 'undefined' ? true : options.characterData
            });

            s.observers.push(observer);
        }
        s.initObservers = function () {
            if (s.params.observeParents) {
                var containerParents = s.container.parents();
                for (var i = 0; i < containerParents.length; i++) {
                    initObserver(containerParents[i]);
                }
            }

            // Observe container
            initObserver(s.container[0], {childList: false});

            // Observe wrapper
            initObserver(s.wrapper[0], {attributes: false});
        };
        s.disconnectObservers = function () {
            for (var i = 0; i < s.observers.length; i++) {
                s.observers[i].disconnect();
            }
            s.observers = [];
        };

        s.updateLoop = function(){
          var currentSlide = s.slides.eq(s.activeIndex);
          if ( angular.element(currentSlide).hasClass(s.params.slideDuplicateClass) ){
            // we're on a duplicate, so slide to the non-duplicate
            var swiperSlideIndex = angular.element(currentSlide).attr("data-swiper-slide-index");
            var slides = s.wrapper.children('.' + s.params.slideClass);
            for ( var i = 0; i < slides.length; i++ ){
              if ( !angular.element(slides[i]).hasClass(s.params.slideDuplicateClass) && angular.element(slides[i]).attr("data-swiper-slide-index") === swiperSlideIndex ){
                s.slideTo(i, 0, false, true);
                break;
              }
            }
            // if we needed to switch slides, we did that.  So, now call the createLoop function internally
            setTimeout(function(){
              s.createLoop();
            }, 50);
          }
        }

        s.getSlideDataIndex = function(slideIndex){
          // this is an Ionic custom function
          // Swiper loops utilize duplicate DOM elements for slides when in a loop
          // which means that we cannot rely on the actual slide index for our events
          // because index 0 does not necessarily point to index 0
          // and index n+1 does not necessarily point to the expected piece of data
          // therefore, rather than using the actual slide index we should
          // use the data index that swiper includes as an attribute on the dom elements
          // because this is what will be meaningful to the consumer of our events
          var slide = s.slides.eq(slideIndex);
          var attributeIndex = angular.element(slide).attr("data-swiper-slide-index");
          return parseInt(attributeIndex);
        }

        /*=========================
          Loop
          ===========================*/
        // Create looped slides
        s.createLoop = function () {
          //console.log("Slider create loop method");
            //var toRemove = s.wrapper.children('.' + s.params.slideClass + '.' + s.params.slideDuplicateClass);
            //angular.element(toRemove).remove();
            s.wrapper.children('.' + s.params.slideClass + '.' + s.params.slideDuplicateClass).remove();

            var slides = s.wrapper.children('.' + s.params.slideClass);

            if(s.params.slidesPerView === 'auto' && !s.params.loopedSlides) s.params.loopedSlides = slides.length;

            s.loopedSlides = parseInt(s.params.loopedSlides || s.params.slidesPerView, 10);
            s.loopedSlides = s.loopedSlides + s.params.loopAdditionalSlides;
            if (s.loopedSlides > slides.length) {
                s.loopedSlides = slides.length;
            }

            var prependSlides = [], appendSlides = [], i, scope, newNode;
            slides.each(function (index, el) {
                var slide = $(this);
                if (index < s.loopedSlides) appendSlides.push(el);
                if (index < slides.length && index >= slides.length - s.loopedSlides) prependSlides.push(el);
                slide.attr('data-swiper-slide-index', index);
            });
            for (i = 0; i < appendSlides.length; i++) {

              newNode = angular.element(appendSlides[i]).clone().addClass(s.params.slideDuplicateClass);
              newNode.removeAttr('ng-transclude');
              newNode.removeAttr('ng-repeat');
              scope = angular.element(appendSlides[i]).scope();
              newNode = $compile(newNode)(scope);
              angular.element(s.wrapper).append(newNode);
              //s.wrapper.append($(appendSlides[i].cloneNode(true)).addClass(s.params.slideDuplicateClass));
            }
            for (i = prependSlides.length - 1; i >= 0; i--) {
              //s.wrapper.prepend($(prependSlides[i].cloneNode(true)).addClass(s.params.slideDuplicateClass));

              newNode = angular.element(prependSlides[i]).clone().addClass(s.params.slideDuplicateClass);
              newNode.removeAttr('ng-transclude');
              newNode.removeAttr('ng-repeat');

              scope = angular.element(prependSlides[i]).scope();
              newNode = $compile(newNode)(scope);
              angular.element(s.wrapper).prepend(newNode);
            }
        };
        s.destroyLoop = function () {
            s.wrapper.children('.' + s.params.slideClass + '.' + s.params.slideDuplicateClass).remove();
            s.slides.removeAttr('data-swiper-slide-index');
        };
        s.fixLoop = function () {
            var newIndex;
            //Fix For Negative Oversliding
            if (s.activeIndex < s.loopedSlides) {
                newIndex = s.slides.length - s.loopedSlides * 3 + s.activeIndex;
                newIndex = newIndex + s.loopedSlides;
                s.slideTo(newIndex, 0, false, true);
            }
            //Fix For Positive Oversliding
            else if ((s.params.slidesPerView === 'auto' && s.activeIndex >= s.loopedSlides * 2) || (s.activeIndex > s.slides.length - s.params.slidesPerView * 2)) {
                newIndex = -s.slides.length + s.activeIndex + s.loopedSlides;
                newIndex = newIndex + s.loopedSlides;
                s.slideTo(newIndex, 0, false, true);
            }
        };
        /*=========================
          Append/Prepend/Remove Slides
          ===========================*/
        s.appendSlide = function (slides) {
            if (s.params.loop) {
                s.destroyLoop();
            }
            if (typeof slides === 'object' && slides.length) {
                for (var i = 0; i < slides.length; i++) {
                    if (slides[i]) s.wrapper.append(slides[i]);
                }
            }
            else {
                s.wrapper.append(slides);
            }
            if (s.params.loop) {
                s.createLoop();
            }
            if (!(s.params.observer && s.support.observer)) {
                s.update(true);
            }
        };
        s.prependSlide = function (slides) {
            if (s.params.loop) {
                s.destroyLoop();
            }
            var newActiveIndex = s.activeIndex + 1;
            if (typeof slides === 'object' && slides.length) {
                for (var i = 0; i < slides.length; i++) {
                    if (slides[i]) s.wrapper.prepend(slides[i]);
                }
                newActiveIndex = s.activeIndex + slides.length;
            }
            else {
                s.wrapper.prepend(slides);
            }
            if (s.params.loop) {
                s.createLoop();
            }
            if (!(s.params.observer && s.support.observer)) {
                s.update(true);
            }
            s.slideTo(newActiveIndex, 0, false);
        };
        s.removeSlide = function (slidesIndexes) {
            if (s.params.loop) {
                s.destroyLoop();
                s.slides = s.wrapper.children('.' + s.params.slideClass);
            }
            var newActiveIndex = s.activeIndex,
                indexToRemove;
            if (typeof slidesIndexes === 'object' && slidesIndexes.length) {
                for (var i = 0; i < slidesIndexes.length; i++) {
                    indexToRemove = slidesIndexes[i];
                    if (s.slides[indexToRemove]) s.slides.eq(indexToRemove).remove();
                    if (indexToRemove < newActiveIndex) newActiveIndex--;
                }
                newActiveIndex = Math.max(newActiveIndex, 0);
            }
            else {
                indexToRemove = slidesIndexes;
                if (s.slides[indexToRemove]) s.slides.eq(indexToRemove).remove();
                if (indexToRemove < newActiveIndex) newActiveIndex--;
                newActiveIndex = Math.max(newActiveIndex, 0);
            }

            if (s.params.loop) {
                s.createLoop();
            }

            if (!(s.params.observer && s.support.observer)) {
                s.update(true);
            }
            if (s.params.loop) {
                s.slideTo(newActiveIndex + s.loopedSlides, 0, false);
            }
            else {
                s.slideTo(newActiveIndex, 0, false);
            }

        };
        s.removeAllSlides = function () {
            var slidesIndexes = [];
            for (var i = 0; i < s.slides.length; i++) {
                slidesIndexes.push(i);
            }
            s.removeSlide(slidesIndexes);
        };


        /*=========================
          Effects
          ===========================*/
        s.effects = {
            fade: {
                setTranslate: function () {
                    for (var i = 0; i < s.slides.length; i++) {
                        var slide = s.slides.eq(i);
                        var offset = slide[0].swiperSlideOffset;
                        var tx = -offset;
                        if (!s.params.virtualTranslate) tx = tx - s.translate;
                        var ty = 0;
                        if (!isH()) {
                            ty = tx;
                            tx = 0;
                        }
                        var slideOpacity = s.params.fade.crossFade ?
                                Math.max(1 - Math.abs(slide[0].progress), 0) :
                                1 + Math.min(Math.max(slide[0].progress, -1), 0);
                        slide
                            .css({
                                opacity: slideOpacity
                            })
                            .transform('translate3d(' + tx + 'px, ' + ty + 'px, 0px)');

                    }

                },
                setTransition: function (duration) {
                    s.slides.transition(duration);
                    if (s.params.virtualTranslate && duration !== 0) {
                        var eventTriggered = false;
                        s.slides.transitionEnd(function () {
                            if (eventTriggered) return;
                            if (!s) return;
                            eventTriggered = true;
                            s.animating = false;
                            var triggerEvents = ['webkitTransitionEnd', 'transitionend', 'oTransitionEnd', 'MSTransitionEnd', 'msTransitionEnd'];
                            for (var i = 0; i < triggerEvents.length; i++) {
                                s.wrapper.trigger(triggerEvents[i]);
                            }
                        });
                    }
                }
            },
            cube: {
                setTranslate: function () {
                    var wrapperRotate = 0, cubeShadow;
                    if (s.params.cube.shadow) {
                        if (isH()) {
                            cubeShadow = s.wrapper.find('.swiper-cube-shadow');
                            if (cubeShadow.length === 0) {
                                cubeShadow = $('<div class="swiper-cube-shadow"></div>');
                                s.wrapper.append(cubeShadow);
                            }
                            cubeShadow.css({height: s.width + 'px'});
                        }
                        else {
                            cubeShadow = s.container.find('.swiper-cube-shadow');
                            if (cubeShadow.length === 0) {
                                cubeShadow = $('<div class="swiper-cube-shadow"></div>');
                                s.container.append(cubeShadow);
                            }
                        }
                    }
                    for (var i = 0; i < s.slides.length; i++) {
                        var slide = s.slides.eq(i);
                        var slideAngle = i * 90;
                        var round = Math.floor(slideAngle / 360);
                        if (s.rtl) {
                            slideAngle = -slideAngle;
                            round = Math.floor(-slideAngle / 360);
                        }
                        var progress = Math.max(Math.min(slide[0].progress, 1), -1);
                        var tx = 0, ty = 0, tz = 0;
                        if (i % 4 === 0) {
                            tx = - round * 4 * s.size;
                            tz = 0;
                        }
                        else if ((i - 1) % 4 === 0) {
                            tx = 0;
                            tz = - round * 4 * s.size;
                        }
                        else if ((i - 2) % 4 === 0) {
                            tx = s.size + round * 4 * s.size;
                            tz = s.size;
                        }
                        else if ((i - 3) % 4 === 0) {
                            tx = - s.size;
                            tz = 3 * s.size + s.size * 4 * round;
                        }
                        if (s.rtl) {
                            tx = -tx;
                        }

                        if (!isH()) {
                            ty = tx;
                            tx = 0;
                        }

                        var transform = 'rotateX(' + (isH() ? 0 : -slideAngle) + 'deg) rotateY(' + (isH() ? slideAngle : 0) + 'deg) translate3d(' + tx + 'px, ' + ty + 'px, ' + tz + 'px)';
                        if (progress <= 1 && progress > -1) {
                            wrapperRotate = i * 90 + progress * 90;
                            if (s.rtl) wrapperRotate = -i * 90 - progress * 90;
                        }
                        slide.transform(transform);
                        if (s.params.cube.slideShadows) {
                            //Set shadows
                            var shadowBefore = isH() ? slide.find('.swiper-slide-shadow-left') : slide.find('.swiper-slide-shadow-top');
                            var shadowAfter = isH() ? slide.find('.swiper-slide-shadow-right') : slide.find('.swiper-slide-shadow-bottom');
                            if (shadowBefore.length === 0) {
                                shadowBefore = $('<div class="swiper-slide-shadow-' + (isH() ? 'left' : 'top') + '"></div>');
                                slide.append(shadowBefore);
                            }
                            if (shadowAfter.length === 0) {
                                shadowAfter = $('<div class="swiper-slide-shadow-' + (isH() ? 'right' : 'bottom') + '"></div>');
                                slide.append(shadowAfter);
                            }
                            var shadowOpacity = slide[0].progress;
                            if (shadowBefore.length) shadowBefore[0].style.opacity = -slide[0].progress;
                            if (shadowAfter.length) shadowAfter[0].style.opacity = slide[0].progress;
                        }
                    }
                    s.wrapper.css({
                        '-webkit-transform-origin': '50% 50% -' + (s.size / 2) + 'px',
                        '-moz-transform-origin': '50% 50% -' + (s.size / 2) + 'px',
                        '-ms-transform-origin': '50% 50% -' + (s.size / 2) + 'px',
                        'transform-origin': '50% 50% -' + (s.size / 2) + 'px'
                    });

                    if (s.params.cube.shadow) {
                        if (isH()) {
                            cubeShadow.transform('translate3d(0px, ' + (s.width / 2 + s.params.cube.shadowOffset) + 'px, ' + (-s.width / 2) + 'px) rotateX(90deg) rotateZ(0deg) scale(' + (s.params.cube.shadowScale) + ')');
                        }
                        else {
                            var shadowAngle = Math.abs(wrapperRotate) - Math.floor(Math.abs(wrapperRotate) / 90) * 90;
                            var multiplier = 1.5 - (Math.sin(shadowAngle * 2 * Math.PI / 360) / 2 + Math.cos(shadowAngle * 2 * Math.PI / 360) / 2);
                            var scale1 = s.params.cube.shadowScale,
                                scale2 = s.params.cube.shadowScale / multiplier,
                                offset = s.params.cube.shadowOffset;
                            cubeShadow.transform('scale3d(' + scale1 + ', 1, ' + scale2 + ') translate3d(0px, ' + (s.height / 2 + offset) + 'px, ' + (-s.height / 2 / scale2) + 'px) rotateX(-90deg)');
                        }
                    }
                    var zFactor = (s.isSafari || s.isUiWebView) ? (-s.size / 2) : 0;
                    s.wrapper.transform('translate3d(0px,0,' + zFactor + 'px) rotateX(' + (isH() ? 0 : wrapperRotate) + 'deg) rotateY(' + (isH() ? -wrapperRotate : 0) + 'deg)');
                },
                setTransition: function (duration) {
                    s.slides.transition(duration).find('.swiper-slide-shadow-top, .swiper-slide-shadow-right, .swiper-slide-shadow-bottom, .swiper-slide-shadow-left').transition(duration);
                    if (s.params.cube.shadow && !isH()) {
                        s.container.find('.swiper-cube-shadow').transition(duration);
                    }
                }
            },
            coverflow: {
                setTranslate: function () {
                    var transform = s.translate;
                    var center = isH() ? -transform + s.width / 2 : -transform + s.height / 2;
                    var rotate = isH() ? s.params.coverflow.rotate: -s.params.coverflow.rotate;
                    var translate = s.params.coverflow.depth;
                    //Each slide offset from center
                    for (var i = 0, length = s.slides.length; i < length; i++) {
                        var slide = s.slides.eq(i);
                        var slideSize = s.slidesSizesGrid[i];
                        var slideOffset = slide[0].swiperSlideOffset;
                        var offsetMultiplier = (center - slideOffset - slideSize / 2) / slideSize * s.params.coverflow.modifier;

                        var rotateY = isH() ? rotate * offsetMultiplier : 0;
                        var rotateX = isH() ? 0 : rotate * offsetMultiplier;
                        // var rotateZ = 0
                        var translateZ = -translate * Math.abs(offsetMultiplier);

                        var translateY = isH() ? 0 : s.params.coverflow.stretch * (offsetMultiplier);
                        var translateX = isH() ? s.params.coverflow.stretch * (offsetMultiplier) : 0;

                        //Fix for ultra small values
                        if (Math.abs(translateX) < 0.001) translateX = 0;
                        if (Math.abs(translateY) < 0.001) translateY = 0;
                        if (Math.abs(translateZ) < 0.001) translateZ = 0;
                        if (Math.abs(rotateY) < 0.001) rotateY = 0;
                        if (Math.abs(rotateX) < 0.001) rotateX = 0;

                        var slideTransform = 'translate3d(' + translateX + 'px,' + translateY + 'px,' + translateZ + 'px)  rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg)';

                        slide.transform(slideTransform);
                        slide[0].style.zIndex = -Math.abs(Math.round(offsetMultiplier)) + 1;
                        if (s.params.coverflow.slideShadows) {
                            //Set shadows
                            var shadowBefore = isH() ? slide.find('.swiper-slide-shadow-left') : slide.find('.swiper-slide-shadow-top');
                            var shadowAfter = isH() ? slide.find('.swiper-slide-shadow-right') : slide.find('.swiper-slide-shadow-bottom');
                            if (shadowBefore.length === 0) {
                                shadowBefore = $('<div class="swiper-slide-shadow-' + (isH() ? 'left' : 'top') + '"></div>');
                                slide.append(shadowBefore);
                            }
                            if (shadowAfter.length === 0) {
                                shadowAfter = $('<div class="swiper-slide-shadow-' + (isH() ? 'right' : 'bottom') + '"></div>');
                                slide.append(shadowAfter);
                            }
                            if (shadowBefore.length) shadowBefore[0].style.opacity = offsetMultiplier > 0 ? offsetMultiplier : 0;
                            if (shadowAfter.length) shadowAfter[0].style.opacity = (-offsetMultiplier) > 0 ? -offsetMultiplier : 0;
                        }
                    }

                    //Set correct perspective for IE10
                    if (s.browser.ie) {
                        var ws = s.wrapper[0].style;
                        ws.perspectiveOrigin = center + 'px 50%';
                    }
                },
                setTransition: function (duration) {
                    s.slides.transition(duration).find('.swiper-slide-shadow-top, .swiper-slide-shadow-right, .swiper-slide-shadow-bottom, .swiper-slide-shadow-left').transition(duration);
                }
            }
        };

        /*=========================
          Images Lazy Loading
          ===========================*/
        s.lazy = {
            initialImageLoaded: false,
            loadImageInSlide: function (index, loadInDuplicate) {
                if (typeof index === 'undefined') return;
                if (typeof loadInDuplicate === 'undefined') loadInDuplicate = true;
                if (s.slides.length === 0) return;

                var slide = s.slides.eq(index);
                var img = slide.find('.swiper-lazy:not(.swiper-lazy-loaded):not(.swiper-lazy-loading)');
                if (slide.hasClass('swiper-lazy') && !slide.hasClass('swiper-lazy-loaded') && !slide.hasClass('swiper-lazy-loading')) {
                    img = img.add(slide[0]);
                }
                if (img.length === 0) return;

                img.each(function () {
                    var _img = $(this);
                    _img.addClass('swiper-lazy-loading');
                    var background = _img.attr('data-background');
                    var src = _img.attr('data-src'),
                        srcset = _img.attr('data-srcset');
                    s.loadImage(_img[0], (src || background), srcset, false, function () {
                        if (background) {
                            _img.css('background-image', 'url(' + background + ')');
                            _img.removeAttr('data-background');
                        }
                        else {
                            if (srcset) {
                                _img.attr('srcset', srcset);
                                _img.removeAttr('data-srcset');
                            }
                            if (src) {
                                _img.attr('src', src);
                                _img.removeAttr('data-src');
                            }

                        }

                        _img.addClass('swiper-lazy-loaded').removeClass('swiper-lazy-loading');
                        slide.find('.swiper-lazy-preloader, .preloader').remove();
                        if (s.params.loop && loadInDuplicate) {
                            var slideOriginalIndex = slide.attr('data-swiper-slide-index');
                            if (slide.hasClass(s.params.slideDuplicateClass)) {
                                var originalSlide = s.wrapper.children('[data-swiper-slide-index="' + slideOriginalIndex + '"]:not(.' + s.params.slideDuplicateClass + ')');
                                s.lazy.loadImageInSlide(originalSlide.index(), false);
                            }
                            else {
                                var duplicatedSlide = s.wrapper.children('.' + s.params.slideDuplicateClass + '[data-swiper-slide-index="' + slideOriginalIndex + '"]');
                                s.lazy.loadImageInSlide(duplicatedSlide.index(), false);
                            }
                        }
                        s.emit('onLazyImageReady', s, slide[0], _img[0]);
                    });

                    s.emit('onLazyImageLoad', s, slide[0], _img[0]);
                });

            },
            load: function () {
                var i;
                if (s.params.watchSlidesVisibility) {
                    s.wrapper.children('.' + s.params.slideVisibleClass).each(function () {
                        s.lazy.loadImageInSlide($(this).index());
                    });
                }
                else {
                    if (s.params.slidesPerView > 1) {
                        for (i = s.activeIndex; i < s.activeIndex + s.params.slidesPerView ; i++) {
                            if (s.slides[i]) s.lazy.loadImageInSlide(i);
                        }
                    }
                    else {
                        s.lazy.loadImageInSlide(s.activeIndex);
                    }
                }
                if (s.params.lazyLoadingInPrevNext) {
                    if (s.params.slidesPerView > 1) {
                        // Next Slides
                        for (i = s.activeIndex + s.params.slidesPerView; i < s.activeIndex + s.params.slidesPerView + s.params.slidesPerView; i++) {
                            if (s.slides[i]) s.lazy.loadImageInSlide(i);
                        }
                        // Prev Slides
                        for (i = s.activeIndex - s.params.slidesPerView; i < s.activeIndex ; i++) {
                            if (s.slides[i]) s.lazy.loadImageInSlide(i);
                        }
                    }
                    else {
                        var nextSlide = s.wrapper.children('.' + s.params.slideNextClass);
                        if (nextSlide.length > 0) s.lazy.loadImageInSlide(nextSlide.index());

                        var prevSlide = s.wrapper.children('.' + s.params.slidePrevClass);
                        if (prevSlide.length > 0) s.lazy.loadImageInSlide(prevSlide.index());
                    }
                }
            },
            onTransitionStart: function () {
                if (s.params.lazyLoading) {
                    if (s.params.lazyLoadingOnTransitionStart || (!s.params.lazyLoadingOnTransitionStart && !s.lazy.initialImageLoaded)) {
                        s.lazy.load();
                    }
                }
            },
            onTransitionEnd: function () {
                if (s.params.lazyLoading && !s.params.lazyLoadingOnTransitionStart) {
                    s.lazy.load();
                }
            }
        };


        /*=========================
          Scrollbar
          ===========================*/
        s.scrollbar = {
            isTouched: false,
            setDragPosition: function (e) {
                var sb = s.scrollbar;
                var x = 0, y = 0;
                var translate;
                var pointerPosition = isH() ?
                    ((e.type === 'touchstart' || e.type === 'touchmove') ? e.targetTouches[0].pageX : e.pageX || e.clientX) :
                    ((e.type === 'touchstart' || e.type === 'touchmove') ? e.targetTouches[0].pageY : e.pageY || e.clientY) ;
                var position = (pointerPosition) - sb.track.offset()[isH() ? 'left' : 'top'] - sb.dragSize / 2;
                var positionMin = -s.minTranslate() * sb.moveDivider;
                var positionMax = -s.maxTranslate() * sb.moveDivider;
                if (position < positionMin) {
                    position = positionMin;
                }
                else if (position > positionMax) {
                    position = positionMax;
                }
                position = -position / sb.moveDivider;
                s.updateProgress(position);
                s.setWrapperTranslate(position, true);
            },
            dragStart: function (e) {
                var sb = s.scrollbar;
                sb.isTouched = true;
                e.preventDefault();
                e.stopPropagation();

                sb.setDragPosition(e);
                clearTimeout(sb.dragTimeout);

                sb.track.transition(0);
                if (s.params.scrollbarHide) {
                    sb.track.css('opacity', 1);
                }
                s.wrapper.transition(100);
                sb.drag.transition(100);
                s.emit('onScrollbarDragStart', s);
            },
            dragMove: function (e) {
                var sb = s.scrollbar;
                if (!sb.isTouched) return;
                if (e.preventDefault) e.preventDefault();
                else e.returnValue = false;
                sb.setDragPosition(e);
                s.wrapper.transition(0);
                sb.track.transition(0);
                sb.drag.transition(0);
                s.emit('onScrollbarDragMove', s);
            },
            dragEnd: function (e) {
                var sb = s.scrollbar;
                if (!sb.isTouched) return;
                sb.isTouched = false;
                if (s.params.scrollbarHide) {
                    clearTimeout(sb.dragTimeout);
                    sb.dragTimeout = setTimeout(function () {
                        sb.track.css('opacity', 0);
                        sb.track.transition(400);
                    }, 1000);

                }
                s.emit('onScrollbarDragEnd', s);
                if (s.params.scrollbarSnapOnRelease) {
                    s.slideReset();
                }
            },
            enableDraggable: function () {
                var sb = s.scrollbar;
                var target = s.support.touch ? sb.track : document;
                $(sb.track).on(s.touchEvents.start, sb.dragStart);
                $(target).on(s.touchEvents.move, sb.dragMove);
                $(target).on(s.touchEvents.end, sb.dragEnd);
            },
            disableDraggable: function () {
                var sb = s.scrollbar;
                var target = s.support.touch ? sb.track : document;
                $(sb.track).off(s.touchEvents.start, sb.dragStart);
                $(target).off(s.touchEvents.move, sb.dragMove);
                $(target).off(s.touchEvents.end, sb.dragEnd);
            },
            set: function () {
                if (!s.params.scrollbar) return;
                var sb = s.scrollbar;
                sb.track = $(s.params.scrollbar);
                sb.drag = sb.track.find('.swiper-scrollbar-drag');
                if (sb.drag.length === 0) {
                    sb.drag = $('<div class="swiper-scrollbar-drag"></div>');
                    sb.track.append(sb.drag);
                }
                sb.drag[0].style.width = '';
                sb.drag[0].style.height = '';
                sb.trackSize = isH() ? sb.track[0].offsetWidth : sb.track[0].offsetHeight;

                sb.divider = s.size / s.virtualSize;
                sb.moveDivider = sb.divider * (sb.trackSize / s.size);
                sb.dragSize = sb.trackSize * sb.divider;

                if (isH()) {
                    sb.drag[0].style.width = sb.dragSize + 'px';
                }
                else {
                    sb.drag[0].style.height = sb.dragSize + 'px';
                }

                if (sb.divider >= 1) {
                    sb.track[0].style.display = 'none';
                }
                else {
                    sb.track[0].style.display = '';
                }
                if (s.params.scrollbarHide) {
                    sb.track[0].style.opacity = 0;
                }
            },
            setTranslate: function () {
                if (!s.params.scrollbar) return;
                var diff;
                var sb = s.scrollbar;
                var translate = s.translate || 0;
                var newPos;

                var newSize = sb.dragSize;
                newPos = (sb.trackSize - sb.dragSize) * s.progress;
                if (s.rtl && isH()) {
                    newPos = -newPos;
                    if (newPos > 0) {
                        newSize = sb.dragSize - newPos;
                        newPos = 0;
                    }
                    else if (-newPos + sb.dragSize > sb.trackSize) {
                        newSize = sb.trackSize + newPos;
                    }
                }
                else {
                    if (newPos < 0) {
                        newSize = sb.dragSize + newPos;
                        newPos = 0;
                    }
                    else if (newPos + sb.dragSize > sb.trackSize) {
                        newSize = sb.trackSize - newPos;
                    }
                }
                if (isH()) {
                    if (s.support.transforms3d) {
                        sb.drag.transform('translate3d(' + (newPos) + 'px, 0, 0)');
                    }
                    else {
                        sb.drag.transform('translateX(' + (newPos) + 'px)');
                    }
                    sb.drag[0].style.width = newSize + 'px';
                }
                else {
                    if (s.support.transforms3d) {
                        sb.drag.transform('translate3d(0px, ' + (newPos) + 'px, 0)');
                    }
                    else {
                        sb.drag.transform('translateY(' + (newPos) + 'px)');
                    }
                    sb.drag[0].style.height = newSize + 'px';
                }
                if (s.params.scrollbarHide) {
                    clearTimeout(sb.timeout);
                    sb.track[0].style.opacity = 1;
                    sb.timeout = setTimeout(function () {
                        sb.track[0].style.opacity = 0;
                        sb.track.transition(400);
                    }, 1000);
                }
            },
            setTransition: function (duration) {
                if (!s.params.scrollbar) return;
                s.scrollbar.drag.transition(duration);
            }
        };

        /*=========================
          Controller
          ===========================*/
        s.controller = {
            LinearSpline: function (x, y) {
                this.x = x;
                this.y = y;
                this.lastIndex = x.length - 1;
                // Given an x value (x2), return the expected y2 value:
                // (x1,y1) is the known point before given value,
                // (x3,y3) is the known point after given value.
                var i1, i3;
                var l = this.x.length;

                this.interpolate = function (x2) {
                    if (!x2) return 0;

                    // Get the indexes of x1 and x3 (the array indexes before and after given x2):
                    i3 = binarySearch(this.x, x2);
                    i1 = i3 - 1;

                    // We have our indexes i1 & i3, so we can calculate already:
                    // y2 := ((x2−x1) × (y3−y1)) ÷ (x3−x1) + y1
                    return ((x2 - this.x[i1]) * (this.y[i3] - this.y[i1])) / (this.x[i3] - this.x[i1]) + this.y[i1];
                };

                var binarySearch = (function() {
                    var maxIndex, minIndex, guess;
                    return function(array, val) {
                        minIndex = -1;
                        maxIndex = array.length;
                        while (maxIndex - minIndex > 1)
                            if (array[guess = maxIndex + minIndex >> 1] <= val) {
                                minIndex = guess;
                            } else {
                                maxIndex = guess;
                            }
                        return maxIndex;
                    };
                })();
            },
            //xxx: for now i will just save one spline function to to
            getInterpolateFunction: function(c){
                if(!s.controller.spline) s.controller.spline = s.params.loop ?
                    new s.controller.LinearSpline(s.slidesGrid, c.slidesGrid) :
                    new s.controller.LinearSpline(s.snapGrid, c.snapGrid);
            },
            setTranslate: function (translate, byController) {
               var controlled = s.params.control;
               var multiplier, controlledTranslate;
               function setControlledTranslate(c) {
                    // this will create an Interpolate function based on the snapGrids
                    // x is the Grid of the scrolled scroller and y will be the controlled scroller
                    // it makes sense to create this only once and recall it for the interpolation
                    // the function does a lot of value caching for performance
                    translate = c.rtl && c.params.direction === 'horizontal' ? -s.translate : s.translate;
                    if (s.params.controlBy === 'slide') {
                        s.controller.getInterpolateFunction(c);
                        // i am not sure why the values have to be multiplicated this way, tried to invert the snapGrid
                        // but it did not work out
                        controlledTranslate = -s.controller.spline.interpolate(-translate);
                    }

                    if(!controlledTranslate || s.params.controlBy === 'container'){
                        multiplier = (c.maxTranslate() - c.minTranslate()) / (s.maxTranslate() - s.minTranslate());
                        controlledTranslate = (translate - s.minTranslate()) * multiplier + c.minTranslate();
                    }

                    if (s.params.controlInverse) {
                        controlledTranslate = c.maxTranslate() - controlledTranslate;
                    }
                    c.updateProgress(controlledTranslate);
                    c.setWrapperTranslate(controlledTranslate, false, s);
                    c.updateActiveIndex();
               }
               if (s.isArray(controlled)) {
                   for (var i = 0; i < controlled.length; i++) {
                       if (controlled[i] !== byController && controlled[i] instanceof Swiper) {
                           setControlledTranslate(controlled[i]);
                       }
                   }
               }
               else if (controlled instanceof Swiper && byController !== controlled) {

                   setControlledTranslate(controlled);
               }
            },
            setTransition: function (duration, byController) {
                var controlled = s.params.control;
                var i;
                function setControlledTransition(c) {
                    c.setWrapperTransition(duration, s);
                    if (duration !== 0) {
                        c.onTransitionStart();
                        c.wrapper.transitionEnd(function(){
                            if (!controlled) return;
                            if (c.params.loop && s.params.controlBy === 'slide') {
                                c.fixLoop();
                            }
                            c.onTransitionEnd();

                        });
                    }
                }
                if (s.isArray(controlled)) {
                    for (i = 0; i < controlled.length; i++) {
                        if (controlled[i] !== byController && controlled[i] instanceof Swiper) {
                            setControlledTransition(controlled[i]);
                        }
                    }
                }
                else if (controlled instanceof Swiper && byController !== controlled) {
                    setControlledTransition(controlled);
                }
            }
        };

        /*=========================
          Hash Navigation
          ===========================*/
        s.hashnav = {
            init: function () {
                if (!s.params.hashnav) return;
                s.hashnav.initialized = true;
                var hash = document.location.hash.replace('#', '');
                if (!hash) return;
                var speed = 0;
                for (var i = 0, length = s.slides.length; i < length; i++) {
                    var slide = s.slides.eq(i);
                    var slideHash = slide.attr('data-hash');
                    if (slideHash === hash && !slide.hasClass(s.params.slideDuplicateClass)) {
                        var index = slide.index();
                        s.slideTo(index, speed, s.params.runCallbacksOnInit, true);
                    }
                }
            },
            setHash: function () {
                if (!s.hashnav.initialized || !s.params.hashnav) return;
                document.location.hash = s.slides.eq(s.activeIndex).attr('data-hash') || '';
            }
        };

        /*=========================
          Keyboard Control
          ===========================*/
        function handleKeyboard(e) {
            if (e.originalEvent) e = e.originalEvent; //jquery fix
            var kc = e.keyCode || e.charCode;
            // Directions locks
            if (!s.params.allowSwipeToNext && (isH() && kc === 39 || !isH() && kc === 40)) {
                return false;
            }
            if (!s.params.allowSwipeToPrev && (isH() && kc === 37 || !isH() && kc === 38)) {
                return false;
            }
            if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) {
                return;
            }
            if (document.activeElement && document.activeElement.nodeName && (document.activeElement.nodeName.toLowerCase() === 'input' || document.activeElement.nodeName.toLowerCase() === 'textarea')) {
                return;
            }
            if (kc === 37 || kc === 39 || kc === 38 || kc === 40) {
                var inView = false;
                //Check that swiper should be inside of visible area of window
                if (s.container.parents('.swiper-slide').length > 0 && s.container.parents('.swiper-slide-active').length === 0) {
                    return;
                }
                var windowScroll = {
                    left: window.pageXOffset,
                    top: window.pageYOffset
                };
                var windowWidth = window.innerWidth;
                var windowHeight = window.innerHeight;
                var swiperOffset = s.container.offset();
                if (s.rtl) swiperOffset.left = swiperOffset.left - s.container[0].scrollLeft;
                var swiperCoord = [
                    [swiperOffset.left, swiperOffset.top],
                    [swiperOffset.left + s.width, swiperOffset.top],
                    [swiperOffset.left, swiperOffset.top + s.height],
                    [swiperOffset.left + s.width, swiperOffset.top + s.height]
                ];
                for (var i = 0; i < swiperCoord.length; i++) {
                    var point = swiperCoord[i];
                    if (
                        point[0] >= windowScroll.left && point[0] <= windowScroll.left + windowWidth &&
                        point[1] >= windowScroll.top && point[1] <= windowScroll.top + windowHeight
                    ) {
                        inView = true;
                    }

                }
                if (!inView) return;
            }
            if (isH()) {
                if (kc === 37 || kc === 39) {
                    if (e.preventDefault) e.preventDefault();
                    else e.returnValue = false;
                }
                if ((kc === 39 && !s.rtl) || (kc === 37 && s.rtl)) s.slideNext();
                if ((kc === 37 && !s.rtl) || (kc === 39 && s.rtl)) s.slidePrev();
            }
            else {
                if (kc === 38 || kc === 40) {
                    if (e.preventDefault) e.preventDefault();
                    else e.returnValue = false;
                }
                if (kc === 40) s.slideNext();
                if (kc === 38) s.slidePrev();
            }
        }
        s.disableKeyboardControl = function () {
            s.params.keyboardControl = false;
            $(document).off('keydown', handleKeyboard);
        };
        s.enableKeyboardControl = function () {
            s.params.keyboardControl = true;
            $(document).on('keydown', handleKeyboard);
        };


        /*=========================
          Mousewheel Control
          ===========================*/
        s.mousewheel = {
            event: false,
            lastScrollTime: (new window.Date()).getTime()
        };
        if (s.params.mousewheelControl) {
            try {
                new window.WheelEvent('wheel');
                s.mousewheel.event = 'wheel';
            } catch (e) {}

            if (!s.mousewheel.event && document.onmousewheel !== undefined) {
                s.mousewheel.event = 'mousewheel';
            }
            if (!s.mousewheel.event) {
                s.mousewheel.event = 'DOMMouseScroll';
            }
        }
        function handleMousewheel(e) {
            if (e.originalEvent) e = e.originalEvent; //jquery fix
            var we = s.mousewheel.event;
            var delta = 0;
            var rtlFactor = s.rtl ? -1 : 1;
            //Opera & IE
            if (e.detail) delta = -e.detail;
            //WebKits
            else if (we === 'mousewheel') {
                if (s.params.mousewheelForceToAxis) {
                    if (isH()) {
                        if (Math.abs(e.wheelDeltaX) > Math.abs(e.wheelDeltaY)) delta = e.wheelDeltaX * rtlFactor;
                        else return;
                    }
                    else {
                        if (Math.abs(e.wheelDeltaY) > Math.abs(e.wheelDeltaX)) delta = e.wheelDeltaY;
                        else return;
                    }
                }
                else {
                    delta = Math.abs(e.wheelDeltaX) > Math.abs(e.wheelDeltaY) ? - e.wheelDeltaX * rtlFactor : - e.wheelDeltaY;
                }
            }
            //Old FireFox
            else if (we === 'DOMMouseScroll') delta = -e.detail;
            //New FireFox
            else if (we === 'wheel') {
                if (s.params.mousewheelForceToAxis) {
                    if (isH()) {
                        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) delta = -e.deltaX * rtlFactor;
                        else return;
                    }
                    else {
                        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) delta = -e.deltaY;
                        else return;
                    }
                }
                else {
                    delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? - e.deltaX * rtlFactor : - e.deltaY;
                }
            }
            if (delta === 0) return;

            if (s.params.mousewheelInvert) delta = -delta;

            if (!s.params.freeMode) {
                if ((new window.Date()).getTime() - s.mousewheel.lastScrollTime > 60) {
                    if (delta < 0) {
                        if ((!s.isEnd || s.params.loop) && !s.animating) s.slideNext();
                        else if (s.params.mousewheelReleaseOnEdges) return true;
                    }
                    else {
                        if ((!s.isBeginning || s.params.loop) && !s.animating) s.slidePrev();
                        else if (s.params.mousewheelReleaseOnEdges) return true;
                    }
                }
                s.mousewheel.lastScrollTime = (new window.Date()).getTime();

            }
            else {
                //Freemode or scrollContainer:
                var position = s.getWrapperTranslate() + delta * s.params.mousewheelSensitivity;
                var wasBeginning = s.isBeginning,
                    wasEnd = s.isEnd;

                if (position >= s.minTranslate()) position = s.minTranslate();
                if (position <= s.maxTranslate()) position = s.maxTranslate();

                s.setWrapperTransition(0);
                s.setWrapperTranslate(position);
                s.updateProgress();
                s.updateActiveIndex();

                if (!wasBeginning && s.isBeginning || !wasEnd && s.isEnd) {
                    s.updateClasses();
                }

                if (s.params.freeModeSticky) {
                    clearTimeout(s.mousewheel.timeout);
                    s.mousewheel.timeout = setTimeout(function () {
                        s.slideReset();
                    }, 300);
                }

                // Return page scroll on edge positions
                if (position === 0 || position === s.maxTranslate()) return;
            }
            if (s.params.autoplay) s.stopAutoplay();

            if (e.preventDefault) e.preventDefault();
            else e.returnValue = false;
            return false;
        }
        s.disableMousewheelControl = function () {
            if (!s.mousewheel.event) return false;
            s.container.off(s.mousewheel.event, handleMousewheel);
            return true;
        };

        s.enableMousewheelControl = function () {
            if (!s.mousewheel.event) return false;
            s.container.on(s.mousewheel.event, handleMousewheel);
            return true;
        };


        /*=========================
          Parallax
          ===========================*/
        function setParallaxTransform(el, progress) {
            el = $(el);
            var p, pX, pY;
            var rtlFactor = s.rtl ? -1 : 1;

            p = el.attr('data-swiper-parallax') || '0';
            pX = el.attr('data-swiper-parallax-x');
            pY = el.attr('data-swiper-parallax-y');
            if (pX || pY) {
                pX = pX || '0';
                pY = pY || '0';
            }
            else {
                if (isH()) {
                    pX = p;
                    pY = '0';
                }
                else {
                    pY = p;
                    pX = '0';
                }
            }

            if ((pX).indexOf('%') >= 0) {
                pX = parseInt(pX, 10) * progress * rtlFactor + '%';
            }
            else {
                pX = pX * progress * rtlFactor + 'px' ;
            }
            if ((pY).indexOf('%') >= 0) {
                pY = parseInt(pY, 10) * progress + '%';
            }
            else {
                pY = pY * progress + 'px' ;
            }

            el.transform('translate3d(' + pX + ', ' + pY + ',0px)');
        }
        s.parallax = {
            setTranslate: function () {
                s.container.children('[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y]').each(function(){
                    setParallaxTransform(this, s.progress);

                });
                s.slides.each(function () {
                    var slide = $(this);
                    slide.find('[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y]').each(function () {
                        var progress = Math.min(Math.max(slide[0].progress, -1), 1);
                        setParallaxTransform(this, progress);
                    });
                });
            },
            setTransition: function (duration) {
                if (typeof duration === 'undefined') duration = s.params.speed;
                s.container.find('[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y]').each(function(){
                    var el = $(this);
                    var parallaxDuration = parseInt(el.attr('data-swiper-parallax-duration'), 10) || duration;
                    if (duration === 0) parallaxDuration = 0;
                    el.transition(parallaxDuration);
                });
            }
        };


        /*=========================
          Plugins API. Collect all and init all plugins
          ===========================*/
        s._plugins = [];
        for (var plugin in s.plugins) {
            var p = s.plugins[plugin](s, s.params[plugin]);
            if (p) s._plugins.push(p);
        }
        // Method to call all plugins event/method
        s.callPlugins = function (eventName) {
            for (var i = 0; i < s._plugins.length; i++) {
                if (eventName in s._plugins[i]) {
                    s._plugins[i][eventName](arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]);
                }
            }
        };

        /*=========================
          Events/Callbacks/Plugins Emitter
          ===========================*/
        function normalizeEventName (eventName) {
            if (eventName.indexOf('on') !== 0) {
                if (eventName[0] !== eventName[0].toUpperCase()) {
                    eventName = 'on' + eventName[0].toUpperCase() + eventName.substring(1);
                }
                else {
                    eventName = 'on' + eventName;
                }
            }
            return eventName;
        }
        s.emitterEventListeners = {

        };
        s.emit = function (eventName) {
            // Trigger callbacks
            if (s.params[eventName]) {
                s.params[eventName](arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]);
            }
            var i;
            // Trigger events
            if (s.emitterEventListeners[eventName]) {
                for (i = 0; i < s.emitterEventListeners[eventName].length; i++) {
                    s.emitterEventListeners[eventName][i](arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]);
                }
            }
            // Trigger plugins
            if (s.callPlugins) s.callPlugins(eventName, arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]);
        };
        s.on = function (eventName, handler) {
            eventName = normalizeEventName(eventName);
            if (!s.emitterEventListeners[eventName]) s.emitterEventListeners[eventName] = [];
            s.emitterEventListeners[eventName].push(handler);
            return s;
        };
        s.off = function (eventName, handler) {
            var i;
            eventName = normalizeEventName(eventName);
            if (typeof handler === 'undefined') {
                // Remove all handlers for such event
                s.emitterEventListeners[eventName] = [];
                return s;
            }
            if (!s.emitterEventListeners[eventName] || s.emitterEventListeners[eventName].length === 0) return;
            for (i = 0; i < s.emitterEventListeners[eventName].length; i++) {
                if(s.emitterEventListeners[eventName][i] === handler) s.emitterEventListeners[eventName].splice(i, 1);
            }
            return s;
        };
        s.once = function (eventName, handler) {
            eventName = normalizeEventName(eventName);
            var _handler = function () {
                handler(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]);
                s.off(eventName, _handler);
            };
            s.on(eventName, _handler);
            return s;
        };

        // Accessibility tools
        s.a11y = {
            makeFocusable: function ($el) {
                $el.attr('tabIndex', '0');
                return $el;
            },
            addRole: function ($el, role) {
                $el.attr('role', role);
                return $el;
            },

            addLabel: function ($el, label) {
                $el.attr('aria-label', label);
                return $el;
            },

            disable: function ($el) {
                $el.attr('aria-disabled', true);
                return $el;
            },

            enable: function ($el) {
                $el.attr('aria-disabled', false);
                return $el;
            },

            onEnterKey: function (event) {
                if (event.keyCode !== 13) return;
                if ($(event.target).is(s.params.nextButton)) {
                    s.onClickNext(event);
                    if (s.isEnd) {
                        s.a11y.notify(s.params.lastSlideMessage);
                    }
                    else {
                        s.a11y.notify(s.params.nextSlideMessage);
                    }
                }
                else if ($(event.target).is(s.params.prevButton)) {
                    s.onClickPrev(event);
                    if (s.isBeginning) {
                        s.a11y.notify(s.params.firstSlideMessage);
                    }
                    else {
                        s.a11y.notify(s.params.prevSlideMessage);
                    }
                }
                if ($(event.target).is('.' + s.params.bulletClass)) {
                    $(event.target)[0].click();
                }
            },

            liveRegion: $('<span class="swiper-notification" aria-live="assertive" aria-atomic="true"></span>'),

            notify: function (message) {
                var notification = s.a11y.liveRegion;
                if (notification.length === 0) return;
                notification.html('');
                notification.html(message);
            },
            init: function () {
                // Setup accessibility
                if (s.params.nextButton) {
                    var nextButton = $(s.params.nextButton);
                    s.a11y.makeFocusable(nextButton);
                    s.a11y.addRole(nextButton, 'button');
                    s.a11y.addLabel(nextButton, s.params.nextSlideMessage);
                }
                if (s.params.prevButton) {
                    var prevButton = $(s.params.prevButton);
                    s.a11y.makeFocusable(prevButton);
                    s.a11y.addRole(prevButton, 'button');
                    s.a11y.addLabel(prevButton, s.params.prevSlideMessage);
                }

                $(s.container).append(s.a11y.liveRegion);
            },
            initPagination: function () {
                if (s.params.pagination && s.params.paginationClickable && s.bullets && s.bullets.length) {
                    s.bullets.each(function () {
                        var bullet = $(this);
                        s.a11y.makeFocusable(bullet);
                        s.a11y.addRole(bullet, 'button');
                        s.a11y.addLabel(bullet, s.params.paginationBulletMessage.replace(/{{index}}/, bullet.index() + 1));
                    });
                }
            },
            destroy: function () {
                if (s.a11y.liveRegion && s.a11y.liveRegion.length > 0) s.a11y.liveRegion.remove();
            }
        };


        /*=========================
          Init/Destroy
          ===========================*/
        s.init = function () {
            if (s.params.loop) s.createLoop();
            s.updateContainerSize();
            s.updateSlidesSize();
            s.updatePagination();
            if (s.params.scrollbar && s.scrollbar) {
                s.scrollbar.set();
                if (s.params.scrollbarDraggable) {
                    s.scrollbar.enableDraggable();
                }
            }
            if (s.params.effect !== 'slide' && s.effects[s.params.effect]) {
                if (!s.params.loop) s.updateProgress();
                s.effects[s.params.effect].setTranslate();
            }
            if (s.params.loop) {
                s.slideTo(s.params.initialSlide + s.loopedSlides, 0, s.params.runCallbacksOnInit);
            }
            else {
                s.slideTo(s.params.initialSlide, 0, s.params.runCallbacksOnInit);
                if (s.params.initialSlide === 0) {
                    if (s.parallax && s.params.parallax) s.parallax.setTranslate();
                    if (s.lazy && s.params.lazyLoading) {
                        s.lazy.load();
                        s.lazy.initialImageLoaded = true;
                    }
                }
            }
            s.attachEvents();
            if (s.params.observer && s.support.observer) {
                s.initObservers();
            }
            if (s.params.preloadImages && !s.params.lazyLoading) {
                s.preloadImages();
            }
            if (s.params.autoplay) {
                s.startAutoplay();
            }
            if (s.params.keyboardControl) {
                if (s.enableKeyboardControl) s.enableKeyboardControl();
            }
            if (s.params.mousewheelControl) {
                if (s.enableMousewheelControl) s.enableMousewheelControl();
            }
            if (s.params.hashnav) {
                if (s.hashnav) s.hashnav.init();
            }
            if (s.params.a11y && s.a11y) s.a11y.init();
            s.emit('onInit', s);
        };

        // Cleanup dynamic styles
        s.cleanupStyles = function () {
            // Container
            s.container.removeClass(s.classNames.join(' ')).removeAttr('style');

            // Wrapper
            s.wrapper.removeAttr('style');

            // Slides
            if (s.slides && s.slides.length) {
                s.slides
                    .removeClass([
                      s.params.slideVisibleClass,
                      s.params.slideActiveClass,
                      s.params.slideNextClass,
                      s.params.slidePrevClass
                    ].join(' '))
                    .removeAttr('style')
                    .removeAttr('data-swiper-column')
                    .removeAttr('data-swiper-row');
            }

            // Pagination/Bullets
            if (s.paginationContainer && s.paginationContainer.length) {
                s.paginationContainer.removeClass(s.params.paginationHiddenClass);
            }
            if (s.bullets && s.bullets.length) {
                s.bullets.removeClass(s.params.bulletActiveClass);
            }

            // Buttons
            if (s.params.prevButton) $(s.params.prevButton).removeClass(s.params.buttonDisabledClass);
            if (s.params.nextButton) $(s.params.nextButton).removeClass(s.params.buttonDisabledClass);

            // Scrollbar
            if (s.params.scrollbar && s.scrollbar) {
                if (s.scrollbar.track && s.scrollbar.track.length) s.scrollbar.track.removeAttr('style');
                if (s.scrollbar.drag && s.scrollbar.drag.length) s.scrollbar.drag.removeAttr('style');
            }
        };

        // Destroy
        s.destroy = function (deleteInstance, cleanupStyles) {
            // Detach evebts
            s.detachEvents();
            // Stop autoplay
            s.stopAutoplay();
            // Disable draggable
            if (s.params.scrollbar && s.scrollbar) {
                if (s.params.scrollbarDraggable) {
                    s.scrollbar.disableDraggable();
                }
            }
            // Destroy loop
            if (s.params.loop) {
                s.destroyLoop();
            }
            // Cleanup styles
            if (cleanupStyles) {
                s.cleanupStyles();
            }
            // Disconnect observer
            s.disconnectObservers();
            // Disable keyboard/mousewheel
            if (s.params.keyboardControl) {
                if (s.disableKeyboardControl) s.disableKeyboardControl();
            }
            if (s.params.mousewheelControl) {
                if (s.disableMousewheelControl) s.disableMousewheelControl();
            }
            // Disable a11y
            if (s.params.a11y && s.a11y) s.a11y.destroy();
            // Destroy callback
            s.emit('onDestroy');
            // Delete instance
            if (deleteInstance !== false) s = null;
        };

        s.init();



        // Return swiper instance
        return s;
    };


    /*==================================================
        Prototype
    ====================================================*/
    Swiper.prototype = {
        isSafari: (function () {
            var ua = navigator.userAgent.toLowerCase();
            return (ua.indexOf('safari') >= 0 && ua.indexOf('chrome') < 0 && ua.indexOf('android') < 0);
        })(),
        isUiWebView: /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent),
        isArray: function (arr) {
            return Object.prototype.toString.apply(arr) === '[object Array]';
        },
        /*==================================================
        Browser
        ====================================================*/
        browser: {
            ie: window.navigator.pointerEnabled || window.navigator.msPointerEnabled,
            ieTouch: (window.navigator.msPointerEnabled && window.navigator.msMaxTouchPoints > 1) || (window.navigator.pointerEnabled && window.navigator.maxTouchPoints > 1)
        },
        /*==================================================
        Devices
        ====================================================*/
        device: (function () {
            var ua = navigator.userAgent;
            var android = ua.match(/(Android);?[\s\/]+([\d.]+)?/);
            var ipad = ua.match(/(iPad).*OS\s([\d_]+)/);
            var ipod = ua.match(/(iPod)(.*OS\s([\d_]+))?/);
            var iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/);
            return {
                ios: ipad || iphone || ipod,
                android: android
            };
        })(),
        /*==================================================
        Feature Detection
        ====================================================*/
        support: {
            touch : (window.Modernizr && Modernizr.touch === true) || (function () {
                return !!(('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch);
            })(),

            transforms3d : (window.Modernizr && Modernizr.csstransforms3d === true) || (function () {
                var div = document.createElement('div').style;
                return ('webkitPerspective' in div || 'MozPerspective' in div || 'OPerspective' in div || 'MsPerspective' in div || 'perspective' in div);
            })(),

            flexbox: (function () {
                var div = document.createElement('div').style;
                var styles = ('alignItems webkitAlignItems webkitBoxAlign msFlexAlign mozBoxAlign webkitFlexDirection msFlexDirection mozBoxDirection mozBoxOrient webkitBoxDirection webkitBoxOrient').split(' ');
                for (var i = 0; i < styles.length; i++) {
                    if (styles[i] in div) return true;
                }
            })(),

            observer: (function () {
                return ('MutationObserver' in window || 'WebkitMutationObserver' in window);
            })()
        },
        /*==================================================
        Plugins
        ====================================================*/
        plugins: {}
    };


    /*===========================
    Dom7 Library
    ===========================*/
    var Dom7 = (function () {
        var Dom7 = function (arr) {
            var _this = this, i = 0;
            // Create array-like object
            for (i = 0; i < arr.length; i++) {
                _this[i] = arr[i];
            }
            _this.length = arr.length;
            // Return collection with methods
            return this;
        };
        var $ = function (selector, context) {
            var arr = [], i = 0;
            if (selector && !context) {
                if (selector instanceof Dom7) {
                    return selector;
                }
            }
            if (selector) {
                // String
                if (typeof selector === 'string') {
                    var els, tempParent, html = selector.trim();
                    if (html.indexOf('<') >= 0 && html.indexOf('>') >= 0) {
                        var toCreate = 'div';
                        if (html.indexOf('<li') === 0) toCreate = 'ul';
                        if (html.indexOf('<tr') === 0) toCreate = 'tbody';
                        if (html.indexOf('<td') === 0 || html.indexOf('<th') === 0) toCreate = 'tr';
                        if (html.indexOf('<tbody') === 0) toCreate = 'table';
                        if (html.indexOf('<option') === 0) toCreate = 'select';
                        tempParent = document.createElement(toCreate);
                        tempParent.innerHTML = selector;
                        for (i = 0; i < tempParent.childNodes.length; i++) {
                            arr.push(tempParent.childNodes[i]);
                        }
                    }
                    else {
                        if (!context && selector[0] === '#' && !selector.match(/[ .<>:~]/)) {
                            // Pure ID selector
                            els = [document.getElementById(selector.split('#')[1])];
                        }
                        else {
                            // Other selectors
                            els = (context || document).querySelectorAll(selector);
                        }
                        for (i = 0; i < els.length; i++) {
                            if (els[i]) arr.push(els[i]);
                        }
                    }
                }
                // Node/element
                else if (selector.nodeType || selector === window || selector === document) {
                    arr.push(selector);
                }
                //Array of elements or instance of Dom
                else if (selector.length > 0 && selector[0].nodeType) {
                    for (i = 0; i < selector.length; i++) {
                        arr.push(selector[i]);
                    }
                }
            }
            return new Dom7(arr);
        };
        Dom7.prototype = {
            // Classes and attriutes
            addClass: function (className) {
                if (typeof className === 'undefined') {
                    return this;
                }
                var classes = className.split(' ');
                for (var i = 0; i < classes.length; i++) {
                    for (var j = 0; j < this.length; j++) {
                        this[j].classList.add(classes[i]);
                    }
                }
                return this;
            },
            removeClass: function (className) {
                var classes = className.split(' ');
                for (var i = 0; i < classes.length; i++) {
                    for (var j = 0; j < this.length; j++) {
                        this[j].classList.remove(classes[i]);
                    }
                }
                return this;
            },
            hasClass: function (className) {
                if (!this[0]) return false;
                else return this[0].classList.contains(className);
            },
            toggleClass: function (className) {
                var classes = className.split(' ');
                for (var i = 0; i < classes.length; i++) {
                    for (var j = 0; j < this.length; j++) {
                        this[j].classList.toggle(classes[i]);
                    }
                }
                return this;
            },
            attr: function (attrs, value) {
                if (arguments.length === 1 && typeof attrs === 'string') {
                    // Get attr
                    if (this[0]) return this[0].getAttribute(attrs);
                    else return undefined;
                }
                else {
                    // Set attrs
                    for (var i = 0; i < this.length; i++) {
                        if (arguments.length === 2) {
                            // String
                            this[i].setAttribute(attrs, value);
                        }
                        else {
                            // Object
                            for (var attrName in attrs) {
                                this[i][attrName] = attrs[attrName];
                                this[i].setAttribute(attrName, attrs[attrName]);
                            }
                        }
                    }
                    return this;
                }
            },
            removeAttr: function (attr) {
                for (var i = 0; i < this.length; i++) {
                    this[i].removeAttribute(attr);
                }
                return this;
            },
            data: function (key, value) {
                if (typeof value === 'undefined') {
                    // Get value
                    if (this[0]) {
                        var dataKey = this[0].getAttribute('data-' + key);
                        if (dataKey) return dataKey;
                        else if (this[0].dom7ElementDataStorage && (key in this[0].dom7ElementDataStorage)) return this[0].dom7ElementDataStorage[key];
                        else return undefined;
                    }
                    else return undefined;
                }
                else {
                    // Set value
                    for (var i = 0; i < this.length; i++) {
                        var el = this[i];
                        if (!el.dom7ElementDataStorage) el.dom7ElementDataStorage = {};
                        el.dom7ElementDataStorage[key] = value;
                    }
                    return this;
                }
            },
            // Transforms
            transform : function (transform) {
                for (var i = 0; i < this.length; i++) {
                    var elStyle = this[i].style;
                    elStyle.webkitTransform = elStyle.MsTransform = elStyle.msTransform = elStyle.MozTransform = elStyle.OTransform = elStyle.transform = transform;
                }
                return this;
            },
            transition: function (duration) {
                if (typeof duration !== 'string') {
                    duration = duration + 'ms';
                }
                for (var i = 0; i < this.length; i++) {
                    var elStyle = this[i].style;
                    elStyle.webkitTransitionDuration = elStyle.MsTransitionDuration = elStyle.msTransitionDuration = elStyle.MozTransitionDuration = elStyle.OTransitionDuration = elStyle.transitionDuration = duration;
                }
                return this;
            },
            //Events
            on: function (eventName, targetSelector, listener, capture) {
                function handleLiveEvent(e) {
                    var target = e.target;
                    if ($(target).is(targetSelector)) listener.call(target, e);
                    else {
                        var parents = $(target).parents();
                        for (var k = 0; k < parents.length; k++) {
                            if ($(parents[k]).is(targetSelector)) listener.call(parents[k], e);
                        }
                    }
                }
                var events = eventName.split(' ');
                var i, j;
                for (i = 0; i < this.length; i++) {
                    if (typeof targetSelector === 'function' || targetSelector === false) {
                        // Usual events
                        if (typeof targetSelector === 'function') {
                            listener = arguments[1];
                            capture = arguments[2] || false;
                        }
                        for (j = 0; j < events.length; j++) {
                            this[i].addEventListener(events[j], listener, capture);
                        }
                    }
                    else {
                        //Live events
                        for (j = 0; j < events.length; j++) {
                            if (!this[i].dom7LiveListeners) this[i].dom7LiveListeners = [];
                            this[i].dom7LiveListeners.push({listener: listener, liveListener: handleLiveEvent});
                            this[i].addEventListener(events[j], handleLiveEvent, capture);
                        }
                    }
                }

                return this;
            },
            off: function (eventName, targetSelector, listener, capture) {
                var events = eventName.split(' ');
                for (var i = 0; i < events.length; i++) {
                    for (var j = 0; j < this.length; j++) {
                        if (typeof targetSelector === 'function' || targetSelector === false) {
                            // Usual events
                            if (typeof targetSelector === 'function') {
                                listener = arguments[1];
                                capture = arguments[2] || false;
                            }
                            this[j].removeEventListener(events[i], listener, capture);
                        }
                        else {
                            // Live event
                            if (this[j].dom7LiveListeners) {
                                for (var k = 0; k < this[j].dom7LiveListeners.length; k++) {
                                    if (this[j].dom7LiveListeners[k].listener === listener) {
                                        this[j].removeEventListener(events[i], this[j].dom7LiveListeners[k].liveListener, capture);
                                    }
                                }
                            }
                        }
                    }
                }
                return this;
            },
            once: function (eventName, targetSelector, listener, capture) {
                var dom = this;
                if (typeof targetSelector === 'function') {
                    targetSelector = false;
                    listener = arguments[1];
                    capture = arguments[2];
                }
                function proxy(e) {
                    listener(e);
                    dom.off(eventName, targetSelector, proxy, capture);
                }
                dom.on(eventName, targetSelector, proxy, capture);
            },
            trigger: function (eventName, eventData) {
                for (var i = 0; i < this.length; i++) {
                    var evt;
                    try {
                        evt = new window.CustomEvent(eventName, {detail: eventData, bubbles: true, cancelable: true});
                    }
                    catch (e) {
                        evt = document.createEvent('Event');
                        evt.initEvent(eventName, true, true);
                        evt.detail = eventData;
                    }
                    this[i].dispatchEvent(evt);
                }
                return this;
            },
            transitionEnd: function (callback) {
                var events = ['webkitTransitionEnd', 'transitionend', 'oTransitionEnd', 'MSTransitionEnd', 'msTransitionEnd'],
                    i, j, dom = this;
                function fireCallBack(e) {
                    /*jshint validthis:true */
                    if (e.target !== this) return;
                    callback.call(this, e);
                    for (i = 0; i < events.length; i++) {
                        dom.off(events[i], fireCallBack);
                    }
                }
                if (callback) {
                    for (i = 0; i < events.length; i++) {
                        dom.on(events[i], fireCallBack);
                    }
                }
                return this;
            },
            // Sizing/Styles
            width: function () {
                if (this[0] === window) {
                    return window.innerWidth;
                }
                else {
                    if (this.length > 0) {
                        return parseFloat(this.css('width'));
                    }
                    else {
                        return null;
                    }
                }
            },
            outerWidth: function (includeMargins) {
                if (this.length > 0) {
                    if (includeMargins)
                        return this[0].offsetWidth + parseFloat(this.css('margin-right')) + parseFloat(this.css('margin-left'));
                    else
                        return this[0].offsetWidth;
                }
                else return null;
            },
            height: function () {
                if (this[0] === window) {
                    return window.innerHeight;
                }
                else {
                    if (this.length > 0) {
                        return parseFloat(this.css('height'));
                    }
                    else {
                        return null;
                    }
                }
            },
            outerHeight: function (includeMargins) {
                if (this.length > 0) {
                    if (includeMargins)
                        return this[0].offsetHeight + parseFloat(this.css('margin-top')) + parseFloat(this.css('margin-bottom'));
                    else
                        return this[0].offsetHeight;
                }
                else return null;
            },
            offset: function () {
                if (this.length > 0) {
                    var el = this[0];
                    var box = el.getBoundingClientRect();
                    var body = document.body;
                    var clientTop  = el.clientTop  || body.clientTop  || 0;
                    var clientLeft = el.clientLeft || body.clientLeft || 0;
                    var scrollTop  = window.pageYOffset || el.scrollTop;
                    var scrollLeft = window.pageXOffset || el.scrollLeft;
                    return {
                        top: box.top  + scrollTop  - clientTop,
                        left: box.left + scrollLeft - clientLeft
                    };
                }
                else {
                    return null;
                }
            },
            css: function (props, value) {
                var i;
                if (arguments.length === 1) {
                    if (typeof props === 'string') {
                        if (this[0]) return window.getComputedStyle(this[0], null).getPropertyValue(props);
                    }
                    else {
                        for (i = 0; i < this.length; i++) {
                            for (var prop in props) {
                                this[i].style[prop] = props[prop];
                            }
                        }
                        return this;
                    }
                }
                if (arguments.length === 2 && typeof props === 'string') {
                    for (i = 0; i < this.length; i++) {
                        this[i].style[props] = value;
                    }
                    return this;
                }
                return this;
            },

            //Dom manipulation
            each: function (callback) {
                for (var i = 0; i < this.length; i++) {
                    callback.call(this[i], i, this[i]);
                }
                return this;
            },
            html: function (html) {
                if (typeof html === 'undefined') {
                    return this[0] ? this[0].innerHTML : undefined;
                }
                else {
                    for (var i = 0; i < this.length; i++) {
                        this[i].innerHTML = html;
                    }
                    return this;
                }
            },
            is: function (selector) {
                if (!this[0]) return false;
                var compareWith, i;
                if (typeof selector === 'string') {
                    var el = this[0];
                    if (el === document) return selector === document;
                    if (el === window) return selector === window;

                    if (el.matches) return el.matches(selector);
                    else if (el.webkitMatchesSelector) return el.webkitMatchesSelector(selector);
                    else if (el.mozMatchesSelector) return el.mozMatchesSelector(selector);
                    else if (el.msMatchesSelector) return el.msMatchesSelector(selector);
                    else {
                        compareWith = $(selector);
                        for (i = 0; i < compareWith.length; i++) {
                            if (compareWith[i] === this[0]) return true;
                        }
                        return false;
                    }
                }
                else if (selector === document) return this[0] === document;
                else if (selector === window) return this[0] === window;
                else {
                    if (selector.nodeType || selector instanceof Dom7) {
                        compareWith = selector.nodeType ? [selector] : selector;
                        for (i = 0; i < compareWith.length; i++) {
                            if (compareWith[i] === this[0]) return true;
                        }
                        return false;
                    }
                    return false;
                }

            },
            index: function () {
                if (this[0]) {
                    var child = this[0];
                    var i = 0;
                    while ((child = child.previousSibling) !== null) {
                        if (child.nodeType === 1) i++;
                    }
                    return i;
                }
                else return undefined;
            },
            eq: function (index) {
                if (typeof index === 'undefined') return this;
                var length = this.length;
                var returnIndex;
                if (index > length - 1) {
                    return new Dom7([]);
                }
                if (index < 0) {
                    returnIndex = length + index;
                    if (returnIndex < 0) return new Dom7([]);
                    else return new Dom7([this[returnIndex]]);
                }
                return new Dom7([this[index]]);
            },
            append: function (newChild) {
                var i, j;
                for (i = 0; i < this.length; i++) {
                    if (typeof newChild === 'string') {
                        var tempDiv = document.createElement('div');
                        tempDiv.innerHTML = newChild;
                        while (tempDiv.firstChild) {
                            this[i].appendChild(tempDiv.firstChild);
                        }
                    }
                    else if (newChild instanceof Dom7) {
                        for (j = 0; j < newChild.length; j++) {
                            this[i].appendChild(newChild[j]);
                        }
                    }
                    else {
                        this[i].appendChild(newChild);
                    }
                }
                return this;
            },
            prepend: function (newChild) {
                var i, j;
                for (i = 0; i < this.length; i++) {
                    if (typeof newChild === 'string') {
                        var tempDiv = document.createElement('div');
                        tempDiv.innerHTML = newChild;
                        for (j = tempDiv.childNodes.length - 1; j >= 0; j--) {
                            this[i].insertBefore(tempDiv.childNodes[j], this[i].childNodes[0]);
                        }
                        // this[i].insertAdjacentHTML('afterbegin', newChild);
                    }
                    else if (newChild instanceof Dom7) {
                        for (j = 0; j < newChild.length; j++) {
                            this[i].insertBefore(newChild[j], this[i].childNodes[0]);
                        }
                    }
                    else {
                        this[i].insertBefore(newChild, this[i].childNodes[0]);
                    }
                }
                return this;
            },
            insertBefore: function (selector) {
                var before = $(selector);
                for (var i = 0; i < this.length; i++) {
                    if (before.length === 1) {
                        before[0].parentNode.insertBefore(this[i], before[0]);
                    }
                    else if (before.length > 1) {
                        for (var j = 0; j < before.length; j++) {
                            before[j].parentNode.insertBefore(this[i].cloneNode(true), before[j]);
                        }
                    }
                }
            },
            insertAfter: function (selector) {
                var after = $(selector);
                for (var i = 0; i < this.length; i++) {
                    if (after.length === 1) {
                        after[0].parentNode.insertBefore(this[i], after[0].nextSibling);
                    }
                    else if (after.length > 1) {
                        for (var j = 0; j < after.length; j++) {
                            after[j].parentNode.insertBefore(this[i].cloneNode(true), after[j].nextSibling);
                        }
                    }
                }
            },
            next: function (selector) {
                if (this.length > 0) {
                    if (selector) {
                        if (this[0].nextElementSibling && $(this[0].nextElementSibling).is(selector)) return new Dom7([this[0].nextElementSibling]);
                        else return new Dom7([]);
                    }
                    else {
                        if (this[0].nextElementSibling) return new Dom7([this[0].nextElementSibling]);
                        else return new Dom7([]);
                    }
                }
                else return new Dom7([]);
            },
            nextAll: function (selector) {
                var nextEls = [];
                var el = this[0];
                if (!el) return new Dom7([]);
                while (el.nextElementSibling) {
                    var next = el.nextElementSibling;
                    if (selector) {
                        if($(next).is(selector)) nextEls.push(next);
                    }
                    else nextEls.push(next);
                    el = next;
                }
                return new Dom7(nextEls);
            },
            prev: function (selector) {
                if (this.length > 0) {
                    if (selector) {
                        if (this[0].previousElementSibling && $(this[0].previousElementSibling).is(selector)) return new Dom7([this[0].previousElementSibling]);
                        else return new Dom7([]);
                    }
                    else {
                        if (this[0].previousElementSibling) return new Dom7([this[0].previousElementSibling]);
                        else return new Dom7([]);
                    }
                }
                else return new Dom7([]);
            },
            prevAll: function (selector) {
                var prevEls = [];
                var el = this[0];
                if (!el) return new Dom7([]);
                while (el.previousElementSibling) {
                    var prev = el.previousElementSibling;
                    if (selector) {
                        if($(prev).is(selector)) prevEls.push(prev);
                    }
                    else prevEls.push(prev);
                    el = prev;
                }
                return new Dom7(prevEls);
            },
            parent: function (selector) {
                var parents = [];
                for (var i = 0; i < this.length; i++) {
                    if (selector) {
                        if ($(this[i].parentNode).is(selector)) parents.push(this[i].parentNode);
                    }
                    else {
                        parents.push(this[i].parentNode);
                    }
                }
                return $($.unique(parents));
            },
            parents: function (selector) {
                var parents = [];
                for (var i = 0; i < this.length; i++) {
                    var parent = this[i].parentNode;
                    while (parent) {
                        if (selector) {
                            if ($(parent).is(selector)) parents.push(parent);
                        }
                        else {
                            parents.push(parent);
                        }
                        parent = parent.parentNode;
                    }
                }
                return $($.unique(parents));
            },
            find : function (selector) {
                var foundElements = [];
                for (var i = 0; i < this.length; i++) {
                    var found = this[i].querySelectorAll(selector);
                    for (var j = 0; j < found.length; j++) {
                        foundElements.push(found[j]);
                    }
                }
                return new Dom7(foundElements);
            },
            children: function (selector) {
                var children = [];
                for (var i = 0; i < this.length; i++) {
                    var childNodes = this[i].childNodes;

                    for (var j = 0; j < childNodes.length; j++) {
                        if (!selector) {
                            if (childNodes[j].nodeType === 1) children.push(childNodes[j]);
                        }
                        else {
                            if (childNodes[j].nodeType === 1 && $(childNodes[j]).is(selector)) children.push(childNodes[j]);
                        }
                    }
                }
                return new Dom7($.unique(children));
            },
            remove: function () {
                for (var i = 0; i < this.length; i++) {
                    if (this[i].parentNode) this[i].parentNode.removeChild(this[i]);
                }
                return this;
            },
            add: function () {
                var dom = this;
                var i, j;
                for (i = 0; i < arguments.length; i++) {
                    var toAdd = $(arguments[i]);
                    for (j = 0; j < toAdd.length; j++) {
                        dom[dom.length] = toAdd[j];
                        dom.length++;
                    }
                }
                return dom;
            }
        };
        $.fn = Dom7.prototype;
        $.unique = function (arr) {
            var unique = [];
            for (var i = 0; i < arr.length; i++) {
                if (unique.indexOf(arr[i]) === -1) unique.push(arr[i]);
            }
            return unique;
        };

        return $;
    })();


    /*===========================
     Get Dom libraries
     ===========================*/
    var swiperDomPlugins = ['jQuery', 'Zepto', 'Dom7'];
    for (var i = 0; i < swiperDomPlugins.length; i++) {
    	if (window[swiperDomPlugins[i]]) {
    		addLibraryPlugin(window[swiperDomPlugins[i]]);
    	}
    }
    // Required DOM Plugins
    var domLib;
    if (typeof Dom7 === 'undefined') {
    	domLib = window.Dom7 || window.Zepto || window.jQuery;
    }
    else {
    	domLib = Dom7;
    }

    /*===========================
    Add .swiper plugin from Dom libraries
    ===========================*/
    function addLibraryPlugin(lib) {
        lib.fn.swiper = function (params) {
            var firstInstance;
            lib(this).each(function () {
                var s = new Swiper(this, params);
                if (!firstInstance) firstInstance = s;
            });
            return firstInstance;
        };
    }

    if (domLib) {
        if (!('transitionEnd' in domLib.fn)) {
            domLib.fn.transitionEnd = function (callback) {
                var events = ['webkitTransitionEnd', 'transitionend', 'oTransitionEnd', 'MSTransitionEnd', 'msTransitionEnd'],
                    i, j, dom = this;
                function fireCallBack(e) {
                    /*jshint validthis:true */
                    if (e.target !== this) return;
                    callback.call(this, e);
                    for (i = 0; i < events.length; i++) {
                        dom.off(events[i], fireCallBack);
                    }
                }
                if (callback) {
                    for (i = 0; i < events.length; i++) {
                        dom.on(events[i], fireCallBack);
                    }
                }
                return this;
            };
        }
        if (!('transform' in domLib.fn)) {
            domLib.fn.transform = function (transform) {
                for (var i = 0; i < this.length; i++) {
                    var elStyle = this[i].style;
                    elStyle.webkitTransform = elStyle.MsTransform = elStyle.msTransform = elStyle.MozTransform = elStyle.OTransform = elStyle.transform = transform;
                }
                return this;
            };
        }
        if (!('transition' in domLib.fn)) {
            domLib.fn.transition = function (duration) {
                if (typeof duration !== 'string') {
                    duration = duration + 'ms';
                }
                for (var i = 0; i < this.length; i++) {
                    var elStyle = this[i].style;
                    elStyle.webkitTransitionDuration = elStyle.MsTransitionDuration = elStyle.msTransitionDuration = elStyle.MozTransitionDuration = elStyle.OTransitionDuration = elStyle.transitionDuration = duration;
                }
                return this;
            };
        }
    }

    ionic.views.Swiper = Swiper;
})();

(function(ionic) {
'use strict';

  ionic.views.Toggle = ionic.views.View.inherit({
    initialize: function(opts) {
      var self = this;

      this.el = opts.el;
      this.checkbox = opts.checkbox;
      this.track = opts.track;
      this.handle = opts.handle;
      this.openPercent = -1;
      this.onChange = opts.onChange || function() {};

      this.triggerThreshold = opts.triggerThreshold || 20;

      this.dragStartHandler = function(e) {
        self.dragStart(e);
      };
      this.dragHandler = function(e) {
        self.drag(e);
      };
      this.holdHandler = function(e) {
        self.hold(e);
      };
      this.releaseHandler = function(e) {
        self.release(e);
      };

      this.dragStartGesture = ionic.onGesture('dragstart', this.dragStartHandler, this.el);
      this.dragGesture = ionic.onGesture('drag', this.dragHandler, this.el);
      this.dragHoldGesture = ionic.onGesture('hold', this.holdHandler, this.el);
      this.dragReleaseGesture = ionic.onGesture('release', this.releaseHandler, this.el);
    },

    destroy: function() {
      ionic.offGesture(this.dragStartGesture, 'dragstart', this.dragStartGesture);
      ionic.offGesture(this.dragGesture, 'drag', this.dragGesture);
      ionic.offGesture(this.dragHoldGesture, 'hold', this.holdHandler);
      ionic.offGesture(this.dragReleaseGesture, 'release', this.releaseHandler);
    },

    tap: function() {
      if(this.el.getAttribute('disabled') !== 'disabled') {
        this.val( !this.checkbox.checked );
      }
    },

    dragStart: function(e) {
      if(this.checkbox.disabled) return;

      this._dragInfo = {
        width: this.el.offsetWidth,
        left: this.el.offsetLeft,
        right: this.el.offsetLeft + this.el.offsetWidth,
        triggerX: this.el.offsetWidth / 2,
        initialState: this.checkbox.checked
      };

      // Stop any parent dragging
      e.gesture.srcEvent.preventDefault();

      // Trigger hold styles
      this.hold(e);
    },

    drag: function(e) {
      var self = this;
      if(!this._dragInfo) { return; }

      // Stop any parent dragging
      e.gesture.srcEvent.preventDefault();

      ionic.requestAnimationFrame(function () {
        if (!self._dragInfo) { return; }

        var px = e.gesture.touches[0].pageX - self._dragInfo.left;
        var mx = self._dragInfo.width - self.triggerThreshold;

        // The initial state was on, so "tend towards" on
        if(self._dragInfo.initialState) {
          if(px < self.triggerThreshold) {
            self.setOpenPercent(0);
          } else if(px > self._dragInfo.triggerX) {
            self.setOpenPercent(100);
          }
        } else {
          // The initial state was off, so "tend towards" off
          if(px < self._dragInfo.triggerX) {
            self.setOpenPercent(0);
          } else if(px > mx) {
            self.setOpenPercent(100);
          }
        }
      });
    },

    endDrag: function() {
      this._dragInfo = null;
    },

    hold: function() {
      this.el.classList.add('dragging');
    },
    release: function(e) {
      this.el.classList.remove('dragging');
      this.endDrag(e);
    },


    setOpenPercent: function(openPercent) {
      // only make a change if the new open percent has changed
      if(this.openPercent < 0 || (openPercent < (this.openPercent - 3) || openPercent > (this.openPercent + 3) ) ) {
        this.openPercent = openPercent;

        if(openPercent === 0) {
          this.val(false);
        } else if(openPercent === 100) {
          this.val(true);
        } else {
          var openPixel = Math.round( (openPercent / 100) * this.track.offsetWidth - (this.handle.offsetWidth) );
          openPixel = (openPixel < 1 ? 0 : openPixel);
          this.handle.style[ionic.CSS.TRANSFORM] = 'translate3d(' + openPixel + 'px,0,0)';
        }
      }
    },

    val: function(value) {
      if(value === true || value === false) {
        if(this.handle.style[ionic.CSS.TRANSFORM] !== "") {
          this.handle.style[ionic.CSS.TRANSFORM] = "";
        }
        this.checkbox.checked = value;
        this.openPercent = (value ? 100 : 0);
        this.onChange && this.onChange();
      }
      return this.checkbox.checked;
    }

  });

})(ionic);

})();

/*!
 * Copyright 2015 Drifty Co.
 * http://drifty.com/
 *
 * Ionic, v1.3.1
 * A powerful HTML5 mobile app framework.
 * http://ionicframework.com/
 *
 * By @maxlynch, @benjsperry, @adamdbradley <3
 *
 * Licensed under the MIT license. Please see LICENSE for more information.
 *
 */

(function() {
/* eslint no-unused-vars:0 */
var IonicModule = angular.module('ionic', ['ngAnimate', 'ngSanitize', 'ui.router', 'ngIOS9UIWebViewPatch']),
  extend = angular.extend,
  forEach = angular.forEach,
  isDefined = angular.isDefined,
  isNumber = angular.isNumber,
  isString = angular.isString,
  jqLite = angular.element,
  noop = angular.noop;

/**
 * @ngdoc service
 * @name $ionicActionSheet
 * @module ionic
 * @description
 * The Action Sheet is a slide-up pane that lets the user choose from a set of options.
 * Dangerous options are highlighted in red and made obvious.
 *
 * There are easy ways to cancel out of the action sheet, such as tapping the backdrop or even
 * hitting escape on the keyboard for desktop testing.
 *
 * ![Action Sheet](http://ionicframework.com.s3.amazonaws.com/docs/controllers/actionSheet.gif)
 *
 * @usage
 * To trigger an Action Sheet in your code, use the $ionicActionSheet service in your angular controllers:
 *
 * ```js
 * angular.module('mySuperApp', ['ionic'])
 * .controller(function($scope, $ionicActionSheet, $timeout) {
 *
 *  // Triggered on a button click, or some other target
 *  $scope.show = function() {
 *
 *    // Show the action sheet
 *    var hideSheet = $ionicActionSheet.show({
 *      buttons: [
 *        { text: '<b>Share</b> This' },
 *        { text: 'Move' }
 *      ],
 *      destructiveText: 'Delete',
 *      titleText: 'Modify your album',
 *      cancelText: 'Cancel',
 *      cancel: function() {
          // add cancel code..
        },
 *      buttonClicked: function(index) {
 *        return true;
 *      }
 *    });
 *
 *    // For example's sake, hide the sheet after two seconds
 *    $timeout(function() {
 *      hideSheet();
 *    }, 2000);
 *
 *  };
 * });
 * ```
 *
 */
IonicModule
.factory('$ionicActionSheet', [
  '$rootScope',
  '$compile',
  '$animate',
  '$timeout',
  '$ionicTemplateLoader',
  '$ionicPlatform',
  '$ionicBody',
  'IONIC_BACK_PRIORITY',
function($rootScope, $compile, $animate, $timeout, $ionicTemplateLoader, $ionicPlatform, $ionicBody, IONIC_BACK_PRIORITY) {

  return {
    show: actionSheet
  };

  /**
   * @ngdoc method
   * @name $ionicActionSheet#show
   * @description
   * Load and return a new action sheet.
   *
   * A new isolated scope will be created for the
   * action sheet and the new element will be appended into the body.
   *
   * @param {object} options The options for this ActionSheet. Properties:
   *
   *  - `[Object]` `buttons` Which buttons to show.  Each button is an object with a `text` field.
   *  - `{string}` `titleText` The title to show on the action sheet.
   *  - `{string=}` `cancelText` the text for a 'cancel' button on the action sheet.
   *  - `{string=}` `destructiveText` The text for a 'danger' on the action sheet.
   *  - `{function=}` `cancel` Called if the cancel button is pressed, the backdrop is tapped or
   *     the hardware back button is pressed.
   *  - `{function=}` `buttonClicked` Called when one of the non-destructive buttons is clicked,
   *     with the index of the button that was clicked and the button object. Return true to close
   *     the action sheet, or false to keep it opened.
   *  - `{function=}` `destructiveButtonClicked` Called when the destructive button is clicked.
   *     Return true to close the action sheet, or false to keep it opened.
   *  -  `{boolean=}` `cancelOnStateChange` Whether to cancel the actionSheet when navigating
   *     to a new state.  Default true.
   *  - `{string}` `cssClass` The custom CSS class name.
   *
   * @returns {function} `hideSheet` A function which, when called, hides & cancels the action sheet.
   */
  function actionSheet(opts) {
    var scope = $rootScope.$new(true);

    extend(scope, {
      cancel: noop,
      destructiveButtonClicked: noop,
      buttonClicked: noop,
      $deregisterBackButton: noop,
      buttons: [],
      cancelOnStateChange: true
    }, opts || {});

    function textForIcon(text) {
      if (text && /icon/.test(text)) {
        scope.$actionSheetHasIcon = true;
      }
    }

    for (var x = 0; x < scope.buttons.length; x++) {
      textForIcon(scope.buttons[x].text);
    }
    textForIcon(scope.cancelText);
    textForIcon(scope.destructiveText);

    // Compile the template
    var element = scope.element = $compile('<ion-action-sheet ng-class="cssClass" buttons="buttons"></ion-action-sheet>')(scope);

    // Grab the sheet element for animation
    var sheetEl = jqLite(element[0].querySelector('.action-sheet-wrapper'));

    var stateChangeListenDone = scope.cancelOnStateChange ?
      $rootScope.$on('$stateChangeSuccess', function() { scope.cancel(); }) :
      noop;

    // removes the actionSheet from the screen
    scope.removeSheet = function(done) {
      if (scope.removed) return;

      scope.removed = true;
      sheetEl.removeClass('action-sheet-up');
      $timeout(function() {
        // wait to remove this due to a 300ms delay native
        // click which would trigging whatever was underneath this
        $ionicBody.removeClass('action-sheet-open');
      }, 400);
      scope.$deregisterBackButton();
      stateChangeListenDone();

      $animate.removeClass(element, 'active').then(function() {
        scope.$destroy();
        element.remove();
        // scope.cancel.$scope is defined near the bottom
        scope.cancel.$scope = sheetEl = null;
        (done || noop)(opts.buttons);
      });
    };

    scope.showSheet = function(done) {
      if (scope.removed) return;

      $ionicBody.append(element)
                .addClass('action-sheet-open');

      $animate.addClass(element, 'active').then(function() {
        if (scope.removed) return;
        (done || noop)();
      });
      $timeout(function() {
        if (scope.removed) return;
        sheetEl.addClass('action-sheet-up');
      }, 20, false);
    };

    // registerBackButtonAction returns a callback to deregister the action
    scope.$deregisterBackButton = $ionicPlatform.registerBackButtonAction(
      function() {
        $timeout(scope.cancel);
      },
      IONIC_BACK_PRIORITY.actionSheet
    );

    // called when the user presses the cancel button
    scope.cancel = function() {
      // after the animation is out, call the cancel callback
      scope.removeSheet(opts.cancel);
    };

    scope.buttonClicked = function(index) {
      // Check if the button click event returned true, which means
      // we can close the action sheet
      if (opts.buttonClicked(index, opts.buttons[index]) === true) {
        scope.removeSheet();
      }
    };

    scope.destructiveButtonClicked = function() {
      // Check if the destructive button click event returned true, which means
      // we can close the action sheet
      if (opts.destructiveButtonClicked() === true) {
        scope.removeSheet();
      }
    };

    scope.showSheet();

    // Expose the scope on $ionicActionSheet's return value for the sake
    // of testing it.
    scope.cancel.$scope = scope;

    return scope.cancel;
  }
}]);


jqLite.prototype.addClass = function(cssClasses) {
  var x, y, cssClass, el, splitClasses, existingClasses;
  if (cssClasses && cssClasses != 'ng-scope' && cssClasses != 'ng-isolate-scope') {
    for (x = 0; x < this.length; x++) {
      el = this[x];
      if (el.setAttribute) {

        if (cssClasses.indexOf(' ') < 0 && el.classList.add) {
          el.classList.add(cssClasses);
        } else {
          existingClasses = (' ' + (el.getAttribute('class') || '') + ' ')
            .replace(/[\n\t]/g, " ");
          splitClasses = cssClasses.split(' ');

          for (y = 0; y < splitClasses.length; y++) {
            cssClass = splitClasses[y].trim();
            if (existingClasses.indexOf(' ' + cssClass + ' ') === -1) {
              existingClasses += cssClass + ' ';
            }
          }
          el.setAttribute('class', existingClasses.trim());
        }
      }
    }
  }
  return this;
};

jqLite.prototype.removeClass = function(cssClasses) {
  var x, y, splitClasses, cssClass, el;
  if (cssClasses) {
    for (x = 0; x < this.length; x++) {
      el = this[x];
      if (el.getAttribute) {
        if (cssClasses.indexOf(' ') < 0 && el.classList.remove) {
          el.classList.remove(cssClasses);
        } else {
          splitClasses = cssClasses.split(' ');

          for (y = 0; y < splitClasses.length; y++) {
            cssClass = splitClasses[y];
            el.setAttribute('class', (
                (" " + (el.getAttribute('class') || '') + " ")
                .replace(/[\n\t]/g, " ")
                .replace(" " + cssClass.trim() + " ", " ")).trim()
            );
          }
        }
      }
    }
  }
  return this;
};

/**
 * @ngdoc service
 * @name $ionicBackdrop
 * @module ionic
 * @description
 * Shows and hides a backdrop over the UI.  Appears behind popups, loading,
 * and other overlays.
 *
 * Often, multiple UI components require a backdrop, but only one backdrop is
 * ever needed in the DOM at a time.
 *
 * Therefore, each component that requires the backdrop to be shown calls
 * `$ionicBackdrop.retain()` when it wants the backdrop, then `$ionicBackdrop.release()`
 * when it is done with the backdrop.
 *
 * For each time `retain` is called, the backdrop will be shown until `release` is called.
 *
 * For example, if `retain` is called three times, the backdrop will be shown until `release`
 * is called three times.
 *
 * **Notes:**
 * - The backdrop service will broadcast 'backdrop.shown' and 'backdrop.hidden' events from the root scope,
 * this is useful for alerting native components not in html.
 *
 * @usage
 *
 * ```js
 * function MyController($scope, $ionicBackdrop, $timeout, $rootScope) {
 *   //Show a backdrop for one second
 *   $scope.action = function() {
 *     $ionicBackdrop.retain();
 *     $timeout(function() {
 *       $ionicBackdrop.release();
 *     }, 1000);
 *   };
 *
 *   // Execute action on backdrop disappearing
 *   $scope.$on('backdrop.hidden', function() {
 *     // Execute action
 *   });
 *
 *   // Execute action on backdrop appearing
 *   $scope.$on('backdrop.shown', function() {
 *     // Execute action
 *   });
 *
 * }
 * ```
 */
IonicModule
.factory('$ionicBackdrop', [
  '$document', '$timeout', '$$rAF', '$rootScope',
function($document, $timeout, $$rAF, $rootScope) {

  var el = jqLite('<div class="backdrop">');
  var backdropHolds = 0;

  $document[0].body.appendChild(el[0]);

  return {
    /**
     * @ngdoc method
     * @name $ionicBackdrop#retain
     * @description Retains the backdrop.
     */
    retain: retain,
    /**
     * @ngdoc method
     * @name $ionicBackdrop#release
     * @description
     * Releases the backdrop.
     */
    release: release,

    getElement: getElement,

    // exposed for testing
    _element: el
  };

  function retain() {
    backdropHolds++;
    if (backdropHolds === 1) {
      el.addClass('visible');
      $rootScope.$broadcast('backdrop.shown');
      $$rAF(function() {
        // If we're still at >0 backdropHolds after async...
        if (backdropHolds >= 1) el.addClass('active');
      });
    }
  }
  function release() {
    if (backdropHolds === 1) {
      el.removeClass('active');
      $rootScope.$broadcast('backdrop.hidden');
      $timeout(function() {
        // If we're still at 0 backdropHolds after async...
        if (backdropHolds === 0) el.removeClass('visible');
      }, 400, false);
    }
    backdropHolds = Math.max(0, backdropHolds - 1);
  }

  function getElement() {
    return el;
  }

}]);

/**
 * @private
 */
IonicModule
.factory('$ionicBind', ['$parse', '$interpolate', function($parse, $interpolate) {
  var LOCAL_REGEXP = /^\s*([@=&])(\??)\s*(\w*)\s*$/;
  return function(scope, attrs, bindDefinition) {
    forEach(bindDefinition || {}, function(definition, scopeName) {
      //Adapted from angular.js $compile
      var match = definition.match(LOCAL_REGEXP) || [],
        attrName = match[3] || scopeName,
        mode = match[1], // @, =, or &
        parentGet,
        unwatch;

      switch (mode) {
        case '@':
          if (!attrs[attrName]) {
            return;
          }
          attrs.$observe(attrName, function(value) {
            scope[scopeName] = value;
          });
          // we trigger an interpolation to ensure
          // the value is there for use immediately
          if (attrs[attrName]) {
            scope[scopeName] = $interpolate(attrs[attrName])(scope);
          }
          break;

        case '=':
          if (!attrs[attrName]) {
            return;
          }
          unwatch = scope.$watch(attrs[attrName], function(value) {
            scope[scopeName] = value;
          });
          //Destroy parent scope watcher when this scope is destroyed
          scope.$on('$destroy', unwatch);
          break;

        case '&':
          /* jshint -W044 */
          if (attrs[attrName] && attrs[attrName].match(RegExp(scopeName + '\(.*?\)'))) {
            throw new Error('& expression binding "' + scopeName + '" looks like it will recursively call "' +
                          attrs[attrName] + '" and cause a stack overflow! Please choose a different scopeName.');
          }
          parentGet = $parse(attrs[attrName]);
          scope[scopeName] = function(locals) {
            return parentGet(scope, locals);
          };
          break;
      }
    });
  };
}]);

/**
 * @ngdoc service
 * @name $ionicBody
 * @module ionic
 * @description An angular utility service to easily and efficiently
 * add and remove CSS classes from the document's body element.
 */
IonicModule
.factory('$ionicBody', ['$document', function($document) {
  return {
    /**
     * @ngdoc method
     * @name $ionicBody#addClass
     * @description Add a class to the document's body element.
     * @param {string} class Each argument will be added to the body element.
     * @returns {$ionicBody} The $ionicBody service so methods can be chained.
     */
    addClass: function() {
      for (var x = 0; x < arguments.length; x++) {
        $document[0].body.classList.add(arguments[x]);
      }
      return this;
    },
    /**
     * @ngdoc method
     * @name $ionicBody#removeClass
     * @description Remove a class from the document's body element.
     * @param {string} class Each argument will be removed from the body element.
     * @returns {$ionicBody} The $ionicBody service so methods can be chained.
     */
    removeClass: function() {
      for (var x = 0; x < arguments.length; x++) {
        $document[0].body.classList.remove(arguments[x]);
      }
      return this;
    },
    /**
     * @ngdoc method
     * @name $ionicBody#enableClass
     * @description Similar to the `add` method, except the first parameter accepts a boolean
     * value determining if the class should be added or removed. Rather than writing user code,
     * such as "if true then add the class, else then remove the class", this method can be
     * given a true or false value which reduces redundant code.
     * @param {boolean} shouldEnableClass A true/false value if the class should be added or removed.
     * @param {string} class Each remaining argument would be added or removed depending on
     * the first argument.
     * @returns {$ionicBody} The $ionicBody service so methods can be chained.
     */
    enableClass: function(shouldEnableClass) {
      var args = Array.prototype.slice.call(arguments).slice(1);
      if (shouldEnableClass) {
        this.addClass.apply(this, args);
      } else {
        this.removeClass.apply(this, args);
      }
      return this;
    },
    /**
     * @ngdoc method
     * @name $ionicBody#append
     * @description Append a child to the document's body.
     * @param {element} element The element to be appended to the body. The passed in element
     * can be either a jqLite element, or a DOM element.
     * @returns {$ionicBody} The $ionicBody service so methods can be chained.
     */
    append: function(ele) {
      $document[0].body.appendChild(ele.length ? ele[0] : ele);
      return this;
    },
    /**
     * @ngdoc method
     * @name $ionicBody#get
     * @description Get the document's body element.
     * @returns {element} Returns the document's body element.
     */
    get: function() {
      return $document[0].body;
    }
  };
}]);

IonicModule
.factory('$ionicClickBlock', [
  '$document',
  '$ionicBody',
  '$timeout',
function($document, $ionicBody, $timeout) {
  var CSS_HIDE = 'click-block-hide';
  var cbEle, fallbackTimer, pendingShow;

  function preventClick(ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }

  function addClickBlock() {
    if (pendingShow) {
      if (cbEle) {
        cbEle.classList.remove(CSS_HIDE);
      } else {
        cbEle = $document[0].createElement('div');
        cbEle.className = 'click-block';
        $ionicBody.append(cbEle);
        cbEle.addEventListener('touchstart', preventClick);
        cbEle.addEventListener('mousedown', preventClick);
      }
      pendingShow = false;
    }
  }

  function removeClickBlock() {
    cbEle && cbEle.classList.add(CSS_HIDE);
  }

  return {
    show: function(autoExpire) {
      pendingShow = true;
      $timeout.cancel(fallbackTimer);
      fallbackTimer = $timeout(this.hide, autoExpire || 310, false);
      addClickBlock();
    },
    hide: function() {
      pendingShow = false;
      $timeout.cancel(fallbackTimer);
      removeClickBlock();
    }
  };
}]);

/**
 * @ngdoc service
 * @name $ionicGesture
 * @module ionic
 * @description An angular service exposing ionic
 * {@link ionic.utility:ionic.EventController}'s gestures.
 */
IonicModule
.factory('$ionicGesture', [function() {
  return {
    /**
     * @ngdoc method
     * @name $ionicGesture#on
     * @description Add an event listener for a gesture on an element. See {@link ionic.utility:ionic.EventController#onGesture}.
     * @param {string} eventType The gesture event to listen for.
     * @param {function(e)} callback The function to call when the gesture
     * happens.
     * @param {element} $element The angular element to listen for the event on.
     * @param {object} options object.
     * @returns {ionic.Gesture} The gesture object (use this to remove the gesture later on).
     */
    on: function(eventType, cb, $element, options) {
      return window.ionic.onGesture(eventType, cb, $element[0], options);
    },
    /**
     * @ngdoc method
     * @name $ionicGesture#off
     * @description Remove an event listener for a gesture on an element. See {@link ionic.utility:ionic.EventController#offGesture}.
     * @param {ionic.Gesture} gesture The gesture that should be removed.
     * @param {string} eventType The gesture event to remove the listener for.
     * @param {function(e)} callback The listener to remove.
     */
    off: function(gesture, eventType, cb) {
      return window.ionic.offGesture(gesture, eventType, cb);
    }
  };
}]);

/**
 * @ngdoc service
 * @name $ionicHistory
 * @module ionic
 * @description
 * $ionicHistory keeps track of views as the user navigates through an app. Similar to the way a
 * browser behaves, an Ionic app is able to keep track of the previous view, the current view, and
 * the forward view (if there is one).  However, a typical web browser only keeps track of one
 * history stack in a linear fashion.
 *
 * Unlike a traditional browser environment, apps and webapps have parallel independent histories,
 * such as with tabs. Should a user navigate few pages deep on one tab, and then switch to a new
 * tab and back, the back button relates not to the previous tab, but to the previous pages
 * visited within _that_ tab.
 *
 * `$ionicHistory` facilitates this parallel history architecture.
 */

IonicModule
.factory('$ionicHistory', [
  '$rootScope',
  '$state',
  '$location',
  '$window',
  '$timeout',
  '$ionicViewSwitcher',
  '$ionicNavViewDelegate',
function($rootScope, $state, $location, $window, $timeout, $ionicViewSwitcher, $ionicNavViewDelegate) {

  // history actions while navigating views
  var ACTION_INITIAL_VIEW = 'initialView';
  var ACTION_NEW_VIEW = 'newView';
  var ACTION_MOVE_BACK = 'moveBack';
  var ACTION_MOVE_FORWARD = 'moveForward';

  // direction of navigation
  var DIRECTION_BACK = 'back';
  var DIRECTION_FORWARD = 'forward';
  var DIRECTION_ENTER = 'enter';
  var DIRECTION_EXIT = 'exit';
  var DIRECTION_SWAP = 'swap';
  var DIRECTION_NONE = 'none';

  var stateChangeCounter = 0;
  var lastStateId, nextViewOptions, deregisterStateChangeListener, nextViewExpireTimer, forcedNav;

  var viewHistory = {
    histories: { root: { historyId: 'root', parentHistoryId: null, stack: [], cursor: -1 } },
    views: {},
    backView: null,
    forwardView: null,
    currentView: null
  };

  var View = function() {};
  View.prototype.initialize = function(data) {
    if (data) {
      for (var name in data) this[name] = data[name];
      return this;
    }
    return null;
  };
  View.prototype.go = function() {

    if (this.stateName) {
      return $state.go(this.stateName, this.stateParams);
    }

    if (this.url && this.url !== $location.url()) {

      if (viewHistory.backView === this) {
        return $window.history.go(-1);
      } else if (viewHistory.forwardView === this) {
        return $window.history.go(1);
      }

      $location.url(this.url);
    }

    return null;
  };
  View.prototype.destroy = function() {
    if (this.scope) {
      this.scope.$destroy && this.scope.$destroy();
      this.scope = null;
    }
  };


  function getViewById(viewId) {
    return (viewId ? viewHistory.views[ viewId ] : null);
  }

  function getBackView(view) {
    return (view ? getViewById(view.backViewId) : null);
  }

  function getForwardView(view) {
    return (view ? getViewById(view.forwardViewId) : null);
  }

  function getHistoryById(historyId) {
    return (historyId ? viewHistory.histories[ historyId ] : null);
  }

  function getHistory(scope) {
    var histObj = getParentHistoryObj(scope);

    if (!viewHistory.histories[ histObj.historyId ]) {
      // this history object exists in parent scope, but doesn't
      // exist in the history data yet
      viewHistory.histories[ histObj.historyId ] = {
        historyId: histObj.historyId,
        parentHistoryId: getParentHistoryObj(histObj.scope.$parent).historyId,
        stack: [],
        cursor: -1
      };
    }
    return getHistoryById(histObj.historyId);
  }

  function getParentHistoryObj(scope) {
    var parentScope = scope;
    while (parentScope) {
      if (parentScope.hasOwnProperty('$historyId')) {
        // this parent scope has a historyId
        return { historyId: parentScope.$historyId, scope: parentScope };
      }
      // nothing found keep climbing up
      parentScope = parentScope.$parent;
    }
    // no history for the parent, use the root
    return { historyId: 'root', scope: $rootScope };
  }

  function setNavViews(viewId) {
    viewHistory.currentView = getViewById(viewId);
    viewHistory.backView = getBackView(viewHistory.currentView);
    viewHistory.forwardView = getForwardView(viewHistory.currentView);
  }

  function getCurrentStateId() {
    var id;
    if ($state && $state.current && $state.current.name) {
      id = $state.current.name;
      if ($state.params) {
        for (var key in $state.params) {
          if ($state.params.hasOwnProperty(key) && $state.params[key]) {
            id += "_" + key + "=" + $state.params[key];
          }
        }
      }
      return id;
    }
    // if something goes wrong make sure its got a unique stateId
    return ionic.Utils.nextUid();
  }

  function getCurrentStateParams() {
    var rtn;
    if ($state && $state.params) {
      for (var key in $state.params) {
        if ($state.params.hasOwnProperty(key)) {
          rtn = rtn || {};
          rtn[key] = $state.params[key];
        }
      }
    }
    return rtn;
  }


  return {

    register: function(parentScope, viewLocals) {

      var currentStateId = getCurrentStateId(),
          hist = getHistory(parentScope),
          currentView = viewHistory.currentView,
          backView = viewHistory.backView,
          forwardView = viewHistory.forwardView,
          viewId = null,
          action = null,
          direction = DIRECTION_NONE,
          historyId = hist.historyId,
          url = $location.url(),
          tmp, x, ele;

      if (lastStateId !== currentStateId) {
        lastStateId = currentStateId;
        stateChangeCounter++;
      }

      if (forcedNav) {
        // we've previously set exactly what to do
        viewId = forcedNav.viewId;
        action = forcedNav.action;
        direction = forcedNav.direction;
        forcedNav = null;

      } else if (backView && backView.stateId === currentStateId) {
        // they went back one, set the old current view as a forward view
        viewId = backView.viewId;
        historyId = backView.historyId;
        action = ACTION_MOVE_BACK;
        if (backView.historyId === currentView.historyId) {
          // went back in the same history
          direction = DIRECTION_BACK;

        } else if (currentView) {
          direction = DIRECTION_EXIT;

          tmp = getHistoryById(backView.historyId);
          if (tmp && tmp.parentHistoryId === currentView.historyId) {
            direction = DIRECTION_ENTER;

          } else {
            tmp = getHistoryById(currentView.historyId);
            if (tmp && tmp.parentHistoryId === hist.parentHistoryId) {
              direction = DIRECTION_SWAP;
            }
          }
        }

      } else if (forwardView && forwardView.stateId === currentStateId) {
        // they went to the forward one, set the forward view to no longer a forward view
        viewId = forwardView.viewId;
        historyId = forwardView.historyId;
        action = ACTION_MOVE_FORWARD;
        if (forwardView.historyId === currentView.historyId) {
          direction = DIRECTION_FORWARD;

        } else if (currentView) {
          direction = DIRECTION_EXIT;

          if (currentView.historyId === hist.parentHistoryId) {
            direction = DIRECTION_ENTER;

          } else {
            tmp = getHistoryById(currentView.historyId);
            if (tmp && tmp.parentHistoryId === hist.parentHistoryId) {
              direction = DIRECTION_SWAP;
            }
          }
        }

        tmp = getParentHistoryObj(parentScope);
        if (forwardView.historyId && tmp.scope) {
          // if a history has already been created by the forward view then make sure it stays the same
          tmp.scope.$historyId = forwardView.historyId;
          historyId = forwardView.historyId;
        }

      } else if (currentView && currentView.historyId !== historyId &&
                hist.cursor > -1 && hist.stack.length > 0 && hist.cursor < hist.stack.length &&
                hist.stack[hist.cursor].stateId === currentStateId) {
        // they just changed to a different history and the history already has views in it
        var switchToView = hist.stack[hist.cursor];
        viewId = switchToView.viewId;
        historyId = switchToView.historyId;
        action = ACTION_MOVE_BACK;
        direction = DIRECTION_SWAP;

        tmp = getHistoryById(currentView.historyId);
        if (tmp && tmp.parentHistoryId === historyId) {
          direction = DIRECTION_EXIT;

        } else {
          tmp = getHistoryById(historyId);
          if (tmp && tmp.parentHistoryId === currentView.historyId) {
            direction = DIRECTION_ENTER;
          }
        }

        // if switching to a different history, and the history of the view we're switching
        // to has an existing back view from a different history than itself, then
        // it's back view would be better represented using the current view as its back view
        tmp = getViewById(switchToView.backViewId);
        if (tmp && switchToView.historyId !== tmp.historyId) {
          // the new view is being removed from it's old position in the history and being placed at the top,
          // so we need to update any views that reference it as a backview, otherwise there will be infinitely loops
          var viewIds = Object.keys(viewHistory.views);
          viewIds.forEach(function(viewId) {
            var view = viewHistory.views[viewId];
            if ( view.backViewId === switchToView.viewId ) {
              view.backViewId = null;
            }
          });

          hist.stack[hist.cursor].backViewId = currentView.viewId;
        }

      } else {

        // create an element from the viewLocals template
        ele = $ionicViewSwitcher.createViewEle(viewLocals);
        if (this.isAbstractEle(ele, viewLocals)) {
          return {
            action: 'abstractView',
            direction: DIRECTION_NONE,
            ele: ele
          };
        }

        // set a new unique viewId
        viewId = ionic.Utils.nextUid();

        if (currentView) {
          // set the forward view if there is a current view (ie: if its not the first view)
          currentView.forwardViewId = viewId;

          action = ACTION_NEW_VIEW;

          // check if there is a new forward view within the same history
          if (forwardView && currentView.stateId !== forwardView.stateId &&
             currentView.historyId === forwardView.historyId) {
            // they navigated to a new view but the stack already has a forward view
            // since its a new view remove any forwards that existed
            tmp = getHistoryById(forwardView.historyId);
            if (tmp) {
              // the forward has a history
              for (x = tmp.stack.length - 1; x >= forwardView.index; x--) {
                // starting from the end destroy all forwards in this history from this point
                var stackItem = tmp.stack[x];
                stackItem && stackItem.destroy && stackItem.destroy();
                tmp.stack.splice(x);
              }
              historyId = forwardView.historyId;
            }
          }

          // its only moving forward if its in the same history
          if (hist.historyId === currentView.historyId) {
            direction = DIRECTION_FORWARD;

          } else if (currentView.historyId !== hist.historyId) {
            // DB: this is a new view in a different tab
            direction = DIRECTION_ENTER;

            tmp = getHistoryById(currentView.historyId);
            if (tmp && tmp.parentHistoryId === hist.parentHistoryId) {
              direction = DIRECTION_SWAP;

            } else {
              tmp = getHistoryById(tmp.parentHistoryId);
              if (tmp && tmp.historyId === hist.historyId) {
                direction = DIRECTION_EXIT;
              }
            }
          }

        } else {
          // there's no current view, so this must be the initial view
          action = ACTION_INITIAL_VIEW;
        }

        if (stateChangeCounter < 2) {
          // views that were spun up on the first load should not animate
          direction = DIRECTION_NONE;
        }

        // add the new view
        viewHistory.views[viewId] = this.createView({
          viewId: viewId,
          index: hist.stack.length,
          historyId: hist.historyId,
          backViewId: (currentView && currentView.viewId ? currentView.viewId : null),
          forwardViewId: null,
          stateId: currentStateId,
          stateName: this.currentStateName(),
          stateParams: getCurrentStateParams(),
          url: url,
          canSwipeBack: canSwipeBack(ele, viewLocals)
        });

        // add the new view to this history's stack
        hist.stack.push(viewHistory.views[viewId]);
      }

      deregisterStateChangeListener && deregisterStateChangeListener();
      $timeout.cancel(nextViewExpireTimer);
      if (nextViewOptions) {
        if (nextViewOptions.disableAnimate) direction = DIRECTION_NONE;
        if (nextViewOptions.disableBack) viewHistory.views[viewId].backViewId = null;
        if (nextViewOptions.historyRoot) {
          for (x = 0; x < hist.stack.length; x++) {
            if (hist.stack[x].viewId === viewId) {
              hist.stack[x].index = 0;
              hist.stack[x].backViewId = hist.stack[x].forwardViewId = null;
            } else {
              delete viewHistory.views[hist.stack[x].viewId];
            }
          }
          hist.stack = [viewHistory.views[viewId]];
        }
        nextViewOptions = null;
      }

      setNavViews(viewId);

      if (viewHistory.backView && historyId == viewHistory.backView.historyId && currentStateId == viewHistory.backView.stateId && url == viewHistory.backView.url) {
        for (x = 0; x < hist.stack.length; x++) {
          if (hist.stack[x].viewId == viewId) {
            action = 'dupNav';
            direction = DIRECTION_NONE;
            if (x > 0) {
              hist.stack[x - 1].forwardViewId = null;
            }
            viewHistory.forwardView = null;
            viewHistory.currentView.index = viewHistory.backView.index;
            viewHistory.currentView.backViewId = viewHistory.backView.backViewId;
            viewHistory.backView = getBackView(viewHistory.backView);
            hist.stack.splice(x, 1);
            break;
          }
        }
      }

      hist.cursor = viewHistory.currentView.index;

      return {
        viewId: viewId,
        action: action,
        direction: direction,
        historyId: historyId,
        enableBack: this.enabledBack(viewHistory.currentView),
        isHistoryRoot: (viewHistory.currentView.index === 0),
        ele: ele
      };
    },

    registerHistory: function(scope) {
      scope.$historyId = ionic.Utils.nextUid();
    },

    createView: function(data) {
      var newView = new View();
      return newView.initialize(data);
    },

    getViewById: getViewById,

    /**
     * @ngdoc method
     * @name $ionicHistory#viewHistory
     * @description The app's view history data, such as all the views and histories, along
     * with how they are ordered and linked together within the navigation stack.
     * @returns {object} Returns an object containing the apps view history data.
     */
    viewHistory: function() {
      return viewHistory;
    },

    /**
     * @ngdoc method
     * @name $ionicHistory#currentView
     * @description The app's current view.
     * @returns {object} Returns the current view.
     */
    currentView: function(view) {
      if (arguments.length) {
        viewHistory.currentView = view;
      }
      return viewHistory.currentView;
    },

    /**
     * @ngdoc method
     * @name $ionicHistory#currentHistoryId
     * @description The ID of the history stack which is the parent container of the current view.
     * @returns {string} Returns the current history ID.
     */
    currentHistoryId: function() {
      return viewHistory.currentView ? viewHistory.currentView.historyId : null;
    },

    /**
     * @ngdoc method
     * @name $ionicHistory#currentTitle
     * @description Gets and sets the current view's title.
     * @param {string=} val The title to update the current view with.
     * @returns {string} Returns the current view's title.
     */
    currentTitle: function(val) {
      if (viewHistory.currentView) {
        if (arguments.length) {
          viewHistory.currentView.title = val;
        }
        return viewHistory.currentView.title;
      }
    },

    /**
     * @ngdoc method
     * @name $ionicHistory#backView
     * @description Returns the view that was before the current view in the history stack.
     * If the user navigated from View A to View B, then View A would be the back view, and
     * View B would be the current view.
     * @returns {object} Returns the back view.
     */
    backView: function(view) {
      if (arguments.length) {
        viewHistory.backView = view;
      }
      return viewHistory.backView;
    },

    /**
     * @ngdoc method
     * @name $ionicHistory#backTitle
     * @description Gets the back view's title.
     * @returns {string} Returns the back view's title.
     */
    backTitle: function(view) {
      var backView = (view && getViewById(view.backViewId)) || viewHistory.backView;
      return backView && backView.title;
    },

    /**
     * @ngdoc method
     * @name $ionicHistory#forwardView
     * @description Returns the view that was in front of the current view in the history stack.
     * A forward view would exist if the user navigated from View A to View B, then
     * navigated back to View A. At this point then View B would be the forward view, and View
     * A would be the current view.
     * @returns {object} Returns the forward view.
     */
    forwardView: function(view) {
      if (arguments.length) {
        viewHistory.forwardView = view;
      }
      return viewHistory.forwardView;
    },

    /**
     * @ngdoc method
     * @name $ionicHistory#currentStateName
     * @description Returns the current state name.
     * @returns {string}
     */
    currentStateName: function() {
      return ($state && $state.current ? $state.current.name : null);
    },

    isCurrentStateNavView: function(navView) {
      return !!($state && $state.current && $state.current.views && $state.current.views[navView]);
    },

    goToHistoryRoot: function(historyId) {
      if (historyId) {
        var hist = getHistoryById(historyId);
        if (hist && hist.stack.length) {
          if (viewHistory.currentView && viewHistory.currentView.viewId === hist.stack[0].viewId) {
            return;
          }
          forcedNav = {
            viewId: hist.stack[0].viewId,
            action: ACTION_MOVE_BACK,
            direction: DIRECTION_BACK
          };
          hist.stack[0].go();
        }
      }
    },

    /**
     * @ngdoc method
     * @name $ionicHistory#goBack
     * @param {number=} backCount Optional negative integer setting how many views to go
     * back. By default it'll go back one view by using the value `-1`. To go back two
     * views you would use `-2`. If the number goes farther back than the number of views
     * in the current history's stack then it'll go to the first view in the current history's
     * stack. If the number is zero or greater then it'll do nothing. It also does not
     * cross history stacks, meaning it can only go as far back as the current history.
     * @description Navigates the app to the back view, if a back view exists.
     */
    goBack: function(backCount) {
      if (isDefined(backCount) && backCount !== -1) {
        if (backCount > -1) return;

        var currentHistory = viewHistory.histories[this.currentHistoryId()];
        var newCursor = currentHistory.cursor + backCount + 1;
        if (newCursor < 1) {
          newCursor = 1;
        }

        currentHistory.cursor = newCursor;
        setNavViews(currentHistory.stack[newCursor].viewId);

        var cursor = newCursor - 1;
        var clearStateIds = [];
        var fwdView = getViewById(currentHistory.stack[cursor].forwardViewId);
        while (fwdView) {
          clearStateIds.push(fwdView.stateId || fwdView.viewId);
          cursor++;
          if (cursor >= currentHistory.stack.length) break;
          fwdView = getViewById(currentHistory.stack[cursor].forwardViewId);
        }

        var self = this;
        if (clearStateIds.length) {
          $timeout(function() {
            self.clearCache(clearStateIds);
          }, 300);
        }
      }

      viewHistory.backView && viewHistory.backView.go();
    },

    /**
     * @ngdoc method
     * @name $ionicHistory#removeBackView
     * @description Remove the previous view from the history completely, including the
     * cached element and scope (if they exist).
     */
    removeBackView: function() {
      var self = this;
      var currentHistory = viewHistory.histories[this.currentHistoryId()];
      var currentCursor = currentHistory.cursor;

      var currentView = currentHistory.stack[currentCursor];
      var backView = currentHistory.stack[currentCursor - 1];
      var replacementView = currentHistory.stack[currentCursor - 2];

      // fail if we dont have enough views in the history
      if (!backView || !replacementView) {
        return;
      }

      // remove the old backView and the cached element/scope
      currentHistory.stack.splice(currentCursor - 1, 1);
      self.clearCache([backView.viewId]);
      // make the replacementView and currentView point to each other (bypass the old backView)
      currentView.backViewId = replacementView.viewId;
      currentView.index = currentView.index - 1;
      replacementView.forwardViewId = currentView.viewId;
      // update the cursor and set new backView
      viewHistory.backView = replacementView;
      currentHistory.currentCursor += -1;
    },

    enabledBack: function(view) {
      var backView = getBackView(view);
      return !!(backView && backView.historyId === view.historyId);
    },

    /**
     * @ngdoc method
     * @name $ionicHistory#clearHistory
     * @description Clears out the app's entire history, except for the current view.
     */
    clearHistory: function() {
      var
      histories = viewHistory.histories,
      currentView = viewHistory.currentView;

      if (histories) {
        for (var historyId in histories) {

          if (histories[historyId].stack) {
            histories[historyId].stack = [];
            histories[historyId].cursor = -1;
          }

          if (currentView && currentView.historyId === historyId) {
            currentView.backViewId = currentView.forwardViewId = null;
            histories[historyId].stack.push(currentView);
          } else if (histories[historyId].destroy) {
            histories[historyId].destroy();
          }

        }
      }

      for (var viewId in viewHistory.views) {
        if (viewId !== currentView.viewId) {
          delete viewHistory.views[viewId];
        }
      }

      if (currentView) {
        setNavViews(currentView.viewId);
      }
    },

    /**
     * @ngdoc method
     * @name $ionicHistory#clearCache
   * @return promise
     * @description Removes all cached views within every {@link ionic.directive:ionNavView}.
     * This both removes the view element from the DOM, and destroy it's scope.
     */
    clearCache: function(stateIds) {
      return $timeout(function() {
        $ionicNavViewDelegate._instances.forEach(function(instance) {
          instance.clearCache(stateIds);
        });
      });
    },

    /**
     * @ngdoc method
     * @name $ionicHistory#nextViewOptions
     * @description Sets options for the next view. This method can be useful to override
     * certain view/transition defaults right before a view transition happens. For example,
     * the {@link ionic.directive:menuClose} directive uses this method internally to ensure
     * an animated view transition does not happen when a side menu is open, and also sets
     * the next view as the root of its history stack. After the transition these options
     * are set back to null.
     *
     * Available options:
     *
     * * `disableAnimate`: Do not animate the next transition.
     * * `disableBack`: The next view should forget its back view, and set it to null.
     * * `historyRoot`: The next view should become the root view in its history stack.
     *
     * ```js
     * $ionicHistory.nextViewOptions({
     *   disableAnimate: true,
     *   disableBack: true
     * });
     * ```
     */
    nextViewOptions: function(opts) {
      deregisterStateChangeListener && deregisterStateChangeListener();
      if (arguments.length) {
        $timeout.cancel(nextViewExpireTimer);
        if (opts === null) {
          nextViewOptions = opts;
        } else {
          nextViewOptions = nextViewOptions || {};
          extend(nextViewOptions, opts);
          if (nextViewOptions.expire) {
              deregisterStateChangeListener = $rootScope.$on('$stateChangeSuccess', function() {
                nextViewExpireTimer = $timeout(function() {
                  nextViewOptions = null;
                  }, nextViewOptions.expire);
              });
          }
        }
      }
      return nextViewOptions;
    },

    isAbstractEle: function(ele, viewLocals) {
      if (viewLocals && viewLocals.$$state && viewLocals.$$state.self['abstract']) {
        return true;
      }
      return !!(ele && (isAbstractTag(ele) || isAbstractTag(ele.children())));
    },

    isActiveScope: function(scope) {
      if (!scope) return false;

      var climbScope = scope;
      var currentHistoryId = this.currentHistoryId();
      var foundHistoryId;

      while (climbScope) {
        if (climbScope.$$disconnected) {
          return false;
        }

        if (!foundHistoryId && climbScope.hasOwnProperty('$historyId')) {
          foundHistoryId = true;
        }

        if (currentHistoryId) {
          if (climbScope.hasOwnProperty('$historyId') && currentHistoryId == climbScope.$historyId) {
            return true;
          }
          if (climbScope.hasOwnProperty('$activeHistoryId')) {
            if (currentHistoryId == climbScope.$activeHistoryId) {
              if (climbScope.hasOwnProperty('$historyId')) {
                return true;
              }
              if (!foundHistoryId) {
                return true;
              }
            }
          }
        }

        if (foundHistoryId && climbScope.hasOwnProperty('$activeHistoryId')) {
          foundHistoryId = false;
        }

        climbScope = climbScope.$parent;
      }

      return currentHistoryId ? currentHistoryId == 'root' : true;
    }

  };

  function isAbstractTag(ele) {
    return ele && ele.length && /ion-side-menus|ion-tabs/i.test(ele[0].tagName);
  }

  function canSwipeBack(ele, viewLocals) {
    if (viewLocals && viewLocals.$$state && viewLocals.$$state.self.canSwipeBack === false) {
      return false;
    }
    if (ele && ele.attr('can-swipe-back') === 'false') {
      return false;
    }
    var eleChild = ele.find('ion-view');
    if (eleChild && eleChild.attr('can-swipe-back') === 'false') {
      return false;
    }
    return true;
  }

}])

.run([
  '$rootScope',
  '$state',
  '$location',
  '$document',
  '$ionicPlatform',
  '$ionicHistory',
  'IONIC_BACK_PRIORITY',
function($rootScope, $state, $location, $document, $ionicPlatform, $ionicHistory, IONIC_BACK_PRIORITY) {

  // always reset the keyboard state when change stage
  $rootScope.$on('$ionicView.beforeEnter', function() {
    ionic.keyboard && ionic.keyboard.hide && ionic.keyboard.hide();
  });

  $rootScope.$on('$ionicHistory.change', function(e, data) {
    if (!data) return null;

    var viewHistory = $ionicHistory.viewHistory();

    var hist = (data.historyId ? viewHistory.histories[ data.historyId ] : null);
    if (hist && hist.cursor > -1 && hist.cursor < hist.stack.length) {
      // the history they're going to already exists
      // go to it's last view in its stack
      var view = hist.stack[ hist.cursor ];
      return view.go(data);
    }

    // this history does not have a URL, but it does have a uiSref
    // figure out its URL from the uiSref
    if (!data.url && data.uiSref) {
      data.url = $state.href(data.uiSref);
    }

    if (data.url) {
      // don't let it start with a #, messes with $location.url()
      if (data.url.indexOf('#') === 0) {
        data.url = data.url.replace('#', '');
      }
      if (data.url !== $location.url()) {
        // we've got a good URL, ready GO!
        $location.url(data.url);
      }
    }
  });

  $rootScope.$ionicGoBack = function(backCount) {
    $ionicHistory.goBack(backCount);
  };

  // Set the document title when a new view is shown
  $rootScope.$on('$ionicView.afterEnter', function(ev, data) {
    if (data && data.title) {
      $document[0].title = data.title;
    }
  });

  // Triggered when devices with a hardware back button (Android) is clicked by the user
  // This is a Cordova/Phonegap platform specifc method
  function onHardwareBackButton(e) {
    var backView = $ionicHistory.backView();
    if (backView) {
      // there is a back view, go to it
      backView.go();
    } else {
      // there is no back view, so close the app instead
      ionic.Platform.exitApp();
    }
    e.preventDefault();
    return false;
  }
  $ionicPlatform.registerBackButtonAction(
    onHardwareBackButton,
    IONIC_BACK_PRIORITY.view
  );

}]);

/**
 * @ngdoc provider
 * @name $ionicConfigProvider
 * @module ionic
 * @description
 * Ionic automatically takes platform configurations into account to adjust things like what
 * transition style to use and whether tab icons should show on the top or bottom. For example,
 * iOS will move forward by transitioning the entering view from right to center and the leaving
 * view from center to left. However, Android will transition with the entering view going from
 * bottom to center, covering the previous view, which remains stationary. It should be noted
 * that when a platform is not iOS or Android, then it'll default to iOS. So if you are
 * developing on a desktop browser, it's going to take on iOS default configs.
 *
 * These configs can be changed using the `$ionicConfigProvider` during the configuration phase
 * of your app. Additionally, `$ionicConfig` can also set and get config values during the run
 * phase and within the app itself.
 *
 * By default, all base config variables are set to `'platform'`, which means it'll take on the
 * default config of the platform on which it's running. Config variables can be set at this
 * level so all platforms follow the same setting, rather than its platform config.
 * The following code would set the same config variable for all platforms:
 *
 * ```js
 * $ionicConfigProvider.views.maxCache(10);
 * ```
 *
 * Additionally, each platform can have it's own config within the `$ionicConfigProvider.platform`
 * property. The config below would only apply to Android devices.
 *
 * ```js
 * $ionicConfigProvider.platform.android.views.maxCache(5);
 * ```
 *
 * @usage
 * ```js
 * var myApp = angular.module('reallyCoolApp', ['ionic']);
 *
 * myApp.config(function($ionicConfigProvider) {
 *   $ionicConfigProvider.views.maxCache(5);
 *
 *   // note that you can also chain configs
 *   $ionicConfigProvider.backButton.text('Go Back').icon('ion-chevron-left');
 * });
 * ```
 */

/**
 * @ngdoc method
 * @name $ionicConfigProvider#views.transition
 * @description Animation style when transitioning between views. Default `platform`.
 *
 * @param {string} transition Which style of view transitioning to use.
 *
 * * `platform`: Dynamically choose the correct transition style depending on the platform
 * the app is running from. If the platform is not `ios` or `android` then it will default
 * to `ios`.
 * * `ios`: iOS style transition.
 * * `android`: Android style transition.
 * * `none`: Do not perform animated transitions.
 *
 * @returns {string} value
 */

/**
 * @ngdoc method
 * @name $ionicConfigProvider#views.maxCache
 * @description  Maximum number of view elements to cache in the DOM. When the max number is
 * exceeded, the view with the longest time period since it was accessed is removed. Views that
 * stay in the DOM cache the view's scope, current state, and scroll position. The scope is
 * disconnected from the `$watch` cycle when it is cached and reconnected when it enters again.
 * When the maximum cache is `0`, the leaving view's element will be removed from the DOM after
 * each view transition, and the next time the same view is shown, it will have to re-compile,
 * attach to the DOM, and link the element again. This disables caching, in effect.
 * @param {number} maxNumber Maximum number of views to retain. Default `10`.
 * @returns {number} How many views Ionic will hold onto until the a view is removed.
 */

/**
 * @ngdoc method
 * @name $ionicConfigProvider#views.forwardCache
 * @description  By default, when navigating, views that were recently visited are cached, and
 * the same instance data and DOM elements are referenced when navigating back. However, when
 * navigating back in the history, the "forward" views are removed from the cache. If you
 * navigate forward to the same view again, it'll create a new DOM element and controller
 * instance. Basically, any forward views are reset each time. Set this config to `true` to have
 * forward views cached and not reset on each load.
 * @param {boolean} value
 * @returns {boolean}
 */

 /**
  * @ngdoc method
  * @name $ionicConfigProvider#views.swipeBackEnabled
  * @description  By default on iOS devices, swipe to go back functionality is enabled by default.
  * This method can be used to disable it globally, or on a per-view basis.
  * Note: This functionality is only supported on iOS.
  * @param {boolean} value
  * @returns {boolean}
  */

/**
 * @ngdoc method
 * @name $ionicConfigProvider#scrolling.jsScrolling
 * @description  Whether to use JS or Native scrolling. Defaults to native scrolling. Setting this to
 * `true` has the same effect as setting each `ion-content` to have `overflow-scroll='false'`.
 * @param {boolean} value Defaults to `false` as of Ionic 1.2
 * @returns {boolean}
 */

/**
 * @ngdoc method
 * @name $ionicConfigProvider#backButton.icon
 * @description Back button icon.
 * @param {string} value
 * @returns {string}
 */

/**
 * @ngdoc method
 * @name $ionicConfigProvider#backButton.text
 * @description Back button text.
 * @param {string} value Defaults to `Back`.
 * @returns {string}
 */

/**
 * @ngdoc method
 * @name $ionicConfigProvider#backButton.previousTitleText
 * @description If the previous title text should become the back button text. This
 * is the default for iOS.
 * @param {boolean} value
 * @returns {boolean}
 */

/**
 * @ngdoc method
 * @name $ionicConfigProvider#form.checkbox
 * @description Checkbox style. Android defaults to `square` and iOS defaults to `circle`.
 * @param {string} value
 * @returns {string}
 */

/**
 * @ngdoc method
 * @name $ionicConfigProvider#form.toggle
 * @description Toggle item style. Android defaults to `small` and iOS defaults to `large`.
 * @param {string} value
 * @returns {string}
 */

/**
 * @ngdoc method
 * @name $ionicConfigProvider#spinner.icon
 * @description Default spinner icon to use.
 * @param {string} value Can be: `android`, `ios`, `ios-small`, `bubbles`, `circles`, `crescent`,
 * `dots`, `lines`, `ripple`, or `spiral`.
 * @returns {string}
 */

/**
 * @ngdoc method
 * @name $ionicConfigProvider#tabs.style
 * @description Tab style. Android defaults to `striped` and iOS defaults to `standard`.
 * @param {string} value Available values include `striped` and `standard`.
 * @returns {string}
 */

/**
 * @ngdoc method
 * @name $ionicConfigProvider#tabs.position
 * @description Tab position. Android defaults to `top` and iOS defaults to `bottom`.
 * @param {string} value Available values include `top` and `bottom`.
 * @returns {string}
 */

/**
 * @ngdoc method
 * @name $ionicConfigProvider#templates.maxPrefetch
 * @description Sets the maximum number of templates to prefetch from the templateUrls defined in
 * $stateProvider.state. If set to `0`, the user will have to wait
 * for a template to be fetched the first time when navigating to a new page. Default `30`.
 * @param {integer} value Max number of template to prefetch from the templateUrls defined in
 * `$stateProvider.state()`.
 * @returns {integer}
 */

/**
 * @ngdoc method
 * @name $ionicConfigProvider#navBar.alignTitle
 * @description Which side of the navBar to align the title. Default `center`.
 *
 * @param {string} value side of the navBar to align the title.
 *
 * * `platform`: Dynamically choose the correct title style depending on the platform
 * the app is running from. If the platform is `ios`, it will default to `center`.
 * If the platform is `android`, it will default to `left`. If the platform is not
 * `ios` or `android`, it will default to `center`.
 *
 * * `left`: Left align the title in the navBar
 * * `center`: Center align the title in the navBar
 * * `right`: Right align the title in the navBar.
 *
 * @returns {string} value
 */

/**
  * @ngdoc method
  * @name $ionicConfigProvider#navBar.positionPrimaryButtons
  * @description Which side of the navBar to align the primary navBar buttons. Default `left`.
  *
  * @param {string} value side of the navBar to align the primary navBar buttons.
  *
  * * `platform`: Dynamically choose the correct title style depending on the platform
  * the app is running from. If the platform is `ios`, it will default to `left`.
  * If the platform is `android`, it will default to `right`. If the platform is not
  * `ios` or `android`, it will default to `left`.
  *
  * * `left`: Left align the primary navBar buttons in the navBar
  * * `right`: Right align the primary navBar buttons in the navBar.
  *
  * @returns {string} value
  */

/**
 * @ngdoc method
 * @name $ionicConfigProvider#navBar.positionSecondaryButtons
 * @description Which side of the navBar to align the secondary navBar buttons. Default `right`.
 *
 * @param {string} value side of the navBar to align the secondary navBar buttons.
 *
 * * `platform`: Dynamically choose the correct title style depending on the platform
 * the app is running from. If the platform is `ios`, it will default to `right`.
 * If the platform is `android`, it will default to `right`. If the platform is not
 * `ios` or `android`, it will default to `right`.
 *
 * * `left`: Left align the secondary navBar buttons in the navBar
 * * `right`: Right align the secondary navBar buttons in the navBar.
 *
 * @returns {string} value
 */

IonicModule
.provider('$ionicConfig', function() {

  var provider = this;
  provider.platform = {};
  var PLATFORM = 'platform';

  var configProperties = {
    views: {
      maxCache: PLATFORM,
      forwardCache: PLATFORM,
      transition: PLATFORM,
      swipeBackEnabled: PLATFORM,
      swipeBackHitWidth: PLATFORM
    },
    navBar: {
      alignTitle: PLATFORM,
      positionPrimaryButtons: PLATFORM,
      positionSecondaryButtons: PLATFORM,
      transition: PLATFORM
    },
    backButton: {
      icon: PLATFORM,
      text: PLATFORM,
      previousTitleText: PLATFORM
    },
    form: {
      checkbox: PLATFORM,
      toggle: PLATFORM
    },
    scrolling: {
      jsScrolling: PLATFORM
    },
    spinner: {
      icon: PLATFORM
    },
    tabs: {
      style: PLATFORM,
      position: PLATFORM
    },
    templates: {
      maxPrefetch: PLATFORM
    },
    platform: {}
  };
  createConfig(configProperties, provider, '');



  // Default
  // -------------------------
  setPlatformConfig('default', {

    views: {
      maxCache: 10,
      forwardCache: false,
      transition: 'ios',
      swipeBackEnabled: true,
      swipeBackHitWidth: 45
    },

    navBar: {
      alignTitle: 'center',
      positionPrimaryButtons: 'left',
      positionSecondaryButtons: 'right',
      transition: 'view'
    },

    backButton: {
      icon: 'ion-ios-arrow-back',
      text: 'Back',
      previousTitleText: true
    },

    form: {
      checkbox: 'circle',
      toggle: 'large'
    },

    scrolling: {
      jsScrolling: true
    },

    spinner: {
      icon: 'ios'
    },

    tabs: {
      style: 'standard',
      position: 'bottom'
    },

    templates: {
      maxPrefetch: 30
    }

  });



  // iOS (it is the default already)
  // -------------------------
  setPlatformConfig('ios', {});



  // Android
  // -------------------------
  setPlatformConfig('android', {

    views: {
      transition: 'android',
      swipeBackEnabled: false
    },

    navBar: {
      alignTitle: 'left',
      positionPrimaryButtons: 'right',
      positionSecondaryButtons: 'right'
    },

    backButton: {
      icon: 'ion-android-arrow-back',
      text: false,
      previousTitleText: false
    },

    form: {
      checkbox: 'square',
      toggle: 'small'
    },

    spinner: {
      icon: 'android'
    },

    tabs: {
      style: 'striped',
      position: 'top'
    },

    scrolling: {
      jsScrolling: false
    }
  });

  // Windows Phone
  // -------------------------
  setPlatformConfig('windowsphone', {
    //scrolling: {
    //  jsScrolling: false
    //}
    spinner: {
      icon: 'android'
    }
  });


  provider.transitions = {
    views: {},
    navBar: {}
  };


  // iOS Transitions
  // -----------------------
  provider.transitions.views.ios = function(enteringEle, leavingEle, direction, shouldAnimate) {

    function setStyles(ele, opacity, x, boxShadowOpacity) {
      var css = {};
      css[ionic.CSS.TRANSITION_DURATION] = d.shouldAnimate ? '' : 0;
      css.opacity = opacity;
      if (boxShadowOpacity > -1) {
        css.boxShadow = '0 0 10px rgba(0,0,0,' + (d.shouldAnimate ? boxShadowOpacity * 0.45 : 0.3) + ')';
      }
      css[ionic.CSS.TRANSFORM] = 'translate3d(' + x + '%,0,0)';
      ionic.DomUtil.cachedStyles(ele, css);
    }

    var d = {
      run: function(step) {
        if (direction == 'forward') {
          setStyles(enteringEle, 1, (1 - step) * 99, 1 - step); // starting at 98% prevents a flicker
          setStyles(leavingEle, (1 - 0.1 * step), step * -33, -1);

        } else if (direction == 'back') {
          setStyles(enteringEle, (1 - 0.1 * (1 - step)), (1 - step) * -33, -1);
          setStyles(leavingEle, 1, step * 100, 1 - step);

        } else {
          // swap, enter, exit
          setStyles(enteringEle, 1, 0, -1);
          setStyles(leavingEle, 0, 0, -1);
        }
      },
      shouldAnimate: shouldAnimate && (direction == 'forward' || direction == 'back')
    };

    return d;
  };

  provider.transitions.navBar.ios = function(enteringHeaderBar, leavingHeaderBar, direction, shouldAnimate) {

    function setStyles(ctrl, opacity, titleX, backTextX) {
      var css = {};
      css[ionic.CSS.TRANSITION_DURATION] = d.shouldAnimate ? '' : '0ms';
      css.opacity = opacity === 1 ? '' : opacity;

      ctrl.setCss('buttons-left', css);
      ctrl.setCss('buttons-right', css);
      ctrl.setCss('back-button', css);

      css[ionic.CSS.TRANSFORM] = 'translate3d(' + backTextX + 'px,0,0)';
      ctrl.setCss('back-text', css);

      css[ionic.CSS.TRANSFORM] = 'translate3d(' + titleX + 'px,0,0)';
      ctrl.setCss('title', css);
    }

    function enter(ctrlA, ctrlB, step) {
      if (!ctrlA || !ctrlB) return;
      var titleX = (ctrlA.titleTextX() + ctrlA.titleWidth()) * (1 - step);
      var backTextX = (ctrlB && (ctrlB.titleTextX() - ctrlA.backButtonTextLeft()) * (1 - step)) || 0;
      setStyles(ctrlA, step, titleX, backTextX);
    }

    function leave(ctrlA, ctrlB, step) {
      if (!ctrlA || !ctrlB) return;
      var titleX = (-(ctrlA.titleTextX() - ctrlB.backButtonTextLeft()) - (ctrlA.titleLeftRight())) * step;
      setStyles(ctrlA, 1 - step, titleX, 0);
    }

    var d = {
      run: function(step) {
        var enteringHeaderCtrl = enteringHeaderBar.controller();
        var leavingHeaderCtrl = leavingHeaderBar && leavingHeaderBar.controller();
        if (d.direction == 'back') {
          leave(enteringHeaderCtrl, leavingHeaderCtrl, 1 - step);
          enter(leavingHeaderCtrl, enteringHeaderCtrl, 1 - step);
        } else {
          enter(enteringHeaderCtrl, leavingHeaderCtrl, step);
          leave(leavingHeaderCtrl, enteringHeaderCtrl, step);
        }
      },
      direction: direction,
      shouldAnimate: shouldAnimate && (direction == 'forward' || direction == 'back')
    };

    return d;
  };


  // Android Transitions
  // -----------------------

  provider.transitions.views.android = function(enteringEle, leavingEle, direction, shouldAnimate) {
    shouldAnimate = shouldAnimate && (direction == 'forward' || direction == 'back');

    function setStyles(ele, x, opacity) {
      var css = {};
      css[ionic.CSS.TRANSITION_DURATION] = d.shouldAnimate ? '' : 0;
      css[ionic.CSS.TRANSFORM] = 'translate3d(' + x + '%,0,0)';
      css.opacity = opacity;
      ionic.DomUtil.cachedStyles(ele, css);
    }

    var d = {
      run: function(step) {
        if (direction == 'forward') {
          setStyles(enteringEle, (1 - step) * 99, 1); // starting at 98% prevents a flicker
          setStyles(leavingEle, step * -100, 1);

        } else if (direction == 'back') {
          setStyles(enteringEle, (1 - step) * -100, 1);
          setStyles(leavingEle, step * 100, 1);

        } else {
          // swap, enter, exit
          setStyles(enteringEle, 0, 1);
          setStyles(leavingEle, 0, 0);
        }
      },
      shouldAnimate: shouldAnimate
    };

    return d;
  };

  provider.transitions.navBar.android = function(enteringHeaderBar, leavingHeaderBar, direction, shouldAnimate) {

    function setStyles(ctrl, opacity) {
      if (!ctrl) return;
      var css = {};
      css.opacity = opacity === 1 ? '' : opacity;

      ctrl.setCss('buttons-left', css);
      ctrl.setCss('buttons-right', css);
      ctrl.setCss('back-button', css);
      ctrl.setCss('back-text', css);
      ctrl.setCss('title', css);
    }

    return {
      run: function(step) {
        setStyles(enteringHeaderBar.controller(), step);
        setStyles(leavingHeaderBar && leavingHeaderBar.controller(), 1 - step);
      },
      shouldAnimate: shouldAnimate && (direction == 'forward' || direction == 'back')
    };
  };


  // No Transition
  // -----------------------

  provider.transitions.views.none = function(enteringEle, leavingEle) {
    return {
      run: function(step) {
        provider.transitions.views.android(enteringEle, leavingEle, false, false).run(step);
      },
      shouldAnimate: false
    };
  };

  provider.transitions.navBar.none = function(enteringHeaderBar, leavingHeaderBar) {
    return {
      run: function(step) {
        provider.transitions.navBar.ios(enteringHeaderBar, leavingHeaderBar, false, false).run(step);
        provider.transitions.navBar.android(enteringHeaderBar, leavingHeaderBar, false, false).run(step);
      },
      shouldAnimate: false
    };
  };


  // private: used to set platform configs
  function setPlatformConfig(platformName, platformConfigs) {
    configProperties.platform[platformName] = platformConfigs;
    provider.platform[platformName] = {};

    addConfig(configProperties, configProperties.platform[platformName]);

    createConfig(configProperties.platform[platformName], provider.platform[platformName], '');
  }


  // private: used to recursively add new platform configs
  function addConfig(configObj, platformObj) {
    for (var n in configObj) {
      if (n != PLATFORM && configObj.hasOwnProperty(n)) {
        if (angular.isObject(configObj[n])) {
          if (!isDefined(platformObj[n])) {
            platformObj[n] = {};
          }
          addConfig(configObj[n], platformObj[n]);

        } else if (!isDefined(platformObj[n])) {
          platformObj[n] = null;
        }
      }
    }
  }


  // private: create methods for each config to get/set
  function createConfig(configObj, providerObj, platformPath) {
    forEach(configObj, function(value, namespace) {

      if (angular.isObject(configObj[namespace])) {
        // recursively drill down the config object so we can create a method for each one
        providerObj[namespace] = {};
        createConfig(configObj[namespace], providerObj[namespace], platformPath + '.' + namespace);

      } else {
        // create a method for the provider/config methods that will be exposed
        providerObj[namespace] = function(newValue) {
          if (arguments.length) {
            configObj[namespace] = newValue;
            return providerObj;
          }
          if (configObj[namespace] == PLATFORM) {
            // if the config is set to 'platform', then get this config's platform value
            var platformConfig = stringObj(configProperties.platform, ionic.Platform.platform() + platformPath + '.' + namespace);
            if (platformConfig || platformConfig === false) {
              return platformConfig;
            }
            // didnt find a specific platform config, now try the default
            return stringObj(configProperties.platform, 'default' + platformPath + '.' + namespace);
          }
          return configObj[namespace];
        };
      }

    });
  }

  function stringObj(obj, str) {
    str = str.split(".");
    for (var i = 0; i < str.length; i++) {
      if (obj && isDefined(obj[str[i]])) {
        obj = obj[str[i]];
      } else {
        return null;
      }
    }
    return obj;
  }

  provider.setPlatformConfig = setPlatformConfig;


  // private: Service definition for internal Ionic use
  /**
   * @ngdoc service
   * @name $ionicConfig
   * @module ionic
   * @private
   */
  provider.$get = function() {
    return provider;
  };
})
// Fix for URLs in Cordova apps on Windows Phone
// http://blogs.msdn.com/b/msdn_answers/archive/2015/02/10/
// running-cordova-apps-on-windows-and-windows-phone-8-1-using-ionic-angularjs-and-other-frameworks.aspx
.config(['$compileProvider', function($compileProvider) {
  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|sms|tel|geo|ftp|mailto|file|ghttps?|ms-appx-web|ms-appx|x-wmapp0):/);
  $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|file|content|blob|ms-appx|ms-appx-web|x-wmapp0):|data:image\//);
}]);


var LOADING_TPL =
  '<div class="loading-container">' +
    '<div class="loading">' +
    '</div>' +
  '</div>';

/**
 * @ngdoc service
 * @name $ionicLoading
 * @module ionic
 * @description
 * An overlay that can be used to indicate activity while blocking user
 * interaction.
 *
 * @usage
 * ```js
 * angular.module('LoadingApp', ['ionic'])
 * .controller('LoadingCtrl', function($scope, $ionicLoading) {
 *   $scope.show = function() {
 *     $ionicLoading.show({
 *       template: 'Loading...'
 *     }).then(function(){
 *        console.log("The loading indicator is now displayed");
 *     });
 *   };
 *   $scope.hide = function(){
 *     $ionicLoading.hide().then(function(){
 *        console.log("The loading indicator is now hidden");
 *     });
 *   };
 * });
 * ```
 */
/**
 * @ngdoc object
 * @name $ionicLoadingConfig
 * @module ionic
 * @description
 * Set the default options to be passed to the {@link ionic.service:$ionicLoading} service.
 *
 * @usage
 * ```js
 * var app = angular.module('myApp', ['ionic'])
 * app.constant('$ionicLoadingConfig', {
 *   template: 'Default Loading Template...'
 * });
 * app.controller('AppCtrl', function($scope, $ionicLoading) {
 *   $scope.showLoading = function() {
 *     //options default to values in $ionicLoadingConfig
 *     $ionicLoading.show().then(function(){
 *        console.log("The loading indicator is now displayed");
 *     });
 *   };
 * });
 * ```
 */
IonicModule
.constant('$ionicLoadingConfig', {
  template: '<ion-spinner></ion-spinner>'
})
.factory('$ionicLoading', [
  '$ionicLoadingConfig',
  '$ionicBody',
  '$ionicTemplateLoader',
  '$ionicBackdrop',
  '$timeout',
  '$q',
  '$log',
  '$compile',
  '$ionicPlatform',
  '$rootScope',
  'IONIC_BACK_PRIORITY',
function($ionicLoadingConfig, $ionicBody, $ionicTemplateLoader, $ionicBackdrop, $timeout, $q, $log, $compile, $ionicPlatform, $rootScope, IONIC_BACK_PRIORITY) {

  var loaderInstance;
  //default values
  var deregisterBackAction = noop;
  var deregisterStateListener1 = noop;
  var deregisterStateListener2 = noop;
  var loadingShowDelay = $q.when();

  return {
    /**
     * @ngdoc method
     * @name $ionicLoading#show
     * @description Shows a loading indicator. If the indicator is already shown,
     * it will set the options given and keep the indicator shown.
     * @returns {promise} A promise which is resolved when the loading indicator is presented.
     * @param {object} opts The options for the loading indicator. Available properties:
     *  - `{string=}` `template` The html content of the indicator.
     *  - `{string=}` `templateUrl` The url of an html template to load as the content of the indicator.
     *  - `{object=}` `scope` The scope to be a child of. Default: creates a child of $rootScope.
     *  - `{boolean=}` `noBackdrop` Whether to hide the backdrop. By default it will be shown.
     *  - `{boolean=}` `hideOnStateChange` Whether to hide the loading spinner when navigating
     *    to a new state. Default false.
     *  - `{number=}` `delay` How many milliseconds to delay showing the indicator. By default there is no delay.
     *  - `{number=}` `duration` How many milliseconds to wait until automatically
     *  hiding the indicator. By default, the indicator will be shown until `.hide()` is called.
     */
    show: showLoader,
    /**
     * @ngdoc method
     * @name $ionicLoading#hide
     * @description Hides the loading indicator, if shown.
     * @returns {promise} A promise which is resolved when the loading indicator is hidden.
     */
    hide: hideLoader,
    /**
     * @private for testing
     */
    _getLoader: getLoader
  };

  function getLoader() {
    if (!loaderInstance) {
      loaderInstance = $ionicTemplateLoader.compile({
        template: LOADING_TPL,
        appendTo: $ionicBody.get()
      })
      .then(function(self) {
        self.show = function(options) {
          var templatePromise = options.templateUrl ?
            $ionicTemplateLoader.load(options.templateUrl) :
            //options.content: deprecated
            $q.when(options.template || options.content || '');

          self.scope = options.scope || self.scope;

          if (!self.isShown) {
            //options.showBackdrop: deprecated
            self.hasBackdrop = !options.noBackdrop && options.showBackdrop !== false;
            if (self.hasBackdrop) {
              $ionicBackdrop.retain();
              $ionicBackdrop.getElement().addClass('backdrop-loading');
            }
          }

          if (options.duration) {
            $timeout.cancel(self.durationTimeout);
            self.durationTimeout = $timeout(
              angular.bind(self, self.hide),
              +options.duration
            );
          }

          deregisterBackAction();
          //Disable hardware back button while loading
          deregisterBackAction = $ionicPlatform.registerBackButtonAction(
            noop,
            IONIC_BACK_PRIORITY.loading
          );

          templatePromise.then(function(html) {
            if (html) {
              var loading = self.element.children();
              loading.html(html);
              $compile(loading.contents())(self.scope);
            }

            //Don't show until template changes
            if (self.isShown) {
              self.element.addClass('visible');
              ionic.requestAnimationFrame(function() {
                if (self.isShown) {
                  self.element.addClass('active');
                  $ionicBody.addClass('loading-active');
                }
              });
            }
          });

          self.isShown = true;
        };
        self.hide = function() {

          deregisterBackAction();
          if (self.isShown) {
            if (self.hasBackdrop) {
              $ionicBackdrop.release();
              $ionicBackdrop.getElement().removeClass('backdrop-loading');
            }
            self.element.removeClass('active');
            $ionicBody.removeClass('loading-active');
            self.element.removeClass('visible');
            ionic.requestAnimationFrame(function() {
              !self.isShown && self.element.removeClass('visible');
            });
          }
          $timeout.cancel(self.durationTimeout);
          self.isShown = false;
          var loading = self.element.children();
          loading.html("");
        };

        return self;
      });
    }
    return loaderInstance;
  }

  function showLoader(options) {
    options = extend({}, $ionicLoadingConfig || {}, options || {});
    // use a default delay of 100 to avoid some issues reported on github
    // https://github.com/driftyco/ionic/issues/3717
    var delay = options.delay || options.showDelay || 0;

    deregisterStateListener1();
    deregisterStateListener2();
    if (options.hideOnStateChange) {
      deregisterStateListener1 = $rootScope.$on('$stateChangeSuccess', hideLoader);
      deregisterStateListener2 = $rootScope.$on('$stateChangeError', hideLoader);
    }

    //If loading.show() was called previously, cancel it and show with our new options
    $timeout.cancel(loadingShowDelay);
    loadingShowDelay = $timeout(noop, delay);
    return loadingShowDelay.then(getLoader).then(function(loader) {
      return loader.show(options);
    });
  }

  function hideLoader() {
    deregisterStateListener1();
    deregisterStateListener2();
    $timeout.cancel(loadingShowDelay);
    return getLoader().then(function(loader) {
      return loader.hide();
    });
  }
}]);

/**
 * @ngdoc service
 * @name $ionicModal
 * @module ionic
 * @codepen gblny
 * @description
 *
 * Related: {@link ionic.controller:ionicModal ionicModal controller}.
 *
 * The Modal is a content pane that can go over the user's main view
 * temporarily.  Usually used for making a choice or editing an item.
 *
 * Put the content of the modal inside of an `<ion-modal-view>` element.
 *
 * **Notes:**
 * - A modal will broadcast 'modal.shown', 'modal.hidden', and 'modal.removed' events from its originating
 * scope, passing in itself as an event argument. Both the modal.removed and modal.hidden events are
 * called when the modal is removed.
 *
 * - This example assumes your modal is in your main index file or another template file. If it is in its own
 * template file, remove the script tags and call it by file name.
 *
 * @usage
 * ```html
 * <script id="my-modal.html" type="text/ng-template">
 *   <ion-modal-view>
 *     <ion-header-bar>
 *       <h1 class="title">My Modal title</h1>
 *     </ion-header-bar>
 *     <ion-content>
 *       Hello!
 *     </ion-content>
 *   </ion-modal-view>
 * </script>
 * ```
 * ```js
 * angular.module('testApp', ['ionic'])
 * .controller('MyController', function($scope, $ionicModal) {
 *   $ionicModal.fromTemplateUrl('my-modal.html', {
 *     scope: $scope,
 *     animation: 'slide-in-up'
 *   }).then(function(modal) {
 *     $scope.modal = modal;
 *   });
 *   $scope.openModal = function() {
 *     $scope.modal.show();
 *   };
 *   $scope.closeModal = function() {
 *     $scope.modal.hide();
 *   };
 *   // Cleanup the modal when we're done with it!
 *   $scope.$on('$destroy', function() {
 *     $scope.modal.remove();
 *   });
 *   // Execute action on hide modal
 *   $scope.$on('modal.hidden', function() {
 *     // Execute action
 *   });
 *   // Execute action on remove modal
 *   $scope.$on('modal.removed', function() {
 *     // Execute action
 *   });
 * });
 * ```
 */
IonicModule
.factory('$ionicModal', [
  '$rootScope',
  '$ionicBody',
  '$compile',
  '$timeout',
  '$ionicPlatform',
  '$ionicTemplateLoader',
  '$$q',
  '$log',
  '$ionicClickBlock',
  '$window',
  'IONIC_BACK_PRIORITY',
function($rootScope, $ionicBody, $compile, $timeout, $ionicPlatform, $ionicTemplateLoader, $$q, $log, $ionicClickBlock, $window, IONIC_BACK_PRIORITY) {

  /**
   * @ngdoc controller
   * @name ionicModal
   * @module ionic
   * @description
   * Instantiated by the {@link ionic.service:$ionicModal} service.
   *
   * Be sure to call [remove()](#remove) when you are done with each modal
   * to clean it up and avoid memory leaks.
   *
   * Note: a modal will broadcast 'modal.shown', 'modal.hidden', and 'modal.removed' events from its originating
   * scope, passing in itself as an event argument. Note: both modal.removed and modal.hidden are
   * called when the modal is removed.
   */
  var ModalView = ionic.views.Modal.inherit({
    /**
     * @ngdoc method
     * @name ionicModal#initialize
     * @description Creates a new modal controller instance.
     * @param {object} options An options object with the following properties:
     *  - `{object=}` `scope` The scope to be a child of.
     *    Default: creates a child of $rootScope.
     *  - `{string=}` `animation` The animation to show & hide with.
     *    Default: 'slide-in-up'
     *  - `{boolean=}` `focusFirstInput` Whether to autofocus the first input of
     *    the modal when shown. Will only show the keyboard on iOS, to force the keyboard to show
     *    on Android, please use the [Ionic keyboard plugin](https://github.com/driftyco/ionic-plugin-keyboard#keyboardshow).
     *    Default: false.
     *  - `{boolean=}` `backdropClickToClose` Whether to close the modal on clicking the backdrop.
     *    Default: true.
     *  - `{boolean=}` `hardwareBackButtonClose` Whether the modal can be closed using the hardware
     *    back button on Android and similar devices.  Default: true.
     */
    initialize: function(opts) {
      ionic.views.Modal.prototype.initialize.call(this, opts);
      this.animation = opts.animation || 'slide-in-up';
    },

    /**
     * @ngdoc method
     * @name ionicModal#show
     * @description Show this modal instance.
     * @returns {promise} A promise which is resolved when the modal is finished animating in.
     */
    show: function(target) {
      var self = this;

      if (self.scope.$$destroyed) {
        $log.error('Cannot call ' + self.viewType + '.show() after remove(). Please create a new ' + self.viewType + ' instance.');
        return $$q.when();
      }

      // on iOS, clicks will sometimes bleed through/ghost click on underlying
      // elements
      $ionicClickBlock.show(600);
      stack.add(self);

      var modalEl = jqLite(self.modalEl);

      self.el.classList.remove('hide');
      $timeout(function() {
        if (!self._isShown) return;
        $ionicBody.addClass(self.viewType + '-open');
      }, 400, false);

      if (!self.el.parentElement) {
        modalEl.addClass(self.animation);
        $ionicBody.append(self.el);
      }

      // if modal was closed while the keyboard was up, reset scroll view on
      // next show since we can only resize it once it's visible
      var scrollCtrl = modalEl.data('$$ionicScrollController');
      scrollCtrl && scrollCtrl.resize();

      if (target && self.positionView) {
        self.positionView(target, modalEl);
        // set up a listener for in case the window size changes

        self._onWindowResize = function() {
          if (self._isShown) self.positionView(target, modalEl);
        };
        ionic.on('resize', self._onWindowResize, window);
      }

      modalEl.addClass('ng-enter active')
             .removeClass('ng-leave ng-leave-active');

      self._isShown = true;
      self._deregisterBackButton = $ionicPlatform.registerBackButtonAction(
        self.hardwareBackButtonClose ? angular.bind(self, self.hide) : noop,
        IONIC_BACK_PRIORITY.modal
      );

      ionic.views.Modal.prototype.show.call(self);

      $timeout(function() {
        if (!self._isShown) return;
        modalEl.addClass('ng-enter-active');
        ionic.trigger('resize');
        self.scope.$parent && self.scope.$parent.$broadcast(self.viewType + '.shown', self);
        self.el.classList.add('active');
        self.scope.$broadcast('$ionicHeader.align');
        self.scope.$broadcast('$ionicFooter.align');
        self.scope.$broadcast('$ionic.modalPresented');
      }, 20);

      return $timeout(function() {
        if (!self._isShown) return;
        self.$el.on('touchmove', function(e) {
          //Don't allow scrolling while open by dragging on backdrop
          var isInScroll = ionic.DomUtil.getParentOrSelfWithClass(e.target, 'scroll');
          if (!isInScroll) {
            e.preventDefault();
          }
        });
        //After animating in, allow hide on backdrop click
        self.$el.on('click', function(e) {
          if (self.backdropClickToClose && e.target === self.el && stack.isHighest(self)) {
            self.hide();
          }
        });
      }, 400);
    },

    /**
     * @ngdoc method
     * @name ionicModal#hide
     * @description Hide this modal instance.
     * @returns {promise} A promise which is resolved when the modal is finished animating out.
     */
    hide: function() {
      var self = this;
      var modalEl = jqLite(self.modalEl);

      // on iOS, clicks will sometimes bleed through/ghost click on underlying
      // elements
      $ionicClickBlock.show(600);
      stack.remove(self);

      self.el.classList.remove('active');
      modalEl.addClass('ng-leave');

      $timeout(function() {
        if (self._isShown) return;
        modalEl.addClass('ng-leave-active')
               .removeClass('ng-enter ng-enter-active active');

        self.scope.$broadcast('$ionic.modalRemoved');
      }, 20, false);

      self.$el.off('click');
      self._isShown = false;
      self.scope.$parent && self.scope.$parent.$broadcast(self.viewType + '.hidden', self);
      self._deregisterBackButton && self._deregisterBackButton();

      ionic.views.Modal.prototype.hide.call(self);

      // clean up event listeners
      if (self.positionView) {
        ionic.off('resize', self._onWindowResize, window);
      }

      return $timeout(function() {
        $ionicBody.removeClass(self.viewType + '-open');
        self.el.classList.add('hide');
      }, self.hideDelay || 320);
    },

    /**
     * @ngdoc method
     * @name ionicModal#remove
     * @description Remove this modal instance from the DOM and clean up.
     * @returns {promise} A promise which is resolved when the modal is finished animating out.
     */
    remove: function() {
      var self = this,
          deferred, promise;
      self.scope.$parent && self.scope.$parent.$broadcast(self.viewType + '.removed', self);

      // Only hide modal, when it is actually shown!
      // The hide function shows a click-block-div for a split second, because on iOS,
      // clicks will sometimes bleed through/ghost click on underlying elements.
      // However, this will make the app unresponsive for short amount of time.
      // We don't want that, if the modal window is already hidden.
      if (self._isShown) {
        promise = self.hide();
      } else {
        deferred = $$q.defer();
        deferred.resolve();
        promise = deferred.promise;
      }

      return promise.then(function() {
        self.scope.$destroy();
        self.$el.remove();
      });
    },

    /**
     * @ngdoc method
     * @name ionicModal#isShown
     * @returns boolean Whether this modal is currently shown.
     */
    isShown: function() {
      return !!this._isShown;
    }
  });

  var createModal = function(templateString, options) {
    // Create a new scope for the modal
    var scope = options.scope && options.scope.$new() || $rootScope.$new(true);

    options.viewType = options.viewType || 'modal';

    extend(scope, {
      $hasHeader: false,
      $hasSubheader: false,
      $hasFooter: false,
      $hasSubfooter: false,
      $hasTabs: false,
      $hasTabsTop: false
    });

    // Compile the template
    var element = $compile('<ion-' + options.viewType + '>' + templateString + '</ion-' + options.viewType + '>')(scope);

    options.$el = element;
    options.el = element[0];
    options.modalEl = options.el.querySelector('.' + options.viewType);
    var modal = new ModalView(options);

    modal.scope = scope;

    // If this wasn't a defined scope, we can assign the viewType to the isolated scope
    // we created
    if (!options.scope) {
      scope[ options.viewType ] = modal;
    }

    return modal;
  };

  var modalStack = [];
  var stack = {
    add: function(modal) {
      modalStack.push(modal);
    },
    remove: function(modal) {
      var index = modalStack.indexOf(modal);
      if (index > -1 && index < modalStack.length) {
        modalStack.splice(index, 1);
      }
    },
    isHighest: function(modal) {
      var index = modalStack.indexOf(modal);
      return (index > -1 && index === modalStack.length - 1);
    }
  };

  return {
    /**
     * @ngdoc method
     * @name $ionicModal#fromTemplate
     * @param {string} templateString The template string to use as the modal's
     * content.
     * @param {object} options Options to be passed {@link ionic.controller:ionicModal#initialize ionicModal#initialize} method.
     * @returns {object} An instance of an {@link ionic.controller:ionicModal}
     * controller.
     */
    fromTemplate: function(templateString, options) {
      var modal = createModal(templateString, options || {});
      return modal;
    },
    /**
     * @ngdoc method
     * @name $ionicModal#fromTemplateUrl
     * @param {string} templateUrl The url to load the template from.
     * @param {object} options Options to be passed {@link ionic.controller:ionicModal#initialize ionicModal#initialize} method.
     * options object.
     * @returns {promise} A promise that will be resolved with an instance of
     * an {@link ionic.controller:ionicModal} controller.
     */
    fromTemplateUrl: function(url, options, _) {
      var cb;
      //Deprecated: allow a callback as second parameter. Now we return a promise.
      if (angular.isFunction(options)) {
        cb = options;
        options = _;
      }
      return $ionicTemplateLoader.load(url).then(function(templateString) {
        var modal = createModal(templateString, options || {});
        cb && cb(modal);
        return modal;
      });
    },

    stack: stack
  };
}]);


/**
 * @ngdoc service
 * @name $ionicNavBarDelegate
 * @module ionic
 * @description
 * Delegate for controlling the {@link ionic.directive:ionNavBar} directive.
 *
 * @usage
 *
 * ```html
 * <body ng-controller="MyCtrl">
 *   <ion-nav-bar>
 *     <button ng-click="setNavTitle('banana')">
 *       Set title to banana!
 *     </button>
 *   </ion-nav-bar>
 * </body>
 * ```
 * ```js
 * function MyCtrl($scope, $ionicNavBarDelegate) {
 *   $scope.setNavTitle = function(title) {
 *     $ionicNavBarDelegate.title(title);
 *   }
 * }
 * ```
 */
IonicModule
.service('$ionicNavBarDelegate', ionic.DelegateService([
  /**
   * @ngdoc method
   * @name $ionicNavBarDelegate#align
   * @description Aligns the title with the buttons in a given direction.
   * @param {string=} direction The direction to the align the title text towards.
   * Available: 'left', 'right', 'center'. Default: 'center'.
   */
  'align',
  /**
   * @ngdoc method
   * @name $ionicNavBarDelegate#showBackButton
   * @description
   * Set/get whether the {@link ionic.directive:ionNavBackButton} is shown
   * (if it exists and there is a previous view that can be navigated to).
   * @param {boolean=} show Whether to show the back button.
   * @returns {boolean} Whether the back button is shown.
   */
  'showBackButton',
  /**
   * @ngdoc method
   * @name $ionicNavBarDelegate#showBar
   * @description
   * Set/get whether the {@link ionic.directive:ionNavBar} is shown.
   * @param {boolean} show Whether to show the bar.
   * @returns {boolean} Whether the bar is shown.
   */
  'showBar',
  /**
   * @ngdoc method
   * @name $ionicNavBarDelegate#title
   * @description
   * Set the title for the {@link ionic.directive:ionNavBar}.
   * @param {string} title The new title to show.
   */
  'title',

  // DEPRECATED, as of v1.0.0-beta14 -------
  'changeTitle',
  'setTitle',
  'getTitle',
  'back',
  'getPreviousTitle'
  // END DEPRECATED -------
]));


IonicModule
.service('$ionicNavViewDelegate', ionic.DelegateService([
  'clearCache'
]));



/**
 * @ngdoc service
 * @name $ionicPlatform
 * @module ionic
 * @description
 * An angular abstraction of {@link ionic.utility:ionic.Platform}.
 *
 * Used to detect the current platform, as well as do things like override the
 * Android back button in PhoneGap/Cordova.
 */
IonicModule
.constant('IONIC_BACK_PRIORITY', {
  view: 100,
  sideMenu: 150,
  modal: 200,
  actionSheet: 300,
  popup: 400,
  loading: 500
})
.provider('$ionicPlatform', function() {
  return {
    $get: ['$q', '$ionicScrollDelegate', function($q, $ionicScrollDelegate) {
      var self = {

        /**
         * @ngdoc method
         * @name $ionicPlatform#onHardwareBackButton
         * @description
         * Some platforms have a hardware back button, so this is one way to
         * bind to it.
         * @param {function} callback the callback to trigger when this event occurs
         */
        onHardwareBackButton: function(cb) {
          ionic.Platform.ready(function() {
            document.addEventListener('backbutton', cb, false);
          });
        },

        /**
         * @ngdoc method
         * @name $ionicPlatform#offHardwareBackButton
         * @description
         * Remove an event listener for the backbutton.
         * @param {function} callback The listener function that was
         * originally bound.
         */
        offHardwareBackButton: function(fn) {
          ionic.Platform.ready(function() {
            document.removeEventListener('backbutton', fn);
          });
        },

        /**
         * @ngdoc method
         * @name $ionicPlatform#registerBackButtonAction
         * @description
         * Register a hardware back button action. Only one action will execute
         * when the back button is clicked, so this method decides which of
         * the registered back button actions has the highest priority.
         *
         * For example, if an actionsheet is showing, the back button should
         * close the actionsheet, but it should not also go back a page view
         * or close a modal which may be open.
         *
         * The priorities for the existing back button hooks are as follows:
         *   Return to previous view = 100
         *   Close side menu = 150
         *   Dismiss modal = 200
         *   Close action sheet = 300
         *   Dismiss popup = 400
         *   Dismiss loading overlay = 500
         *
         * Your back button action will override each of the above actions
         * whose priority is less than the priority you provide. For example,
         * an action assigned a priority of 101 will override the 'return to
         * previous view' action, but not any of the other actions.
         *
         * @param {function} callback Called when the back button is pressed,
         * if this listener is the highest priority.
         * @param {number} priority Only the highest priority will execute.
         * @param {*=} actionId The id to assign this action. Default: a
         * random unique id.
         * @returns {function} A function that, when called, will deregister
         * this backButtonAction.
         */
        $backButtonActions: {},
        registerBackButtonAction: function(fn, priority, actionId) {

          if (!self._hasBackButtonHandler) {
            // add a back button listener if one hasn't been setup yet
            self.$backButtonActions = {};
            self.onHardwareBackButton(self.hardwareBackButtonClick);
            self._hasBackButtonHandler = true;
          }

          var action = {
            id: (actionId ? actionId : ionic.Utils.nextUid()),
            priority: (priority ? priority : 0),
            fn: fn
          };
          self.$backButtonActions[action.id] = action;

          // return a function to de-register this back button action
          return function() {
            delete self.$backButtonActions[action.id];
          };
        },

        /**
         * @private
         */
        hardwareBackButtonClick: function(e) {
          // loop through all the registered back button actions
          // and only run the last one of the highest priority
          var priorityAction, actionId;
          for (actionId in self.$backButtonActions) {
            if (!priorityAction || self.$backButtonActions[actionId].priority >= priorityAction.priority) {
              priorityAction = self.$backButtonActions[actionId];
            }
          }
          if (priorityAction) {
            priorityAction.fn(e);
            return priorityAction;
          }
        },

        is: function(type) {
          return ionic.Platform.is(type);
        },

        /**
         * @ngdoc method
         * @name $ionicPlatform#on
         * @description
         * Add Cordova event listeners, such as `pause`, `resume`, `volumedownbutton`, `batterylow`,
         * `offline`, etc. More information about available event types can be found in
         * [Cordova's event documentation](https://cordova.apache.org/docs/en/edge/cordova_events_events.md.html#Events).
         * @param {string} type Cordova [event type](https://cordova.apache.org/docs/en/edge/cordova_events_events.md.html#Events).
         * @param {function} callback Called when the Cordova event is fired.
         * @returns {function} Returns a deregistration function to remove the event listener.
         */
        on: function(type, cb) {
          ionic.Platform.ready(function() {
            document.addEventListener(type, cb, false);
          });
          return function() {
            ionic.Platform.ready(function() {
              document.removeEventListener(type, cb);
            });
          };
        },

        /**
         * @ngdoc method
         * @name $ionicPlatform#ready
         * @description
         * Trigger a callback once the device is ready,
         * or immediately if the device is already ready.
         * @param {function=} callback The function to call.
         * @returns {promise} A promise which is resolved when the device is ready.
         */
        ready: function(cb) {
          var q = $q.defer();

          ionic.Platform.ready(function() {

            window.addEventListener('statusTap', function() {
              $ionicScrollDelegate.scrollTop(true);
            });

            q.resolve();
            cb && cb();
          });

          return q.promise;
        }
      };

      return self;
    }]
  };

});

/**
 * @ngdoc service
 * @name $ionicPopover
 * @module ionic
 * @description
 *
 * Related: {@link ionic.controller:ionicPopover ionicPopover controller}.
 *
 * The Popover is a view that floats above an app’s content. Popovers provide an
 * easy way to present or gather information from the user and are
 * commonly used in the following situations:
 *
 * - Show more info about the current view
 * - Select a commonly used tool or configuration
 * - Present a list of actions to perform inside one of your views
 *
 * Put the content of the popover inside of an `<ion-popover-view>` element.
 *
 * @usage
 * ```html
 * <p>
 *   <button ng-click="openPopover($event)">Open Popover</button>
 * </p>
 *
 * <script id="my-popover.html" type="text/ng-template">
 *   <ion-popover-view>
 *     <ion-header-bar>
 *       <h1 class="title">My Popover Title</h1>
 *     </ion-header-bar>
 *     <ion-content>
 *       Hello!
 *     </ion-content>
 *   </ion-popover-view>
 * </script>
 * ```
 * ```js
 * angular.module('testApp', ['ionic'])
 * .controller('MyController', function($scope, $ionicPopover) {
 *
 *   // .fromTemplate() method
 *   var template = '<ion-popover-view><ion-header-bar> <h1 class="title">My Popover Title</h1> </ion-header-bar> <ion-content> Hello! </ion-content></ion-popover-view>';
 *
 *   $scope.popover = $ionicPopover.fromTemplate(template, {
 *     scope: $scope
 *   });
 *
 *   // .fromTemplateUrl() method
 *   $ionicPopover.fromTemplateUrl('my-popover.html', {
 *     scope: $scope
 *   }).then(function(popover) {
 *     $scope.popover = popover;
 *   });
 *
 *
 *   $scope.openPopover = function($event) {
 *     $scope.popover.show($event);
 *   };
 *   $scope.closePopover = function() {
 *     $scope.popover.hide();
 *   };
 *   //Cleanup the popover when we're done with it!
 *   $scope.$on('$destroy', function() {
 *     $scope.popover.remove();
 *   });
 *   // Execute action on hide popover
 *   $scope.$on('popover.hidden', function() {
 *     // Execute action
 *   });
 *   // Execute action on remove popover
 *   $scope.$on('popover.removed', function() {
 *     // Execute action
 *   });
 * });
 * ```
 */


IonicModule
.factory('$ionicPopover', ['$ionicModal', '$ionicPosition', '$document', '$window',
function($ionicModal, $ionicPosition, $document, $window) {

  var POPOVER_BODY_PADDING = 6;

  var POPOVER_OPTIONS = {
    viewType: 'popover',
    hideDelay: 1,
    animation: 'none',
    positionView: positionView
  };

  function positionView(target, popoverEle) {
    var targetEle = jqLite(target.target || target);
    var buttonOffset = $ionicPosition.offset(targetEle);
    var popoverWidth = popoverEle.prop('offsetWidth');
    var popoverHeight = popoverEle.prop('offsetHeight');
    // Use innerWidth and innerHeight, because clientWidth and clientHeight
    // doesn't work consistently for body on all platforms
    var bodyWidth = $window.innerWidth;
    var bodyHeight = $window.innerHeight;

    var popoverCSS = {
      left: buttonOffset.left + buttonOffset.width / 2 - popoverWidth / 2
    };
    var arrowEle = jqLite(popoverEle[0].querySelector('.popover-arrow'));

    if (popoverCSS.left < POPOVER_BODY_PADDING) {
      popoverCSS.left = POPOVER_BODY_PADDING;
    } else if (popoverCSS.left + popoverWidth + POPOVER_BODY_PADDING > bodyWidth) {
      popoverCSS.left = bodyWidth - popoverWidth - POPOVER_BODY_PADDING;
    }

    // If the popover when popped down stretches past bottom of screen,
    // make it pop up if there's room above
    if (buttonOffset.top + buttonOffset.height + popoverHeight > bodyHeight &&
        buttonOffset.top - popoverHeight > 0) {
      popoverCSS.top = buttonOffset.top - popoverHeight;
      popoverEle.addClass('popover-bottom');
    } else {
      popoverCSS.top = buttonOffset.top + buttonOffset.height;
      popoverEle.removeClass('popover-bottom');
    }

    arrowEle.css({
      left: buttonOffset.left + buttonOffset.width / 2 -
        arrowEle.prop('offsetWidth') / 2 - popoverCSS.left + 'px'
    });

    popoverEle.css({
      top: popoverCSS.top + 'px',
      left: popoverCSS.left + 'px',
      marginLeft: '0',
      opacity: '1'
    });

  }

  /**
   * @ngdoc controller
   * @name ionicPopover
   * @module ionic
   * @description
   * Instantiated by the {@link ionic.service:$ionicPopover} service.
   *
   * Be sure to call [remove()](#remove) when you are done with each popover
   * to clean it up and avoid memory leaks.
   *
   * Note: a popover will broadcast 'popover.shown', 'popover.hidden', and 'popover.removed' events from its originating
   * scope, passing in itself as an event argument. Both the popover.removed and popover.hidden events are
   * called when the popover is removed.
   */

  /**
   * @ngdoc method
   * @name ionicPopover#initialize
   * @description Creates a new popover controller instance.
   * @param {object} options An options object with the following properties:
   *  - `{object=}` `scope` The scope to be a child of.
   *    Default: creates a child of $rootScope.
   *  - `{boolean=}` `focusFirstInput` Whether to autofocus the first input of
   *    the popover when shown.  Default: false.
   *  - `{boolean=}` `backdropClickToClose` Whether to close the popover on clicking the backdrop.
   *    Default: true.
   *  - `{boolean=}` `hardwareBackButtonClose` Whether the popover can be closed using the hardware
   *    back button on Android and similar devices.  Default: true.
   */

  /**
   * @ngdoc method
   * @name ionicPopover#show
   * @description Show this popover instance.
   * @param {$event} $event The $event or target element which the popover should align
   * itself next to.
   * @returns {promise} A promise which is resolved when the popover is finished animating in.
   */

  /**
   * @ngdoc method
   * @name ionicPopover#hide
   * @description Hide this popover instance.
   * @returns {promise} A promise which is resolved when the popover is finished animating out.
   */

  /**
   * @ngdoc method
   * @name ionicPopover#remove
   * @description Remove this popover instance from the DOM and clean up.
   * @returns {promise} A promise which is resolved when the popover is finished animating out.
   */

  /**
   * @ngdoc method
   * @name ionicPopover#isShown
   * @returns boolean Whether this popover is currently shown.
   */

  return {
    /**
     * @ngdoc method
     * @name $ionicPopover#fromTemplate
     * @param {string} templateString The template string to use as the popovers's
     * content.
     * @param {object} options Options to be passed to the initialize method.
     * @returns {object} An instance of an {@link ionic.controller:ionicPopover}
     * controller (ionicPopover is built on top of $ionicPopover).
     */
    fromTemplate: function(templateString, options) {
      return $ionicModal.fromTemplate(templateString, ionic.Utils.extend({}, POPOVER_OPTIONS, options));
    },
    /**
     * @ngdoc method
     * @name $ionicPopover#fromTemplateUrl
     * @param {string} templateUrl The url to load the template from.
     * @param {object} options Options to be passed to the initialize method.
     * @returns {promise} A promise that will be resolved with an instance of
     * an {@link ionic.controller:ionicPopover} controller (ionicPopover is built on top of $ionicPopover).
     */
    fromTemplateUrl: function(url, options) {
      return $ionicModal.fromTemplateUrl(url, ionic.Utils.extend({}, POPOVER_OPTIONS, options));
    }
  };

}]);


var POPUP_TPL =
  '<div class="popup-container" ng-class="cssClass">' +
    '<div class="popup">' +
      '<div class="popup-head">' +
        '<h3 class="popup-title" ng-bind-html="title"></h3>' +
        '<h5 class="popup-sub-title" ng-bind-html="subTitle" ng-if="subTitle"></h5>' +
      '</div>' +
      '<div class="popup-body">' +
      '</div>' +
      '<div class="popup-buttons" ng-show="buttons.length">' +
        '<button ng-repeat="button in buttons" ng-click="$buttonTapped(button, $event)" class="button" ng-class="button.type || \'button-default\'" ng-bind-html="button.text"></button>' +
      '</div>' +
    '</div>' +
  '</div>';

/**
 * @ngdoc service
 * @name $ionicPopup
 * @module ionic
 * @restrict E
 * @codepen zkmhJ
 * @description
 *
 * The Ionic Popup service allows programmatically creating and showing popup
 * windows that require the user to respond in order to continue.
 *
 * The popup system has support for more flexible versions of the built in `alert()`, `prompt()`,
 * and `confirm()` functions that users are used to, in addition to allowing popups with completely
 * custom content and look.
 *
 * An input can be given an `autofocus` attribute so it automatically receives focus when
 * the popup first shows. However, depending on certain use-cases this can cause issues with
 * the tap/click system, which is why Ionic prefers using the `autofocus` attribute as
 * an opt-in feature and not the default.
 *
 * @usage
 * A few basic examples, see below for details about all of the options available.
 *
 * ```js
 *angular.module('mySuperApp', ['ionic'])
 *.controller('PopupCtrl',function($scope, $ionicPopup, $timeout) {
 *
 * // Triggered on a button click, or some other target
 * $scope.showPopup = function() {
 *   $scope.data = {};
 *
 *   // An elaborate, custom popup
 *   var myPopup = $ionicPopup.show({
 *     template: '<input type="password" ng-model="data.wifi">',
 *     title: 'Enter Wi-Fi Password',
 *     subTitle: 'Please use normal things',
 *     scope: $scope,
 *     buttons: [
 *       { text: 'Cancel' },
 *       {
 *         text: '<b>Save</b>',
 *         type: 'button-positive',
 *         onTap: function(e) {
 *           if (!$scope.data.wifi) {
 *             //don't allow the user to close unless he enters wifi password
 *             e.preventDefault();
 *           } else {
 *             return $scope.data.wifi;
 *           }
 *         }
 *       }
 *     ]
 *   });
 *
 *   myPopup.then(function(res) {
 *     console.log('Tapped!', res);
 *   });
 *
 *   $timeout(function() {
 *      myPopup.close(); //close the popup after 3 seconds for some reason
 *   }, 3000);
 *  };
 *
 *  // A confirm dialog
 *  $scope.showConfirm = function() {
 *    var confirmPopup = $ionicPopup.confirm({
 *      title: 'Consume Ice Cream',
 *      template: 'Are you sure you want to eat this ice cream?'
 *    });
 *
 *    confirmPopup.then(function(res) {
 *      if(res) {
 *        console.log('You are sure');
 *      } else {
 *        console.log('You are not sure');
 *      }
 *    });
 *  };
 *
 *  // An alert dialog
 *  $scope.showAlert = function() {
 *    var alertPopup = $ionicPopup.alert({
 *      title: 'Don\'t eat that!',
 *      template: 'It might taste good'
 *    });
 *
 *    alertPopup.then(function(res) {
 *      console.log('Thank you for not eating my delicious ice cream cone');
 *    });
 *  };
 *});
 *```
 */

IonicModule
.factory('$ionicPopup', [
  '$ionicTemplateLoader',
  '$ionicBackdrop',
  '$q',
  '$timeout',
  '$rootScope',
  '$ionicBody',
  '$compile',
  '$ionicPlatform',
  '$ionicModal',
  'IONIC_BACK_PRIORITY',
function($ionicTemplateLoader, $ionicBackdrop, $q, $timeout, $rootScope, $ionicBody, $compile, $ionicPlatform, $ionicModal, IONIC_BACK_PRIORITY) {
  //TODO allow this to be configured
  var config = {
    stackPushDelay: 75
  };
  var popupStack = [];

  var $ionicPopup = {
    /**
     * @ngdoc method
     * @description
     * Show a complex popup. This is the master show function for all popups.
     *
     * A complex popup has a `buttons` array, with each button having a `text` and `type`
     * field, in addition to an `onTap` function.  The `onTap` function, called when
     * the corresponding button on the popup is tapped, will by default close the popup
     * and resolve the popup promise with its return value.  If you wish to prevent the
     * default and keep the popup open on button tap, call `event.preventDefault()` on the
     * passed in tap event.  Details below.
     *
     * @name $ionicPopup#show
     * @param {object} options The options for the new popup, of the form:
     *
     * ```
     * {
     *   title: '', // String. The title of the popup.
     *   cssClass: '', // String, The custom CSS class name
     *   subTitle: '', // String (optional). The sub-title of the popup.
     *   template: '', // String (optional). The html template to place in the popup body.
     *   templateUrl: '', // String (optional). The URL of an html template to place in the popup   body.
     *   scope: null, // Scope (optional). A scope to link to the popup content.
     *   buttons: [{ // Array[Object] (optional). Buttons to place in the popup footer.
     *     text: 'Cancel',
     *     type: 'button-default',
     *     onTap: function(e) {
     *       // e.preventDefault() will stop the popup from closing when tapped.
     *       e.preventDefault();
     *     }
     *   }, {
     *     text: 'OK',
     *     type: 'button-positive',
     *     onTap: function(e) {
     *       // Returning a value will cause the promise to resolve with the given value.
     *       return scope.data.response;
     *     }
     *   }]
     * }
     * ```
     *
     * @returns {object} A promise which is resolved when the popup is closed. Has an additional
     * `close` function, which can be used to programmatically close the popup.
     */
    show: showPopup,

    /**
     * @ngdoc method
     * @name $ionicPopup#alert
     * @description Show a simple alert popup with a message and one button that the user can
     * tap to close the popup.
     *
     * @param {object} options The options for showing the alert, of the form:
     *
     * ```
     * {
     *   title: '', // String. The title of the popup.
     *   cssClass: '', // String, The custom CSS class name
     *   subTitle: '', // String (optional). The sub-title of the popup.
     *   template: '', // String (optional). The html template to place in the popup body.
     *   templateUrl: '', // String (optional). The URL of an html template to place in the popup   body.
     *   okText: '', // String (default: 'OK'). The text of the OK button.
     *   okType: '', // String (default: 'button-positive'). The type of the OK button.
     * }
     * ```
     *
     * @returns {object} A promise which is resolved when the popup is closed. Has one additional
     * function `close`, which can be called with any value to programmatically close the popup
     * with the given value.
     */
    alert: showAlert,

    /**
     * @ngdoc method
     * @name $ionicPopup#confirm
     * @description
     * Show a simple confirm popup with a Cancel and OK button.
     *
     * Resolves the promise with true if the user presses the OK button, and false if the
     * user presses the Cancel button.
     *
     * @param {object} options The options for showing the confirm popup, of the form:
     *
     * ```
     * {
     *   title: '', // String. The title of the popup.
     *   cssClass: '', // String, The custom CSS class name
     *   subTitle: '', // String (optional). The sub-title of the popup.
     *   template: '', // String (optional). The html template to place in the popup body.
     *   templateUrl: '', // String (optional). The URL of an html template to place in the popup   body.
     *   cancelText: '', // String (default: 'Cancel'). The text of the Cancel button.
     *   cancelType: '', // String (default: 'button-default'). The type of the Cancel button.
     *   okText: '', // String (default: 'OK'). The text of the OK button.
     *   okType: '', // String (default: 'button-positive'). The type of the OK button.
     * }
     * ```
     *
     * @returns {object} A promise which is resolved when the popup is closed. Has one additional
     * function `close`, which can be called with any value to programmatically close the popup
     * with the given value.
     */
    confirm: showConfirm,

    /**
     * @ngdoc method
     * @name $ionicPopup#prompt
     * @description Show a simple prompt popup, which has an input, OK button, and Cancel button.
     * Resolves the promise with the value of the input if the user presses OK, and with undefined
     * if the user presses Cancel.
     *
     * ```javascript
     *  $ionicPopup.prompt({
     *    title: 'Password Check',
     *    template: 'Enter your secret password',
     *    inputType: 'password',
     *    inputPlaceholder: 'Your password'
     *  }).then(function(res) {
     *    console.log('Your password is', res);
     *  });
     * ```
     * @param {object} options The options for showing the prompt popup, of the form:
     *
     * ```
     * {
     *   title: '', // String. The title of the popup.
     *   cssClass: '', // String, The custom CSS class name
     *   subTitle: '', // String (optional). The sub-title of the popup.
     *   template: '', // String (optional). The html template to place in the popup body.
     *   templateUrl: '', // String (optional). The URL of an html template to place in the popup body.
     *   inputType: // String (default: 'text'). The type of input to use
     *   defaultText: // String (default: ''). The initial value placed into the input.
     *   maxLength: // Integer (default: null). Specify a maxlength attribute for the input.
     *   inputPlaceholder: // String (default: ''). A placeholder to use for the input.
     *   cancelText: // String (default: 'Cancel'. The text of the Cancel button.
     *   cancelType: // String (default: 'button-default'). The type of the Cancel button.
     *   okText: // String (default: 'OK'). The text of the OK button.
     *   okType: // String (default: 'button-positive'). The type of the OK button.
     * }
     * ```
     *
     * @returns {object} A promise which is resolved when the popup is closed. Has one additional
     * function `close`, which can be called with any value to programmatically close the popup
     * with the given value.
     */
    prompt: showPrompt,
    /**
     * @private for testing
     */
    _createPopup: createPopup,
    _popupStack: popupStack
  };

  return $ionicPopup;

  function createPopup(options) {
    options = extend({
      scope: null,
      title: '',
      buttons: []
    }, options || {});

    var self = {};
    self.scope = (options.scope || $rootScope).$new();
    self.element = jqLite(POPUP_TPL);
    self.responseDeferred = $q.defer();

    $ionicBody.get().appendChild(self.element[0]);
    $compile(self.element)(self.scope);

    extend(self.scope, {
      title: options.title,
      buttons: options.buttons,
      subTitle: options.subTitle,
      cssClass: options.cssClass,
      $buttonTapped: function(button, event) {
        var result = (button.onTap || noop).apply(self, [event]);
        event = event.originalEvent || event; //jquery events

        if (!event.defaultPrevented) {
          self.responseDeferred.resolve(result);
        }
      }
    });

    $q.when(
      options.templateUrl ?
      $ionicTemplateLoader.load(options.templateUrl) :
        (options.template || options.content || '')
    ).then(function(template) {
      var popupBody = jqLite(self.element[0].querySelector('.popup-body'));
      if (template) {
        popupBody.html(template);
        $compile(popupBody.contents())(self.scope);
      } else {
        popupBody.remove();
      }
    });

    self.show = function() {
      if (self.isShown || self.removed) return;

      $ionicModal.stack.add(self);
      self.isShown = true;
      ionic.requestAnimationFrame(function() {
        //if hidden while waiting for raf, don't show
        if (!self.isShown) return;

        self.element.removeClass('popup-hidden');
        self.element.addClass('popup-showing active');
        focusInput(self.element);
      });
    };

    self.hide = function(callback) {
      callback = callback || noop;
      if (!self.isShown) return callback();

      $ionicModal.stack.remove(self);
      self.isShown = false;
      self.element.removeClass('active');
      self.element.addClass('popup-hidden');
      $timeout(callback, 250, false);
    };

    self.remove = function() {
      if (self.removed) return;

      self.hide(function() {
        self.element.remove();
        self.scope.$destroy();
      });

      self.removed = true;
    };

    return self;
  }

  function onHardwareBackButton() {
    var last = popupStack[popupStack.length - 1];
    last && last.responseDeferred.resolve();
  }

  function showPopup(options) {
    var popup = $ionicPopup._createPopup(options);
    var showDelay = 0;

    if (popupStack.length > 0) {
      showDelay = config.stackPushDelay;
      $timeout(popupStack[popupStack.length - 1].hide, showDelay, false);
    } else {
      //Add popup-open & backdrop if this is first popup
      $ionicBody.addClass('popup-open');
      $ionicBackdrop.retain();
      //only show the backdrop on the first popup
      $ionicPopup._backButtonActionDone = $ionicPlatform.registerBackButtonAction(
        onHardwareBackButton,
        IONIC_BACK_PRIORITY.popup
      );
    }

    // Expose a 'close' method on the returned promise
    popup.responseDeferred.promise.close = function popupClose(result) {
      if (!popup.removed) popup.responseDeferred.resolve(result);
    };
    //DEPRECATED: notify the promise with an object with a close method
    popup.responseDeferred.notify({ close: popup.responseDeferred.close });

    doShow();

    return popup.responseDeferred.promise;

    function doShow() {
      popupStack.push(popup);
      $timeout(popup.show, showDelay, false);

      popup.responseDeferred.promise.then(function(result) {
        var index = popupStack.indexOf(popup);
        if (index !== -1) {
          popupStack.splice(index, 1);
        }

        popup.remove();

        if (popupStack.length > 0) {
          popupStack[popupStack.length - 1].show();
        } else {
          $ionicBackdrop.release();
          //Remove popup-open & backdrop if this is last popup
          $timeout(function() {
            // wait to remove this due to a 300ms delay native
            // click which would trigging whatever was underneath this
            if (!popupStack.length) {
              $ionicBody.removeClass('popup-open');
            }
          }, 400, false);
          ($ionicPopup._backButtonActionDone || noop)();
        }


        return result;
      });

    }

  }

  function focusInput(element) {
    var focusOn = element[0].querySelector('[autofocus]');
    if (focusOn) {
      focusOn.focus();
    }
  }

  function showAlert(opts) {
    return showPopup(extend({
      buttons: [{
        text: opts.okText || 'OK',
        type: opts.okType || 'button-positive',
        onTap: function() {
          return true;
        }
      }]
    }, opts || {}));
  }

  function showConfirm(opts) {
    return showPopup(extend({
      buttons: [{
        text: opts.cancelText || 'Cancel',
        type: opts.cancelType || 'button-default',
        onTap: function() { return false; }
      }, {
        text: opts.okText || 'OK',
        type: opts.okType || 'button-positive',
        onTap: function() { return true; }
      }]
    }, opts || {}));
  }

  function showPrompt(opts) {
    var scope = $rootScope.$new(true);
    scope.data = {};
    scope.data.fieldtype = opts.inputType ? opts.inputType : 'text';
    scope.data.response = opts.defaultText ? opts.defaultText : '';
    scope.data.placeholder = opts.inputPlaceholder ? opts.inputPlaceholder : '';
    scope.data.maxlength = opts.maxLength ? parseInt(opts.maxLength) : '';
    var text = '';
    if (opts.template && /<[a-z][\s\S]*>/i.test(opts.template) === false) {
      text = '<span>' + opts.template + '</span>';
      delete opts.template;
    }
    return showPopup(extend({
      template: text + '<input ng-model="data.response" '
        + 'type="{{ data.fieldtype }}"'
        + 'maxlength="{{ data.maxlength }}"'
        + 'placeholder="{{ data.placeholder }}"'
        + '>',
      scope: scope,
      buttons: [{
        text: opts.cancelText || 'Cancel',
        type: opts.cancelType || 'button-default',
        onTap: function() {}
      }, {
        text: opts.okText || 'OK',
        type: opts.okType || 'button-positive',
        onTap: function() {
          return scope.data.response || '';
        }
      }]
    }, opts || {}));
  }
}]);

/**
 * @ngdoc service
 * @name $ionicPosition
 * @module ionic
 * @description
 * A set of utility methods that can be use to retrieve position of DOM elements.
 * It is meant to be used where we need to absolute-position DOM elements in
 * relation to other, existing elements (this is the case for tooltips, popovers, etc.).
 *
 * Adapted from [AngularUI Bootstrap](https://github.com/angular-ui/bootstrap/blob/master/src/position/position.js),
 * ([license](https://github.com/angular-ui/bootstrap/blob/master/LICENSE))
 */
IonicModule
.factory('$ionicPosition', ['$document', '$window', function($document, $window) {

  function getStyle(el, cssprop) {
    if (el.currentStyle) { //IE
      return el.currentStyle[cssprop];
    } else if ($window.getComputedStyle) {
      return $window.getComputedStyle(el)[cssprop];
    }
    // finally try and get inline style
    return el.style[cssprop];
  }

  /**
   * Checks if a given element is statically positioned
   * @param element - raw DOM element
   */
  function isStaticPositioned(element) {
    return (getStyle(element, 'position') || 'static') === 'static';
  }

  /**
   * returns the closest, non-statically positioned parentOffset of a given element
   * @param element
   */
  var parentOffsetEl = function(element) {
    var docDomEl = $document[0];
    var offsetParent = element.offsetParent || docDomEl;
    while (offsetParent && offsetParent !== docDomEl && isStaticPositioned(offsetParent)) {
      offsetParent = offsetParent.offsetParent;
    }
    return offsetParent || docDomEl;
  };

  return {
    /**
     * @ngdoc method
     * @name $ionicPosition#position
     * @description Get the current coordinates of the element, relative to the offset parent.
     * Read-only equivalent of [jQuery's position function](http://api.jquery.com/position/).
     * @param {element} element The element to get the position of.
     * @returns {object} Returns an object containing the properties top, left, width and height.
     */
    position: function(element) {
      var elBCR = this.offset(element);
      var offsetParentBCR = { top: 0, left: 0 };
      var offsetParentEl = parentOffsetEl(element[0]);
      if (offsetParentEl != $document[0]) {
        offsetParentBCR = this.offset(jqLite(offsetParentEl));
        offsetParentBCR.top += offsetParentEl.clientTop - offsetParentEl.scrollTop;
        offsetParentBCR.left += offsetParentEl.clientLeft - offsetParentEl.scrollLeft;
      }

      var boundingClientRect = element[0].getBoundingClientRect();
      return {
        width: boundingClientRect.width || element.prop('offsetWidth'),
        height: boundingClientRect.height || element.prop('offsetHeight'),
        top: elBCR.top - offsetParentBCR.top,
        left: elBCR.left - offsetParentBCR.left
      };
    },

    /**
     * @ngdoc method
     * @name $ionicPosition#offset
     * @description Get the current coordinates of the element, relative to the document.
     * Read-only equivalent of [jQuery's offset function](http://api.jquery.com/offset/).
     * @param {element} element The element to get the offset of.
     * @returns {object} Returns an object containing the properties top, left, width and height.
     */
    offset: function(element) {
      var boundingClientRect = element[0].getBoundingClientRect();
      return {
        width: boundingClientRect.width || element.prop('offsetWidth'),
        height: boundingClientRect.height || element.prop('offsetHeight'),
        top: boundingClientRect.top + ($window.pageYOffset || $document[0].documentElement.scrollTop),
        left: boundingClientRect.left + ($window.pageXOffset || $document[0].documentElement.scrollLeft)
      };
    }

  };
}]);


/**
 * @ngdoc service
 * @name $ionicScrollDelegate
 * @module ionic
 * @description
 * Delegate for controlling scrollViews (created by
 * {@link ionic.directive:ionContent} and
 * {@link ionic.directive:ionScroll} directives).
 *
 * Methods called directly on the $ionicScrollDelegate service will control all scroll
 * views.  Use the {@link ionic.service:$ionicScrollDelegate#$getByHandle $getByHandle}
 * method to control specific scrollViews.
 *
 * @usage
 *
 * ```html
 * <body ng-controller="MainCtrl">
 *   <ion-content>
 *     <button ng-click="scrollTop()">Scroll to Top!</button>
 *   </ion-content>
 * </body>
 * ```
 * ```js
 * function MainCtrl($scope, $ionicScrollDelegate) {
 *   $scope.scrollTop = function() {
 *     $ionicScrollDelegate.scrollTop();
 *   };
 * }
 * ```
 *
 * Example of advanced usage, with two scroll areas using `delegate-handle`
 * for fine control.
 *
 * ```html
 * <body ng-controller="MainCtrl">
 *   <ion-content delegate-handle="mainScroll">
 *     <button ng-click="scrollMainToTop()">
 *       Scroll content to top!
 *     </button>
 *     <ion-scroll delegate-handle="small" style="height: 100px;">
 *       <button ng-click="scrollSmallToTop()">
 *         Scroll small area to top!
 *       </button>
 *     </ion-scroll>
 *   </ion-content>
 * </body>
 * ```
 * ```js
 * function MainCtrl($scope, $ionicScrollDelegate) {
 *   $scope.scrollMainToTop = function() {
 *     $ionicScrollDelegate.$getByHandle('mainScroll').scrollTop();
 *   };
 *   $scope.scrollSmallToTop = function() {
 *     $ionicScrollDelegate.$getByHandle('small').scrollTop();
 *   };
 * }
 * ```
 */
IonicModule
.service('$ionicScrollDelegate', ionic.DelegateService([
  /**
   * @ngdoc method
   * @name $ionicScrollDelegate#resize
   * @description Tell the scrollView to recalculate the size of its container.
   */
  'resize',
  /**
   * @ngdoc method
   * @name $ionicScrollDelegate#scrollTop
   * @param {boolean=} shouldAnimate Whether the scroll should animate.
   */
  'scrollTop',
  /**
   * @ngdoc method
   * @name $ionicScrollDelegate#scrollBottom
   * @param {boolean=} shouldAnimate Whether the scroll should animate.
   */
  'scrollBottom',
  /**
   * @ngdoc method
   * @name $ionicScrollDelegate#scrollTo
   * @param {number} left The x-value to scroll to.
   * @param {number} top The y-value to scroll to.
   * @param {boolean=} shouldAnimate Whether the scroll should animate.
   */
  'scrollTo',
  /**
   * @ngdoc method
   * @name $ionicScrollDelegate#scrollBy
   * @param {number} left The x-offset to scroll by.
   * @param {number} top The y-offset to scroll by.
   * @param {boolean=} shouldAnimate Whether the scroll should animate.
   */
  'scrollBy',
  /**
   * @ngdoc method
   * @name $ionicScrollDelegate#zoomTo
   * @param {number} level Level to zoom to.
   * @param {boolean=} animate Whether to animate the zoom.
   * @param {number=} originLeft Zoom in at given left coordinate.
   * @param {number=} originTop Zoom in at given top coordinate.
   */
  'zoomTo',
  /**
   * @ngdoc method
   * @name $ionicScrollDelegate#zoomBy
   * @param {number} factor The factor to zoom by.
   * @param {boolean=} animate Whether to animate the zoom.
   * @param {number=} originLeft Zoom in at given left coordinate.
   * @param {number=} originTop Zoom in at given top coordinate.
   */
  'zoomBy',
  /**
   * @ngdoc method
   * @name $ionicScrollDelegate#getScrollPosition
   * @returns {object} The scroll position of this view, with the following properties:
   *  - `{number}` `left` The distance the user has scrolled from the left (starts at 0).
   *  - `{number}` `top` The distance the user has scrolled from the top (starts at 0).
   *  - `{number}` `zoom` The current zoom level.
   */
  'getScrollPosition',
  /**
   * @ngdoc method
   * @name $ionicScrollDelegate#anchorScroll
   * @description Tell the scrollView to scroll to the element with an id
   * matching window.location.hash.
   *
   * If no matching element is found, it will scroll to top.
   *
   * @param {boolean=} shouldAnimate Whether the scroll should animate.
   */
  'anchorScroll',
  /**
   * @ngdoc method
   * @name $ionicScrollDelegate#freezeScroll
   * @description Does not allow this scroll view to scroll either x or y.
   * @param {boolean=} shouldFreeze Should this scroll view be prevented from scrolling or not.
   * @returns {boolean} If the scroll view is being prevented from scrolling or not.
   */
  'freezeScroll',
  /**
   * @ngdoc method
   * @name $ionicScrollDelegate#freezeAllScrolls
   * @description Does not allow any of the app's scroll views to scroll either x or y.
   * @param {boolean=} shouldFreeze Should all app scrolls be prevented from scrolling or not.
   */
  'freezeAllScrolls',
  /**
   * @ngdoc method
   * @name $ionicScrollDelegate#getScrollView
   * @returns {object} The scrollView associated with this delegate.
   */
  'getScrollView'
  /**
   * @ngdoc method
   * @name $ionicScrollDelegate#$getByHandle
   * @param {string} handle
   * @returns `delegateInstance` A delegate instance that controls only the
   * scrollViews with `delegate-handle` matching the given handle.
   *
   * Example: `$ionicScrollDelegate.$getByHandle('my-handle').scrollTop();`
   */
]));


/**
 * @ngdoc service
 * @name $ionicSideMenuDelegate
 * @module ionic
 *
 * @description
 * Delegate for controlling the {@link ionic.directive:ionSideMenus} directive.
 *
 * Methods called directly on the $ionicSideMenuDelegate service will control all side
 * menus.  Use the {@link ionic.service:$ionicSideMenuDelegate#$getByHandle $getByHandle}
 * method to control specific ionSideMenus instances.
 *
 * @usage
 *
 * ```html
 * <body ng-controller="MainCtrl">
 *   <ion-side-menus>
 *     <ion-side-menu-content>
 *       Content!
 *       <button ng-click="toggleLeftSideMenu()">
 *         Toggle Left Side Menu
 *       </button>
 *     </ion-side-menu-content>
 *     <ion-side-menu side="left">
 *       Left Menu!
 *     <ion-side-menu>
 *   </ion-side-menus>
 * </body>
 * ```
 * ```js
 * function MainCtrl($scope, $ionicSideMenuDelegate) {
 *   $scope.toggleLeftSideMenu = function() {
 *     $ionicSideMenuDelegate.toggleLeft();
 *   };
 * }
 * ```
 */
IonicModule
.service('$ionicSideMenuDelegate', ionic.DelegateService([
  /**
   * @ngdoc method
   * @name $ionicSideMenuDelegate#toggleLeft
   * @description Toggle the left side menu (if it exists).
   * @param {boolean=} isOpen Whether to open or close the menu.
   * Default: Toggles the menu.
   */
  'toggleLeft',
  /**
   * @ngdoc method
   * @name $ionicSideMenuDelegate#toggleRight
   * @description Toggle the right side menu (if it exists).
   * @param {boolean=} isOpen Whether to open or close the menu.
   * Default: Toggles the menu.
   */
  'toggleRight',
  /**
   * @ngdoc method
   * @name $ionicSideMenuDelegate#getOpenRatio
   * @description Gets the ratio of open amount over menu width. For example, a
   * menu of width 100 that is opened by 50 pixels is 50% opened, and would return
   * a ratio of 0.5.
   *
   * @returns {float} 0 if nothing is open, between 0 and 1 if left menu is
   * opened/opening, and between 0 and -1 if right menu is opened/opening.
   */
  'getOpenRatio',
  /**
   * @ngdoc method
   * @name $ionicSideMenuDelegate#isOpen
   * @returns {boolean} Whether either the left or right menu is currently opened.
   */
  'isOpen',
  /**
   * @ngdoc method
   * @name $ionicSideMenuDelegate#isOpenLeft
   * @returns {boolean} Whether the left menu is currently opened.
   */
  'isOpenLeft',
  /**
   * @ngdoc method
   * @name $ionicSideMenuDelegate#isOpenRight
   * @returns {boolean} Whether the right menu is currently opened.
   */
  'isOpenRight',
  /**
   * @ngdoc method
   * @name $ionicSideMenuDelegate#canDragContent
   * @param {boolean=} canDrag Set whether the content can or cannot be dragged to open
   * side menus.
   * @returns {boolean} Whether the content can be dragged to open side menus.
   */
  'canDragContent',
  /**
   * @ngdoc method
   * @name $ionicSideMenuDelegate#edgeDragThreshold
   * @param {boolean|number=} value Set whether the content drag can only start if it is below a certain threshold distance from the edge of the screen. Accepts three different values:
   *  - If a non-zero number is given, that many pixels is used as the maximum allowed distance from the edge that starts dragging the side menu.
   *  - If true is given, the default number of pixels (25) is used as the maximum allowed distance.
   *  - If false or 0 is given, the edge drag threshold is disabled, and dragging from anywhere on the content is allowed.
   * @returns {boolean} Whether the drag can start only from within the edge of screen threshold.
   */
  'edgeDragThreshold'
  /**
   * @ngdoc method
   * @name $ionicSideMenuDelegate#$getByHandle
   * @param {string} handle
   * @returns `delegateInstance` A delegate instance that controls only the
   * {@link ionic.directive:ionSideMenus} directives with `delegate-handle` matching
   * the given handle.
   *
   * Example: `$ionicSideMenuDelegate.$getByHandle('my-handle').toggleLeft();`
   */
]));


/**
 * @ngdoc service
 * @name $ionicSlideBoxDelegate
 * @module ionic
 * @description
 * Delegate that controls the {@link ionic.directive:ionSlideBox} directive.
 *
 * Methods called directly on the $ionicSlideBoxDelegate service will control all slide boxes.  Use the {@link ionic.service:$ionicSlideBoxDelegate#$getByHandle $getByHandle}
 * method to control specific slide box instances.
 *
 * @usage
 *
 * ```html
 * <ion-view>
 *   <ion-slide-box>
 *     <ion-slide>
 *       <div class="box blue">
 *         <button ng-click="nextSlide()">Next slide!</button>
 *       </div>
 *     </ion-slide>
 *     <ion-slide>
 *       <div class="box red">
 *         Slide 2!
 *       </div>
 *     </ion-slide>
 *   </ion-slide-box>
 * </ion-view>
 * ```
 * ```js
 * function MyCtrl($scope, $ionicSlideBoxDelegate) {
 *   $scope.nextSlide = function() {
 *     $ionicSlideBoxDelegate.next();
 *   }
 * }
 * ```
 */
IonicModule
.service('$ionicSlideBoxDelegate', ionic.DelegateService([
  /**
   * @ngdoc method
   * @name $ionicSlideBoxDelegate#update
   * @description
   * Update the slidebox (for example if using Angular with ng-repeat,
   * resize it for the elements inside).
   */
  'update',
  /**
   * @ngdoc method
   * @name $ionicSlideBoxDelegate#slide
   * @param {number} to The index to slide to.
   * @param {number=} speed The number of milliseconds the change should take.
   */
  'slide',
  'select',
  /**
   * @ngdoc method
   * @name $ionicSlideBoxDelegate#enableSlide
   * @param {boolean=} shouldEnable Whether to enable sliding the slidebox.
   * @returns {boolean} Whether sliding is enabled.
   */
  'enableSlide',
  /**
   * @ngdoc method
   * @name $ionicSlideBoxDelegate#previous
   * @param {number=} speed The number of milliseconds the change should take.
   * @description Go to the previous slide. Wraps around if at the beginning.
   */
  'previous',
  /**
   * @ngdoc method
   * @name $ionicSlideBoxDelegate#next
   * @param {number=} speed The number of milliseconds the change should take.
   * @description Go to the next slide. Wraps around if at the end.
   */
  'next',
  /**
   * @ngdoc method
   * @name $ionicSlideBoxDelegate#stop
   * @description Stop sliding. The slideBox will not move again until
   * explicitly told to do so.
   */
  'stop',
  'autoPlay',
  /**
   * @ngdoc method
   * @name $ionicSlideBoxDelegate#start
   * @description Start sliding again if the slideBox was stopped.
   */
  'start',
  /**
   * @ngdoc method
   * @name $ionicSlideBoxDelegate#currentIndex
   * @returns number The index of the current slide.
   */
  'currentIndex',
  'selected',
  /**
   * @ngdoc method
   * @name $ionicSlideBoxDelegate#slidesCount
   * @returns number The number of slides there are currently.
   */
  'slidesCount',
  'count',
  'loop'
  /**
   * @ngdoc method
   * @name $ionicSlideBoxDelegate#$getByHandle
   * @param {string} handle
   * @returns `delegateInstance` A delegate instance that controls only the
   * {@link ionic.directive:ionSlideBox} directives with `delegate-handle` matching
   * the given handle.
   *
   * Example: `$ionicSlideBoxDelegate.$getByHandle('my-handle').stop();`
   */
]));


/**
 * @ngdoc service
 * @name $ionicTabsDelegate
 * @module ionic
 *
 * @description
 * Delegate for controlling the {@link ionic.directive:ionTabs} directive.
 *
 * Methods called directly on the $ionicTabsDelegate service will control all ionTabs
 * directives. Use the {@link ionic.service:$ionicTabsDelegate#$getByHandle $getByHandle}
 * method to control specific ionTabs instances.
 *
 * @usage
 *
 * ```html
 * <body ng-controller="MyCtrl">
 *   <ion-tabs>
 *
 *     <ion-tab title="Tab 1">
 *       Hello tab 1!
 *       <button ng-click="selectTabWithIndex(1)">Select tab 2!</button>
 *     </ion-tab>
 *     <ion-tab title="Tab 2">Hello tab 2!</ion-tab>
 *
 *   </ion-tabs>
 * </body>
 * ```
 * ```js
 * function MyCtrl($scope, $ionicTabsDelegate) {
 *   $scope.selectTabWithIndex = function(index) {
 *     $ionicTabsDelegate.select(index);
 *   }
 * }
 * ```
 */
IonicModule
.service('$ionicTabsDelegate', ionic.DelegateService([
  /**
   * @ngdoc method
   * @name $ionicTabsDelegate#select
   * @description Select the tab matching the given index.
   *
   * @param {number} index Index of the tab to select.
   */
  'select',
  /**
   * @ngdoc method
   * @name $ionicTabsDelegate#selectedIndex
   * @returns `number` The index of the selected tab, or -1.
   */
  'selectedIndex',
  /**
   * @ngdoc method
   * @name $ionicTabsDelegate#showBar
   * @description
   * Set/get whether the {@link ionic.directive:ionTabs} is shown
   * @param {boolean} show Whether to show the bar.
   * @returns {boolean} Whether the bar is shown.
   */
  'showBar'
  /**
   * @ngdoc method
   * @name $ionicTabsDelegate#$getByHandle
   * @param {string} handle
   * @returns `delegateInstance` A delegate instance that controls only the
   * {@link ionic.directive:ionTabs} directives with `delegate-handle` matching
   * the given handle.
   *
   * Example: `$ionicTabsDelegate.$getByHandle('my-handle').select(0);`
   */
]));

// closure to keep things neat
(function() {
  var templatesToCache = [];

/**
 * @ngdoc service
 * @name $ionicTemplateCache
 * @module ionic
 * @description A service that preemptively caches template files to eliminate transition flicker and boost performance.
 * @usage
 * State templates are cached automatically, but you can optionally cache other templates.
 *
 * ```js
 * $ionicTemplateCache('myNgIncludeTemplate.html');
 * ```
 *
 * Optionally disable all preemptive caching with the `$ionicConfigProvider` or individual states by setting `prefetchTemplate`
 * in the `$state` definition
 *
 * ```js
 *   angular.module('myApp', ['ionic'])
 *   .config(function($stateProvider, $ionicConfigProvider) {
 *
 *     // disable preemptive template caching globally
 *     $ionicConfigProvider.templates.prefetch(false);
 *
 *     // disable individual states
 *     $stateProvider
 *       .state('tabs', {
 *         url: "/tab",
 *         abstract: true,
 *         prefetchTemplate: false,
 *         templateUrl: "tabs-templates/tabs.html"
 *       })
 *       .state('tabs.home', {
 *         url: "/home",
 *         views: {
 *           'home-tab': {
 *             prefetchTemplate: false,
 *             templateUrl: "tabs-templates/home.html",
 *             controller: 'HomeTabCtrl'
 *           }
 *         }
 *       });
 *   });
 * ```
 */
IonicModule
.factory('$ionicTemplateCache', [
'$http',
'$templateCache',
'$timeout',
function($http, $templateCache, $timeout) {
  var toCache = templatesToCache,
      hasRun;

  function $ionicTemplateCache(templates) {
    if (typeof templates === 'undefined') {
      return run();
    }
    if (isString(templates)) {
      templates = [templates];
    }
    forEach(templates, function(template) {
      toCache.push(template);
    });
    if (hasRun) {
      run();
    }
  }

  // run through methods - internal method
  function run() {
    var template;
    $ionicTemplateCache._runCount++;

    hasRun = true;
    // ignore if race condition already zeroed out array
    if (toCache.length === 0) return;

    var i = 0;
    while (i < 4 && (template = toCache.pop())) {
      // note that inline templates are ignored by this request
      if (isString(template)) $http.get(template, { cache: $templateCache });
      i++;
    }
    // only preload 3 templates a second
    if (toCache.length) {
      $timeout(run, 1000);
    }
  }

  // exposing for testing
  $ionicTemplateCache._runCount = 0;
  // default method
  return $ionicTemplateCache;
}])

// Intercepts the $stateprovider.state() command to look for templateUrls that can be cached
.config([
'$stateProvider',
'$ionicConfigProvider',
function($stateProvider, $ionicConfigProvider) {
  var stateProviderState = $stateProvider.state;
  $stateProvider.state = function(stateName, definition) {
    // don't even bother if it's disabled. note, another config may run after this, so it's not a catch-all
    if (typeof definition === 'object') {
      var enabled = definition.prefetchTemplate !== false && templatesToCache.length < $ionicConfigProvider.templates.maxPrefetch();
      if (enabled && isString(definition.templateUrl)) templatesToCache.push(definition.templateUrl);
      if (angular.isObject(definition.views)) {
        for (var key in definition.views) {
          enabled = definition.views[key].prefetchTemplate !== false && templatesToCache.length < $ionicConfigProvider.templates.maxPrefetch();
          if (enabled && isString(definition.views[key].templateUrl)) templatesToCache.push(definition.views[key].templateUrl);
        }
      }
    }
    return stateProviderState.call($stateProvider, stateName, definition);
  };
}])

// process the templateUrls collected by the $stateProvider, adding them to the cache
.run(['$ionicTemplateCache', function($ionicTemplateCache) {
  $ionicTemplateCache();
}]);

})();

IonicModule
.factory('$ionicTemplateLoader', [
  '$compile',
  '$controller',
  '$http',
  '$q',
  '$rootScope',
  '$templateCache',
function($compile, $controller, $http, $q, $rootScope, $templateCache) {

  return {
    load: fetchTemplate,
    compile: loadAndCompile
  };

  function fetchTemplate(url) {
    return $http.get(url, {cache: $templateCache})
    .then(function(response) {
      return response.data && response.data.trim();
    });
  }

  function loadAndCompile(options) {
    options = extend({
      template: '',
      templateUrl: '',
      scope: null,
      controller: null,
      locals: {},
      appendTo: null
    }, options || {});

    var templatePromise = options.templateUrl ?
      this.load(options.templateUrl) :
      $q.when(options.template);

    return templatePromise.then(function(template) {
      var controller;
      var scope = options.scope || $rootScope.$new();

      //Incase template doesn't have just one root element, do this
      var element = jqLite('<div>').html(template).contents();

      if (options.controller) {
        controller = $controller(
          options.controller,
          extend(options.locals, {
            $scope: scope
          })
        );
        element.children().data('$ngControllerController', controller);
      }
      if (options.appendTo) {
        jqLite(options.appendTo).append(element);
      }

      $compile(element)(scope);

      return {
        element: element,
        scope: scope
      };
    });
  }

}]);

/**
 * @private
 * DEPRECATED, as of v1.0.0-beta14 -------
 */
IonicModule
.factory('$ionicViewService', ['$ionicHistory', '$log', function($ionicHistory, $log) {

  function warn(oldMethod, newMethod) {
    $log.warn('$ionicViewService' + oldMethod + ' is deprecated, please use $ionicHistory' + newMethod + ' instead: http://ionicframework.com/docs/nightly/api/service/$ionicHistory/');
  }

  warn('', '');

  var methodsMap = {
    getCurrentView: 'currentView',
    getBackView: 'backView',
    getForwardView: 'forwardView',
    getCurrentStateName: 'currentStateName',
    nextViewOptions: 'nextViewOptions',
    clearHistory: 'clearHistory'
  };

  forEach(methodsMap, function(newMethod, oldMethod) {
    methodsMap[oldMethod] = function() {
      warn('.' + oldMethod, '.' + newMethod);
      return $ionicHistory[newMethod].apply(this, arguments);
    };
  });

  return methodsMap;

}]);

/**
 * @private
 * TODO document
 */

IonicModule.factory('$ionicViewSwitcher', [
  '$timeout',
  '$document',
  '$q',
  '$ionicClickBlock',
  '$ionicConfig',
  '$ionicNavBarDelegate',
function($timeout, $document, $q, $ionicClickBlock, $ionicConfig, $ionicNavBarDelegate) {

  var TRANSITIONEND_EVENT = 'webkitTransitionEnd transitionend';
  var DATA_NO_CACHE = '$noCache';
  var DATA_DESTROY_ELE = '$destroyEle';
  var DATA_ELE_IDENTIFIER = '$eleId';
  var DATA_VIEW_ACCESSED = '$accessed';
  var DATA_FALLBACK_TIMER = '$fallbackTimer';
  var DATA_VIEW = '$viewData';
  var NAV_VIEW_ATTR = 'nav-view';
  var VIEW_STATUS_ACTIVE = 'active';
  var VIEW_STATUS_CACHED = 'cached';
  var VIEW_STATUS_STAGED = 'stage';

  var transitionCounter = 0;
  var nextTransition, nextDirection;
  ionic.transition = ionic.transition || {};
  ionic.transition.isActive = false;
  var isActiveTimer;
  var cachedAttr = ionic.DomUtil.cachedAttr;
  var transitionPromises = [];
  var defaultTimeout = 1100;

  var ionicViewSwitcher = {

    create: function(navViewCtrl, viewLocals, enteringView, leavingView, renderStart, renderEnd) {
      // get a reference to an entering/leaving element if they exist
      // loop through to see if the view is already in the navViewElement
      var enteringEle, leavingEle;
      var transitionId = ++transitionCounter;
      var alreadyInDom;

      var switcher = {

        init: function(registerData, callback) {
          ionicViewSwitcher.isTransitioning(true);

          switcher.loadViewElements(registerData);

          switcher.render(registerData, function() {
            callback && callback();
          });
        },

        loadViewElements: function(registerData) {
          var x, l, viewEle;
          var viewElements = navViewCtrl.getViewElements();
          var enteringEleIdentifier = getViewElementIdentifier(viewLocals, enteringView);
          var navViewActiveEleId = navViewCtrl.activeEleId();

          for (x = 0, l = viewElements.length; x < l; x++) {
            viewEle = viewElements.eq(x);

            if (viewEle.data(DATA_ELE_IDENTIFIER) === enteringEleIdentifier) {
              // we found an existing element in the DOM that should be entering the view
              if (viewEle.data(DATA_NO_CACHE)) {
                // the existing element should not be cached, don't use it
                viewEle.data(DATA_ELE_IDENTIFIER, enteringEleIdentifier + ionic.Utils.nextUid());
                viewEle.data(DATA_DESTROY_ELE, true);

              } else {
                enteringEle = viewEle;
              }

            } else if (isDefined(navViewActiveEleId) && viewEle.data(DATA_ELE_IDENTIFIER) === navViewActiveEleId) {
              leavingEle = viewEle;
            }

            if (enteringEle && leavingEle) break;
          }

          alreadyInDom = !!enteringEle;

          if (!alreadyInDom) {
            // still no existing element to use
            // create it using existing template/scope/locals
            enteringEle = registerData.ele || ionicViewSwitcher.createViewEle(viewLocals);

            // existing elements in the DOM are looked up by their state name and state id
            enteringEle.data(DATA_ELE_IDENTIFIER, enteringEleIdentifier);
          }

          if (renderEnd) {
            navViewCtrl.activeEleId(enteringEleIdentifier);
          }

          registerData.ele = null;
        },

        render: function(registerData, callback) {
          if (alreadyInDom) {
            // it was already found in the DOM, just reconnect the scope
            ionic.Utils.reconnectScope(enteringEle.scope());

          } else {
            // the entering element is not already in the DOM
            // set that the entering element should be "staged" and its
            // styles of where this element will go before it hits the DOM
            navViewAttr(enteringEle, VIEW_STATUS_STAGED);

            var enteringData = getTransitionData(viewLocals, enteringEle, registerData.direction, enteringView);
            var transitionFn = $ionicConfig.transitions.views[enteringData.transition] || $ionicConfig.transitions.views.none;
            transitionFn(enteringEle, null, enteringData.direction, true).run(0);

            enteringEle.data(DATA_VIEW, {
              viewId: enteringData.viewId,
              historyId: enteringData.historyId,
              stateName: enteringData.stateName,
              stateParams: enteringData.stateParams
            });

            // if the current state has cache:false
            // or the element has cache-view="false" attribute
            if (viewState(viewLocals).cache === false || viewState(viewLocals).cache === 'false' ||
                enteringEle.attr('cache-view') == 'false' || $ionicConfig.views.maxCache() === 0) {
              enteringEle.data(DATA_NO_CACHE, true);
            }

            // append the entering element to the DOM, create a new scope and run link
            var viewScope = navViewCtrl.appendViewElement(enteringEle, viewLocals);

            delete enteringData.direction;
            delete enteringData.transition;
            viewScope.$emit('$ionicView.loaded', enteringData);
          }

          // update that this view was just accessed
          enteringEle.data(DATA_VIEW_ACCESSED, Date.now());

          callback && callback();
        },

        transition: function(direction, enableBack, allowAnimate) {
          var deferred;
          var enteringData = getTransitionData(viewLocals, enteringEle, direction, enteringView);
          var leavingData = extend(extend({}, enteringData), getViewData(leavingView));
          enteringData.transitionId = leavingData.transitionId = transitionId;
          enteringData.fromCache = !!alreadyInDom;
          enteringData.enableBack = !!enableBack;
          enteringData.renderStart = renderStart;
          enteringData.renderEnd = renderEnd;

          cachedAttr(enteringEle.parent(), 'nav-view-transition', enteringData.transition);
          cachedAttr(enteringEle.parent(), 'nav-view-direction', enteringData.direction);

          // cancel any previous transition complete fallbacks
          $timeout.cancel(enteringEle.data(DATA_FALLBACK_TIMER));

          // get the transition ready and see if it'll animate
          var transitionFn = $ionicConfig.transitions.views[enteringData.transition] || $ionicConfig.transitions.views.none;
          var viewTransition = transitionFn(enteringEle, leavingEle, enteringData.direction,
                                            enteringData.shouldAnimate && allowAnimate && renderEnd);

          if (viewTransition.shouldAnimate) {
            // attach transitionend events (and fallback timer)
            enteringEle.on(TRANSITIONEND_EVENT, completeOnTransitionEnd);
            enteringEle.data(DATA_FALLBACK_TIMER, $timeout(transitionComplete, defaultTimeout));
            $ionicClickBlock.show(defaultTimeout);
          }

          if (renderStart) {
            // notify the views "before" the transition starts
            switcher.emit('before', enteringData, leavingData);

            // stage entering element, opacity 0, no transition duration
            navViewAttr(enteringEle, VIEW_STATUS_STAGED);

            // render the elements in the correct location for their starting point
            viewTransition.run(0);
          }

          if (renderEnd) {
            // create a promise so we can keep track of when all transitions finish
            // only required if this transition should complete
            deferred = $q.defer();
            transitionPromises.push(deferred.promise);
          }

          if (renderStart && renderEnd) {
            // CSS "auto" transitioned, not manually transitioned
            // wait a frame so the styles apply before auto transitioning
            $timeout(function() {
              ionic.requestAnimationFrame(onReflow);
            });
          } else if (!renderEnd) {
            // just the start of a manual transition
            // but it will not render the end of the transition
            navViewAttr(enteringEle, 'entering');
            navViewAttr(leavingEle, 'leaving');

            // return the transition run method so each step can be ran manually
            return {
              run: viewTransition.run,
              cancel: function(shouldAnimate) {
                if (shouldAnimate) {
                  enteringEle.on(TRANSITIONEND_EVENT, cancelOnTransitionEnd);
                  enteringEle.data(DATA_FALLBACK_TIMER, $timeout(cancelTransition, defaultTimeout));
                  $ionicClickBlock.show(defaultTimeout);
                } else {
                  cancelTransition();
                }
                viewTransition.shouldAnimate = shouldAnimate;
                viewTransition.run(0);
                viewTransition = null;
              }
            };

          } else if (renderEnd) {
            // just the end of a manual transition
            // happens after the manual transition has completed
            // and a full history change has happened
            onReflow();
          }


          function onReflow() {
            // remove that we're staging the entering element so it can auto transition
            navViewAttr(enteringEle, viewTransition.shouldAnimate ? 'entering' : VIEW_STATUS_ACTIVE);
            navViewAttr(leavingEle, viewTransition.shouldAnimate ? 'leaving' : VIEW_STATUS_CACHED);

            // start the auto transition and let the CSS take over
            viewTransition.run(1);

            // trigger auto transitions on the associated nav bars
            $ionicNavBarDelegate._instances.forEach(function(instance) {
              instance.triggerTransitionStart(transitionId);
            });

            if (!viewTransition.shouldAnimate) {
              // no animated auto transition
              transitionComplete();
            }
          }

          // Make sure that transitionend events bubbling up from children won't fire
          // transitionComplete. Will only go forward if ev.target == the element listening.
          function completeOnTransitionEnd(ev) {
            if (ev.target !== this) return;
            transitionComplete();
          }
          function transitionComplete() {
            if (transitionComplete.x) return;
            transitionComplete.x = true;

            enteringEle.off(TRANSITIONEND_EVENT, completeOnTransitionEnd);
            $timeout.cancel(enteringEle.data(DATA_FALLBACK_TIMER));
            leavingEle && $timeout.cancel(leavingEle.data(DATA_FALLBACK_TIMER));

            // resolve that this one transition (there could be many w/ nested views)
            deferred && deferred.resolve(navViewCtrl);

            // the most recent transition added has completed and all the active
            // transition promises should be added to the services array of promises
            if (transitionId === transitionCounter) {
              $q.all(transitionPromises).then(ionicViewSwitcher.transitionEnd);

              // emit that the views have finished transitioning
              // each parent nav-view will update which views are active and cached
              switcher.emit('after', enteringData, leavingData);
              switcher.cleanup(enteringData);
            }

            // tell the nav bars that the transition has ended
            $ionicNavBarDelegate._instances.forEach(function(instance) {
              instance.triggerTransitionEnd();
            });


            // remove any references that could cause memory issues
            nextTransition = nextDirection = enteringView = leavingView = enteringEle = leavingEle = null;
          }

          // Make sure that transitionend events bubbling up from children won't fire
          // transitionComplete. Will only go forward if ev.target == the element listening.
          function cancelOnTransitionEnd(ev) {
            if (ev.target !== this) return;
            cancelTransition();
          }
          function cancelTransition() {
            navViewAttr(enteringEle, VIEW_STATUS_CACHED);
            navViewAttr(leavingEle, VIEW_STATUS_ACTIVE);
            enteringEle.off(TRANSITIONEND_EVENT, cancelOnTransitionEnd);
            $timeout.cancel(enteringEle.data(DATA_FALLBACK_TIMER));
            ionicViewSwitcher.transitionEnd([navViewCtrl]);
          }

        },

      emit: function(step, enteringData, leavingData) {
          var enteringScope = getScopeForElement(enteringEle, enteringData);
          var leavingScope = getScopeForElement(leavingEle, leavingData);

          var prefixesAreEqual;

          if ( !enteringData.viewId || enteringData.abstractView ) {
            // it's an abstract view, so treat it accordingly

            // we only get access to the leaving scope once in the transition,
            // so dispatch all events right away if it exists
            if ( leavingScope ) {
              leavingScope.$emit('$ionicView.beforeLeave', leavingData);
              leavingScope.$emit('$ionicView.leave', leavingData);
              leavingScope.$emit('$ionicView.afterLeave', leavingData);
              leavingScope.$broadcast('$ionicParentView.beforeLeave', leavingData);
              leavingScope.$broadcast('$ionicParentView.leave', leavingData);
              leavingScope.$broadcast('$ionicParentView.afterLeave', leavingData);
            }
          }
          else {
            // it's a regular view, so do the normal process
            if (step == 'after') {
              if (enteringScope) {
                enteringScope.$emit('$ionicView.enter', enteringData);
                enteringScope.$broadcast('$ionicParentView.enter', enteringData);
              }

              if (leavingScope) {
                leavingScope.$emit('$ionicView.leave', leavingData);
                leavingScope.$broadcast('$ionicParentView.leave', leavingData);
              }
              else if (enteringScope && leavingData && leavingData.viewId && enteringData.stateName !== leavingData.stateName) {
                // we only want to dispatch this when we are doing a single-tier
                // state change such as changing a tab, so compare the state
                // for the same state-prefix but different suffix
                prefixesAreEqual = compareStatePrefixes(enteringData.stateName, leavingData.stateName);
                if ( prefixesAreEqual ) {
                  enteringScope.$emit('$ionicNavView.leave', leavingData);
                }
              }
            }

            if (enteringScope) {
              enteringScope.$emit('$ionicView.' + step + 'Enter', enteringData);
              enteringScope.$broadcast('$ionicParentView.' + step + 'Enter', enteringData);
            }

            if (leavingScope) {
              leavingScope.$emit('$ionicView.' + step + 'Leave', leavingData);
              leavingScope.$broadcast('$ionicParentView.' + step + 'Leave', leavingData);

            } else if (enteringScope && leavingData && leavingData.viewId && enteringData.stateName !== leavingData.stateName) {
              // we only want to dispatch this when we are doing a single-tier
              // state change such as changing a tab, so compare the state
              // for the same state-prefix but different suffix
              prefixesAreEqual = compareStatePrefixes(enteringData.stateName, leavingData.stateName);
              if ( prefixesAreEqual ) {
                enteringScope.$emit('$ionicNavView.' + step + 'Leave', leavingData);
              }
            }
          }
        },

        cleanup: function(transData) {
          // check if any views should be removed
          if (leavingEle && transData.direction == 'back' && !$ionicConfig.views.forwardCache()) {
            // if they just navigated back we can destroy the forward view
            // do not remove forward views if cacheForwardViews config is true
            destroyViewEle(leavingEle);
          }

          var viewElements = navViewCtrl.getViewElements();
          var viewElementsLength = viewElements.length;
          var x, viewElement;
          var removeOldestAccess = (viewElementsLength - 1) > $ionicConfig.views.maxCache();
          var removableEle;
          var oldestAccess = Date.now();

          for (x = 0; x < viewElementsLength; x++) {
            viewElement = viewElements.eq(x);

            if (removeOldestAccess && viewElement.data(DATA_VIEW_ACCESSED) < oldestAccess) {
              // remember what was the oldest element to be accessed so it can be destroyed
              oldestAccess = viewElement.data(DATA_VIEW_ACCESSED);
              removableEle = viewElements.eq(x);

            } else if (viewElement.data(DATA_DESTROY_ELE) && navViewAttr(viewElement) != VIEW_STATUS_ACTIVE) {
              destroyViewEle(viewElement);
            }
          }

          destroyViewEle(removableEle);

          if (enteringEle.data(DATA_NO_CACHE)) {
            enteringEle.data(DATA_DESTROY_ELE, true);
          }
        },

        enteringEle: function() { return enteringEle; },
        leavingEle: function() { return leavingEle; }

      };

      return switcher;
    },

    transitionEnd: function(navViewCtrls) {
      forEach(navViewCtrls, function(navViewCtrl) {
        navViewCtrl.transitionEnd();
      });

      ionicViewSwitcher.isTransitioning(false);
      $ionicClickBlock.hide();
      transitionPromises = [];
    },

    nextTransition: function(val) {
      nextTransition = val;
    },

    nextDirection: function(val) {
      nextDirection = val;
    },

    isTransitioning: function(val) {
      if (arguments.length) {
        ionic.transition.isActive = !!val;
        $timeout.cancel(isActiveTimer);
        if (val) {
          isActiveTimer = $timeout(function() {
            ionicViewSwitcher.isTransitioning(false);
          }, 999);
        }
      }
      return ionic.transition.isActive;
    },

    createViewEle: function(viewLocals) {
      var containerEle = $document[0].createElement('div');
      if (viewLocals && viewLocals.$template) {
        containerEle.innerHTML = viewLocals.$template;
        if (containerEle.children.length === 1) {
          containerEle.children[0].classList.add('pane');
          if ( viewLocals.$$state && viewLocals.$$state.self && viewLocals.$$state.self['abstract'] ) {
            angular.element(containerEle.children[0]).attr("abstract", "true");
          }
          else {
            if ( viewLocals.$$state && viewLocals.$$state.self ) {
              angular.element(containerEle.children[0]).attr("state", viewLocals.$$state.self.name);
            }

          }
          return jqLite(containerEle.children[0]);
        }
      }
      containerEle.className = "pane";
      return jqLite(containerEle);
    },

    viewEleIsActive: function(viewEle, isActiveAttr) {
      navViewAttr(viewEle, isActiveAttr ? VIEW_STATUS_ACTIVE : VIEW_STATUS_CACHED);
    },

    getTransitionData: getTransitionData,
    navViewAttr: navViewAttr,
    destroyViewEle: destroyViewEle

  };

  return ionicViewSwitcher;


  function getViewElementIdentifier(locals, view) {
    if (viewState(locals)['abstract']) return viewState(locals).name;
    if (view) return view.stateId || view.viewId;
    return ionic.Utils.nextUid();
  }

  function viewState(locals) {
    return locals && locals.$$state && locals.$$state.self || {};
  }

  function getTransitionData(viewLocals, enteringEle, direction, view) {
    // Priority
    // 1) attribute directive on the button/link to this view
    // 2) entering element's attribute
    // 3) entering view's $state config property
    // 4) view registration data
    // 5) global config
    // 6) fallback value

    var state = viewState(viewLocals);
    var viewTransition = nextTransition || cachedAttr(enteringEle, 'view-transition') || state.viewTransition || $ionicConfig.views.transition() || 'ios';
    var navBarTransition = $ionicConfig.navBar.transition();
    direction = nextDirection || cachedAttr(enteringEle, 'view-direction') || state.viewDirection || direction || 'none';

    return extend(getViewData(view), {
      transition: viewTransition,
      navBarTransition: navBarTransition === 'view' ? viewTransition : navBarTransition,
      direction: direction,
      shouldAnimate: (viewTransition !== 'none' && direction !== 'none')
    });
  }

  function getViewData(view) {
    view = view || {};
    return {
      viewId: view.viewId,
      historyId: view.historyId,
      stateId: view.stateId,
      stateName: view.stateName,
      stateParams: view.stateParams
    };
  }

  function navViewAttr(ele, value) {
    if (arguments.length > 1) {
      cachedAttr(ele, NAV_VIEW_ATTR, value);
    } else {
      return cachedAttr(ele, NAV_VIEW_ATTR);
    }
  }

  function destroyViewEle(ele) {
    // we found an element that should be removed
    // destroy its scope, then remove the element
    if (ele && ele.length) {
      var viewScope = ele.scope();
      if (viewScope) {
        viewScope.$emit('$ionicView.unloaded', ele.data(DATA_VIEW));
        viewScope.$destroy();
      }
      ele.remove();
    }
  }

  function compareStatePrefixes(enteringStateName, exitingStateName) {
    var enteringStateSuffixIndex = enteringStateName.lastIndexOf('.');
    var exitingStateSuffixIndex = exitingStateName.lastIndexOf('.');

    // if either of the prefixes are empty, just return false
    if ( enteringStateSuffixIndex < 0 || exitingStateSuffixIndex < 0 ) {
      return false;
    }

    var enteringPrefix = enteringStateName.substring(0, enteringStateSuffixIndex);
    var exitingPrefix = exitingStateName.substring(0, exitingStateSuffixIndex);

    return enteringPrefix === exitingPrefix;
  }

  function getScopeForElement(element, stateData) {
    if ( !element ) {
      return null;
    }
    // check if it's abstract
    var attributeValue = angular.element(element).attr("abstract");
    var stateValue = angular.element(element).attr("state");

    if ( attributeValue !== "true" ) {
      // it's not an abstract view, so make sure the element
      // matches the state.  Due to abstract view weirdness,
      // sometimes it doesn't. If it doesn't, don't dispatch events
      // so leave the scope undefined
      if ( stateValue === stateData.stateName ) {
        return angular.element(element).scope();
      }
      return null;
    }
    else {
      // it is an abstract element, so look for element with the "state" attributeValue
      // set to the name of the stateData state
      var elements = aggregateNavViewChildren(element);
      for ( var i = 0; i < elements.length; i++ ) {
          var state = angular.element(elements[i]).attr("state");
          if ( state === stateData.stateName ) {
            stateData.abstractView = true;
            return angular.element(elements[i]).scope();
          }
      }
      // we didn't find a match, so return null
      return null;
    }
  }

  function aggregateNavViewChildren(element) {
    var aggregate = [];
    var navViews = angular.element(element).find("ion-nav-view");
    for ( var i = 0; i < navViews.length; i++ ) {
      var children = angular.element(navViews[i]).children();
      var childrenAggregated = [];
      for ( var j = 0; j < children.length; j++ ) {
        childrenAggregated = childrenAggregated.concat(children[j]);
      }
      aggregate = aggregate.concat(childrenAggregated);
    }
    return aggregate;
  }

}]);

/**
 * ==================  angular-ios9-uiwebview.patch.js v1.1.1 ==================
 *
 * This patch works around iOS9 UIWebView regression that causes infinite digest
 * errors in Angular.
 *
 * The patch can be applied to Angular 1.2.0 – 1.4.5. Newer versions of Angular
 * have the workaround baked in.
 *
 * To apply this patch load/bundle this file with your application and add a
 * dependency on the "ngIOS9UIWebViewPatch" module to your main app module.
 *
 * For example:
 *
 * ```
 * angular.module('myApp', ['ngRoute'])`
 * ```
 *
 * becomes
 *
 * ```
 * angular.module('myApp', ['ngRoute', 'ngIOS9UIWebViewPatch'])
 * ```
 *
 *
 * More info:
 * - https://openradar.appspot.com/22186109
 * - https://github.com/angular/angular.js/issues/12241
 * - https://github.com/driftyco/ionic/issues/4082
 *
 *
 * @license AngularJS
 * (c) 2010-2015 Google, Inc. http://angularjs.org
 * License: MIT
 */

angular.module('ngIOS9UIWebViewPatch', ['ng']).config(['$provide', function($provide) {
  'use strict';

  $provide.decorator('$browser', ['$delegate', '$window', function($delegate, $window) {

    if (isIOS9UIWebView($window.navigator.userAgent)) {
      return applyIOS9Shim($delegate);
    }

    return $delegate;

    function isIOS9UIWebView(userAgent) {
      return /(iPhone|iPad|iPod).* OS 9_\d/.test(userAgent) && !/Version\/9\./.test(userAgent);
    }

    function applyIOS9Shim(browser) {
      var pendingLocationUrl = null;
      var originalUrlFn = browser.url;

      browser.url = function() {
        if (arguments.length) {
          pendingLocationUrl = arguments[0];
          return originalUrlFn.apply(browser, arguments);
        }

        return pendingLocationUrl || originalUrlFn.apply(browser, arguments);
      };

      window.addEventListener('popstate', clearPendingLocationUrl, false);
      window.addEventListener('hashchange', clearPendingLocationUrl, false);

      function clearPendingLocationUrl() {
        pendingLocationUrl = null;
      }

      return browser;
    }
  }]);
}]);

/**
 * @private
 * Parts of Ionic requires that $scope data is attached to the element.
 * We do not want to disable adding $scope data to the $element when
 * $compileProvider.debugInfoEnabled(false) is used.
 */
IonicModule.config(['$provide', function($provide) {
  $provide.decorator('$compile', ['$delegate', function($compile) {
     $compile.$$addScopeInfo = function $$addScopeInfo($element, scope, isolated, noTemplate) {
       var dataName = isolated ? (noTemplate ? '$isolateScopeNoTemplate' : '$isolateScope') : '$scope';
       $element.data(dataName, scope);
     };
     return $compile;
  }]);
}]);

/**
 * @private
 */
IonicModule.config([
  '$provide',
function($provide) {
  function $LocationDecorator($location, $timeout) {

    $location.__hash = $location.hash;
    //Fix: when window.location.hash is set, the scrollable area
    //found nearest to body's scrollTop is set to scroll to an element
    //with that ID.
    $location.hash = function(value) {
      if (isDefined(value) && value.length > 0) {
        $timeout(function() {
          var scroll = document.querySelector('.scroll-content');
          if (scroll) {
            scroll.scrollTop = 0;
          }
        }, 0, false);
      }
      return $location.__hash(value);
    };

    return $location;
  }

  $provide.decorator('$location', ['$delegate', '$timeout', $LocationDecorator]);
}]);

IonicModule

.controller('$ionicHeaderBar', [
  '$scope',
  '$element',
  '$attrs',
  '$q',
  '$ionicConfig',
  '$ionicHistory',
function($scope, $element, $attrs, $q, $ionicConfig, $ionicHistory) {
  var TITLE = 'title';
  var BACK_TEXT = 'back-text';
  var BACK_BUTTON = 'back-button';
  var DEFAULT_TITLE = 'default-title';
  var PREVIOUS_TITLE = 'previous-title';
  var HIDE = 'hide';

  var self = this;
  var titleText = '';
  var previousTitleText = '';
  var titleLeft = 0;
  var titleRight = 0;
  var titleCss = '';
  var isBackEnabled = false;
  var isBackShown = true;
  var isNavBackShown = true;
  var isBackElementShown = false;
  var titleTextWidth = 0;


  self.beforeEnter = function(viewData) {
    $scope.$broadcast('$ionicView.beforeEnter', viewData);
  };


  self.title = function(newTitleText) {
    if (arguments.length && newTitleText !== titleText) {
      getEle(TITLE).innerHTML = newTitleText;
      titleText = newTitleText;
      titleTextWidth = 0;
    }
    return titleText;
  };


  self.enableBack = function(shouldEnable, disableReset) {
    // whether or not the back button show be visible, according
    // to the navigation and history
    if (arguments.length) {
      isBackEnabled = shouldEnable;
      if (!disableReset) self.updateBackButton();
    }
    return isBackEnabled;
  };


  self.showBack = function(shouldShow, disableReset) {
    // different from enableBack() because this will always have the back
    // visually hidden if false, even if the history says it should show
    if (arguments.length) {
      isBackShown = shouldShow;
      if (!disableReset) self.updateBackButton();
    }
    return isBackShown;
  };


  self.showNavBack = function(shouldShow) {
    // different from showBack() because this is for the entire nav bar's
    // setting for all of it's child headers. For internal use.
    isNavBackShown = shouldShow;
    self.updateBackButton();
  };


  self.updateBackButton = function() {
    var ele;
    if ((isBackShown && isNavBackShown && isBackEnabled) !== isBackElementShown) {
      isBackElementShown = isBackShown && isNavBackShown && isBackEnabled;
      ele = getEle(BACK_BUTTON);
      ele && ele.classList[ isBackElementShown ? 'remove' : 'add' ](HIDE);
    }

    if (isBackEnabled) {
      ele = ele || getEle(BACK_BUTTON);
      if (ele) {
        if (self.backButtonIcon !== $ionicConfig.backButton.icon()) {
          ele = getEle(BACK_BUTTON + ' .icon');
          if (ele) {
            self.backButtonIcon = $ionicConfig.backButton.icon();
            ele.className = 'icon ' + self.backButtonIcon;
          }
        }

        if (self.backButtonText !== $ionicConfig.backButton.text()) {
          ele = getEle(BACK_BUTTON + ' .back-text');
          if (ele) {
            ele.textContent = self.backButtonText = $ionicConfig.backButton.text();
          }
        }
      }
    }
  };


  self.titleTextWidth = function() {
    var element = getEle(TITLE);
    if ( element ) {
      // If the element has a nav-bar-title, use that instead
      // to calculate the width of the title
      var children = angular.element(element).children();
      for ( var i = 0; i < children.length; i++ ) {
        if ( angular.element(children[i]).hasClass('nav-bar-title') ) {
          element = children[i];
          break;
        }
      }
    }
    var bounds = ionic.DomUtil.getTextBounds(element);
    titleTextWidth = Math.min(bounds && bounds.width || 30);
    return titleTextWidth;
  };


  self.titleWidth = function() {
    var titleWidth = self.titleTextWidth();
    var offsetWidth = getEle(TITLE).offsetWidth;
    if (offsetWidth < titleWidth) {
      titleWidth = offsetWidth + (titleLeft - titleRight - 5);
    }
    return titleWidth;
  };


  self.titleTextX = function() {
    return ($element[0].offsetWidth / 2) - (self.titleWidth() / 2);
  };


  self.titleLeftRight = function() {
    return titleLeft - titleRight;
  };


  self.backButtonTextLeft = function() {
    var offsetLeft = 0;
    var ele = getEle(BACK_TEXT);
    while (ele) {
      offsetLeft += ele.offsetLeft;
      ele = ele.parentElement;
    }
    return offsetLeft;
  };


  self.resetBackButton = function(viewData) {
    if ($ionicConfig.backButton.previousTitleText()) {
      var previousTitleEle = getEle(PREVIOUS_TITLE);
      if (previousTitleEle) {
        previousTitleEle.classList.remove(HIDE);

        var view = (viewData && $ionicHistory.getViewById(viewData.viewId));
        var newPreviousTitleText = $ionicHistory.backTitle(view);

        if (newPreviousTitleText !== previousTitleText) {
          previousTitleText = previousTitleEle.innerHTML = newPreviousTitleText;
        }
      }
      var defaultTitleEle = getEle(DEFAULT_TITLE);
      if (defaultTitleEle) {
        defaultTitleEle.classList.remove(HIDE);
      }
    }
  };


  self.align = function(textAlign) {
    var titleEle = getEle(TITLE);

    textAlign = textAlign || $attrs.alignTitle || $ionicConfig.navBar.alignTitle();

    var widths = self.calcWidths(textAlign, false);

    if (isBackShown && previousTitleText && $ionicConfig.backButton.previousTitleText()) {
      var previousTitleWidths = self.calcWidths(textAlign, true);

      var availableTitleWidth = $element[0].offsetWidth - previousTitleWidths.titleLeft - previousTitleWidths.titleRight;

      if (self.titleTextWidth() <= availableTitleWidth) {
        widths = previousTitleWidths;
      }
    }

    return self.updatePositions(titleEle, widths.titleLeft, widths.titleRight, widths.buttonsLeft, widths.buttonsRight, widths.css, widths.showPrevTitle);
  };


  self.calcWidths = function(textAlign, isPreviousTitle) {
    var titleEle = getEle(TITLE);
    var backBtnEle = getEle(BACK_BUTTON);
    var x, y, z, b, c, d, childSize, bounds;
    var childNodes = $element[0].childNodes;
    var buttonsLeft = 0;
    var buttonsRight = 0;
    var isCountRightOfTitle;
    var updateTitleLeft = 0;
    var updateTitleRight = 0;
    var updateCss = '';
    var backButtonWidth = 0;

    // Compute how wide the left children are
    // Skip all titles (there may still be two titles, one leaving the dom)
    // Once we encounter a titleEle, realize we are now counting the right-buttons, not left
    for (x = 0; x < childNodes.length; x++) {
      c = childNodes[x];

      childSize = 0;
      if (c.nodeType == 1) {
        // element node
        if (c === titleEle) {
          isCountRightOfTitle = true;
          continue;
        }

        if (c.classList.contains(HIDE)) {
          continue;
        }

        if (isBackShown && c === backBtnEle) {

          for (y = 0; y < c.childNodes.length; y++) {
            b = c.childNodes[y];

            if (b.nodeType == 1) {

              if (b.classList.contains(BACK_TEXT)) {
                for (z = 0; z < b.children.length; z++) {
                  d = b.children[z];

                  if (isPreviousTitle) {
                    if (d.classList.contains(DEFAULT_TITLE)) continue;
                    backButtonWidth += d.offsetWidth;
                  } else {
                    if (d.classList.contains(PREVIOUS_TITLE)) continue;
                    backButtonWidth += d.offsetWidth;
                  }
                }

              } else {
                backButtonWidth += b.offsetWidth;
              }

            } else if (b.nodeType == 3 && b.nodeValue.trim()) {
              bounds = ionic.DomUtil.getTextBounds(b);
              backButtonWidth += bounds && bounds.width || 0;
            }

          }
          childSize = backButtonWidth || c.offsetWidth;

        } else {
          // not the title, not the back button, not a hidden element
          childSize = c.offsetWidth;
        }

      } else if (c.nodeType == 3 && c.nodeValue.trim()) {
        // text node
        bounds = ionic.DomUtil.getTextBounds(c);
        childSize = bounds && bounds.width || 0;
      }

      if (isCountRightOfTitle) {
        buttonsRight += childSize;
      } else {
        buttonsLeft += childSize;
      }
    }

    // Size and align the header titleEle based on the sizes of the left and
    // right children, and the desired alignment mode
    if (textAlign == 'left') {
      updateCss = 'title-left';
      if (buttonsLeft) {
        updateTitleLeft = buttonsLeft + 15;
      }
      if (buttonsRight) {
        updateTitleRight = buttonsRight + 15;
      }

    } else if (textAlign == 'right') {
      updateCss = 'title-right';
      if (buttonsLeft) {
        updateTitleLeft = buttonsLeft + 15;
      }
      if (buttonsRight) {
        updateTitleRight = buttonsRight + 15;
      }

    } else {
      // center the default
      var margin = Math.max(buttonsLeft, buttonsRight) + 10;
      if (margin > 10) {
        updateTitleLeft = updateTitleRight = margin;
      }
    }

    return {
      backButtonWidth: backButtonWidth,
      buttonsLeft: buttonsLeft,
      buttonsRight: buttonsRight,
      titleLeft: updateTitleLeft,
      titleRight: updateTitleRight,
      showPrevTitle: isPreviousTitle,
      css: updateCss
    };
  };


  self.updatePositions = function(titleEle, updateTitleLeft, updateTitleRight, buttonsLeft, buttonsRight, updateCss, showPreviousTitle) {
    var deferred = $q.defer();

    // only make DOM updates when there are actual changes
    if (titleEle) {
      if (updateTitleLeft !== titleLeft) {
        titleEle.style.left = updateTitleLeft ? updateTitleLeft + 'px' : '';
        titleLeft = updateTitleLeft;
      }
      if (updateTitleRight !== titleRight) {
        titleEle.style.right = updateTitleRight ? updateTitleRight + 'px' : '';
        titleRight = updateTitleRight;
      }

      if (updateCss !== titleCss) {
        updateCss && titleEle.classList.add(updateCss);
        titleCss && titleEle.classList.remove(titleCss);
        titleCss = updateCss;
      }
    }

    if ($ionicConfig.backButton.previousTitleText()) {
      var prevTitle = getEle(PREVIOUS_TITLE);
      var defaultTitle = getEle(DEFAULT_TITLE);

      prevTitle && prevTitle.classList[ showPreviousTitle ? 'remove' : 'add'](HIDE);
      defaultTitle && defaultTitle.classList[ showPreviousTitle ? 'add' : 'remove'](HIDE);
    }

    ionic.requestAnimationFrame(function() {
      if (titleEle && titleEle.offsetWidth + 10 < titleEle.scrollWidth) {
        var minRight = buttonsRight + 5;
        var testRight = $element[0].offsetWidth - titleLeft - self.titleTextWidth() - 20;
        updateTitleRight = testRight < minRight ? minRight : testRight;
        if (updateTitleRight !== titleRight) {
          titleEle.style.right = updateTitleRight + 'px';
          titleRight = updateTitleRight;
        }
      }
      deferred.resolve();
    });

    return deferred.promise;
  };


  self.setCss = function(elementClassname, css) {
    ionic.DomUtil.cachedStyles(getEle(elementClassname), css);
  };


  var eleCache = {};
  function getEle(className) {
    if (!eleCache[className]) {
      eleCache[className] = $element[0].querySelector('.' + className);
    }
    return eleCache[className];
  }


  $scope.$on('$destroy', function() {
    for (var n in eleCache) eleCache[n] = null;
  });

}]);

IonicModule
.controller('$ionInfiniteScroll', [
  '$scope',
  '$attrs',
  '$element',
  '$timeout',
function($scope, $attrs, $element, $timeout) {
  var self = this;
  self.isLoading = false;

  $scope.icon = function() {
    return isDefined($attrs.icon) ? $attrs.icon : 'ion-load-d';
  };

  $scope.spinner = function() {
    return isDefined($attrs.spinner) ? $attrs.spinner : '';
  };

  $scope.$on('scroll.infiniteScrollComplete', function() {
    finishInfiniteScroll();
  });

  $scope.$on('$destroy', function() {
    if (self.scrollCtrl && self.scrollCtrl.$element) self.scrollCtrl.$element.off('scroll', self.checkBounds);
    if (self.scrollEl && self.scrollEl.removeEventListener) {
      self.scrollEl.removeEventListener('scroll', self.checkBounds);
    }
  });

  // debounce checking infinite scroll events
  self.checkBounds = ionic.Utils.throttle(checkInfiniteBounds, 300);

  function onInfinite() {
    ionic.requestAnimationFrame(function() {
      $element[0].classList.add('active');
    });
    self.isLoading = true;
    $scope.$parent && $scope.$parent.$apply($attrs.onInfinite || '');
  }

  function finishInfiniteScroll() {
    ionic.requestAnimationFrame(function() {
      $element[0].classList.remove('active');
    });
    $timeout(function() {
      if (self.jsScrolling) self.scrollView.resize();
      // only check bounds again immediately if the page isn't cached (scroll el has height)
      if ((self.jsScrolling && self.scrollView.__container && self.scrollView.__container.offsetHeight > 0) ||
      !self.jsScrolling) {
        self.checkBounds();
      }
    }, 30, false);
    self.isLoading = false;
  }

  // check if we've scrolled far enough to trigger an infinite scroll
  function checkInfiniteBounds() {
    if (self.isLoading) return;
    var maxScroll = {};

    if (self.jsScrolling) {
      maxScroll = self.getJSMaxScroll();
      var scrollValues = self.scrollView.getValues();
      if ((maxScroll.left !== -1 && scrollValues.left >= maxScroll.left) ||
        (maxScroll.top !== -1 && scrollValues.top >= maxScroll.top)) {
        onInfinite();
      }
    } else {
      maxScroll = self.getNativeMaxScroll();
      if ((
        maxScroll.left !== -1 &&
        self.scrollEl.scrollLeft >= maxScroll.left - self.scrollEl.clientWidth
        ) || (
        maxScroll.top !== -1 &&
        self.scrollEl.scrollTop >= maxScroll.top - self.scrollEl.clientHeight
        )) {
        onInfinite();
      }
    }
  }

  // determine the threshold at which we should fire an infinite scroll
  // note: this gets processed every scroll event, can it be cached?
  self.getJSMaxScroll = function() {
    var maxValues = self.scrollView.getScrollMax();
    return {
      left: self.scrollView.options.scrollingX ?
        calculateMaxValue(maxValues.left) :
        -1,
      top: self.scrollView.options.scrollingY ?
        calculateMaxValue(maxValues.top) :
        -1
    };
  };

  self.getNativeMaxScroll = function() {
    var maxValues = {
      left: self.scrollEl.scrollWidth,
      top: self.scrollEl.scrollHeight
    };
    var computedStyle = window.getComputedStyle(self.scrollEl) || {};
    return {
      left: maxValues.left &&
        (computedStyle.overflowX === 'scroll' ||
        computedStyle.overflowX === 'auto' ||
        self.scrollEl.style['overflow-x'] === 'scroll') ?
        calculateMaxValue(maxValues.left) : -1,
      top: maxValues.top &&
        (computedStyle.overflowY === 'scroll' ||
        computedStyle.overflowY === 'auto' ||
        self.scrollEl.style['overflow-y'] === 'scroll' ) ?
        calculateMaxValue(maxValues.top) : -1
    };
  };

  // determine pixel refresh distance based on % or value
  function calculateMaxValue(maximum) {
    var distance = ($attrs.distance || '2.5%').trim();
    var isPercent = distance.indexOf('%') !== -1;
    return isPercent ?
    maximum * (1 - parseFloat(distance) / 100) :
    maximum - parseFloat(distance);
  }

  //for testing
  self.__finishInfiniteScroll = finishInfiniteScroll;

}]);

/**
 * @ngdoc service
 * @name $ionicListDelegate
 * @module ionic
 *
 * @description
 * Delegate for controlling the {@link ionic.directive:ionList} directive.
 *
 * Methods called directly on the $ionicListDelegate service will control all lists.
 * Use the {@link ionic.service:$ionicListDelegate#$getByHandle $getByHandle}
 * method to control specific ionList instances.
 *
 * @usage
 * ```html
 * {% raw %}
 * <ion-content ng-controller="MyCtrl">
 *   <button class="button" ng-click="showDeleteButtons()"></button>
 *   <ion-list>
 *     <ion-item ng-repeat="i in items">
 *       Hello, {{i}}!
 *       <ion-delete-button class="ion-minus-circled"></ion-delete-button>
 *     </ion-item>
 *   </ion-list>
 * </ion-content>
 * {% endraw %}
 * ```

 * ```js
 * function MyCtrl($scope, $ionicListDelegate) {
 *   $scope.showDeleteButtons = function() {
 *     $ionicListDelegate.showDelete(true);
 *   };
 * }
 * ```
 */
IonicModule.service('$ionicListDelegate', ionic.DelegateService([
  /**
   * @ngdoc method
   * @name $ionicListDelegate#showReorder
   * @param {boolean=} showReorder Set whether or not this list is showing its reorder buttons.
   * @returns {boolean} Whether the reorder buttons are shown.
   */
  'showReorder',
  /**
   * @ngdoc method
   * @name $ionicListDelegate#showDelete
   * @param {boolean=} showDelete Set whether or not this list is showing its delete buttons.
   * @returns {boolean} Whether the delete buttons are shown.
   */
  'showDelete',
  /**
   * @ngdoc method
   * @name $ionicListDelegate#canSwipeItems
   * @param {boolean=} canSwipeItems Set whether or not this list is able to swipe to show
   * option buttons.
   * @returns {boolean} Whether the list is able to swipe to show option buttons.
   */
  'canSwipeItems',
  /**
   * @ngdoc method
   * @name $ionicListDelegate#closeOptionButtons
   * @description Closes any option buttons on the list that are swiped open.
   */
  'closeOptionButtons'
  /**
   * @ngdoc method
   * @name $ionicListDelegate#$getByHandle
   * @param {string} handle
   * @returns `delegateInstance` A delegate instance that controls only the
   * {@link ionic.directive:ionList} directives with `delegate-handle` matching
   * the given handle.
   *
   * Example: `$ionicListDelegate.$getByHandle('my-handle').showReorder(true);`
   */
]))

.controller('$ionicList', [
  '$scope',
  '$attrs',
  '$ionicListDelegate',
  '$ionicHistory',
function($scope, $attrs, $ionicListDelegate, $ionicHistory) {
  var self = this;
  var isSwipeable = true;
  var isReorderShown = false;
  var isDeleteShown = false;

  var deregisterInstance = $ionicListDelegate._registerInstance(
    self, $attrs.delegateHandle, function() {
      return $ionicHistory.isActiveScope($scope);
    }
  );
  $scope.$on('$destroy', deregisterInstance);

  self.showReorder = function(show) {
    if (arguments.length) {
      isReorderShown = !!show;
    }
    return isReorderShown;
  };

  self.showDelete = function(show) {
    if (arguments.length) {
      isDeleteShown = !!show;
    }
    return isDeleteShown;
  };

  self.canSwipeItems = function(can) {
    if (arguments.length) {
      isSwipeable = !!can;
    }
    return isSwipeable;
  };

  self.closeOptionButtons = function() {
    self.listView && self.listView.clearDragEffects();
  };
}]);

IonicModule

.controller('$ionicNavBar', [
  '$scope',
  '$element',
  '$attrs',
  '$compile',
  '$timeout',
  '$ionicNavBarDelegate',
  '$ionicConfig',
  '$ionicHistory',
function($scope, $element, $attrs, $compile, $timeout, $ionicNavBarDelegate, $ionicConfig, $ionicHistory) {

  var CSS_HIDE = 'hide';
  var DATA_NAV_BAR_CTRL = '$ionNavBarController';
  var PRIMARY_BUTTONS = 'primaryButtons';
  var SECONDARY_BUTTONS = 'secondaryButtons';
  var BACK_BUTTON = 'backButton';
  var ITEM_TYPES = 'primaryButtons secondaryButtons leftButtons rightButtons title'.split(' ');

  var self = this;
  var headerBars = [];
  var navElementHtml = {};
  var isVisible = true;
  var queuedTransitionStart, queuedTransitionEnd, latestTransitionId;

  $element.parent().data(DATA_NAV_BAR_CTRL, self);

  var delegateHandle = $attrs.delegateHandle || 'navBar' + ionic.Utils.nextUid();

  var deregisterInstance = $ionicNavBarDelegate._registerInstance(self, delegateHandle);


  self.init = function() {
    $element.addClass('nav-bar-container');
    ionic.DomUtil.cachedAttr($element, 'nav-bar-transition', $ionicConfig.views.transition());

    // create two nav bar blocks which will trade out which one is shown
    self.createHeaderBar(false);
    self.createHeaderBar(true);

    $scope.$emit('ionNavBar.init', delegateHandle);
  };


  self.createHeaderBar = function(isActive) {
    var containerEle = jqLite('<div class="nav-bar-block">');
    ionic.DomUtil.cachedAttr(containerEle, 'nav-bar', isActive ? 'active' : 'cached');

    var alignTitle = $attrs.alignTitle || $ionicConfig.navBar.alignTitle();
    var headerBarEle = jqLite('<ion-header-bar>').addClass($attrs['class']).attr('align-title', alignTitle);
    if (isDefined($attrs.noTapScroll)) headerBarEle.attr('no-tap-scroll', $attrs.noTapScroll);
    var titleEle = jqLite('<div class="title title-' + alignTitle + '">');
    var navEle = {};
    var lastViewItemEle = {};
    var leftButtonsEle, rightButtonsEle;

    navEle[BACK_BUTTON] = createNavElement(BACK_BUTTON);
    navEle[BACK_BUTTON] && headerBarEle.append(navEle[BACK_BUTTON]);

    // append title in the header, this is the rock to where buttons append
    headerBarEle.append(titleEle);

    forEach(ITEM_TYPES, function(itemType) {
      // create default button elements
      navEle[itemType] = createNavElement(itemType);
      // append and position buttons
      positionItem(navEle[itemType], itemType);
    });

    // add header-item to the root children
    for (var x = 0; x < headerBarEle[0].children.length; x++) {
      headerBarEle[0].children[x].classList.add('header-item');
    }

    // compile header and append to the DOM
    containerEle.append(headerBarEle);
    $element.append($compile(containerEle)($scope.$new()));

    var headerBarCtrl = headerBarEle.data('$ionHeaderBarController');
    headerBarCtrl.backButtonIcon = $ionicConfig.backButton.icon();
    headerBarCtrl.backButtonText = $ionicConfig.backButton.text();

    var headerBarInstance = {
      isActive: isActive,
      title: function(newTitleText) {
        headerBarCtrl.title(newTitleText);
      },
      setItem: function(navBarItemEle, itemType) {
        // first make sure any exiting nav bar item has been removed
        headerBarInstance.removeItem(itemType);

        if (navBarItemEle) {
          if (itemType === 'title') {
            // clear out the text based title
            headerBarInstance.title("");
          }

          // there's a custom nav bar item
          positionItem(navBarItemEle, itemType);

          if (navEle[itemType]) {
            // make sure the default on this itemType is hidden
            navEle[itemType].addClass(CSS_HIDE);
          }
          lastViewItemEle[itemType] = navBarItemEle;

        } else if (navEle[itemType]) {
          // there's a default button for this side and no view button
          navEle[itemType].removeClass(CSS_HIDE);
        }
      },
      removeItem: function(itemType) {
        if (lastViewItemEle[itemType]) {
          lastViewItemEle[itemType].scope().$destroy();
          lastViewItemEle[itemType].remove();
          lastViewItemEle[itemType] = null;
        }
      },
      containerEle: function() {
        return containerEle;
      },
      headerBarEle: function() {
        return headerBarEle;
      },
      afterLeave: function() {
        forEach(ITEM_TYPES, function(itemType) {
          headerBarInstance.removeItem(itemType);
        });
        headerBarCtrl.resetBackButton();
      },
      controller: function() {
        return headerBarCtrl;
      },
      destroy: function() {
        forEach(ITEM_TYPES, function(itemType) {
          headerBarInstance.removeItem(itemType);
        });
        containerEle.scope().$destroy();
        for (var n in navEle) {
          if (navEle[n]) {
            navEle[n].removeData();
            navEle[n] = null;
          }
        }
        leftButtonsEle && leftButtonsEle.removeData();
        rightButtonsEle && rightButtonsEle.removeData();
        titleEle.removeData();
        headerBarEle.removeData();
        containerEle.remove();
        containerEle = headerBarEle = titleEle = leftButtonsEle = rightButtonsEle = null;
      }
    };

    function positionItem(ele, itemType) {
      if (!ele) return;

      if (itemType === 'title') {
        // title element
        titleEle.append(ele);

      } else if (itemType == 'rightButtons' ||
                (itemType == SECONDARY_BUTTONS && $ionicConfig.navBar.positionSecondaryButtons() != 'left') ||
                (itemType == PRIMARY_BUTTONS && $ionicConfig.navBar.positionPrimaryButtons() == 'right')) {
        // right side
        if (!rightButtonsEle) {
          rightButtonsEle = jqLite('<div class="buttons buttons-right">');
          headerBarEle.append(rightButtonsEle);
        }
        if (itemType == SECONDARY_BUTTONS) {
          rightButtonsEle.append(ele);
        } else {
          rightButtonsEle.prepend(ele);
        }

      } else {
        // left side
        if (!leftButtonsEle) {
          leftButtonsEle = jqLite('<div class="buttons buttons-left">');
          if (navEle[BACK_BUTTON]) {
            navEle[BACK_BUTTON].after(leftButtonsEle);
          } else {
            headerBarEle.prepend(leftButtonsEle);
          }
        }
        if (itemType == SECONDARY_BUTTONS) {
          leftButtonsEle.append(ele);
        } else {
          leftButtonsEle.prepend(ele);
        }
      }

    }

    headerBars.push(headerBarInstance);

    return headerBarInstance;
  };


  self.navElement = function(type, html) {
    if (isDefined(html)) {
      navElementHtml[type] = html;
    }
    return navElementHtml[type];
  };


  self.update = function(viewData) {
    var showNavBar = !viewData.hasHeaderBar && viewData.showNavBar;
    viewData.transition = $ionicConfig.views.transition();

    if (!showNavBar) {
      viewData.direction = 'none';
    }

    self.enable(showNavBar);
    var enteringHeaderBar = self.isInitialized ? getOffScreenHeaderBar() : getOnScreenHeaderBar();
    var leavingHeaderBar = self.isInitialized ? getOnScreenHeaderBar() : null;
    var enteringHeaderCtrl = enteringHeaderBar.controller();

    // update if the entering header should show the back button or not
    enteringHeaderCtrl.enableBack(viewData.enableBack, true);
    enteringHeaderCtrl.showBack(viewData.showBack, true);
    enteringHeaderCtrl.updateBackButton();

    // update the entering header bar's title
    self.title(viewData.title, enteringHeaderBar);

    self.showBar(showNavBar);

    // update the nav bar items, depending if the view has their own or not
    if (viewData.navBarItems) {
      forEach(ITEM_TYPES, function(itemType) {
        enteringHeaderBar.setItem(viewData.navBarItems[itemType], itemType);
      });
    }

    // begin transition of entering and leaving header bars
    self.transition(enteringHeaderBar, leavingHeaderBar, viewData);

    self.isInitialized = true;
    navSwipeAttr('');
  };


  self.transition = function(enteringHeaderBar, leavingHeaderBar, viewData) {
    var enteringHeaderBarCtrl = enteringHeaderBar.controller();
    var transitionFn = $ionicConfig.transitions.navBar[viewData.navBarTransition] || $ionicConfig.transitions.navBar.none;
    var transitionId = viewData.transitionId;

    enteringHeaderBarCtrl.beforeEnter(viewData);

    var navBarTransition = transitionFn(enteringHeaderBar, leavingHeaderBar, viewData.direction, viewData.shouldAnimate && self.isInitialized);

    ionic.DomUtil.cachedAttr($element, 'nav-bar-transition', viewData.navBarTransition);
    ionic.DomUtil.cachedAttr($element, 'nav-bar-direction', viewData.direction);

    if (navBarTransition.shouldAnimate && viewData.renderEnd) {
      navBarAttr(enteringHeaderBar, 'stage');
    } else {
      navBarAttr(enteringHeaderBar, 'entering');
      navBarAttr(leavingHeaderBar, 'leaving');
    }

    enteringHeaderBarCtrl.resetBackButton(viewData);

    navBarTransition.run(0);

    self.activeTransition = {
      run: function(step) {
        navBarTransition.shouldAnimate = false;
        navBarTransition.direction = 'back';
        navBarTransition.run(step);
      },
      cancel: function(shouldAnimate, speed, cancelData) {
        navSwipeAttr(speed);
        navBarAttr(leavingHeaderBar, 'active');
        navBarAttr(enteringHeaderBar, 'cached');
        navBarTransition.shouldAnimate = shouldAnimate;
        navBarTransition.run(0);
        self.activeTransition = navBarTransition = null;

        var runApply;
        if (cancelData.showBar !== self.showBar()) {
          self.showBar(cancelData.showBar);
        }
        if (cancelData.showBackButton !== self.showBackButton()) {
          self.showBackButton(cancelData.showBackButton);
        }
        if (runApply) {
          $scope.$apply();
        }
      },
      complete: function(shouldAnimate, speed) {
        navSwipeAttr(speed);
        navBarTransition.shouldAnimate = shouldAnimate;
        navBarTransition.run(1);
        queuedTransitionEnd = transitionEnd;
      }
    };

    $timeout(enteringHeaderBarCtrl.align, 16);

    queuedTransitionStart = function() {
      if (latestTransitionId !== transitionId) return;

      navBarAttr(enteringHeaderBar, 'entering');
      navBarAttr(leavingHeaderBar, 'leaving');

      navBarTransition.run(1);

      queuedTransitionEnd = function() {
        if (latestTransitionId == transitionId || !navBarTransition.shouldAnimate) {
          transitionEnd();
        }
      };

      queuedTransitionStart = null;
    };

    function transitionEnd() {
      for (var x = 0; x < headerBars.length; x++) {
        headerBars[x].isActive = false;
      }
      enteringHeaderBar.isActive = true;

      navBarAttr(enteringHeaderBar, 'active');
      navBarAttr(leavingHeaderBar, 'cached');

      self.activeTransition = navBarTransition = queuedTransitionEnd = null;
    }

    queuedTransitionStart();
  };


  self.triggerTransitionStart = function(triggerTransitionId) {
    latestTransitionId = triggerTransitionId;
    queuedTransitionStart && queuedTransitionStart();
  };


  self.triggerTransitionEnd = function() {
    queuedTransitionEnd && queuedTransitionEnd();
  };


  self.showBar = function(shouldShow) {
    if (arguments.length) {
      self.visibleBar(shouldShow);
      $scope.$parent.$hasHeader = !!shouldShow;
    }
    return !!$scope.$parent.$hasHeader;
  };


  self.visibleBar = function(shouldShow) {
    if (shouldShow && !isVisible) {
      $element.removeClass(CSS_HIDE);
      self.align();
    } else if (!shouldShow && isVisible) {
      $element.addClass(CSS_HIDE);
    }
    isVisible = shouldShow;
  };


  self.enable = function(val) {
    // set primary to show first
    self.visibleBar(val);

    // set non primary to hide second
    for (var x = 0; x < $ionicNavBarDelegate._instances.length; x++) {
      if ($ionicNavBarDelegate._instances[x] !== self) $ionicNavBarDelegate._instances[x].visibleBar(false);
    }
  };


  /**
   * @ngdoc method
   * @name $ionicNavBar#showBackButton
   * @description Show/hide the nav bar back button when there is a
   * back view. If the back button is not possible, for example, the
   * first view in the stack, then this will not force the back button
   * to show.
   */
  self.showBackButton = function(shouldShow) {
    if (arguments.length) {
      for (var x = 0; x < headerBars.length; x++) {
        headerBars[x].controller().showNavBack(!!shouldShow);
      }
      $scope.$isBackButtonShown = !!shouldShow;
    }
    return $scope.$isBackButtonShown;
  };


  /**
   * @ngdoc method
   * @name $ionicNavBar#showActiveBackButton
   * @description Show/hide only the active header bar's back button.
   */
  self.showActiveBackButton = function(shouldShow) {
    var headerBar = getOnScreenHeaderBar();
    if (headerBar) {
      if (arguments.length) {
        return headerBar.controller().showBack(shouldShow);
      }
      return headerBar.controller().showBack();
    }
  };


  self.title = function(newTitleText, headerBar) {
    if (isDefined(newTitleText)) {
      newTitleText = newTitleText || '';
      headerBar = headerBar || getOnScreenHeaderBar();
      headerBar && headerBar.title(newTitleText);
      $scope.$title = newTitleText;
      $ionicHistory.currentTitle(newTitleText);
    }
    return $scope.$title;
  };


  self.align = function(val, headerBar) {
    headerBar = headerBar || getOnScreenHeaderBar();
    headerBar && headerBar.controller().align(val);
  };


  self.hasTabsTop = function(isTabsTop) {
    $element[isTabsTop ? 'addClass' : 'removeClass']('nav-bar-tabs-top');
  };

  self.hasBarSubheader = function(isBarSubheader) {
    $element[isBarSubheader ? 'addClass' : 'removeClass']('nav-bar-has-subheader');
  };

  // DEPRECATED, as of v1.0.0-beta14 -------
  self.changeTitle = function(val) {
    deprecatedWarning('changeTitle(val)', 'title(val)');
    self.title(val);
  };
  self.setTitle = function(val) {
    deprecatedWarning('setTitle(val)', 'title(val)');
    self.title(val);
  };
  self.getTitle = function() {
    deprecatedWarning('getTitle()', 'title()');
    return self.title();
  };
  self.back = function() {
    deprecatedWarning('back()', '$ionicHistory.goBack()');
    $ionicHistory.goBack();
  };
  self.getPreviousTitle = function() {
    deprecatedWarning('getPreviousTitle()', '$ionicHistory.backTitle()');
    $ionicHistory.goBack();
  };
  function deprecatedWarning(oldMethod, newMethod) {
    var warn = console.warn || console.log;
    warn && warn.call(console, 'navBarController.' + oldMethod + ' is deprecated, please use ' + newMethod + ' instead');
  }
  // END DEPRECATED -------


  function createNavElement(type) {
    if (navElementHtml[type]) {
      return jqLite(navElementHtml[type]);
    }
  }


  function getOnScreenHeaderBar() {
    for (var x = 0; x < headerBars.length; x++) {
      if (headerBars[x].isActive) return headerBars[x];
    }
  }


  function getOffScreenHeaderBar() {
    for (var x = 0; x < headerBars.length; x++) {
      if (!headerBars[x].isActive) return headerBars[x];
    }
  }


  function navBarAttr(ctrl, val) {
    ctrl && ionic.DomUtil.cachedAttr(ctrl.containerEle(), 'nav-bar', val);
  }

  function navSwipeAttr(val) {
    ionic.DomUtil.cachedAttr($element, 'nav-swipe', val);
  }


  $scope.$on('$destroy', function() {
    $scope.$parent.$hasHeader = false;
    $element.parent().removeData(DATA_NAV_BAR_CTRL);
    for (var x = 0; x < headerBars.length; x++) {
      headerBars[x].destroy();
    }
    $element.remove();
    $element = headerBars = null;
    deregisterInstance();
  });

}]);

IonicModule
.controller('$ionicNavView', [
  '$scope',
  '$element',
  '$attrs',
  '$compile',
  '$controller',
  '$ionicNavBarDelegate',
  '$ionicNavViewDelegate',
  '$ionicHistory',
  '$ionicViewSwitcher',
  '$ionicConfig',
  '$ionicScrollDelegate',
  '$ionicSideMenuDelegate',
function($scope, $element, $attrs, $compile, $controller, $ionicNavBarDelegate, $ionicNavViewDelegate, $ionicHistory, $ionicViewSwitcher, $ionicConfig, $ionicScrollDelegate, $ionicSideMenuDelegate) {

  var DATA_ELE_IDENTIFIER = '$eleId';
  var DATA_DESTROY_ELE = '$destroyEle';
  var DATA_NO_CACHE = '$noCache';
  var VIEW_STATUS_ACTIVE = 'active';
  var VIEW_STATUS_CACHED = 'cached';

  var self = this;
  var direction;
  var isPrimary = false;
  var navBarDelegate;
  var activeEleId;
  var navViewAttr = $ionicViewSwitcher.navViewAttr;
  var disableRenderStartViewId, disableAnimation;

  self.scope = $scope;
  self.element = $element;

  self.init = function() {
    var navViewName = $attrs.name || '';

    // Find the details of the parent view directive (if any) and use it
    // to derive our own qualified view name, then hang our own details
    // off the DOM so child directives can find it.
    var parent = $element.parent().inheritedData('$uiView');
    var parentViewName = ((parent && parent.state) ? parent.state.name : '');
    if (navViewName.indexOf('@') < 0) navViewName = navViewName + '@' + parentViewName;

    var viewData = { name: navViewName, state: null };
    $element.data('$uiView', viewData);

    var deregisterInstance = $ionicNavViewDelegate._registerInstance(self, $attrs.delegateHandle);
    $scope.$on('$destroy', function() {
      deregisterInstance();

      // ensure no scrolls have been left frozen
      if (self.isSwipeFreeze) {
        $ionicScrollDelegate.freezeAllScrolls(false);
      }
    });

    $scope.$on('$ionicHistory.deselect', self.cacheCleanup);
    $scope.$on('$ionicTabs.top', onTabsTop);
    $scope.$on('$ionicSubheader', onBarSubheader);

    $scope.$on('$ionicTabs.beforeLeave', onTabsLeave);
    $scope.$on('$ionicTabs.afterLeave', onTabsLeave);
    $scope.$on('$ionicTabs.leave', onTabsLeave);

    ionic.Platform.ready(function() {
      if ( ionic.Platform.isWebView() && ionic.Platform.isIOS() ) {
          self.initSwipeBack();
      }
    });

    return viewData;
  };


  self.register = function(viewLocals) {
    var leavingView = extend({}, $ionicHistory.currentView());

    // register that a view is coming in and get info on how it should transition
    var registerData = $ionicHistory.register($scope, viewLocals);

    // update which direction
    self.update(registerData);

    // begin rendering and transitioning
    var enteringView = $ionicHistory.getViewById(registerData.viewId) || {};

    var renderStart = (disableRenderStartViewId !== registerData.viewId);
    self.render(registerData, viewLocals, enteringView, leavingView, renderStart, true);
  };


  self.update = function(registerData) {
    // always reset that this is the primary navView
    isPrimary = true;

    // remember what direction this navView should use
    // this may get updated later by a child navView
    direction = registerData.direction;

    var parentNavViewCtrl = $element.parent().inheritedData('$ionNavViewController');
    if (parentNavViewCtrl) {
      // this navView is nested inside another one
      // update the parent to use this direction and not
      // the other it originally was set to

      // inform the parent navView that it is not the primary navView
      parentNavViewCtrl.isPrimary(false);

      if (direction === 'enter' || direction === 'exit') {
        // they're entering/exiting a history
        // find parent navViewController
        parentNavViewCtrl.direction(direction);

        if (direction === 'enter') {
          // reset the direction so this navView doesn't animate
          // because it's parent will
          direction = 'none';
        }
      }
    }
  };


  self.render = function(registerData, viewLocals, enteringView, leavingView, renderStart, renderEnd) {
    // register the view and figure out where it lives in the various
    // histories and nav stacks, along with how views should enter/leave
    var switcher = $ionicViewSwitcher.create(self, viewLocals, enteringView, leavingView, renderStart, renderEnd);

    // init the rendering of views for this navView directive
    switcher.init(registerData, function() {
      // the view is now compiled, in the dom and linked, now lets transition the views.
      // this uses a callback incase THIS nav-view has a nested nav-view, and after the NESTED
      // nav-view links, the NESTED nav-view would update which direction THIS nav-view should use

      // kick off the transition of views
      switcher.transition(self.direction(), registerData.enableBack, !disableAnimation);

      // reset private vars for next time
      disableRenderStartViewId = disableAnimation = null;
    });

  };


  self.beforeEnter = function(transitionData) {
    if (isPrimary) {
      // only update this nav-view's nav-bar if this is the primary nav-view
      navBarDelegate = transitionData.navBarDelegate;
      var associatedNavBarCtrl = getAssociatedNavBarCtrl();
      associatedNavBarCtrl && associatedNavBarCtrl.update(transitionData);
      navSwipeAttr('');
    }
  };


  self.activeEleId = function(eleId) {
    if (arguments.length) {
      activeEleId = eleId;
    }
    return activeEleId;
  };


  self.transitionEnd = function() {
    var viewElements = $element.children();
    var x, l, viewElement;

    for (x = 0, l = viewElements.length; x < l; x++) {
      viewElement = viewElements.eq(x);

      if (viewElement.data(DATA_ELE_IDENTIFIER) === activeEleId) {
        // this is the active element
        navViewAttr(viewElement, VIEW_STATUS_ACTIVE);

      } else if (navViewAttr(viewElement) === 'leaving' || navViewAttr(viewElement) === VIEW_STATUS_ACTIVE || navViewAttr(viewElement) === VIEW_STATUS_CACHED) {
        // this is a leaving element or was the former active element, or is an cached element
        if (viewElement.data(DATA_DESTROY_ELE) || viewElement.data(DATA_NO_CACHE)) {
          // this element shouldn't stay cached
          $ionicViewSwitcher.destroyViewEle(viewElement);

        } else {
          // keep in the DOM, mark as cached
          navViewAttr(viewElement, VIEW_STATUS_CACHED);

          // disconnect the leaving scope
          ionic.Utils.disconnectScope(viewElement.scope());
        }
      }
    }

    navSwipeAttr('');

    // ensure no scrolls have been left frozen
    if (self.isSwipeFreeze) {
      $ionicScrollDelegate.freezeAllScrolls(false);
    }
  };


  function onTabsLeave(ev, data) {
    var viewElements = $element.children();
    var viewElement, viewScope;

    for (var x = 0, l = viewElements.length; x < l; x++) {
      viewElement = viewElements.eq(x);
      if (navViewAttr(viewElement) == VIEW_STATUS_ACTIVE) {
        viewScope = viewElement.scope();
        viewScope && viewScope.$emit(ev.name.replace('Tabs', 'View'), data);
        viewScope && viewScope.$broadcast(ev.name.replace('Tabs', 'ParentView'), data);
        break;
      }
    }
  }


  self.cacheCleanup = function() {
    var viewElements = $element.children();
    for (var x = 0, l = viewElements.length; x < l; x++) {
      if (viewElements.eq(x).data(DATA_DESTROY_ELE)) {
        $ionicViewSwitcher.destroyViewEle(viewElements.eq(x));
      }
    }
  };


  self.clearCache = function(stateIds) {
    var viewElements = $element.children();
    var viewElement, viewScope, x, l, y, eleIdentifier;

    for (x = 0, l = viewElements.length; x < l; x++) {
      viewElement = viewElements.eq(x);

      if (stateIds) {
        eleIdentifier = viewElement.data(DATA_ELE_IDENTIFIER);

        for (y = 0; y < stateIds.length; y++) {
          if (eleIdentifier === stateIds[y]) {
            $ionicViewSwitcher.destroyViewEle(viewElement);
          }
        }
        continue;
      }

      if (navViewAttr(viewElement) == VIEW_STATUS_CACHED) {
        $ionicViewSwitcher.destroyViewEle(viewElement);

      } else if (navViewAttr(viewElement) == VIEW_STATUS_ACTIVE) {
        viewScope = viewElement.scope();
        viewScope && viewScope.$broadcast('$ionicView.clearCache');
      }

    }
  };


  self.getViewElements = function() {
    return $element.children();
  };


  self.appendViewElement = function(viewEle, viewLocals) {
    // compile the entering element and get the link function
    var linkFn = $compile(viewEle);

    $element.append(viewEle);

    var viewScope = $scope.$new();

    if (viewLocals && viewLocals.$$controller) {
      viewLocals.$scope = viewScope;
      var controller = $controller(viewLocals.$$controller, viewLocals);
      if (viewLocals.$$controllerAs) {
        viewScope[viewLocals.$$controllerAs] = controller;
      }
      $element.children().data('$ngControllerController', controller);
    }

    linkFn(viewScope);

    return viewScope;
  };


  self.title = function(val) {
    var associatedNavBarCtrl = getAssociatedNavBarCtrl();
    associatedNavBarCtrl && associatedNavBarCtrl.title(val);
  };


  /**
   * @ngdoc method
   * @name $ionicNavView#enableBackButton
   * @description Enable/disable if the back button can be shown or not. For
   * example, the very first view in the navigation stack would not have a
   * back view, so the back button would be disabled.
   */
  self.enableBackButton = function(shouldEnable) {
    var associatedNavBarCtrl = getAssociatedNavBarCtrl();
    associatedNavBarCtrl && associatedNavBarCtrl.enableBackButton(shouldEnable);
  };


  /**
   * @ngdoc method
   * @name $ionicNavView#showBackButton
   * @description Show/hide the nav bar active back button. If the back button
   * is not possible this will not force the back button to show. The
   * `enableBackButton()` method handles if a back button is even possible or not.
   */
  self.showBackButton = function(shouldShow) {
    var associatedNavBarCtrl = getAssociatedNavBarCtrl();
    if (associatedNavBarCtrl) {
      if (arguments.length) {
        return associatedNavBarCtrl.showActiveBackButton(shouldShow);
      }
      return associatedNavBarCtrl.showActiveBackButton();
    }
    return true;
  };


  self.showBar = function(val) {
    var associatedNavBarCtrl = getAssociatedNavBarCtrl();
    if (associatedNavBarCtrl) {
      if (arguments.length) {
        return associatedNavBarCtrl.showBar(val);
      }
      return associatedNavBarCtrl.showBar();
    }
    return true;
  };


  self.isPrimary = function(val) {
    if (arguments.length) {
      isPrimary = val;
    }
    return isPrimary;
  };


  self.direction = function(val) {
    if (arguments.length) {
      direction = val;
    }
    return direction;
  };


  self.initSwipeBack = function() {
    var swipeBackHitWidth = $ionicConfig.views.swipeBackHitWidth();
    var viewTransition, associatedNavBarCtrl, backView;
    var deregDragStart, deregDrag, deregRelease;
    var windowWidth, startDragX, dragPoints;
    var cancelData = {};

    function onDragStart(ev) {
      if (!isPrimary || !$ionicConfig.views.swipeBackEnabled() || $ionicSideMenuDelegate.isOpenRight() ) return;


      startDragX = getDragX(ev);
      if (startDragX > swipeBackHitWidth) return;

      backView = $ionicHistory.backView();

      var currentView = $ionicHistory.currentView();

      if (!backView || backView.historyId !== currentView.historyId || currentView.canSwipeBack === false) return;

      if (!windowWidth) windowWidth = window.innerWidth;

      self.isSwipeFreeze = $ionicScrollDelegate.freezeAllScrolls(true);

      var registerData = {
        direction: 'back'
      };

      dragPoints = [];

      cancelData = {
        showBar: self.showBar(),
        showBackButton: self.showBackButton()
      };

      var switcher = $ionicViewSwitcher.create(self, registerData, backView, currentView, true, false);
      switcher.loadViewElements(registerData);
      switcher.render(registerData);

      viewTransition = switcher.transition('back', $ionicHistory.enabledBack(backView), true);

      associatedNavBarCtrl = getAssociatedNavBarCtrl();

      deregDrag = ionic.onGesture('drag', onDrag, $element[0]);
      deregRelease = ionic.onGesture('release', onRelease, $element[0]);
    }

    function onDrag(ev) {
      if (isPrimary && viewTransition) {
        var dragX = getDragX(ev);

        dragPoints.push({
          t: Date.now(),
          x: dragX
        });

        if (dragX >= windowWidth - 15) {
          onRelease(ev);

        } else {
          var step = Math.min(Math.max(getSwipeCompletion(dragX), 0), 1);
          viewTransition.run(step);
          associatedNavBarCtrl && associatedNavBarCtrl.activeTransition && associatedNavBarCtrl.activeTransition.run(step);
        }

      }
    }

    function onRelease(ev) {
      if (isPrimary && viewTransition && dragPoints && dragPoints.length > 1) {

        var now = Date.now();
        var releaseX = getDragX(ev);
        var startDrag = dragPoints[dragPoints.length - 1];

        for (var x = dragPoints.length - 2; x >= 0; x--) {
          if (now - startDrag.t > 200) {
            break;
          }
          startDrag = dragPoints[x];
        }

        var isSwipingRight = (releaseX >= dragPoints[dragPoints.length - 2].x);
        var releaseSwipeCompletion = getSwipeCompletion(releaseX);
        var velocity = Math.abs(startDrag.x - releaseX) / (now - startDrag.t);

        // private variables because ui-router has no way to pass custom data using $state.go
        disableRenderStartViewId = backView.viewId;
        disableAnimation = (releaseSwipeCompletion < 0.03 || releaseSwipeCompletion > 0.97);

        if (isSwipingRight && (releaseSwipeCompletion > 0.5 || velocity > 0.1)) {
          // complete view transition on release
          var speed = (velocity > 0.5 || velocity < 0.05 || releaseX > windowWidth - 45) ? 'fast' : 'slow';
          navSwipeAttr(disableAnimation ? '' : speed);
          backView.go();
          associatedNavBarCtrl && associatedNavBarCtrl.activeTransition && associatedNavBarCtrl.activeTransition.complete(!disableAnimation, speed);

        } else {
          // cancel view transition on release
          navSwipeAttr(disableAnimation ? '' : 'fast');
          disableRenderStartViewId = null;
          viewTransition.cancel(!disableAnimation);
          associatedNavBarCtrl && associatedNavBarCtrl.activeTransition && associatedNavBarCtrl.activeTransition.cancel(!disableAnimation, 'fast', cancelData);
          disableAnimation = null;
        }

      }

      ionic.offGesture(deregDrag, 'drag', onDrag);
      ionic.offGesture(deregRelease, 'release', onRelease);

      windowWidth = viewTransition = dragPoints = null;

      self.isSwipeFreeze = $ionicScrollDelegate.freezeAllScrolls(false);
    }

    function getDragX(ev) {
      return ionic.tap.pointerCoord(ev.gesture.srcEvent).x;
    }

    function getSwipeCompletion(dragX) {
      return (dragX - startDragX) / windowWidth;
    }

    deregDragStart = ionic.onGesture('dragstart', onDragStart, $element[0]);

    $scope.$on('$destroy', function() {
      ionic.offGesture(deregDragStart, 'dragstart', onDragStart);
      ionic.offGesture(deregDrag, 'drag', onDrag);
      ionic.offGesture(deregRelease, 'release', onRelease);
      self.element = viewTransition = associatedNavBarCtrl = null;
    });
  };


  function navSwipeAttr(val) {
    ionic.DomUtil.cachedAttr($element, 'nav-swipe', val);
  }


  function onTabsTop(ev, isTabsTop) {
    var associatedNavBarCtrl = getAssociatedNavBarCtrl();
    associatedNavBarCtrl && associatedNavBarCtrl.hasTabsTop(isTabsTop);
  }

  function onBarSubheader(ev, isBarSubheader) {
    var associatedNavBarCtrl = getAssociatedNavBarCtrl();
    associatedNavBarCtrl && associatedNavBarCtrl.hasBarSubheader(isBarSubheader);
  }

  function getAssociatedNavBarCtrl() {
    if (navBarDelegate) {
      for (var x = 0; x < $ionicNavBarDelegate._instances.length; x++) {
        if ($ionicNavBarDelegate._instances[x].$$delegateHandle == navBarDelegate) {
          return $ionicNavBarDelegate._instances[x];
        }
      }
    }
    return $element.inheritedData('$ionNavBarController');
  }

}]);

IonicModule
.controller('$ionicRefresher', [
  '$scope',
  '$attrs',
  '$element',
  '$ionicBind',
  '$timeout',
  function($scope, $attrs, $element, $ionicBind, $timeout) {
    var self = this,
        isDragging = false,
        isOverscrolling = false,
        dragOffset = 0,
        lastOverscroll = 0,
        ptrThreshold = 60,
        activated = false,
        scrollTime = 500,
        startY = null,
        deltaY = null,
        canOverscroll = true,
        scrollParent,
        scrollChild;

    if (!isDefined($attrs.pullingIcon)) {
      $attrs.$set('pullingIcon', 'ion-android-arrow-down');
    }

    $scope.showSpinner = !isDefined($attrs.refreshingIcon) && $attrs.spinner != 'none';

    $scope.showIcon = isDefined($attrs.refreshingIcon);

    $ionicBind($scope, $attrs, {
      pullingIcon: '@',
      pullingText: '@',
      refreshingIcon: '@',
      refreshingText: '@',
      spinner: '@',
      disablePullingRotation: '@',
      $onRefresh: '&onRefresh',
      $onPulling: '&onPulling'
    });

    function handleMousedown(e) {
      e.touches = e.touches || [{
        screenX: e.screenX,
        screenY: e.screenY
      }];
      // Mouse needs this
      startY = Math.floor(e.touches[0].screenY);
    }

    function handleTouchstart(e) {
      e.touches = e.touches || [{
        screenX: e.screenX,
        screenY: e.screenY
      }];

      startY = e.touches[0].screenY;
    }

    function handleTouchend() {
      // reset Y
      startY = null;
      // if this wasn't an overscroll, get out immediately
      if (!canOverscroll && !isDragging) {
        return;
      }
      // the user has overscrolled but went back to native scrolling
      if (!isDragging) {
        dragOffset = 0;
        isOverscrolling = false;
        setScrollLock(false);
      } else {
        isDragging = false;
        dragOffset = 0;

        // the user has scroll far enough to trigger a refresh
        if (lastOverscroll > ptrThreshold) {
          start();
          scrollTo(ptrThreshold, scrollTime);

        // the user has overscrolled but not far enough to trigger a refresh
        } else {
          scrollTo(0, scrollTime, deactivate);
          isOverscrolling = false;
        }
      }
    }

    function handleTouchmove(e) {
      e.touches = e.touches || [{
        screenX: e.screenX,
        screenY: e.screenY
      }];

      // Force mouse events to have had a down event first
      if (!startY && e.type == 'mousemove') {
        return;
      }

      // if multitouch or regular scroll event, get out immediately
      if (!canOverscroll || e.touches.length > 1) {
        return;
      }
      //if this is a new drag, keep track of where we start
      if (startY === null) {
        startY = e.touches[0].screenY;
      }

      deltaY = e.touches[0].screenY - startY;

      // how far have we dragged so far?
      // kitkat fix for touchcancel events http://updates.html5rocks.com/2014/05/A-More-Compatible-Smoother-Touch
      // Only do this if we're not on crosswalk
      if (ionic.Platform.isAndroid() && ionic.Platform.version() === 4.4 && !ionic.Platform.isCrosswalk() && scrollParent.scrollTop === 0 && deltaY > 0) {
        isDragging = true;
        e.preventDefault();
      }


      // if we've dragged up and back down in to native scroll territory
      if (deltaY - dragOffset <= 0 || scrollParent.scrollTop !== 0) {

        if (isOverscrolling) {
          isOverscrolling = false;
          setScrollLock(false);
        }

        if (isDragging) {
          nativescroll(scrollParent, deltaY - dragOffset * -1);
        }

        // if we're not at overscroll 0 yet, 0 out
        if (lastOverscroll !== 0) {
          overscroll(0);
        }
        return;

      } else if (deltaY > 0 && scrollParent.scrollTop === 0 && !isOverscrolling) {
        // starting overscroll, but drag started below scrollTop 0, so we need to offset the position
        dragOffset = deltaY;
      }

      // prevent native scroll events while overscrolling
      e.preventDefault();

      // if not overscrolling yet, initiate overscrolling
      if (!isOverscrolling) {
        isOverscrolling = true;
        setScrollLock(true);
      }

      isDragging = true;
      // overscroll according to the user's drag so far
      overscroll((deltaY - dragOffset) / 3);

      // update the icon accordingly
      if (!activated && lastOverscroll > ptrThreshold) {
        activated = true;
        ionic.requestAnimationFrame(activate);

      } else if (activated && lastOverscroll < ptrThreshold) {
        activated = false;
        ionic.requestAnimationFrame(deactivate);
      }
    }

    function handleScroll(e) {
      // canOverscrol is used to greatly simplify the drag handler during normal scrolling
      canOverscroll = (e.target.scrollTop === 0) || isDragging;
    }

    function overscroll(val) {
      scrollChild.style[ionic.CSS.TRANSFORM] = 'translate3d(0px, ' + val + 'px, 0px)';
      lastOverscroll = val;
    }

    function nativescroll(target, newScrollTop) {
      // creates a scroll event that bubbles, can be cancelled, and with its view
      // and detail property initialized to window and 1, respectively
      target.scrollTop = newScrollTop;
      var e = document.createEvent("UIEvents");
      e.initUIEvent("scroll", true, true, window, 1);
      target.dispatchEvent(e);
    }

    function setScrollLock(enabled) {
      // set the scrollbar to be position:fixed in preparation to overscroll
      // or remove it so the app can be natively scrolled
      if (enabled) {
        ionic.requestAnimationFrame(function() {
          scrollChild.classList.add('overscroll');
          show();
        });

      } else {
        ionic.requestAnimationFrame(function() {
          scrollChild.classList.remove('overscroll');
          hide();
          deactivate();
        });
      }
    }

    $scope.$on('scroll.refreshComplete', function() {
      // prevent the complete from firing before the scroll has started
      $timeout(function() {

        ionic.requestAnimationFrame(tail);

        // scroll back to home during tail animation
        scrollTo(0, scrollTime, deactivate);

        // return to native scrolling after tail animation has time to finish
        $timeout(function() {

          if (isOverscrolling) {
            isOverscrolling = false;
            setScrollLock(false);
          }

        }, scrollTime);

      }, scrollTime);
    });

    function scrollTo(Y, duration, callback) {
      // scroll animation loop w/ easing
      // credit https://gist.github.com/dezinezync/5487119
      var start = Date.now(),
          from = lastOverscroll;

      if (from === Y) {
        callback();
        return; /* Prevent scrolling to the Y point if already there */
      }

      // decelerating to zero velocity
      function easeOutCubic(t) {
        return (--t) * t * t + 1;
      }

      // scroll loop
      function scroll() {
        var currentTime = Date.now(),
          time = Math.min(1, ((currentTime - start) / duration)),
          // where .5 would be 50% of time on a linear scale easedT gives a
          // fraction based on the easing method
          easedT = easeOutCubic(time);

        overscroll(Math.floor((easedT * (Y - from)) + from));

        if (time < 1) {
          ionic.requestAnimationFrame(scroll);

        } else {

          if (Y < 5 && Y > -5) {
            isOverscrolling = false;
            setScrollLock(false);
          }

          callback && callback();
        }
      }

      // start scroll loop
      ionic.requestAnimationFrame(scroll);
    }


    var touchStartEvent, touchMoveEvent, touchEndEvent;
    if (window.navigator.pointerEnabled) {
      touchStartEvent = 'pointerdown';
      touchMoveEvent = 'pointermove';
      touchEndEvent = 'pointerup';
    } else if (window.navigator.msPointerEnabled) {
      touchStartEvent = 'MSPointerDown';
      touchMoveEvent = 'MSPointerMove';
      touchEndEvent = 'MSPointerUp';
    } else {
      touchStartEvent = 'touchstart';
      touchMoveEvent = 'touchmove';
      touchEndEvent = 'touchend';
    }

    self.init = function() {
      scrollParent = $element.parent().parent()[0];
      scrollChild = $element.parent()[0];

      if (!scrollParent || !scrollParent.classList.contains('ionic-scroll') ||
        !scrollChild || !scrollChild.classList.contains('scroll')) {
        throw new Error('Refresher must be immediate child of ion-content or ion-scroll');
      }


      ionic.on(touchStartEvent, handleTouchstart, scrollChild);
      ionic.on(touchMoveEvent, handleTouchmove, scrollChild);
      ionic.on(touchEndEvent, handleTouchend, scrollChild);
      ionic.on('mousedown', handleMousedown, scrollChild);
      ionic.on('mousemove', handleTouchmove, scrollChild);
      ionic.on('mouseup', handleTouchend, scrollChild);
      ionic.on('scroll', handleScroll, scrollParent);

      // cleanup when done
      $scope.$on('$destroy', destroy);
    };

    function destroy() {
      if ( scrollChild ) {
        ionic.off(touchStartEvent, handleTouchstart, scrollChild);
        ionic.off(touchMoveEvent, handleTouchmove, scrollChild);
        ionic.off(touchEndEvent, handleTouchend, scrollChild);
        ionic.off('mousedown', handleMousedown, scrollChild);
        ionic.off('mousemove', handleTouchmove, scrollChild);
        ionic.off('mouseup', handleTouchend, scrollChild);
      }
      if ( scrollParent ) {
        ionic.off('scroll', handleScroll, scrollParent);
      }
      scrollParent = null;
      scrollChild = null;
    }

    // DOM manipulation and broadcast methods shared by JS and Native Scrolling
    // getter used by JS Scrolling
    self.getRefresherDomMethods = function() {
      return {
        activate: activate,
        deactivate: deactivate,
        start: start,
        show: show,
        hide: hide,
        tail: tail
      };
    };

    function activate() {
      $element[0].classList.add('active');
      $scope.$onPulling();
    }

    function deactivate() {
      // give tail 150ms to finish
      $timeout(function() {
        // deactivateCallback
        $element.removeClass('active refreshing refreshing-tail');
        if (activated) activated = false;
      }, 150);
    }

    function start() {
      // startCallback
      $element[0].classList.add('refreshing');
      var q = $scope.$onRefresh();

      if (q && q.then) {
        q['finally'](function() {
          $scope.$broadcast('scroll.refreshComplete');
        });
      }
    }

    function show() {
      // showCallback
      $element[0].classList.remove('invisible');
    }

    function hide() {
      // showCallback
      $element[0].classList.add('invisible');
    }

    function tail() {
      // tailCallback
      $element[0].classList.add('refreshing-tail');
    }

    // for testing
    self.__handleTouchmove = handleTouchmove;
    self.__getScrollChild = function() { return scrollChild; };
    self.__getScrollParent = function() { return scrollParent; };
  }
]);

/**
 * @private
 */
IonicModule

.controller('$ionicScroll', [
  '$scope',
  'scrollViewOptions',
  '$timeout',
  '$window',
  '$location',
  '$document',
  '$ionicScrollDelegate',
  '$ionicHistory',
function($scope,
         scrollViewOptions,
         $timeout,
         $window,
         $location,
         $document,
         $ionicScrollDelegate,
         $ionicHistory) {

  var self = this;
  // for testing
  self.__timeout = $timeout;

  self._scrollViewOptions = scrollViewOptions; //for testing
  self.isNative = function() {
    return !!scrollViewOptions.nativeScrolling;
  };

  var element = self.element = scrollViewOptions.el;
  var $element = self.$element = jqLite(element);
  var scrollView;
  if (self.isNative()) {
    scrollView = self.scrollView = new ionic.views.ScrollNative(scrollViewOptions);
  } else {
    scrollView = self.scrollView = new ionic.views.Scroll(scrollViewOptions);
  }


  //Attach self to element as a controller so other directives can require this controller
  //through `require: '$ionicScroll'
  //Also attach to parent so that sibling elements can require this
  ($element.parent().length ? $element.parent() : $element)
    .data('$$ionicScrollController', self);

  var deregisterInstance = $ionicScrollDelegate._registerInstance(
    self, scrollViewOptions.delegateHandle, function() {
      return $ionicHistory.isActiveScope($scope);
    }
  );

  if (!isDefined(scrollViewOptions.bouncing)) {
    ionic.Platform.ready(function() {
      if (scrollView && scrollView.options) {
        scrollView.options.bouncing = true;
        if (ionic.Platform.isAndroid()) {
          // No bouncing by default on Android
          scrollView.options.bouncing = false;
          // Faster scroll decel
          scrollView.options.deceleration = 0.95;
        }
      }
    });
  }

  var resize = angular.bind(scrollView, scrollView.resize);
  angular.element($window).on('resize', resize);

  var scrollFunc = function(e) {
    var detail = (e.originalEvent || e).detail || {};
    $scope.$onScroll && $scope.$onScroll({
      event: e,
      scrollTop: detail.scrollTop || 0,
      scrollLeft: detail.scrollLeft || 0
    });
  };

  $element.on('scroll', scrollFunc);

  $scope.$on('$destroy', function() {
    deregisterInstance();
    scrollView && scrollView.__cleanup && scrollView.__cleanup();
    angular.element($window).off('resize', resize);
    if ( $element ) {
      $element.off('scroll', scrollFunc);
    }
    if ( self._scrollViewOptions ) {
      self._scrollViewOptions.el = null;
    }
    if ( scrollViewOptions ) {
        scrollViewOptions.el = null;
    }

    scrollView = self.scrollView = scrollViewOptions = self._scrollViewOptions = element = self.$element = $element = null;
  });

  $timeout(function() {
    scrollView && scrollView.run && scrollView.run();
  });

  self.getScrollView = function() {
    return scrollView;
  };

  self.getScrollPosition = function() {
    return scrollView.getValues();
  };

  self.resize = function() {
    return $timeout(resize, 0, false).then(function() {
      $element && $element.triggerHandler('scroll-resize');
    });
  };

  self.scrollTop = function(shouldAnimate) {
    self.resize().then(function() {
      if (!scrollView) {
        return;
      }
      scrollView.scrollTo(0, 0, !!shouldAnimate);
    });
  };

  self.scrollBottom = function(shouldAnimate) {
    self.resize().then(function() {
      if (!scrollView) {
        return;
      }
      var max = scrollView.getScrollMax();
      scrollView.scrollTo(max.left, max.top, !!shouldAnimate);
    });
  };

  self.scrollTo = function(left, top, shouldAnimate) {
    self.resize().then(function() {
      if (!scrollView) {
        return;
      }
      scrollView.scrollTo(left, top, !!shouldAnimate);
    });
  };

  self.zoomTo = function(zoom, shouldAnimate, originLeft, originTop) {
    self.resize().then(function() {
      if (!scrollView) {
        return;
      }
      scrollView.zoomTo(zoom, !!shouldAnimate, originLeft, originTop);
    });
  };

  self.zoomBy = function(zoom, shouldAnimate, originLeft, originTop) {
    self.resize().then(function() {
      if (!scrollView) {
        return;
      }
      scrollView.zoomBy(zoom, !!shouldAnimate, originLeft, originTop);
    });
  };

  self.scrollBy = function(left, top, shouldAnimate) {
    self.resize().then(function() {
      if (!scrollView) {
        return;
      }
      scrollView.scrollBy(left, top, !!shouldAnimate);
    });
  };

  self.anchorScroll = function(shouldAnimate) {
    self.resize().then(function() {
      if (!scrollView) {
        return;
      }
      var hash = $location.hash();
      var elm = hash && $document[0].getElementById(hash);
      if (!(hash && elm)) {
        scrollView.scrollTo(0, 0, !!shouldAnimate);
        return;
      }
      var curElm = elm;
      var scrollLeft = 0, scrollTop = 0;
      do {
        if (curElm !== null) scrollLeft += curElm.offsetLeft;
        if (curElm !== null) scrollTop += curElm.offsetTop;
        curElm = curElm.offsetParent;
      } while (curElm.attributes != self.element.attributes && curElm.offsetParent);
      scrollView.scrollTo(scrollLeft, scrollTop, !!shouldAnimate);
    });
  };

  self.freezeScroll = scrollView.freeze;
  self.freezeScrollShut = scrollView.freezeShut;

  self.freezeAllScrolls = function(shouldFreeze) {
    for (var i = 0; i < $ionicScrollDelegate._instances.length; i++) {
      $ionicScrollDelegate._instances[i].freezeScroll(shouldFreeze);
    }
  };


  /**
   * @private
   */
  self._setRefresher = function(refresherScope, refresherElement, refresherMethods) {
    self.refresher = refresherElement;
    var refresherHeight = self.refresher.clientHeight || 60;
    scrollView.activatePullToRefresh(
      refresherHeight,
      refresherMethods
    );
  };

}]);

IonicModule
.controller('$ionicSideMenus', [
  '$scope',
  '$attrs',
  '$ionicSideMenuDelegate',
  '$ionicPlatform',
  '$ionicBody',
  '$ionicHistory',
  '$ionicScrollDelegate',
  'IONIC_BACK_PRIORITY',
  '$rootScope',
function($scope, $attrs, $ionicSideMenuDelegate, $ionicPlatform, $ionicBody, $ionicHistory, $ionicScrollDelegate, IONIC_BACK_PRIORITY, $rootScope) {
  var self = this;
  var rightShowing, leftShowing, isDragging;
  var startX, lastX, offsetX, isAsideExposed;
  var enableMenuWithBackViews = true;

  self.$scope = $scope;

  self.initialize = function(options) {
    self.left = options.left;
    self.right = options.right;
    self.setContent(options.content);
    self.dragThresholdX = options.dragThresholdX || 10;
    $ionicHistory.registerHistory(self.$scope);
  };

  /**
   * Set the content view controller if not passed in the constructor options.
   *
   * @param {object} content
   */
  self.setContent = function(content) {
    if (content) {
      self.content = content;

      self.content.onDrag = function(e) {
        self._handleDrag(e);
      };

      self.content.endDrag = function(e) {
        self._endDrag(e);
      };
    }
  };

  self.isOpenLeft = function() {
    return self.getOpenAmount() > 0;
  };

  self.isOpenRight = function() {
    return self.getOpenAmount() < 0;
  };

  /**
   * Toggle the left menu to open 100%
   */
  self.toggleLeft = function(shouldOpen) {
    if (isAsideExposed || !self.left.isEnabled) return;
    var openAmount = self.getOpenAmount();
    if (arguments.length === 0) {
      shouldOpen = openAmount <= 0;
    }
    self.content.enableAnimation();
    if (!shouldOpen) {
      self.openPercentage(0);
      $rootScope.$emit('$ionicSideMenuClose', 'left');
    } else {
      self.openPercentage(100);
      $rootScope.$emit('$ionicSideMenuOpen', 'left');
    }
  };

  /**
   * Toggle the right menu to open 100%
   */
  self.toggleRight = function(shouldOpen) {
    if (isAsideExposed || !self.right.isEnabled) return;
    var openAmount = self.getOpenAmount();
    if (arguments.length === 0) {
      shouldOpen = openAmount >= 0;
    }
    self.content.enableAnimation();
    if (!shouldOpen) {
      self.openPercentage(0);
      $rootScope.$emit('$ionicSideMenuClose', 'right');
    } else {
      self.openPercentage(-100);
      $rootScope.$emit('$ionicSideMenuOpen', 'right');
    }
  };

  self.toggle = function(side) {
    if (side == 'right') {
      self.toggleRight();
    } else {
      self.toggleLeft();
    }
  };

  /**
   * Close all menus.
   */
  self.close = function() {
    self.openPercentage(0);
    $rootScope.$emit('$ionicSideMenuClose', 'left');
    $rootScope.$emit('$ionicSideMenuClose', 'right');
  };

  /**
   * @return {float} The amount the side menu is open, either positive or negative for left (positive), or right (negative)
   */
  self.getOpenAmount = function() {
    return self.content && self.content.getTranslateX() || 0;
  };

  /**
   * @return {float} The ratio of open amount over menu width. For example, a
   * menu of width 100 open 50 pixels would be open 50% or a ratio of 0.5. Value is negative
   * for right menu.
   */
  self.getOpenRatio = function() {
    var amount = self.getOpenAmount();
    if (amount >= 0) {
      return amount / self.left.width;
    }
    return amount / self.right.width;
  };

  self.isOpen = function() {
    return self.getOpenAmount() !== 0;
  };

  /**
   * @return {float} The percentage of open amount over menu width. For example, a
   * menu of width 100 open 50 pixels would be open 50%. Value is negative
   * for right menu.
   */
  self.getOpenPercentage = function() {
    return self.getOpenRatio() * 100;
  };

  /**
   * Open the menu with a given percentage amount.
   * @param {float} percentage The percentage (positive or negative for left/right) to open the menu.
   */
  self.openPercentage = function(percentage) {
    var p = percentage / 100;

    if (self.left && percentage >= 0) {
      self.openAmount(self.left.width * p);
    } else if (self.right && percentage < 0) {
      self.openAmount(self.right.width * p);
    }

    // add the CSS class "menu-open" if the percentage does not
    // equal 0, otherwise remove the class from the body element
    $ionicBody.enableClass((percentage !== 0), 'menu-open');

    self.content.setCanScroll(percentage == 0);
  };

  /*
  function freezeAllScrolls(shouldFreeze) {
    if (shouldFreeze && !self.isScrollFreeze) {
      $ionicScrollDelegate.freezeAllScrolls(shouldFreeze);

    } else if (!shouldFreeze && self.isScrollFreeze) {
      $ionicScrollDelegate.freezeAllScrolls(false);
    }
    self.isScrollFreeze = shouldFreeze;
  }
  */

  /**
   * Open the menu the given pixel amount.
   * @param {float} amount the pixel amount to open the menu. Positive value for left menu,
   * negative value for right menu (only one menu will be visible at a time).
   */
  self.openAmount = function(amount) {
    var maxLeft = self.left && self.left.width || 0;
    var maxRight = self.right && self.right.width || 0;

    // Check if we can move to that side, depending if the left/right panel is enabled
    if (!(self.left && self.left.isEnabled) && amount > 0) {
      self.content.setTranslateX(0);
      return;
    }

    if (!(self.right && self.right.isEnabled) && amount < 0) {
      self.content.setTranslateX(0);
      return;
    }

    if (leftShowing && amount > maxLeft) {
      self.content.setTranslateX(maxLeft);
      return;
    }

    if (rightShowing && amount < -maxRight) {
      self.content.setTranslateX(-maxRight);
      return;
    }

    self.content.setTranslateX(amount);

    if (amount >= 0) {
      leftShowing = true;
      rightShowing = false;

      if (amount > 0) {
        // Push the z-index of the right menu down
        self.right && self.right.pushDown && self.right.pushDown();
        // Bring the z-index of the left menu up
        self.left && self.left.bringUp && self.left.bringUp();
      }
    } else {
      rightShowing = true;
      leftShowing = false;

      // Bring the z-index of the right menu up
      self.right && self.right.bringUp && self.right.bringUp();
      // Push the z-index of the left menu down
      self.left && self.left.pushDown && self.left.pushDown();
    }
  };

  /**
   * Given an event object, find the final resting position of this side
   * menu. For example, if the user "throws" the content to the right and
   * releases the touch, the left menu should snap open (animated, of course).
   *
   * @param {Event} e the gesture event to use for snapping
   */
  self.snapToRest = function(e) {
    // We want to animate at the end of this
    self.content.enableAnimation();
    isDragging = false;

    // Check how much the panel is open after the drag, and
    // what the drag velocity is
    var ratio = self.getOpenRatio();

    if (ratio === 0) {
      // Just to be safe
      self.openPercentage(0);
      return;
    }

    var velocityThreshold = 0.3;
    var velocityX = e.gesture.velocityX;
    var direction = e.gesture.direction;

    // Going right, less than half, too slow (snap back)
    if (ratio > 0 && ratio < 0.5 && direction == 'right' && velocityX < velocityThreshold) {
      self.openPercentage(0);
    }

    // Going left, more than half, too slow (snap back)
    else if (ratio > 0.5 && direction == 'left' && velocityX < velocityThreshold) {
      self.openPercentage(100);
    }

    // Going left, less than half, too slow (snap back)
    else if (ratio < 0 && ratio > -0.5 && direction == 'left' && velocityX < velocityThreshold) {
      self.openPercentage(0);
    }

    // Going right, more than half, too slow (snap back)
    else if (ratio < 0.5 && direction == 'right' && velocityX < velocityThreshold) {
      self.openPercentage(-100);
    }

    // Going right, more than half, or quickly (snap open)
    else if (direction == 'right' && ratio >= 0 && (ratio >= 0.5 || velocityX > velocityThreshold)) {
      self.openPercentage(100);
    }

    // Going left, more than half, or quickly (span open)
    else if (direction == 'left' && ratio <= 0 && (ratio <= -0.5 || velocityX > velocityThreshold)) {
      self.openPercentage(-100);
    }

    // Snap back for safety
    else {
      self.openPercentage(0);
    }
  };

  self.enableMenuWithBackViews = function(val) {
    if (arguments.length) {
      enableMenuWithBackViews = !!val;
    }
    return enableMenuWithBackViews;
  };

  self.isAsideExposed = function() {
    return !!isAsideExposed;
  };

  self.exposeAside = function(shouldExposeAside) {
    if (!(self.left && self.left.isEnabled) && !(self.right && self.right.isEnabled)) return;
    self.close();

    isAsideExposed = shouldExposeAside;
    if ((self.left && self.left.isEnabled) && (self.right && self.right.isEnabled)) {
      self.content.setMarginLeftAndRight(isAsideExposed ? self.left.width : 0, isAsideExposed ? self.right.width : 0);
    } else if (self.left && self.left.isEnabled) {
      // set the left marget width if it should be exposed
      // otherwise set false so there's no left margin
      self.content.setMarginLeft(isAsideExposed ? self.left.width : 0);
    } else if (self.right && self.right.isEnabled) {
      self.content.setMarginRight(isAsideExposed ? self.right.width : 0);
    }
    self.$scope.$emit('$ionicExposeAside', isAsideExposed);
  };

  self.activeAsideResizing = function(isResizing) {
    $ionicBody.enableClass(isResizing, 'aside-resizing');
  };

  // End a drag with the given event
  self._endDrag = function(e) {
    if (isAsideExposed) return;

    if (isDragging) {
      self.snapToRest(e);
    }
    startX = null;
    lastX = null;
    offsetX = null;
  };

  // Handle a drag event
  self._handleDrag = function(e) {
    if (isAsideExposed || !$scope.dragContent) return;

    // If we don't have start coords, grab and store them
    if (!startX) {
      startX = e.gesture.touches[0].pageX;
      lastX = startX;
    } else {
      // Grab the current tap coords
      lastX = e.gesture.touches[0].pageX;
    }

    // Calculate difference from the tap points
    if (!isDragging && Math.abs(lastX - startX) > self.dragThresholdX) {
      // if the difference is greater than threshold, start dragging using the current
      // point as the starting point
      startX = lastX;

      isDragging = true;
      // Initialize dragging
      self.content.disableAnimation();
      offsetX = self.getOpenAmount();
    }

    if (isDragging) {
      self.openAmount(offsetX + (lastX - startX));
      //self.content.setCanScroll(false);
    }
  };

  self.canDragContent = function(canDrag) {
    if (arguments.length) {
      $scope.dragContent = !!canDrag;
    }
    return $scope.dragContent;
  };

  self.edgeThreshold = 25;
  self.edgeThresholdEnabled = false;
  self.edgeDragThreshold = function(value) {
    if (arguments.length) {
      if (isNumber(value) && value > 0) {
        self.edgeThreshold = value;
        self.edgeThresholdEnabled = true;
      } else {
        self.edgeThresholdEnabled = !!value;
      }
    }
    return self.edgeThresholdEnabled;
  };

  self.isDraggableTarget = function(e) {
    //Only restrict edge when sidemenu is closed and restriction is enabled
    var shouldOnlyAllowEdgeDrag = self.edgeThresholdEnabled && !self.isOpen();
    var startX = e.gesture.startEvent && e.gesture.startEvent.center &&
      e.gesture.startEvent.center.pageX;

    var dragIsWithinBounds = !shouldOnlyAllowEdgeDrag ||
      startX <= self.edgeThreshold ||
      startX >= self.content.element.offsetWidth - self.edgeThreshold;

    var backView = $ionicHistory.backView();
    var menuEnabled = enableMenuWithBackViews ? true : !backView;
    if (!menuEnabled) {
      var currentView = $ionicHistory.currentView() || {};
      return (dragIsWithinBounds && (backView.historyId !== currentView.historyId));
    }

    return ($scope.dragContent || self.isOpen()) &&
      dragIsWithinBounds &&
      !e.gesture.srcEvent.defaultPrevented &&
      menuEnabled &&
      !e.target.tagName.match(/input|textarea|select|object|embed/i) &&
      !e.target.isContentEditable &&
      !(e.target.dataset ? e.target.dataset.preventScroll : e.target.getAttribute('data-prevent-scroll') == 'true');
  };

  $scope.sideMenuContentTranslateX = 0;

  var deregisterBackButtonAction = noop;
  var closeSideMenu = angular.bind(self, self.close);

  $scope.$watch(function() {
    return self.getOpenAmount() !== 0;
  }, function(isOpen) {
    deregisterBackButtonAction();
    if (isOpen) {
      deregisterBackButtonAction = $ionicPlatform.registerBackButtonAction(
        closeSideMenu,
        IONIC_BACK_PRIORITY.sideMenu
      );
    }
  });

  var deregisterInstance = $ionicSideMenuDelegate._registerInstance(
    self, $attrs.delegateHandle, function() {
      return $ionicHistory.isActiveScope($scope);
    }
  );

  $scope.$on('$destroy', function() {
    deregisterInstance();
    deregisterBackButtonAction();
    self.$scope = null;
    if (self.content) {
      self.content.setCanScroll(true);
      self.content.element = null;
      self.content = null;
    }
  });

  self.initialize({
    left: {
      width: 275
    },
    right: {
      width: 275
    }
  });

}]);

(function(ionic) {

  var TRANSLATE32 = 'translate(32,32)';
  var STROKE_OPACITY = 'stroke-opacity';
  var ROUND = 'round';
  var INDEFINITE = 'indefinite';
  var DURATION = '750ms';
  var NONE = 'none';
  var SHORTCUTS = {
    a: 'animate',
    an: 'attributeName',
    at: 'animateTransform',
    c: 'circle',
    da: 'stroke-dasharray',
    os: 'stroke-dashoffset',
    f: 'fill',
    lc: 'stroke-linecap',
    rc: 'repeatCount',
    sw: 'stroke-width',
    t: 'transform',
    v: 'values'
  };

  var SPIN_ANIMATION = {
    v: '0,32,32;360,32,32',
    an: 'transform',
    type: 'rotate',
    rc: INDEFINITE,
    dur: DURATION
  };

  function createSvgElement(tagName, data, parent, spinnerName) {
    var ele = document.createElement(SHORTCUTS[tagName] || tagName);
    var k, x, y;

    for (k in data) {

      if (angular.isArray(data[k])) {
        for (x = 0; x < data[k].length; x++) {
          if (data[k][x].fn) {
            for (y = 0; y < data[k][x].t; y++) {
              createSvgElement(k, data[k][x].fn(y, spinnerName), ele, spinnerName);
            }
          } else {
            createSvgElement(k, data[k][x], ele, spinnerName);
          }
        }

      } else {
        setSvgAttribute(ele, k, data[k]);
      }
    }

    parent.appendChild(ele);
  }

  function setSvgAttribute(ele, k, v) {
    ele.setAttribute(SHORTCUTS[k] || k, v);
  }

  function animationValues(strValues, i) {
    var values = strValues.split(';');
    var back = values.slice(i);
    var front = values.slice(0, values.length - back.length);
    values = back.concat(front).reverse();
    return values.join(';') + ';' + values[0];
  }

  var IOS_SPINNER = {
    sw: 4,
    lc: ROUND,
    line: [{
      fn: function(i, spinnerName) {
        return {
          y1: spinnerName == 'ios' ? 17 : 12,
          y2: spinnerName == 'ios' ? 29 : 20,
          t: TRANSLATE32 + ' rotate(' + (30 * i + (i < 6 ? 180 : -180)) + ')',
          a: [{
            fn: function() {
              return {
                an: STROKE_OPACITY,
                dur: DURATION,
                v: animationValues('0;.1;.15;.25;.35;.45;.55;.65;.7;.85;1', i),
                rc: INDEFINITE
              };
            },
            t: 1
          }]
        };
      },
      t: 12
    }]
  };

  var spinners = {

    android: {
      c: [{
        sw: 6,
        da: 128,
        os: 82,
        r: 26,
        cx: 32,
        cy: 32,
        f: NONE
      }]
    },

    ios: IOS_SPINNER,

    'ios-small': IOS_SPINNER,

    bubbles: {
      sw: 0,
      c: [{
        fn: function(i) {
          return {
            cx: 24 * Math.cos(2 * Math.PI * i / 8),
            cy: 24 * Math.sin(2 * Math.PI * i / 8),
            t: TRANSLATE32,
            a: [{
              fn: function() {
                return {
                  an: 'r',
                  dur: DURATION,
                  v: animationValues('1;2;3;4;5;6;7;8', i),
                  rc: INDEFINITE
                };
              },
              t: 1
            }]
          };
        },
        t: 8
      }]
    },

    circles: {

      c: [{
        fn: function(i) {
          return {
            r: 5,
            cx: 24 * Math.cos(2 * Math.PI * i / 8),
            cy: 24 * Math.sin(2 * Math.PI * i / 8),
            t: TRANSLATE32,
            sw: 0,
            a: [{
              fn: function() {
                return {
                  an: 'fill-opacity',
                  dur: DURATION,
                  v: animationValues('.3;.3;.3;.4;.7;.85;.9;1', i),
                  rc: INDEFINITE
                };
              },
              t: 1
            }]
          };
        },
        t: 8
      }]
    },

    crescent: {
      c: [{
        sw: 4,
        da: 128,
        os: 82,
        r: 26,
        cx: 32,
        cy: 32,
        f: NONE,
        at: [SPIN_ANIMATION]
      }]
    },

    dots: {

      c: [{
        fn: function(i) {
          return {
            cx: 16 + (16 * i),
            cy: 32,
            sw: 0,
            a: [{
              fn: function() {
                return {
                  an: 'fill-opacity',
                  dur: DURATION,
                  v: animationValues('.5;.6;.8;1;.8;.6;.5', i),
                  rc: INDEFINITE
                };
              },
              t: 1
            }, {
              fn: function() {
                return {
                  an: 'r',
                  dur: DURATION,
                  v: animationValues('4;5;6;5;4;3;3', i),
                  rc: INDEFINITE
                };
              },
              t: 1
            }]
          };
        },
        t: 3
      }]
    },

    lines: {
      sw: 7,
      lc: ROUND,
      line: [{
        fn: function(i) {
          return {
            x1: 10 + (i * 14),
            x2: 10 + (i * 14),
            a: [{
              fn: function() {
                return {
                  an: 'y1',
                  dur: DURATION,
                  v: animationValues('16;18;28;18;16', i),
                  rc: INDEFINITE
                };
              },
              t: 1
            }, {
              fn: function() {
                return {
                  an: 'y2',
                  dur: DURATION,
                  v: animationValues('48;44;36;46;48', i),
                  rc: INDEFINITE
                };
              },
              t: 1
            }, {
              fn: function() {
                return {
                  an: STROKE_OPACITY,
                  dur: DURATION,
                  v: animationValues('1;.8;.5;.4;1', i),
                  rc: INDEFINITE
                };
              },
              t: 1
            }]
          };
        },
        t: 4
      }]
    },

    ripple: {
      f: NONE,
      'fill-rule': 'evenodd',
      sw: 3,
      circle: [{
        fn: function(i) {
          return {
            cx: 32,
            cy: 32,
            a: [{
              fn: function() {
                return {
                  an: 'r',
                  begin: (i * -1) + 's',
                  dur: '2s',
                  v: '0;24',
                  keyTimes: '0;1',
                  keySplines: '0.1,0.2,0.3,1',
                  calcMode: 'spline',
                  rc: INDEFINITE
                };
              },
              t: 1
            }, {
              fn: function() {
                return {
                  an: STROKE_OPACITY,
                  begin: (i * -1) + 's',
                  dur: '2s',
                  v: '.2;1;.2;0',
                  rc: INDEFINITE
                };
              },
              t: 1
            }]
          };
        },
        t: 2
      }]
    },

    spiral: {
      defs: [{
        linearGradient: [{
          id: 'sGD',
          gradientUnits: 'userSpaceOnUse',
          x1: 55, y1: 46, x2: 2, y2: 46,
          stop: [{
            offset: 0.1,
            class: 'stop1'
          }, {
            offset: 1,
            class: 'stop2'
          }]
        }]
      }],
      g: [{
        sw: 4,
        lc: ROUND,
        f: NONE,
        path: [{
          stroke: 'url(#sGD)',
          d: 'M4,32 c0,15,12,28,28,28c8,0,16-4,21-9'
        }, {
          d: 'M60,32 C60,16,47.464,4,32,4S4,16,4,32'
        }],
        at: [SPIN_ANIMATION]
      }]
    }

  };

  var animations = {

    android: function(ele) {
      // Note that this is called as a function, not a constructor.
      var self = {};

      this.stop = false;

      var rIndex = 0;
      var rotateCircle = 0;
      var startTime;
      var svgEle = ele.querySelector('g');
      var circleEle = ele.querySelector('circle');

      function run() {
        if (self.stop) return;

        var v = easeInOutCubic(Date.now() - startTime, 650);
        var scaleX = 1;
        var translateX = 0;
        var dasharray = (188 - (58 * v));
        var dashoffset = (182 - (182 * v));

        if (rIndex % 2) {
          scaleX = -1;
          translateX = -64;
          dasharray = (128 - (-58 * v));
          dashoffset = (182 * v);
        }

        var rotateLine = [0, -101, -90, -11, -180, 79, -270, -191][rIndex];

        setSvgAttribute(circleEle, 'da', Math.max(Math.min(dasharray, 188), 128));
        setSvgAttribute(circleEle, 'os', Math.max(Math.min(dashoffset, 182), 0));
        setSvgAttribute(circleEle, 't', 'scale(' + scaleX + ',1) translate(' + translateX + ',0) rotate(' + rotateLine + ',32,32)');

        rotateCircle += 4.1;
        if (rotateCircle > 359) rotateCircle = 0;
        setSvgAttribute(svgEle, 't', 'rotate(' + rotateCircle + ',32,32)');

        if (v >= 1) {
          rIndex++;
          if (rIndex > 7) rIndex = 0;
          startTime = Date.now();
        }

        ionic.requestAnimationFrame(run);
      }

      return function() {
        startTime = Date.now();
        run();
        return self;
      };

    }

  };

  function easeInOutCubic(t, c) {
    t /= c / 2;
    if (t < 1) return 1 / 2 * t * t * t;
    t -= 2;
    return 1 / 2 * (t * t * t + 2);
  }


  IonicModule
  .controller('$ionicSpinner', [
    '$element',
    '$attrs',
    '$ionicConfig',
  function($element, $attrs, $ionicConfig) {
    var spinnerName, anim;

    this.init = function() {
      spinnerName = $attrs.icon || $ionicConfig.spinner.icon();

      var container = document.createElement('div');
      createSvgElement('svg', {
        viewBox: '0 0 64 64',
        g: [spinners[spinnerName]]
      }, container, spinnerName);

      // Specifically for animations to work,
      // Android 4.3 and below requires the element to be
      // added as an html string, rather than dynmically
      // building up the svg element and appending it.
      $element.html(container.innerHTML);

      this.start();

      return spinnerName;
    };

    this.start = function() {
      animations[spinnerName] && (anim = animations[spinnerName]($element[0])());
    };

    this.stop = function() {
      animations[spinnerName] && (anim.stop = true);
    };

  }]);

})(ionic);

IonicModule
.controller('$ionicTab', [
  '$scope',
  '$ionicHistory',
  '$attrs',
  '$location',
  '$state',
function($scope, $ionicHistory, $attrs, $location, $state) {
  this.$scope = $scope;

  //All of these exposed for testing
  this.hrefMatchesState = function() {
    return $attrs.href && $location.path().indexOf(
      $attrs.href.replace(/^#/, '').replace(/\/$/, '')
    ) === 0;
  };
  this.srefMatchesState = function() {
    return $attrs.uiSref && $state.includes($attrs.uiSref.split('(')[0]);
  };
  this.navNameMatchesState = function() {
    return this.navViewName && $ionicHistory.isCurrentStateNavView(this.navViewName);
  };

  this.tabMatchesState = function() {
    return this.hrefMatchesState() || this.srefMatchesState() || this.navNameMatchesState();
  };
}]);

IonicModule
.controller('$ionicTabs', [
  '$scope',
  '$element',
  '$ionicHistory',
function($scope, $element, $ionicHistory) {
  var self = this;
  var selectedTab = null;
  var previousSelectedTab = null;
  var selectedTabIndex;
  var isVisible = true;
  self.tabs = [];

  self.selectedIndex = function() {
    return self.tabs.indexOf(selectedTab);
  };
  self.selectedTab = function() {
    return selectedTab;
  };
  self.previousSelectedTab = function() {
    return previousSelectedTab;
  };

  self.add = function(tab) {
    $ionicHistory.registerHistory(tab);
    self.tabs.push(tab);
  };

  self.remove = function(tab) {
    var tabIndex = self.tabs.indexOf(tab);
    if (tabIndex === -1) {
      return;
    }
    //Use a field like '$tabSelected' so developers won't accidentally set it in controllers etc
    if (tab.$tabSelected) {
      self.deselect(tab);
      //Try to select a new tab if we're removing a tab
      if (self.tabs.length === 1) {
        //Do nothing if there are no other tabs to select
      } else {
        //Select previous tab if it's the last tab, else select next tab
        var newTabIndex = tabIndex === self.tabs.length - 1 ? tabIndex - 1 : tabIndex + 1;
        self.select(self.tabs[newTabIndex]);
      }
    }
    self.tabs.splice(tabIndex, 1);
  };

  self.deselect = function(tab) {
    if (tab.$tabSelected) {
      previousSelectedTab = selectedTab;
      selectedTab = selectedTabIndex = null;
      tab.$tabSelected = false;
      (tab.onDeselect || noop)();
      tab.$broadcast && tab.$broadcast('$ionicHistory.deselect');
    }
  };

  self.select = function(tab, shouldEmitEvent) {
    var tabIndex;
    if (isNumber(tab)) {
      tabIndex = tab;
      if (tabIndex >= self.tabs.length) return;
      tab = self.tabs[tabIndex];
    } else {
      tabIndex = self.tabs.indexOf(tab);
    }

    if (arguments.length === 1) {
      shouldEmitEvent = !!(tab.navViewName || tab.uiSref);
    }

    if (selectedTab && selectedTab.$historyId == tab.$historyId) {
      if (shouldEmitEvent) {
        $ionicHistory.goToHistoryRoot(tab.$historyId);
      }

    } else if (selectedTabIndex !== tabIndex) {
      forEach(self.tabs, function(tab) {
        self.deselect(tab);
      });

      selectedTab = tab;
      selectedTabIndex = tabIndex;

      if (self.$scope && self.$scope.$parent) {
        self.$scope.$parent.$activeHistoryId = tab.$historyId;
      }

      //Use a funny name like $tabSelected so the developer doesn't overwrite the var in a child scope
      tab.$tabSelected = true;
      (tab.onSelect || noop)();

      if (shouldEmitEvent) {
        $scope.$emit('$ionicHistory.change', {
          type: 'tab',
          tabIndex: tabIndex,
          historyId: tab.$historyId,
          navViewName: tab.navViewName,
          hasNavView: !!tab.navViewName,
          title: tab.title,
          url: tab.href,
          uiSref: tab.uiSref
        });
      }

      $scope.$broadcast("tabSelected", { selectedTab: tab, selectedTabIndex: tabIndex});
    }
  };

  self.hasActiveScope = function() {
    for (var x = 0; x < self.tabs.length; x++) {
      if ($ionicHistory.isActiveScope(self.tabs[x])) {
        return true;
      }
    }
    return false;
  };

  self.showBar = function(show) {
    if (arguments.length) {
      if (show) {
        $element.removeClass('tabs-item-hide');
      } else {
        $element.addClass('tabs-item-hide');
      }
      isVisible = !!show;
    }
    return isVisible;
  };
}]);

IonicModule
.controller('$ionicView', [
  '$scope',
  '$element',
  '$attrs',
  '$compile',
  '$rootScope',
function($scope, $element, $attrs, $compile, $rootScope) {
  var self = this;
  var navElementHtml = {};
  var navViewCtrl;
  var navBarDelegateHandle;
  var hasViewHeaderBar;
  var deregisters = [];
  var viewTitle;

  var deregIonNavBarInit = $scope.$on('ionNavBar.init', function(ev, delegateHandle) {
    // this view has its own ion-nav-bar, remember the navBarDelegateHandle for this view
    ev.stopPropagation();
    navBarDelegateHandle = delegateHandle;
  });


  self.init = function() {
    deregIonNavBarInit();

    var modalCtrl = $element.inheritedData('$ionModalController');
    navViewCtrl = $element.inheritedData('$ionNavViewController');

    // don't bother if inside a modal or there's no parent navView
    if (!navViewCtrl || modalCtrl) return;

    // add listeners for when this view changes
    $scope.$on('$ionicView.beforeEnter', self.beforeEnter);
    $scope.$on('$ionicView.afterEnter', afterEnter);
    $scope.$on('$ionicView.beforeLeave', deregisterFns);
  };

  self.beforeEnter = function(ev, transData) {
    // this event was emitted, starting at intial ion-view, then bubbles up
    // only the first ion-view should do something with it, parent ion-views should ignore
    if (transData && !transData.viewNotified) {
      transData.viewNotified = true;

      if (!$rootScope.$$phase) $scope.$digest();
      viewTitle = isDefined($attrs.viewTitle) ? $attrs.viewTitle : $attrs.title;

      var navBarItems = {};
      for (var n in navElementHtml) {
        navBarItems[n] = generateNavBarItem(navElementHtml[n]);
      }

      navViewCtrl.beforeEnter(extend(transData, {
        title: viewTitle,
        showBack: !attrTrue('hideBackButton'),
        navBarItems: navBarItems,
        navBarDelegate: navBarDelegateHandle || null,
        showNavBar: !attrTrue('hideNavBar'),
        hasHeaderBar: !!hasViewHeaderBar
      }));

      // make sure any existing observers are cleaned up
      deregisterFns();
    }
  };


  function afterEnter() {
    // only listen for title updates after it has entered
    // but also deregister the observe before it leaves
    var viewTitleAttr = isDefined($attrs.viewTitle) && 'viewTitle' || isDefined($attrs.title) && 'title';
    if (viewTitleAttr) {
      titleUpdate($attrs[viewTitleAttr]);
      deregisters.push($attrs.$observe(viewTitleAttr, titleUpdate));
    }

    if (isDefined($attrs.hideBackButton)) {
      deregisters.push($scope.$watch($attrs.hideBackButton, function(val) {
        navViewCtrl.showBackButton(!val);
      }));
    }

    if (isDefined($attrs.hideNavBar)) {
      deregisters.push($scope.$watch($attrs.hideNavBar, function(val) {
        navViewCtrl.showBar(!val);
      }));
    }
  }


  function titleUpdate(newTitle) {
    if (isDefined(newTitle) && newTitle !== viewTitle) {
      viewTitle = newTitle;
      navViewCtrl.title(viewTitle);
    }
  }


  function deregisterFns() {
    // remove all existing $attrs.$observe's
    for (var x = 0; x < deregisters.length; x++) {
      deregisters[x]();
    }
    deregisters = [];
  }


  function generateNavBarItem(html) {
    if (html) {
      // every time a view enters we need to recreate its view buttons if they exist
      return $compile(html)($scope.$new());
    }
  }


  function attrTrue(key) {
    return !!$scope.$eval($attrs[key]);
  }


  self.navElement = function(type, html) {
    navElementHtml[type] = html;
  };

}]);

/*
 * We don't document the ionActionSheet directive, we instead document
 * the $ionicActionSheet service
 */
IonicModule
.directive('ionActionSheet', ['$document', function($document) {
  return {
    restrict: 'E',
    scope: true,
    replace: true,
    link: function($scope, $element) {

      var keyUp = function(e) {
        if (e.which == 27) {
          $scope.cancel();
          $scope.$apply();
        }
      };

      var backdropClick = function(e) {
        if (e.target == $element[0]) {
          $scope.cancel();
          $scope.$apply();
        }
      };
      $scope.$on('$destroy', function() {
        $element.remove();
        $document.unbind('keyup', keyUp);
      });

      $document.bind('keyup', keyUp);
      $element.bind('click', backdropClick);
    },
    template: '<div class="action-sheet-backdrop">' +
                '<div class="action-sheet-wrapper">' +
                  '<div class="action-sheet" ng-class="{\'action-sheet-has-icons\': $actionSheetHasIcon}">' +
                    '<div class="action-sheet-group action-sheet-options">' +
                      '<div class="action-sheet-title" ng-if="titleText" ng-bind-html="titleText"></div>' +
                      '<button class="button action-sheet-option" ng-click="buttonClicked($index)" ng-class="b.className" ng-repeat="b in buttons" ng-bind-html="b.text"></button>' +
                      '<button class="button destructive action-sheet-destructive" ng-if="destructiveText" ng-click="destructiveButtonClicked()" ng-bind-html="destructiveText"></button>' +
                    '</div>' +
                    '<div class="action-sheet-group action-sheet-cancel" ng-if="cancelText">' +
                      '<button class="button" ng-click="cancel()" ng-bind-html="cancelText"></button>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</div>'
  };
}]);


/**
 * @ngdoc directive
 * @name ionCheckbox
 * @module ionic
 * @restrict E
 * @codepen hqcju
 * @description
 * The checkbox is no different than the HTML checkbox input, except it's styled differently.
 *
 * The checkbox behaves like any [AngularJS checkbox](http://docs.angularjs.org/api/ng/input/input[checkbox]).
 *
 * @usage
 * ```html
 * <ion-checkbox ng-model="isChecked">Checkbox Label</ion-checkbox>
 * ```
 */

IonicModule
.directive('ionCheckbox', ['$ionicConfig', function($ionicConfig) {
  return {
    restrict: 'E',
    replace: true,
    require: '?ngModel',
    transclude: true,
    template:
      '<label class="item item-checkbox">' +
        '<div class="checkbox checkbox-input-hidden disable-pointer-events">' +
          '<input type="checkbox">' +
          '<i class="checkbox-icon"></i>' +
        '</div>' +
        '<div class="item-content disable-pointer-events" ng-transclude></div>' +
      '</label>',
    compile: function(element, attr) {
      var input = element.find('input');
      forEach({
        'name': attr.name,
        'ng-value': attr.ngValue,
        'ng-model': attr.ngModel,
        'ng-checked': attr.ngChecked,
        'ng-disabled': attr.ngDisabled,
        'ng-true-value': attr.ngTrueValue,
        'ng-false-value': attr.ngFalseValue,
        'ng-change': attr.ngChange,
        'ng-required': attr.ngRequired,
        'required': attr.required
      }, function(value, name) {
        if (isDefined(value)) {
          input.attr(name, value);
        }
      });
      var checkboxWrapper = element[0].querySelector('.checkbox');
      checkboxWrapper.classList.add('checkbox-' + $ionicConfig.form.checkbox());
    }
  };
}]);


/**
 * @ngdoc directive
 * @restrict A
 * @name collectionRepeat
 * @module ionic
 * @codepen 7ec1ec58f2489ab8f359fa1a0fe89c15
 * @description
 * `collection-repeat` allows an app to show huge lists of items much more performantly than
 * `ng-repeat`.
 *
 * It renders into the DOM only as many items as are currently visible.
 *
 * This means that on a phone screen that can fit eight items, only the eight items matching
 * the current scroll position will be rendered.
 *
 * **The Basics**:
 *
 * - The data given to collection-repeat must be an array.
 * - If the `item-height` and `item-width` attributes are not supplied, it will be assumed that
 *   every item in the list has the same dimensions as the first item.
 * - Don't use angular one-time binding (`::`) with collection-repeat. The scope of each item is
 *   assigned new data and re-digested as you scroll. Bindings need to update, and one-time bindings
 *   won't.
 *
 * **Performance Tips**:
 *
 * - The iOS webview has a performance bottleneck when switching out `<img src>` attributes.
 *   To increase performance of images on iOS, cache your images in advance and,
 *   if possible, lower the number of unique images. We're working on [a solution](https://github.com/driftyco/ionic/issues/3194).
 *
 * @usage
 * #### Basic Item List ([codepen](http://codepen.io/ionic/pen/0c2c35a34a8b18ad4d793fef0b081693))
 * ```html
 * <ion-content>
 *   <ion-item collection-repeat="item in items">
 *     {% raw %}{{item}}{% endraw %}
 *   </ion-item>
 * </ion-content>
 * ```
 *
 * #### Grid of Images ([codepen](http://codepen.io/ionic/pen/5515d4efd9d66f780e96787387f41664))
 * ```html
 * <ion-content>
 *   <img collection-repeat="photo in photos"
 *     item-width="33%"
 *     item-height="200px"
 *     ng-src="{% raw %}{{photo.url}}{% endraw %}">
 * </ion-content>
 * ```
 *
 * #### Horizontal Scroller, Dynamic Item Width ([codepen](http://codepen.io/ionic/pen/67cc56b349124a349acb57a0740e030e))
 * ```html
 * <ion-content>
 *   <h2>Available Kittens:</h2>
 *   <ion-scroll direction="x" class="available-scroller">
 *     <div class="photo" collection-repeat="photo in main.photos"
 *        item-height="250" item-width="photo.width + 30">
 *        <img ng-src="{% raw %}{{photo.src}}{% endraw %}">
 *     </div>
 *   </ion-scroll>
 * </ion-content>
 * ```
 *
 * @param {expression} collection-repeat The expression indicating how to enumerate a collection,
 *   of the format  `variable in expression` – where variable is the user defined loop variable
 *   and `expression` is a scope expression giving the collection to enumerate.
 *   For example: `album in artist.albums` or `album in artist.albums | orderBy:'name'`.
 * @param {expression=} item-width The width of the repeated element. The expression must return
 *   a number (pixels) or a percentage. Defaults to the width of the first item in the list.
 *   (previously named collection-item-width)
 * @param {expression=} item-height The height of the repeated element. The expression must return
 *   a number (pixels) or a percentage. Defaults to the height of the first item in the list.
 *   (previously named collection-item-height)
 * @param {number=} item-render-buffer The number of items to load before and after the visible
 *   items in the list. Default 3. Tip: set this higher if you have lots of images to preload, but
 *   don't set it too high or you'll see performance loss.
 * @param {boolean=} force-refresh-images Force images to refresh as you scroll. This fixes a problem
 *   where, when an element is interchanged as scrolling, its image will still have the old src
 *   while the new src loads. Setting this to true comes with a small performance loss.
 */

IonicModule
.directive('collectionRepeat', CollectionRepeatDirective)
.factory('$ionicCollectionManager', RepeatManagerFactory);

var ONE_PX_TRANSPARENT_IMG_SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
var WIDTH_HEIGHT_REGEX = /height:.*?px;\s*width:.*?px/;
var DEFAULT_RENDER_BUFFER = 3;

CollectionRepeatDirective.$inject = ['$ionicCollectionManager', '$parse', '$window', '$$rAF', '$rootScope', '$timeout'];
function CollectionRepeatDirective($ionicCollectionManager, $parse, $window, $$rAF, $rootScope, $timeout) {
  return {
    restrict: 'A',
    priority: 1000,
    transclude: 'element',
    $$tlb: true,
    require: '^^$ionicScroll',
    link: postLink
  };

  function postLink(scope, element, attr, scrollCtrl, transclude) {
    var scrollView = scrollCtrl.scrollView;
    var node = element[0];
    var containerNode = angular.element('<div class="collection-repeat-container">')[0];
    node.parentNode.replaceChild(containerNode, node);

    if (scrollView.options.scrollingX && scrollView.options.scrollingY) {
      throw new Error("collection-repeat expected a parent x or y scrollView, not " +
                      "an xy scrollView.");
    }

    var repeatExpr = attr.collectionRepeat;
    var match = repeatExpr.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?\s*$/);
    if (!match) {
      throw new Error("collection-repeat expected expression in form of '_item_ in " +
                      "_collection_[ track by _id_]' but got '" + attr.collectionRepeat + "'.");
    }
    var keyExpr = match[1];
    var listExpr = match[2];
    var listGetter = $parse(listExpr);
    var heightData = {};
    var widthData = {};
    var computedStyleDimensions = {};
    var data = [];
    var repeatManager;

    // attr.collectionBufferSize is deprecated
    var renderBufferExpr = attr.itemRenderBuffer || attr.collectionBufferSize;
    var renderBuffer = angular.isDefined(renderBufferExpr) ?
      parseInt(renderBufferExpr) :
      DEFAULT_RENDER_BUFFER;

    // attr.collectionItemHeight is deprecated
    var heightExpr = attr.itemHeight || attr.collectionItemHeight;
    // attr.collectionItemWidth is deprecated
    var widthExpr = attr.itemWidth || attr.collectionItemWidth;

    var afterItemsContainer = initAfterItemsContainer();

    var changeValidator = makeChangeValidator();
    initDimensions();

    // Dimensions are refreshed on resize or data change.
    scrollCtrl.$element.on('scroll-resize', refreshDimensions);

    angular.element($window).on('resize', onResize);
    var unlistenToExposeAside = $rootScope.$on('$ionicExposeAside', ionic.animationFrameThrottle(function() {
      scrollCtrl.scrollView.resize();
      onResize();
    }));
    $timeout(refreshDimensions, 0, false);

    function onResize() {
      if (changeValidator.resizeRequiresRefresh(scrollView.__clientWidth, scrollView.__clientHeight)) {
        refreshDimensions();
      }
    }

    scope.$watchCollection(listGetter, function(newValue) {
      data = newValue || (newValue = []);
      if (!angular.isArray(newValue)) {
        throw new Error("collection-repeat expected an array for '" + listExpr + "', " +
          "but got a " + typeof value);
      }
      // Wait for this digest to end before refreshing everything.
      scope.$$postDigest(function() {
        getRepeatManager().setData(data);
        if (changeValidator.dataChangeRequiresRefresh(data)) refreshDimensions();
      });
    });

    scope.$on('$destroy', function() {
      angular.element($window).off('resize', onResize);
      unlistenToExposeAside();
      scrollCtrl.$element && scrollCtrl.$element.off('scroll-resize', refreshDimensions);

      computedStyleNode && computedStyleNode.parentNode &&
        computedStyleNode.parentNode.removeChild(computedStyleNode);
      computedStyleScope && computedStyleScope.$destroy();
      computedStyleScope = computedStyleNode = null;

      repeatManager && repeatManager.destroy();
      repeatManager = null;
    });

    function makeChangeValidator() {
      var self;
      return (self = {
        dataLength: 0,
        width: 0,
        height: 0,
        // A resize triggers a refresh only if we have data, the scrollView has size,
        // and the size has changed.
        resizeRequiresRefresh: function(newWidth, newHeight) {
          var requiresRefresh = self.dataLength && newWidth && newHeight &&
            (newWidth !== self.width || newHeight !== self.height);

          self.width = newWidth;
          self.height = newHeight;

          return !!requiresRefresh;
        },
        // A change in data only triggers a refresh if the data has length, or if the data's
        // length is less than before.
        dataChangeRequiresRefresh: function(newData) {
          var requiresRefresh = newData.length > 0 || newData.length < self.dataLength;

          self.dataLength = newData.length;

          return !!requiresRefresh;
        }
      });
    }

    function getRepeatManager() {
      return repeatManager || (repeatManager = new $ionicCollectionManager({
        afterItemsNode: afterItemsContainer[0],
        containerNode: containerNode,
        heightData: heightData,
        widthData: widthData,
        forceRefreshImages: !!(isDefined(attr.forceRefreshImages) && attr.forceRefreshImages !== 'false'),
        keyExpression: keyExpr,
        renderBuffer: renderBuffer,
        scope: scope,
        scrollView: scrollCtrl.scrollView,
        transclude: transclude
      }));
    }

    function initAfterItemsContainer() {
      var container = angular.element(
        scrollView.__content.querySelector('.collection-repeat-after-container')
      );
      // Put everything in the view after the repeater into a container.
      if (!container.length) {
        var elementIsAfterRepeater = false;
        var afterNodes = [].filter.call(scrollView.__content.childNodes, function(node) {
          if (ionic.DomUtil.contains(node, containerNode)) {
            elementIsAfterRepeater = true;
            return false;
          }
          return elementIsAfterRepeater;
        });
        container = angular.element('<span class="collection-repeat-after-container">');
        if (scrollView.options.scrollingX) {
          container.addClass('horizontal');
        }
        container.append(afterNodes);
        scrollView.__content.appendChild(container[0]);
      }
      return container;
    }

    function initDimensions() {
      //Height and width have four 'modes':
      //1) Computed Mode
      //  - Nothing is supplied, so we getComputedStyle() on one element in the list and use
      //    that width and height value for the width and height of every item. This is re-computed
      //    every resize.
      //2) Constant Mode, Static Integer
      //  - The user provides a constant number for width or height, in pixels. We parse it,
      //    store it on the `value` field, and it never changes
      //3) Constant Mode, Percent
      //  - The user provides a percent string for width or height. The getter for percent is
      //    stored on the `getValue()` field, and is re-evaluated once every resize. The result
      //    is stored on the `value` field.
      //4) Dynamic Mode
      //  - The user provides a dynamic expression for the width or height.  This is re-evaluated
      //    for every item, stored on the `.getValue()` field.
      if (heightExpr) {
        parseDimensionAttr(heightExpr, heightData);
      } else {
        heightData.computed = true;
      }
      if (widthExpr) {
        parseDimensionAttr(widthExpr, widthData);
      } else {
        widthData.computed = true;
      }
    }

    function refreshDimensions() {
      var hasData = data.length > 0;

      if (hasData && (heightData.computed || widthData.computed)) {
        computeStyleDimensions();
      }

      if (hasData && heightData.computed) {
        heightData.value = computedStyleDimensions.height;
        if (!heightData.value) {
          throw new Error('collection-repeat tried to compute the height of repeated elements "' +
            repeatExpr + '", but was unable to. Please provide the "item-height" attribute. ' +
            'http://ionicframework.com/docs/api/directive/collectionRepeat/');
        }
      } else if (!heightData.dynamic && heightData.getValue) {
        // If it's a constant with a getter (eg percent), we just refresh .value after resize
        heightData.value = heightData.getValue();
      }

      if (hasData && widthData.computed) {
        widthData.value = computedStyleDimensions.width;
        if (!widthData.value) {
          throw new Error('collection-repeat tried to compute the width of repeated elements "' +
            repeatExpr + '", but was unable to. Please provide the "item-width" attribute. ' +
            'http://ionicframework.com/docs/api/directive/collectionRepeat/');
        }
      } else if (!widthData.dynamic && widthData.getValue) {
        // If it's a constant with a getter (eg percent), we just refresh .value after resize
        widthData.value = widthData.getValue();
      }
      // Dynamic dimensions aren't updated on resize. Since they're already dynamic anyway,
      // .getValue() will be used.

      getRepeatManager().refreshLayout();
    }

    function parseDimensionAttr(attrValue, dimensionData) {
      if (!attrValue) return;

      var parsedValue;
      // Try to just parse the plain attr value
      try {
        parsedValue = $parse(attrValue);
      } catch (e) {
        // If the parse fails and the value has `px` or `%` in it, surround the attr in
        // quotes, to attempt to let the user provide a simple `attr="100%"` or `attr="100px"`
        if (attrValue.trim().match(/\d+(px|%)$/)) {
          attrValue = '"' + attrValue + '"';
        }
        parsedValue = $parse(attrValue);
      }

      var constantAttrValue = attrValue.replace(/(\'|\"|px|%)/g, '').trim();
      var isConstant = constantAttrValue.length && !/([a-zA-Z]|\$|:|\?)/.test(constantAttrValue);
      dimensionData.attrValue = attrValue;

      // If it's a constant, it's either a percent or just a constant pixel number.
      if (isConstant) {
        // For percents, store the percent getter on .getValue()
        if (attrValue.indexOf('%') > -1) {
          var decimalValue = parseFloat(parsedValue()) / 100;
          dimensionData.getValue = dimensionData === heightData ?
            function() { return Math.floor(decimalValue * scrollView.__clientHeight); } :
            function() { return Math.floor(decimalValue * scrollView.__clientWidth); };
        } else {
          // For static constants, just store the static constant.
          dimensionData.value = parseInt(parsedValue());
        }

      } else {
        dimensionData.dynamic = true;
        dimensionData.getValue = dimensionData === heightData ?
          function heightGetter(scope, locals) {
            var result = parsedValue(scope, locals);
            if (result.charAt && result.charAt(result.length - 1) === '%') {
              return Math.floor(parseFloat(result) / 100 * scrollView.__clientHeight);
            }
            return parseInt(result);
          } :
          function widthGetter(scope, locals) {
            var result = parsedValue(scope, locals);
            if (result.charAt && result.charAt(result.length - 1) === '%') {
              return Math.floor(parseFloat(result) / 100 * scrollView.__clientWidth);
            }
            return parseInt(result);
          };
      }
    }

    var computedStyleNode;
    var computedStyleScope;
    function computeStyleDimensions() {
      if (!computedStyleNode) {
        transclude(computedStyleScope = scope.$new(), function(clone) {
          clone[0].removeAttribute('collection-repeat'); // remove absolute position styling
          computedStyleNode = clone[0];
        });
      }

      computedStyleScope[keyExpr] = (listGetter(scope) || [])[0];
      if (!$rootScope.$$phase) computedStyleScope.$digest();
      containerNode.appendChild(computedStyleNode);

      var style = $window.getComputedStyle(computedStyleNode);
      computedStyleDimensions.width = parseInt(style.width);
      computedStyleDimensions.height = parseInt(style.height);

      containerNode.removeChild(computedStyleNode);
    }

  }

}

RepeatManagerFactory.$inject = ['$rootScope', '$window', '$$rAF'];
function RepeatManagerFactory($rootScope, $window, $$rAF) {
  var EMPTY_DIMENSION = { primaryPos: 0, secondaryPos: 0, primarySize: 0, secondarySize: 0, rowPrimarySize: 0 };

  return function RepeatController(options) {
    var afterItemsNode = options.afterItemsNode;
    var containerNode = options.containerNode;
    var forceRefreshImages = options.forceRefreshImages;
    var heightData = options.heightData;
    var widthData = options.widthData;
    var keyExpression = options.keyExpression;
    var renderBuffer = options.renderBuffer;
    var scope = options.scope;
    var scrollView = options.scrollView;
    var transclude = options.transclude;

    var data = [];

    var getterLocals = {};
    var heightFn = heightData.getValue || function() { return heightData.value; };
    var heightGetter = function(index, value) {
      getterLocals[keyExpression] = value;
      getterLocals.$index = index;
      return heightFn(scope, getterLocals);
    };

    var widthFn = widthData.getValue || function() { return widthData.value; };
    var widthGetter = function(index, value) {
      getterLocals[keyExpression] = value;
      getterLocals.$index = index;
      return widthFn(scope, getterLocals);
    };

    var isVertical = !!scrollView.options.scrollingY;

    // We say it's a grid view if we're either dynamic or not 100% width
    var isGridView = isVertical ?
      (widthData.dynamic || widthData.value !== scrollView.__clientWidth) :
      (heightData.dynamic || heightData.value !== scrollView.__clientHeight);

    var isStaticView = !heightData.dynamic && !widthData.dynamic;

    var PRIMARY = 'PRIMARY';
    var SECONDARY = 'SECONDARY';
    var TRANSLATE_TEMPLATE_STR = isVertical ?
      'translate3d(SECONDARYpx,PRIMARYpx,0)' :
      'translate3d(PRIMARYpx,SECONDARYpx,0)';
    var WIDTH_HEIGHT_TEMPLATE_STR = isVertical ?
      'height: PRIMARYpx; width: SECONDARYpx;' :
      'height: SECONDARYpx; width: PRIMARYpx;';

    var estimatedHeight;
    var estimatedWidth;

    var repeaterBeforeSize = 0;
    var repeaterAfterSize = 0;

    var renderStartIndex = -1;
    var renderEndIndex = -1;
    var renderAfterBoundary = -1;
    var renderBeforeBoundary = -1;

    var itemsPool = [];
    var itemsLeaving = [];
    var itemsEntering = [];
    var itemsShownMap = {};
    var nextItemId = 0;

    var scrollViewSetDimensions = isVertical ?
      function() { scrollView.setDimensions(null, null, null, view.getContentSize(), true); } :
      function() { scrollView.setDimensions(null, null, view.getContentSize(), null, true); };

    // view is a mix of list/grid methods + static/dynamic methods.
    // See bottom for implementations. Available methods:
    //
    // getEstimatedPrimaryPos(i), getEstimatedSecondaryPos(i), getEstimatedIndex(scrollTop),
    // calculateDimensions(toIndex), getDimensions(index),
    // updateRenderRange(scrollTop, scrollValueEnd), onRefreshLayout(), onRefreshData()
    var view = isVertical ? new VerticalViewType() : new HorizontalViewType();
    (isGridView ? GridViewType : ListViewType).call(view);
    (isStaticView ? StaticViewType : DynamicViewType).call(view);

    var contentSizeStr = isVertical ? 'getContentHeight' : 'getContentWidth';
    var originalGetContentSize = scrollView.options[contentSizeStr];
    scrollView.options[contentSizeStr] = angular.bind(view, view.getContentSize);

    scrollView.__$callback = scrollView.__callback;
    scrollView.__callback = function(transformLeft, transformTop, zoom, wasResize) {
      var scrollValue = view.getScrollValue();
      if (renderStartIndex === -1 ||
          scrollValue + view.scrollPrimarySize > renderAfterBoundary ||
          scrollValue < renderBeforeBoundary) {
        render();
      }
      scrollView.__$callback(transformLeft, transformTop, zoom, wasResize);
    };

    var isLayoutReady = false;
    var isDataReady = false;
    this.refreshLayout = function() {
      if (data.length) {
        estimatedHeight = heightGetter(0, data[0]);
        estimatedWidth = widthGetter(0, data[0]);
      } else {
        // If we don't have any data in our array, just guess.
        estimatedHeight = 100;
        estimatedWidth = 100;
      }

      // Get the size of every element AFTER the repeater. We have to get the margin before and
      // after the first/last element to fix a browser bug with getComputedStyle() not counting
      // the first/last child's margins into height.
      var style = getComputedStyle(afterItemsNode) || {};
      var firstStyle = afterItemsNode.firstElementChild && getComputedStyle(afterItemsNode.firstElementChild) || {};
      var lastStyle = afterItemsNode.lastElementChild && getComputedStyle(afterItemsNode.lastElementChild) || {};
      repeaterAfterSize = (parseInt(style[isVertical ? 'height' : 'width']) || 0) +
        (firstStyle && parseInt(firstStyle[isVertical ? 'marginTop' : 'marginLeft']) || 0) +
        (lastStyle && parseInt(lastStyle[isVertical ? 'marginBottom' : 'marginRight']) || 0);

      // Get the offsetTop of the repeater.
      repeaterBeforeSize = 0;
      var current = containerNode;
      do {
        repeaterBeforeSize += current[isVertical ? 'offsetTop' : 'offsetLeft'];
      } while ( ionic.DomUtil.contains(scrollView.__content, current = current.offsetParent) );

      var containerPrevNode = containerNode.previousElementSibling;
      var beforeStyle = containerPrevNode ? $window.getComputedStyle(containerPrevNode) : {};
      var beforeMargin = parseInt(beforeStyle[isVertical ? 'marginBottom' : 'marginRight'] || 0);

      // Because we position the collection container with position: relative, it doesn't take
      // into account where to position itself relative to the previous element's marginBottom.
      // To compensate, we translate the container up by the previous element's margin.
      containerNode.style[ionic.CSS.TRANSFORM] = TRANSLATE_TEMPLATE_STR
        .replace(PRIMARY, -beforeMargin)
        .replace(SECONDARY, 0);
      repeaterBeforeSize -= beforeMargin;

      if (!scrollView.__clientHeight || !scrollView.__clientWidth) {
        scrollView.__clientWidth = scrollView.__container.clientWidth;
        scrollView.__clientHeight = scrollView.__container.clientHeight;
      }

      (view.onRefreshLayout || angular.noop)();
      view.refreshDirection();
      scrollViewSetDimensions();

      // Create the pool of items for reuse, setting the size to (estimatedItemsOnScreen) * 2,
      // plus the size of the renderBuffer.
      if (!isLayoutReady) {
        var poolSize = Math.max(20, renderBuffer * 3);
        for (var i = 0; i < poolSize; i++) {
          itemsPool.push(new RepeatItem());
        }
      }

      isLayoutReady = true;
      if (isLayoutReady && isDataReady) {
        // If the resize or latest data change caused the scrollValue to
        // now be out of bounds, resize the scrollView.
        if (scrollView.__scrollLeft > scrollView.__maxScrollLeft ||
            scrollView.__scrollTop > scrollView.__maxScrollTop) {
          scrollView.resize();
        }
        forceRerender(true);
      }
    };

    this.setData = function(newData) {
      data = newData;
      (view.onRefreshData || angular.noop)();
      isDataReady = true;
    };

    this.destroy = function() {
      render.destroyed = true;

      itemsPool.forEach(function(item) {
        item.scope.$destroy();
        item.scope = item.element = item.node = item.images = null;
      });
      itemsPool.length = itemsEntering.length = itemsLeaving.length = 0;
      itemsShownMap = {};

      //Restore the scrollView's normal behavior and resize it to normal size.
      scrollView.options[contentSizeStr] = originalGetContentSize;
      scrollView.__callback = scrollView.__$callback;
      scrollView.resize();

      (view.onDestroy || angular.noop)();
    };

    function forceRerender() {
      return render(true);
    }
    function render(forceRerender) {
      if (render.destroyed) return;
      var i;
      var ii;
      var item;
      var dim;
      var scope;
      var scrollValue = view.getScrollValue();
      var scrollValueEnd = scrollValue + view.scrollPrimarySize;

      view.updateRenderRange(scrollValue, scrollValueEnd);

      renderStartIndex = Math.max(0, renderStartIndex - renderBuffer);
      renderEndIndex = Math.min(data.length - 1, renderEndIndex + renderBuffer);

      for (i in itemsShownMap) {
        if (i < renderStartIndex || i > renderEndIndex) {
          item = itemsShownMap[i];
          delete itemsShownMap[i];
          itemsLeaving.push(item);
          item.isShown = false;
        }
      }

      // Render indicies that aren't shown yet
      //
      // NOTE(ajoslin): this may sound crazy, but calling any other functions during this render
      // loop will often push the render time over the edge from less than one frame to over
      // one frame, causing visible jank.
      // DON'T call any other functions inside this loop unless it's vital.
      for (i = renderStartIndex; i <= renderEndIndex; i++) {
        // We only go forward with render if the index is in data, the item isn't already shown,
        // or forceRerender is on.
        if (i >= data.length || (itemsShownMap[i] && !forceRerender)) continue;

        item = itemsShownMap[i] || (itemsShownMap[i] = itemsLeaving.length ? itemsLeaving.pop() :
                                    itemsPool.length ? itemsPool.shift() :
                                    new RepeatItem());
        itemsEntering.push(item);
        item.isShown = true;

        scope = item.scope;
        scope.$index = i;
        scope[keyExpression] = data[i];
        scope.$first = (i === 0);
        scope.$last = (i === (data.length - 1));
        scope.$middle = !(scope.$first || scope.$last);
        scope.$odd = !(scope.$even = (i & 1) === 0);

        if (scope.$$disconnected) ionic.Utils.reconnectScope(item.scope);

        dim = view.getDimensions(i);
        if (item.secondaryPos !== dim.secondaryPos || item.primaryPos !== dim.primaryPos) {
          item.node.style[ionic.CSS.TRANSFORM] = TRANSLATE_TEMPLATE_STR
            .replace(PRIMARY, (item.primaryPos = dim.primaryPos))
            .replace(SECONDARY, (item.secondaryPos = dim.secondaryPos));
        }
        if (item.secondarySize !== dim.secondarySize || item.primarySize !== dim.primarySize) {
          item.node.style.cssText = item.node.style.cssText
            .replace(WIDTH_HEIGHT_REGEX, WIDTH_HEIGHT_TEMPLATE_STR
              //TODO fix item.primarySize + 1 hack
              .replace(PRIMARY, (item.primarySize = dim.primarySize) + 1)
              .replace(SECONDARY, (item.secondarySize = dim.secondarySize))
            );
        }

      }

      // If we reach the end of the list, render the afterItemsNode - this contains all the
      // elements the developer placed after the collection-repeat
      if (renderEndIndex === data.length - 1) {
        dim = view.getDimensions(data.length - 1) || EMPTY_DIMENSION;
        afterItemsNode.style[ionic.CSS.TRANSFORM] = TRANSLATE_TEMPLATE_STR
          .replace(PRIMARY, dim.primaryPos + dim.primarySize)
          .replace(SECONDARY, 0);
      }

      while (itemsLeaving.length) {
        item = itemsLeaving.pop();
        item.scope.$broadcast('$collectionRepeatLeave');
        ionic.Utils.disconnectScope(item.scope);
        itemsPool.push(item);
        item.node.style[ionic.CSS.TRANSFORM] = 'translate3d(-9999px,-9999px,0)';
        item.primaryPos = item.secondaryPos = null;
      }

      if (forceRefreshImages) {
        for (i = 0, ii = itemsEntering.length; i < ii && (item = itemsEntering[i]); i++) {
          if (!item.images) continue;
          for (var j = 0, jj = item.images.length, img; j < jj && (img = item.images[j]); j++) {
            var src = img.src;
            img.src = ONE_PX_TRANSPARENT_IMG_SRC;
            img.src = src;
          }
        }
      }
      if (forceRerender) {
        var rootScopePhase = $rootScope.$$phase;
        while (itemsEntering.length) {
          item = itemsEntering.pop();
          if (!rootScopePhase) item.scope.$digest();
        }
      } else {
        digestEnteringItems();
      }
    }

    function digestEnteringItems() {
      var item;
      if (digestEnteringItems.running) return;
      digestEnteringItems.running = true;

      $$rAF(function process() {
        var rootScopePhase = $rootScope.$$phase;
        while (itemsEntering.length) {
          item = itemsEntering.pop();
          if (item.isShown) {
            if (!rootScopePhase) item.scope.$digest();
          }
        }
        digestEnteringItems.running = false;
      });
    }

    function RepeatItem() {
      var self = this;
      this.scope = scope.$new();
      this.id = 'item' + (nextItemId++);
      transclude(this.scope, function(clone) {
        self.element = clone;
        self.element.data('$$collectionRepeatItem', self);
        // TODO destroy
        self.node = clone[0];
        // Batch style setting to lower repaints
        self.node.style[ionic.CSS.TRANSFORM] = 'translate3d(-9999px,-9999px,0)';
        self.node.style.cssText += ' height: 0px; width: 0px;';
        ionic.Utils.disconnectScope(self.scope);
        containerNode.appendChild(self.node);
        self.images = clone[0].getElementsByTagName('img');
      });
    }

    function VerticalViewType() {
      this.getItemPrimarySize = heightGetter;
      this.getItemSecondarySize = widthGetter;

      this.getScrollValue = function() {
        return Math.max(0, Math.min(scrollView.__scrollTop - repeaterBeforeSize,
          scrollView.__maxScrollTop - repeaterBeforeSize - repeaterAfterSize));
      };

      this.refreshDirection = function() {
        this.scrollPrimarySize = scrollView.__clientHeight;
        this.scrollSecondarySize = scrollView.__clientWidth;

        this.estimatedPrimarySize = estimatedHeight;
        this.estimatedSecondarySize = estimatedWidth;
        this.estimatedItemsAcross = isGridView &&
          Math.floor(scrollView.__clientWidth / estimatedWidth) ||
          1;
      };
    }
    function HorizontalViewType() {
      this.getItemPrimarySize = widthGetter;
      this.getItemSecondarySize = heightGetter;

      this.getScrollValue = function() {
        return Math.max(0, Math.min(scrollView.__scrollLeft - repeaterBeforeSize,
          scrollView.__maxScrollLeft - repeaterBeforeSize - repeaterAfterSize));
      };

      this.refreshDirection = function() {
        this.scrollPrimarySize = scrollView.__clientWidth;
        this.scrollSecondarySize = scrollView.__clientHeight;

        this.estimatedPrimarySize = estimatedWidth;
        this.estimatedSecondarySize = estimatedHeight;
        this.estimatedItemsAcross = isGridView &&
          Math.floor(scrollView.__clientHeight / estimatedHeight) ||
          1;
      };
    }

    function GridViewType() {
      this.getEstimatedSecondaryPos = function(index) {
        return (index % this.estimatedItemsAcross) * this.estimatedSecondarySize;
      };
      this.getEstimatedPrimaryPos = function(index) {
        return Math.floor(index / this.estimatedItemsAcross) * this.estimatedPrimarySize;
      };
      this.getEstimatedIndex = function(scrollValue) {
        return Math.floor(scrollValue / this.estimatedPrimarySize) *
          this.estimatedItemsAcross;
      };
    }

    function ListViewType() {
      this.getEstimatedSecondaryPos = function() {
        return 0;
      };
      this.getEstimatedPrimaryPos = function(index) {
        return index * this.estimatedPrimarySize;
      };
      this.getEstimatedIndex = function(scrollValue) {
        return Math.floor((scrollValue) / this.estimatedPrimarySize);
      };
    }

    function StaticViewType() {
      this.getContentSize = function() {
        return this.getEstimatedPrimaryPos(data.length - 1) + this.estimatedPrimarySize +
          repeaterBeforeSize + repeaterAfterSize;
      };
      // static view always returns the same object for getDimensions, to avoid memory allocation
      // while scrolling. This could be dangerous if this was a public function, but it's not.
      // Only we use it.
      var dim = {};
      this.getDimensions = function(index) {
        dim.primaryPos = this.getEstimatedPrimaryPos(index);
        dim.secondaryPos = this.getEstimatedSecondaryPos(index);
        dim.primarySize = this.estimatedPrimarySize;
        dim.secondarySize = this.estimatedSecondarySize;
        return dim;
      };
      this.updateRenderRange = function(scrollValue, scrollValueEnd) {
        renderStartIndex = Math.max(0, this.getEstimatedIndex(scrollValue));

        // Make sure the renderEndIndex takes into account all the items on the row
        renderEndIndex = Math.min(data.length - 1,
          this.getEstimatedIndex(scrollValueEnd) + this.estimatedItemsAcross - 1);

        renderBeforeBoundary = Math.max(0,
          this.getEstimatedPrimaryPos(renderStartIndex));
        renderAfterBoundary = this.getEstimatedPrimaryPos(renderEndIndex) +
          this.estimatedPrimarySize;
      };
    }

    function DynamicViewType() {
      var self = this;
      var debouncedScrollViewSetDimensions = ionic.debounce(scrollViewSetDimensions, 25, true);
      var calculateDimensions = isGridView ? calculateDimensionsGrid : calculateDimensionsList;
      var dimensionsIndex;
      var dimensions = [];


      // Get the dimensions at index. {width, height, left, top}.
      // We start with no dimensions calculated, then any time dimensions are asked for at an
      // index we calculate dimensions up to there.
      function calculateDimensionsList(toIndex) {
        var i, prevDimension, dim;
        for (i = Math.max(0, dimensionsIndex); i <= toIndex && (dim = dimensions[i]); i++) {
          prevDimension = dimensions[i - 1] || EMPTY_DIMENSION;
          dim.primarySize = self.getItemPrimarySize(i, data[i]);
          dim.secondarySize = self.scrollSecondarySize;
          dim.primaryPos = prevDimension.primaryPos + prevDimension.primarySize;
          dim.secondaryPos = 0;
        }
      }
      function calculateDimensionsGrid(toIndex) {
        var i, prevDimension, dim;
        for (i = Math.max(dimensionsIndex, 0); i <= toIndex && (dim = dimensions[i]); i++) {
          prevDimension = dimensions[i - 1] || EMPTY_DIMENSION;
          dim.secondarySize = Math.min(
            self.getItemSecondarySize(i, data[i]),
            self.scrollSecondarySize
          );
          dim.secondaryPos = prevDimension.secondaryPos + prevDimension.secondarySize;

          if (i === 0 || dim.secondaryPos + dim.secondarySize > self.scrollSecondarySize) {
            dim.secondaryPos = 0;
            dim.primarySize = self.getItemPrimarySize(i, data[i]);
            dim.primaryPos = prevDimension.primaryPos + prevDimension.rowPrimarySize;

            dim.rowStartIndex = i;
            dim.rowPrimarySize = dim.primarySize;
          } else {
            dim.primarySize = self.getItemPrimarySize(i, data[i]);
            dim.primaryPos = prevDimension.primaryPos;
            dim.rowStartIndex = prevDimension.rowStartIndex;

            dimensions[dim.rowStartIndex].rowPrimarySize = dim.rowPrimarySize = Math.max(
              dimensions[dim.rowStartIndex].rowPrimarySize,
              dim.primarySize
            );
            dim.rowPrimarySize = Math.max(dim.primarySize, dim.rowPrimarySize);
          }
        }
      }

      this.getContentSize = function() {
        var dim = dimensions[dimensionsIndex] || EMPTY_DIMENSION;
        return ((dim.primaryPos + dim.primarySize) || 0) +
          this.getEstimatedPrimaryPos(data.length - dimensionsIndex - 1) +
          repeaterBeforeSize + repeaterAfterSize;
      };
      this.onDestroy = function() {
        dimensions.length = 0;
      };

      this.onRefreshData = function() {
        var i;
        var ii;
        // Make sure dimensions has as many items as data.length.
        // This is to be sure we don't have to allocate objects while scrolling.
        for (i = dimensions.length, ii = data.length; i < ii; i++) {
          dimensions.push({});
        }
        dimensionsIndex = -1;
      };
      this.onRefreshLayout = function() {
        dimensionsIndex = -1;
      };
      this.getDimensions = function(index) {
        index = Math.min(index, data.length - 1);

        if (dimensionsIndex < index) {
          // Once we start asking for dimensions near the end of the list, go ahead and calculate
          // everything. This is to make sure when the user gets to the end of the list, the
          // scroll height of the list is 100% accurate (not estimated anymore).
          if (index > data.length * 0.9) {
            calculateDimensions(data.length - 1);
            dimensionsIndex = data.length - 1;
            scrollViewSetDimensions();
          } else {
            calculateDimensions(index);
            dimensionsIndex = index;
            debouncedScrollViewSetDimensions();
          }

        }
        return dimensions[index];
      };

      var oldRenderStartIndex = -1;
      var oldScrollValue = -1;
      this.updateRenderRange = function(scrollValue, scrollValueEnd) {
        var i;
        var len;
        var dim;

        // Calculate more dimensions than we estimate we'll need, to be sure.
        this.getDimensions( this.getEstimatedIndex(scrollValueEnd) * 2 );

        // -- Calculate renderStartIndex
        // base case: start at 0
        if (oldRenderStartIndex === -1 || scrollValue === 0) {
          i = 0;
        // scrolling down
        } else if (scrollValue >= oldScrollValue) {
          for (i = oldRenderStartIndex, len = data.length; i < len; i++) {
            if ((dim = this.getDimensions(i)) && dim.primaryPos + dim.rowPrimarySize >= scrollValue) {
              break;
            }
          }
        // scrolling up
        } else {
          for (i = oldRenderStartIndex; i >= 0; i--) {
            if ((dim = this.getDimensions(i)) && dim.primaryPos <= scrollValue) {
              // when grid view, make sure the render starts at the beginning of a row.
              i = isGridView ? dim.rowStartIndex : i;
              break;
            }
          }
        }

        renderStartIndex = Math.min(Math.max(0, i), data.length - 1);
        renderBeforeBoundary = renderStartIndex !== -1 ? this.getDimensions(renderStartIndex).primaryPos : -1;

        // -- Calculate renderEndIndex
        var lastRowDim;
        for (i = renderStartIndex + 1, len = data.length; i < len; i++) {
          if ((dim = this.getDimensions(i)) && dim.primaryPos + dim.rowPrimarySize > scrollValueEnd) {

            // Go all the way to the end of the row if we're in a grid
            if (isGridView) {
              lastRowDim = dim;
              while (i < len - 1 &&
                    (dim = this.getDimensions(i + 1)).primaryPos === lastRowDim.primaryPos) {
                i++;
              }
            }
            break;
          }
        }

        renderEndIndex = Math.min(i, data.length - 1);
        renderAfterBoundary = renderEndIndex !== -1 ?
          ((dim = this.getDimensions(renderEndIndex)).primaryPos + (dim.rowPrimarySize || dim.primarySize)) :
          -1;

        oldScrollValue = scrollValue;
        oldRenderStartIndex = renderStartIndex;
      };
    }


  };

}

/**
 * @ngdoc directive
 * @name ionContent
 * @module ionic
 * @delegate ionic.service:$ionicScrollDelegate
 * @restrict E
 *
 * @description
 * The ionContent directive provides an easy to use content area that can be configured
 * to use Ionic's custom Scroll View, or the built in overflow scrolling of the browser.
 *
 * While we recommend using the custom Scroll features in Ionic in most cases, sometimes
 * (for performance reasons) only the browser's native overflow scrolling will suffice,
 * and so we've made it easy to toggle between the Ionic scroll implementation and
 * overflow scrolling.
 *
 * You can implement pull-to-refresh with the {@link ionic.directive:ionRefresher}
 * directive, and infinite scrolling with the {@link ionic.directive:ionInfiniteScroll}
 * directive.
 *
 * If there is any dynamic content inside the ion-content, be sure to call `.resize()` with {@link ionic.service:$ionicScrollDelegate}
 * after the content has been added.
 *
 * Be aware that this directive gets its own child scope. If you do not understand why this
 * is important, you can read [https://docs.angularjs.org/guide/scope](https://docs.angularjs.org/guide/scope).
 *
 * @param {string=} delegate-handle The handle used to identify this scrollView
 * with {@link ionic.service:$ionicScrollDelegate}.
 * @param {string=} direction Which way to scroll. 'x' or 'y' or 'xy'. Default 'y'.
 * @param {boolean=} locking Whether to lock scrolling in one direction at a time. Useful to set to false when zoomed in or scrolling in two directions. Default true.
 * @param {boolean=} padding Whether to add padding to the content.
 * Defaults to true on iOS, false on Android.
 * @param {boolean=} scroll Whether to allow scrolling of content.  Defaults to true.
 * @param {boolean=} overflow-scroll Whether to use overflow-scrolling instead of
 * Ionic scroll. See {@link ionic.provider:$ionicConfigProvider} to set this as the global default.
 * @param {boolean=} scrollbar-x Whether to show the horizontal scrollbar. Default true.
 * @param {boolean=} scrollbar-y Whether to show the vertical scrollbar. Default true.
 * @param {string=} start-x Initial horizontal scroll position. Default 0.
 * @param {string=} start-y Initial vertical scroll position. Default 0.
 * @param {expression=} on-scroll Expression to evaluate when the content is scrolled.
 * @param {expression=} on-scroll-complete Expression to evaluate when a scroll action completes. Has access to 'scrollLeft' and 'scrollTop' locals.
 * @param {boolean=} has-bouncing Whether to allow scrolling to bounce past the edges
 * of the content.  Defaults to true on iOS, false on Android.
 * @param {number=} scroll-event-interval Number of milliseconds between each firing of the 'on-scroll' expression. Default 10.
 */
IonicModule
.directive('ionContent', [
  '$timeout',
  '$controller',
  '$ionicBind',
  '$ionicConfig',
function($timeout, $controller, $ionicBind, $ionicConfig) {
  return {
    restrict: 'E',
    require: '^?ionNavView',
    scope: true,
    priority: 800,
    compile: function(element, attr) {
      var innerElement;
      var scrollCtrl;

      element.addClass('scroll-content ionic-scroll');

      if (attr.scroll != 'false') {
        //We cannot use normal transclude here because it breaks element.data()
        //inheritance on compile
        innerElement = jqLite('<div class="scroll"></div>');
        innerElement.append(element.contents());
        element.append(innerElement);
      } else {
        element.addClass('scroll-content-false');
      }

      var nativeScrolling = attr.overflowScroll !== "false" && (attr.overflowScroll === "true" || !$ionicConfig.scrolling.jsScrolling());

      // collection-repeat requires JS scrolling
      if (nativeScrolling) {
        nativeScrolling = !element[0].querySelector('[collection-repeat]');
      }
      return { pre: prelink };
      function prelink($scope, $element, $attr) {
        var parentScope = $scope.$parent;
        $scope.$watch(function() {
          return (parentScope.$hasHeader ? ' has-header' : '') +
            (parentScope.$hasSubheader ? ' has-subheader' : '') +
            (parentScope.$hasFooter ? ' has-footer' : '') +
            (parentScope.$hasSubfooter ? ' has-subfooter' : '') +
            (parentScope.$hasTabs ? ' has-tabs' : '') +
            (parentScope.$hasTabsTop ? ' has-tabs-top' : '');
        }, function(className, oldClassName) {
          $element.removeClass(oldClassName);
          $element.addClass(className);
        });

        //Only this ionContent should use these variables from parent scopes
        $scope.$hasHeader = $scope.$hasSubheader =
          $scope.$hasFooter = $scope.$hasSubfooter =
          $scope.$hasTabs = $scope.$hasTabsTop =
          false;
        $ionicBind($scope, $attr, {
          $onScroll: '&onScroll',
          $onScrollComplete: '&onScrollComplete',
          hasBouncing: '@',
          padding: '@',
          direction: '@',
          scrollbarX: '@',
          scrollbarY: '@',
          startX: '@',
          startY: '@',
          scrollEventInterval: '@'
        });
        $scope.direction = $scope.direction || 'y';

        if (isDefined($attr.padding)) {
          $scope.$watch($attr.padding, function(newVal) {
              (innerElement || $element).toggleClass('padding', !!newVal);
          });
        }

        if ($attr.scroll === "false") {
          //do nothing
        } else {
          var scrollViewOptions = {};

          // determined in compile phase above
          if (nativeScrolling) {
            // use native scrolling
            $element.addClass('overflow-scroll');

            scrollViewOptions = {
              el: $element[0],
              delegateHandle: attr.delegateHandle,
              startX: $scope.$eval($scope.startX) || 0,
              startY: $scope.$eval($scope.startY) || 0,
              nativeScrolling: true
            };

          } else {
            // Use JS scrolling
            scrollViewOptions = {
              el: $element[0],
              delegateHandle: attr.delegateHandle,
              locking: (attr.locking || 'true') === 'true',
              bouncing: $scope.$eval($scope.hasBouncing),
              startX: $scope.$eval($scope.startX) || 0,
              startY: $scope.$eval($scope.startY) || 0,
              scrollbarX: $scope.$eval($scope.scrollbarX) !== false,
              scrollbarY: $scope.$eval($scope.scrollbarY) !== false,
              scrollingX: $scope.direction.indexOf('x') >= 0,
              scrollingY: $scope.direction.indexOf('y') >= 0,
              scrollEventInterval: parseInt($scope.scrollEventInterval, 10) || 10,
              scrollingComplete: onScrollComplete
            };
          }

          // init scroll controller with appropriate options
          scrollCtrl = $controller('$ionicScroll', {
            $scope: $scope,
            scrollViewOptions: scrollViewOptions
          });

          $scope.scrollCtrl = scrollCtrl;

          $scope.$on('$destroy', function() {
            if (scrollViewOptions) {
              scrollViewOptions.scrollingComplete = noop;
              delete scrollViewOptions.el;
            }
            innerElement = null;
            $element = null;
            attr.$$element = null;
          });
        }

        function onScrollComplete() {
          $scope.$onScrollComplete({
            scrollTop: scrollCtrl.scrollView.__scrollTop,
            scrollLeft: scrollCtrl.scrollView.__scrollLeft
          });
        }

      }
    }
  };
}]);

/**
 * @ngdoc directive
 * @name exposeAsideWhen
 * @module ionic
 * @restrict A
 * @parent ionic.directive:ionSideMenus
 *
 * @description
 * It is common for a tablet application to hide a menu when in portrait mode, but to show the
 * same menu on the left side when the tablet is in landscape mode. The `exposeAsideWhen` attribute
 * directive can be used to accomplish a similar interface.
 *
 * By default, side menus are hidden underneath its side menu content, and can be opened by either
 * swiping the content left or right, or toggling a button to show the side menu. However, by adding the
 * `exposeAsideWhen` attribute directive to an {@link ionic.directive:ionSideMenu} element directive,
 * a side menu can be given instructions on "when" the menu should be exposed (always viewable). For
 * example, the `expose-aside-when="large"` attribute will keep the side menu hidden when the viewport's
 * width is less than `768px`, but when the viewport's width is `768px` or greater, the menu will then
 * always be shown and can no longer be opened or closed like it could when it was hidden for smaller
 * viewports.
 *
 * Using `large` as the attribute's value is a shortcut value to `(min-width:768px)` since it is
 * the most common use-case. However, for added flexibility, any valid media query could be added
 * as the value, such as `(min-width:600px)` or even multiple queries such as
 * `(min-width:750px) and (max-width:1200px)`.
 * @usage
 * ```html
 * <ion-side-menus>
 *   <!-- Center content -->
 *   <ion-side-menu-content>
 *   </ion-side-menu-content>
 *
 *   <!-- Left menu -->
 *   <ion-side-menu expose-aside-when="large">
 *   </ion-side-menu>
 * </ion-side-menus>
 * ```
 * For a complete side menu example, see the
 * {@link ionic.directive:ionSideMenus} documentation.
 */

IonicModule.directive('exposeAsideWhen', ['$window', function($window) {
  return {
    restrict: 'A',
    require: '^ionSideMenus',
    link: function($scope, $element, $attr, sideMenuCtrl) {

      var prevInnerWidth = $window.innerWidth;
      var prevInnerHeight = $window.innerHeight;

      ionic.on('resize', function() {
        if (prevInnerWidth === $window.innerWidth && prevInnerHeight === $window.innerHeight) {
          return;
        }
        prevInnerWidth = $window.innerWidth;
        prevInnerHeight = $window.innerHeight;
        onResize();
      }, $window);

      function checkAsideExpose() {
        var mq = $attr.exposeAsideWhen == 'large' ? '(min-width:768px)' : $attr.exposeAsideWhen;
        sideMenuCtrl.exposeAside($window.matchMedia(mq).matches);
        sideMenuCtrl.activeAsideResizing(false);
      }

      function onResize() {
        sideMenuCtrl.activeAsideResizing(true);
        debouncedCheck();
      }

      var debouncedCheck = ionic.debounce(function() {
        $scope.$apply(checkAsideExpose);
      }, 300, false);

      $scope.$evalAsync(checkAsideExpose);
    }
  };
}]);

var GESTURE_DIRECTIVES = 'onHold onTap onDoubleTap onTouch onRelease onDragStart onDrag onDragEnd onDragUp onDragRight onDragDown onDragLeft onSwipe onSwipeUp onSwipeRight onSwipeDown onSwipeLeft'.split(' ');

GESTURE_DIRECTIVES.forEach(function(name) {
  IonicModule.directive(name, gestureDirective(name));
});


/**
 * @ngdoc directive
 * @name onHold
 * @module ionic
 * @restrict A
 *
 * @description
 * Touch stays at the same location for 500ms. Similar to long touch events available for AngularJS and jQuery.
 *
 * @usage
 * ```html
 * <button on-hold="onHold()" class="button">Test</button>
 * ```
 */


/**
 * @ngdoc directive
 * @name onTap
 * @module ionic
 * @restrict A
 *
 * @description
 * Quick touch at a location. If the duration of the touch goes
 * longer than 250ms it is no longer a tap gesture.
 *
 * @usage
 * ```html
 * <button on-tap="onTap()" class="button">Test</button>
 * ```
 */


/**
 * @ngdoc directive
 * @name onDoubleTap
 * @module ionic
 * @restrict A
 *
 * @description
 * Double tap touch at a location.
 *
 * @usage
 * ```html
 * <button on-double-tap="onDoubleTap()" class="button">Test</button>
 * ```
 */


/**
 * @ngdoc directive
 * @name onTouch
 * @module ionic
 * @restrict A
 *
 * @description
 * Called immediately when the user first begins a touch. This
 * gesture does not wait for a touchend/mouseup.
 *
 * @usage
 * ```html
 * <button on-touch="onTouch()" class="button">Test</button>
 * ```
 */


/**
 * @ngdoc directive
 * @name onRelease
 * @module ionic
 * @restrict A
 *
 * @description
 * Called when the user ends a touch.
 *
 * @usage
 * ```html
 * <button on-release="onRelease()" class="button">Test</button>
 * ```
 */

/**
 * @ngdoc directive
 * @name onDragStart
 * @module ionic
 * @restrict A
 *
 * @description
 * Called when a drag gesture has started.
 *
 * @usage
 * ```html
 * <button on-drag-start="onDragStart()" class="button">Test</button>
 * ```
 */


/**
 * @ngdoc directive
 * @name onDrag
 * @module ionic
 * @restrict A
 *
 * @description
 * Move with one touch around on the page. Blocking the scrolling when
 * moving left and right is a good practice. When all the drag events are
 * blocking you disable scrolling on that area.
 *
 * @usage
 * ```html
 * <button on-drag="onDrag()" class="button">Test</button>
 * ```
 */

/**
 * @ngdoc directive
 * @name onDragEnd
 * @module ionic
 * @restrict A
 *
 * @description
 * Called when a drag gesture has ended.
 *
 * @usage
 * ```html
 * <button on-drag-end="onDragEnd()" class="button">Test</button>
 * ```
 */

/**
 * @ngdoc directive
 * @name onDragUp
 * @module ionic
 * @restrict A
 *
 * @description
 * Called when the element is dragged up.
 *
 * @usage
 * ```html
 * <button on-drag-up="onDragUp()" class="button">Test</button>
 * ```
 */


/**
 * @ngdoc directive
 * @name onDragRight
 * @module ionic
 * @restrict A
 *
 * @description
 * Called when the element is dragged to the right.
 *
 * @usage
 * ```html
 * <button on-drag-right="onDragRight()" class="button">Test</button>
 * ```
 */


/**
 * @ngdoc directive
 * @name onDragDown
 * @module ionic
 * @restrict A
 *
 * @description
 * Called when the element is dragged down.
 *
 * @usage
 * ```html
 * <button on-drag-down="onDragDown()" class="button">Test</button>
 * ```
 */


/**
 * @ngdoc directive
 * @name onDragLeft
 * @module ionic
 * @restrict A
 *
 * @description
 * Called when the element is dragged to the left.
 *
 * @usage
 * ```html
 * <button on-drag-left="onDragLeft()" class="button">Test</button>
 * ```
 */


/**
 * @ngdoc directive
 * @name onSwipe
 * @module ionic
 * @restrict A
 *
 * @description
 * Called when a moving touch has a high velocity in any direction.
 *
 * @usage
 * ```html
 * <button on-swipe="onSwipe()" class="button">Test</button>
 * ```
 */


/**
 * @ngdoc directive
 * @name onSwipeUp
 * @module ionic
 * @restrict A
 *
 * @description
 * Called when a moving touch has a high velocity moving up.
 *
 * @usage
 * ```html
 * <button on-swipe-up="onSwipeUp()" class="button">Test</button>
 * ```
 */


/**
 * @ngdoc directive
 * @name onSwipeRight
 * @module ionic
 * @restrict A
 *
 * @description
 * Called when a moving touch has a high velocity moving to the right.
 *
 * @usage
 * ```html
 * <button on-swipe-right="onSwipeRight()" class="button">Test</button>
 * ```
 */


/**
 * @ngdoc directive
 * @name onSwipeDown
 * @module ionic
 * @restrict A
 *
 * @description
 * Called when a moving touch has a high velocity moving down.
 *
 * @usage
 * ```html
 * <button on-swipe-down="onSwipeDown()" class="button">Test</button>
 * ```
 */


/**
 * @ngdoc directive
 * @name onSwipeLeft
 * @module ionic
 * @restrict A
 *
 * @description
 * Called when a moving touch has a high velocity moving to the left.
 *
 * @usage
 * ```html
 * <button on-swipe-left="onSwipeLeft()" class="button">Test</button>
 * ```
 */


function gestureDirective(directiveName) {
  return ['$ionicGesture', '$parse', function($ionicGesture, $parse) {
    var eventType = directiveName.substr(2).toLowerCase();

    return function(scope, element, attr) {
      var fn = $parse( attr[directiveName] );

      var listener = function(ev) {
        scope.$apply(function() {
          fn(scope, {
            $event: ev
          });
        });
      };

      var gesture = $ionicGesture.on(eventType, listener, element);

      scope.$on('$destroy', function() {
        $ionicGesture.off(gesture, eventType, listener);
      });
    };
  }];
}


IonicModule
//.directive('ionHeaderBar', tapScrollToTopDirective())

/**
 * @ngdoc directive
 * @name ionHeaderBar
 * @module ionic
 * @restrict E
 *
 * @description
 * Adds a fixed header bar above some content.
 *
 * Can also be a subheader (lower down) if the 'bar-subheader' class is applied.
 * See [the header CSS docs](/docs/components/#subheader).
 *
 * @param {string=} align-title How to align the title. By default the title
 * will be aligned the same as how the platform aligns its titles (iOS centers
 * titles, Android aligns them left).
 * Available: 'left', 'right', or 'center'.  Defaults to the same as the platform.
 * @param {boolean=} no-tap-scroll By default, the header bar will scroll the
 * content to the top when tapped.  Set no-tap-scroll to true to disable this
 * behavior.
 * Available: true or false.  Defaults to false.
 *
 * @usage
 * ```html
 * <ion-header-bar align-title="left" class="bar-positive">
 *   <div class="buttons">
 *     <button class="button" ng-click="doSomething()">Left Button</button>
 *   </div>
 *   <h1 class="title">Title!</h1>
 *   <div class="buttons">
 *     <button class="button">Right Button</button>
 *   </div>
 * </ion-header-bar>
 * <ion-content class="has-header">
 *   Some content!
 * </ion-content>
 * ```
 */
.directive('ionHeaderBar', headerFooterBarDirective(true))

/**
 * @ngdoc directive
 * @name ionFooterBar
 * @module ionic
 * @restrict E
 *
 * @description
 * Adds a fixed footer bar below some content.
 *
 * Can also be a subfooter (higher up) if the 'bar-subfooter' class is applied.
 * See [the footer CSS docs](/docs/components/#footer).
 *
 * Note: If you use ionFooterBar in combination with ng-if, the surrounding content
 * will not align correctly.  This will be fixed soon.
 *
 * @param {string=} align-title Where to align the title.
 * Available: 'left', 'right', or 'center'.  Defaults to 'center'.
 *
 * @usage
 * ```html
 * <ion-content class="has-footer">
 *   Some content!
 * </ion-content>
 * <ion-footer-bar align-title="left" class="bar-assertive">
 *   <div class="buttons">
 *     <button class="button">Left Button</button>
 *   </div>
 *   <h1 class="title">Title!</h1>
 *   <div class="buttons" ng-click="doSomething()">
 *     <button class="button">Right Button</button>
 *   </div>
 * </ion-footer-bar>
 * ```
 */
.directive('ionFooterBar', headerFooterBarDirective(false));

function tapScrollToTopDirective() { //eslint-disable-line no-unused-vars
  return ['$ionicScrollDelegate', function($ionicScrollDelegate) {
    return {
      restrict: 'E',
      link: function($scope, $element, $attr) {
        if ($attr.noTapScroll == 'true') {
          return;
        }
        ionic.on('tap', onTap, $element[0]);
        $scope.$on('$destroy', function() {
          ionic.off('tap', onTap, $element[0]);
        });

        function onTap(e) {
          var depth = 3;
          var current = e.target;
          //Don't scroll to top in certain cases
          while (depth-- && current) {
            if (current.classList.contains('button') ||
                current.tagName.match(/input|textarea|select/i) ||
                current.isContentEditable) {
              return;
            }
            current = current.parentNode;
          }
          var touch = e.gesture && e.gesture.touches[0] || e.detail.touches[0];
          var bounds = $element[0].getBoundingClientRect();
          if (ionic.DomUtil.rectContains(
            touch.pageX, touch.pageY,
            bounds.left, bounds.top - 20,
            bounds.left + bounds.width, bounds.top + bounds.height
          )) {
            $ionicScrollDelegate.scrollTop(true);
          }
        }
      }
    };
  }];
}

function headerFooterBarDirective(isHeader) {
  return ['$document', '$timeout', function($document, $timeout) {
    return {
      restrict: 'E',
      controller: '$ionicHeaderBar',
      compile: function(tElement) {
        tElement.addClass(isHeader ? 'bar bar-header' : 'bar bar-footer');
        // top style tabs? if so, remove bottom border for seamless display
        $timeout(function() {
          if (isHeader && $document[0].getElementsByClassName('tabs-top').length) tElement.addClass('has-tabs-top');
        });

        return { pre: prelink };
        function prelink($scope, $element, $attr, ctrl) {
          if (isHeader) {
            $scope.$watch(function() { return $element[0].className; }, function(value) {
              var isShown = value.indexOf('ng-hide') === -1;
              var isSubheader = value.indexOf('bar-subheader') !== -1;
              $scope.$hasHeader = isShown && !isSubheader;
              $scope.$hasSubheader = isShown && isSubheader;
              $scope.$emit('$ionicSubheader', $scope.$hasSubheader);
            });
            $scope.$on('$destroy', function() {
              delete $scope.$hasHeader;
              delete $scope.$hasSubheader;
            });
            ctrl.align();
            $scope.$on('$ionicHeader.align', function() {
              ionic.requestAnimationFrame(function() {
                ctrl.align();
              });
            });

          } else {
            $scope.$watch(function() { return $element[0].className; }, function(value) {
              var isShown = value.indexOf('ng-hide') === -1;
              var isSubfooter = value.indexOf('bar-subfooter') !== -1;
              $scope.$hasFooter = isShown && !isSubfooter;
              $scope.$hasSubfooter = isShown && isSubfooter;
            });
            $scope.$on('$destroy', function() {
              delete $scope.$hasFooter;
              delete $scope.$hasSubfooter;
            });
            $scope.$watch('$hasTabs', function(val) {
              $element.toggleClass('has-tabs', !!val);
            });
            ctrl.align();
            $scope.$on('$ionicFooter.align', function() {
              ionic.requestAnimationFrame(function() {
                ctrl.align();
              });
            });
          }
        }
      }
    };
  }];
}

/**
 * @ngdoc directive
 * @name ionInfiniteScroll
 * @module ionic
 * @parent ionic.directive:ionContent, ionic.directive:ionScroll
 * @restrict E
 *
 * @description
 * The ionInfiniteScroll directive allows you to call a function whenever
 * the user gets to the bottom of the page or near the bottom of the page.
 *
 * The expression you pass in for `on-infinite` is called when the user scrolls
 * greater than `distance` away from the bottom of the content.  Once `on-infinite`
 * is done loading new data, it should broadcast the `scroll.infiniteScrollComplete`
 * event from your controller (see below example).
 *
 * @param {expression} on-infinite What to call when the scroller reaches the
 * bottom.
 * @param {string=} distance The distance from the bottom that the scroll must
 * reach to trigger the on-infinite expression. Default: 1%.
 * @param {string=} spinner The {@link ionic.directive:ionSpinner} to show while loading. The SVG
 * {@link ionic.directive:ionSpinner} is now the default, replacing rotating font icons.
 * @param {string=} icon The icon to show while loading. Default: 'ion-load-d'.  This is depreicated
 * in favor of the SVG {@link ionic.directive:ionSpinner}.
 * @param {boolean=} immediate-check Whether to check the infinite scroll bounds immediately on load.
 *
 * @usage
 * ```html
 * <ion-content ng-controller="MyController">
 *   <ion-list>
 *   ....
 *   ....
 *   </ion-list>
 *
 *   <ion-infinite-scroll
 *     on-infinite="loadMore()"
 *     distance="1%">
 *   </ion-infinite-scroll>
 * </ion-content>
 * ```
 * ```js
 * function MyController($scope, $http) {
 *   $scope.items = [];
 *   $scope.loadMore = function() {
 *     $http.get('/more-items').success(function(items) {
 *       useItems(items);
 *       $scope.$broadcast('scroll.infiniteScrollComplete');
 *     });
 *   };
 *
 *   $scope.$on('$stateChangeSuccess', function() {
 *     $scope.loadMore();
 *   });
 * }
 * ```
 *
 * An easy to way to stop infinite scroll once there is no more data to load
 * is to use angular's `ng-if` directive:
 *
 * ```html
 * <ion-infinite-scroll
 *   ng-if="moreDataCanBeLoaded()"
 *   icon="ion-loading-c"
 *   on-infinite="loadMoreData()">
 * </ion-infinite-scroll>
 * ```
 */
IonicModule
.directive('ionInfiniteScroll', ['$timeout', function($timeout) {
  return {
    restrict: 'E',
    require: ['?^$ionicScroll', 'ionInfiniteScroll'],
    template: function($element, $attrs) {
      if ($attrs.icon) return '<i class="icon {{icon()}} icon-refreshing {{scrollingType}}"></i>';
      return '<ion-spinner icon="{{spinner()}}"></ion-spinner>';
    },
    scope: true,
    controller: '$ionInfiniteScroll',
    link: function($scope, $element, $attrs, ctrls) {
      var infiniteScrollCtrl = ctrls[1];
      var scrollCtrl = infiniteScrollCtrl.scrollCtrl = ctrls[0];
      var jsScrolling = infiniteScrollCtrl.jsScrolling = !scrollCtrl.isNative();

      // if this view is not beneath a scrollCtrl, it can't be injected, proceed w/ native scrolling
      if (jsScrolling) {
        infiniteScrollCtrl.scrollView = scrollCtrl.scrollView;
        $scope.scrollingType = 'js-scrolling';
        //bind to JS scroll events
        scrollCtrl.$element.on('scroll', infiniteScrollCtrl.checkBounds);
      } else {
        // grabbing the scrollable element, to determine dimensions, and current scroll pos
        var scrollEl = ionic.DomUtil.getParentOrSelfWithClass($element[0].parentNode, 'overflow-scroll');
        infiniteScrollCtrl.scrollEl = scrollEl;
        // if there's no scroll controller, and no overflow scroll div, infinite scroll wont work
        if (!scrollEl) {
          throw 'Infinite scroll must be used inside a scrollable div';
        }
        //bind to native scroll events
        infiniteScrollCtrl.scrollEl.addEventListener('scroll', infiniteScrollCtrl.checkBounds);
      }

      // Optionally check bounds on start after scrollView is fully rendered
      var doImmediateCheck = isDefined($attrs.immediateCheck) ? $scope.$eval($attrs.immediateCheck) : true;
      if (doImmediateCheck) {
        $timeout(function() { infiniteScrollCtrl.checkBounds(); });
      }
    }
  };
}]);

/**
* @ngdoc directive
* @name ionInput
* @parent ionic.directive:ionList
* @module ionic
* @restrict E
* Creates a text input group that can easily be focused
*
* @usage
*
* ```html
* <ion-list>
*   <ion-input>
*     <input type="text" placeholder="First Name">
*   </ion-input>
*
*   <ion-input>
*     <ion-label>Username</ion-label>
*     <input type="text">
*   </ion-input>
* </ion-list>
* ```
*/

var labelIds = -1;

IonicModule
.directive('ionInput', [function() {
  return {
    restrict: 'E',
    controller: ['$scope', '$element', function($scope, $element) {
      this.$scope = $scope;
      this.$element = $element;

      this.setInputAriaLabeledBy = function(id) {
        var inputs = $element[0].querySelectorAll('input,textarea');
        inputs.length && inputs[0].setAttribute('aria-labelledby', id);
      };

      this.focus = function() {
        var inputs = $element[0].querySelectorAll('input,textarea');
        inputs.length && inputs[0].focus();
      };
    }]
  };
}]);

/**
* @ngdoc directive
* @name ionLabel
* @parent ionic.directive:ionList
* @module ionic
* @restrict E
*
* New in Ionic 1.2. It is strongly recommended that you use `<ion-label>` in place
* of any `<label>` elements for maximum cross-browser support and performance.
*
* Creates a label for a form input.
*
* @usage
*
* ```html
* <ion-list>
*   <ion-input>
*     <ion-label>Username</ion-label>
*     <input type="text">
*   </ion-input>
* </ion-list>
* ```
*/
IonicModule
.directive('ionLabel', [function() {
  return {
    restrict: 'E',
    require: '?^ionInput',
    compile: function() {

      return function link($scope, $element, $attrs, ionInputCtrl) {
        var element = $element[0];

        $element.addClass('input-label');

        $element.attr('aria-label', $element.text());
        var id = element.id || '_label-' + ++labelIds;

        if (!element.id) {
          $element.attr('id', id);
        }

        if (ionInputCtrl) {

          ionInputCtrl.setInputAriaLabeledBy(id);

          $element.on('click', function() {
            ionInputCtrl.focus();
          });
        }
      };
    }
  };
}]);

/**
 * Input label adds accessibility to <span class="input-label">.
 */
IonicModule
.directive('inputLabel', [function() {
  return {
    restrict: 'C',
    require: '?^ionInput',
    compile: function() {

      return function link($scope, $element, $attrs, ionInputCtrl) {
        var element = $element[0];

        $element.attr('aria-label', $element.text());
        var id = element.id || '_label-' + ++labelIds;

        if (!element.id) {
          $element.attr('id', id);
        }

        if (ionInputCtrl) {
          ionInputCtrl.setInputAriaLabeledBy(id);
        }

      };
    }
  };
}]);

/**
* @ngdoc directive
* @name ionItem
* @parent ionic.directive:ionList
* @module ionic
* @restrict E
* Creates a list-item that can easily be swiped,
* deleted, reordered, edited, and more.
*
* See {@link ionic.directive:ionList} for a complete example & explanation.
*
* Can be assigned any item class name. See the
* [list CSS documentation](/docs/components/#list).
*
* @usage
*
* ```html
* <ion-list>
*   <ion-item>Hello!</ion-item>
*   <ion-item href="#/detail">
*     Link to detail page
*   </ion-item>
* </ion-list>
* ```
*/
IonicModule
.directive('ionItem', ['$$rAF', function($$rAF) {
  return {
    restrict: 'E',
    controller: ['$scope', '$element', function($scope, $element) {
      this.$scope = $scope;
      this.$element = $element;
    }],
    scope: true,
    compile: function($element, $attrs) {
      var isAnchor = isDefined($attrs.href) ||
                     isDefined($attrs.ngHref) ||
                     isDefined($attrs.uiSref);
      var isComplexItem = isAnchor ||
        //Lame way of testing, but we have to know at compile what to do with the element
        /ion-(delete|option|reorder)-button/i.test($element.html());

      if (isComplexItem) {
        var innerElement = jqLite(isAnchor ? '<a></a>' : '<div></div>');
        innerElement.addClass('item-content');

        if (isDefined($attrs.href) || isDefined($attrs.ngHref)) {
          innerElement.attr('ng-href', '{{$href()}}');
          if (isDefined($attrs.target)) {
            innerElement.attr('target', '{{$target()}}');
          }
        }

        innerElement.append($element.contents());

        $element.addClass('item item-complex')
                .append(innerElement);
      } else {
        $element.addClass('item');
      }

      return function link($scope, $element, $attrs) {
        $scope.$href = function() {
          return $attrs.href || $attrs.ngHref;
        };
        $scope.$target = function() {
          return $attrs.target;
        };

        var content = $element[0].querySelector('.item-content');
        if (content) {
          $scope.$on('$collectionRepeatLeave', function() {
            if (content && content.$$ionicOptionsOpen) {
              content.style[ionic.CSS.TRANSFORM] = '';
              content.style[ionic.CSS.TRANSITION] = 'none';
              $$rAF(function() {
                content.style[ionic.CSS.TRANSITION] = '';
              });
              content.$$ionicOptionsOpen = false;
            }
          });
        }
      };

    }
  };
}]);

var ITEM_TPL_DELETE_BUTTON =
  '<div class="item-left-edit item-delete enable-pointer-events">' +
  '</div>';
/**
* @ngdoc directive
* @name ionDeleteButton
* @parent ionic.directive:ionItem
* @module ionic
* @restrict E
* Creates a delete button inside a list item, that is visible when the
* {@link ionic.directive:ionList ionList parent's} `show-delete` evaluates to true or
* `$ionicListDelegate.showDelete(true)` is called.
*
* Takes any ionicon as a class.
*
* See {@link ionic.directive:ionList} for a complete example & explanation.
*
* @usage
*
* ```html
* <ion-list show-delete="shouldShowDelete">
*   <ion-item>
*     <ion-delete-button class="ion-minus-circled"></ion-delete-button>
*     Hello, list item!
*   </ion-item>
* </ion-list>
* <ion-toggle ng-model="shouldShowDelete">
*   Show Delete?
* </ion-toggle>
* ```
*/
IonicModule
.directive('ionDeleteButton', function() {

  function stopPropagation(ev) {
    ev.stopPropagation();
  }

  return {
    restrict: 'E',
    require: ['^^ionItem', '^?ionList'],
    //Run before anything else, so we can move it before other directives process
    //its location (eg ngIf relies on the location of the directive in the dom)
    priority: Number.MAX_VALUE,
    compile: function($element, $attr) {
      //Add the classes we need during the compile phase, so that they stay
      //even if something else like ngIf removes the element and re-addss it
      $attr.$set('class', ($attr['class'] || '') + ' button icon button-icon', true);
      return function($scope, $element, $attr, ctrls) {
        var itemCtrl = ctrls[0];
        var listCtrl = ctrls[1];
        var container = jqLite(ITEM_TPL_DELETE_BUTTON);
        container.append($element);
        itemCtrl.$element.append(container).addClass('item-left-editable');

        //Don't bubble click up to main .item
        $element.on('click', stopPropagation);

        init();
        $scope.$on('$ionic.reconnectScope', init);
        function init() {
          listCtrl = listCtrl || $element.controller('ionList');
          if (listCtrl && listCtrl.showDelete()) {
            container.addClass('visible active');
          }
        }
      };
    }
  };
});


IonicModule
.directive('itemFloatingLabel', function() {
  return {
    restrict: 'C',
    link: function(scope, element) {
      var el = element[0];
      var input = el.querySelector('input, textarea');
      var inputLabel = el.querySelector('.input-label');

      if (!input || !inputLabel) return;

      var onInput = function() {
        if (input.value) {
          inputLabel.classList.add('has-input');
        } else {
          inputLabel.classList.remove('has-input');
        }
      };

      input.addEventListener('input', onInput);

      var ngModelCtrl = jqLite(input).controller('ngModel');
      if (ngModelCtrl) {
        ngModelCtrl.$render = function() {
          input.value = ngModelCtrl.$viewValue || '';
          onInput();
        };
      }

      scope.$on('$destroy', function() {
        input.removeEventListener('input', onInput);
      });
    }
  };
});

var ITEM_TPL_OPTION_BUTTONS =
  '<div class="item-options invisible">' +
  '</div>';
/**
* @ngdoc directive
* @name ionOptionButton
* @parent ionic.directive:ionItem
* @module ionic
* @restrict E
* @description
* Creates an option button inside a list item, that is visible when the item is swiped
* to the left by the user.  Swiped open option buttons can be hidden with
* {@link ionic.service:$ionicListDelegate#closeOptionButtons $ionicListDelegate.closeOptionButtons}.
*
* Can be assigned any button class.
*
* See {@link ionic.directive:ionList} for a complete example & explanation.
*
* @usage
*
* ```html
* <ion-list>
*   <ion-item>
*     I love kittens!
*     <ion-option-button class="button-positive">Share</ion-option-button>
*     <ion-option-button class="button-assertive">Edit</ion-option-button>
*   </ion-item>
* </ion-list>
* ```
*/
IonicModule.directive('ionOptionButton', [function() {
  function stopPropagation(e) {
    e.stopPropagation();
  }
  return {
    restrict: 'E',
    require: '^ionItem',
    priority: Number.MAX_VALUE,
    compile: function($element, $attr) {
      $attr.$set('class', ($attr['class'] || '') + ' button', true);
      return function($scope, $element, $attr, itemCtrl) {
        if (!itemCtrl.optionsContainer) {
          itemCtrl.optionsContainer = jqLite(ITEM_TPL_OPTION_BUTTONS);
          itemCtrl.$element.append(itemCtrl.optionsContainer);
        }
        itemCtrl.optionsContainer.append($element);

        itemCtrl.$element.addClass('item-right-editable');

        //Don't bubble click up to main .item
        $element.on('click', stopPropagation);
      };
    }
  };
}]);

var ITEM_TPL_REORDER_BUTTON =
  '<div data-prevent-scroll="true" class="item-right-edit item-reorder enable-pointer-events">' +
  '</div>';

/**
* @ngdoc directive
* @name ionReorderButton
* @parent ionic.directive:ionItem
* @module ionic
* @restrict E
* Creates a reorder button inside a list item, that is visible when the
* {@link ionic.directive:ionList ionList parent's} `show-reorder` evaluates to true or
* `$ionicListDelegate.showReorder(true)` is called.
*
* Can be dragged to reorder items in the list. Takes any ionicon class.
*
* Note: Reordering works best when used with `ng-repeat`.  Be sure that all `ion-item` children of an `ion-list` are part of the same `ng-repeat` expression.
*
* When an item reorder is complete, the expression given in the `on-reorder` attribute is called. The `on-reorder` expression is given two locals that can be used: `$fromIndex` and `$toIndex`.  See below for an example.
*
* Look at {@link ionic.directive:ionList} for more examples.
*
* @usage
*
* ```html
* <ion-list ng-controller="MyCtrl" show-reorder="true">
*   <ion-item ng-repeat="item in items">
*     Item {{item}}
*     <ion-reorder-button class="ion-navicon"
*                         on-reorder="moveItem(item, $fromIndex, $toIndex)">
*     </ion-reorder-button>
*   </ion-item>
* </ion-list>
* ```
* ```js
* function MyCtrl($scope) {
*   $scope.items = [1, 2, 3, 4];
*   $scope.moveItem = function(item, fromIndex, toIndex) {
*     //Move the item in the array
*     $scope.items.splice(fromIndex, 1);
*     $scope.items.splice(toIndex, 0, item);
*   };
* }
* ```
*
* @param {expression=} on-reorder Expression to call when an item is reordered.
* Parameters given: $fromIndex, $toIndex.
*/
IonicModule
.directive('ionReorderButton', ['$parse', function($parse) {
  return {
    restrict: 'E',
    require: ['^ionItem', '^?ionList'],
    priority: Number.MAX_VALUE,
    compile: function($element, $attr) {
      $attr.$set('class', ($attr['class'] || '') + ' button icon button-icon', true);
      $element[0].setAttribute('data-prevent-scroll', true);
      return function($scope, $element, $attr, ctrls) {
        var itemCtrl = ctrls[0];
        var listCtrl = ctrls[1];
        var onReorderFn = $parse($attr.onReorder);

        $scope.$onReorder = function(oldIndex, newIndex) {
          onReorderFn($scope, {
            $fromIndex: oldIndex,
            $toIndex: newIndex
          });
        };

        // prevent clicks from bubbling up to the item
        if (!$attr.ngClick && !$attr.onClick && !$attr.onclick) {
          $element[0].onclick = function(e) {
            e.stopPropagation();
            return false;
          };
        }

        var container = jqLite(ITEM_TPL_REORDER_BUTTON);
        container.append($element);
        itemCtrl.$element.append(container).addClass('item-right-editable');

        if (listCtrl && listCtrl.showReorder()) {
          container.addClass('visible active');
        }
      };
    }
  };
}]);

/**
 * @ngdoc directive
 * @name keyboardAttach
 * @module ionic
 * @restrict A
 *
 * @description
 * keyboard-attach is an attribute directive which will cause an element to float above
 * the keyboard when the keyboard shows. Currently only supports the
 * [ion-footer-bar]({{ page.versionHref }}/api/directive/ionFooterBar/) directive.
 *
 * ### Notes
 * - This directive requires the
 * [Ionic Keyboard Plugin](https://github.com/driftyco/ionic-plugins-keyboard).
 * - On Android not in fullscreen mode, i.e. you have
 *   `<preference name="Fullscreen" value="false" />` or no preference in your `config.xml` file,
 *   this directive is unnecessary since it is the default behavior.
 * - On iOS, if there is an input in your footer, you will need to set
 *   `cordova.plugins.Keyboard.disableScroll(true)`.
 *
 * @usage
 *
 * ```html
 *  <ion-footer-bar align-title="left" keyboard-attach class="bar-assertive">
 *    <h1 class="title">Title!</h1>
 *  </ion-footer-bar>
 * ```
 */

IonicModule
.directive('keyboardAttach', function() {
  return function(scope, element) {
    ionic.on('native.keyboardshow', onShow, window);
    ionic.on('native.keyboardhide', onHide, window);

    //deprecated
    ionic.on('native.showkeyboard', onShow, window);
    ionic.on('native.hidekeyboard', onHide, window);


    var scrollCtrl;

    function onShow(e) {
      if (ionic.Platform.isAndroid() && !ionic.Platform.isFullScreen) {
        return;
      }

      //for testing
      var keyboardHeight = e.keyboardHeight || (e.detail && e.detail.keyboardHeight);
      element.css('bottom', keyboardHeight + "px");
      scrollCtrl = element.controller('$ionicScroll');
      if (scrollCtrl) {
        scrollCtrl.scrollView.__container.style.bottom = keyboardHeight + keyboardAttachGetClientHeight(element[0]) + "px";
      }
    }

    function onHide() {
      if (ionic.Platform.isAndroid() && !ionic.Platform.isFullScreen) {
        return;
      }

      element.css('bottom', '');
      if (scrollCtrl) {
        scrollCtrl.scrollView.__container.style.bottom = '';
      }
    }

    scope.$on('$destroy', function() {
      ionic.off('native.keyboardshow', onShow, window);
      ionic.off('native.keyboardhide', onHide, window);

      //deprecated
      ionic.off('native.showkeyboard', onShow, window);
      ionic.off('native.hidekeyboard', onHide, window);
    });
  };
});

function keyboardAttachGetClientHeight(element) {
  return element.clientHeight;
}

/**
* @ngdoc directive
* @name ionList
* @module ionic
* @delegate ionic.service:$ionicListDelegate
* @codepen JsHjf
* @restrict E
* @description
* The List is a widely used interface element in almost any mobile app, and can include
* content ranging from basic text all the way to buttons, toggles, icons, and thumbnails.
*
* Both the list, which contains items, and the list items themselves can be any HTML
* element. The containing element requires the `list` class and each list item requires
* the `item` class.
*
* However, using the ionList and ionItem directives make it easy to support various
* interaction modes such as swipe to edit, drag to reorder, and removing items.
*
* Related: {@link ionic.directive:ionItem}, {@link ionic.directive:ionOptionButton}
* {@link ionic.directive:ionReorderButton}, {@link ionic.directive:ionDeleteButton}, [`list CSS documentation`](/docs/components/#list).
*
* @usage
*
* Basic Usage:
*
* ```html
* <ion-list>
*   <ion-item ng-repeat="item in items">
*     {% raw %}Hello, {{item}}!{% endraw %}
*   </ion-item>
* </ion-list>
* ```
*
* Advanced Usage: Thumbnails, Delete buttons, Reordering, Swiping
*
* ```html
* <ion-list ng-controller="MyCtrl"
*           show-delete="shouldShowDelete"
*           show-reorder="shouldShowReorder"
*           can-swipe="listCanSwipe">
*   <ion-item ng-repeat="item in items"
*             class="item-thumbnail-left">
*
*     {% raw %}<img ng-src="{{item.img}}">
*     <h2>{{item.title}}</h2>
*     <p>{{item.description}}</p>{% endraw %}
*     <ion-option-button class="button-positive"
*                        ng-click="share(item)">
*       Share
*     </ion-option-button>
*     <ion-option-button class="button-info"
*                        ng-click="edit(item)">
*       Edit
*     </ion-option-button>
*     <ion-delete-button class="ion-minus-circled"
*                        ng-click="items.splice($index, 1)">
*     </ion-delete-button>
*     <ion-reorder-button class="ion-navicon"
*                         on-reorder="reorderItem(item, $fromIndex, $toIndex)">
*     </ion-reorder-button>
*
*   </ion-item>
* </ion-list>
* ```
*
*```javascript
* app.controller('MyCtrl', function($scope) {
*  $scope.shouldShowDelete = false;
*  $scope.shouldShowReorder = false;
*  $scope.listCanSwipe = true
* });
*```
*
* @param {string=} delegate-handle The handle used to identify this list with
* {@link ionic.service:$ionicListDelegate}.
* @param type {string=} The type of list to use (list-inset or card)
* @param show-delete {boolean=} Whether the delete buttons for the items in the list are
* currently shown or hidden.
* @param show-reorder {boolean=} Whether the reorder buttons for the items in the list are
* currently shown or hidden.
* @param can-swipe {boolean=} Whether the items in the list are allowed to be swiped to reveal
* option buttons. Default: true.
*/
IonicModule
.directive('ionList', [
  '$timeout',
function($timeout) {
  return {
    restrict: 'E',
    require: ['ionList', '^?$ionicScroll'],
    controller: '$ionicList',
    compile: function($element, $attr) {
      var listEl = jqLite('<div class="list">')
        .append($element.contents())
        .addClass($attr.type);

      $element.append(listEl);

      return function($scope, $element, $attrs, ctrls) {
        var listCtrl = ctrls[0];
        var scrollCtrl = ctrls[1];

        // Wait for child elements to render...
        $timeout(init);

        function init() {
          var listView = listCtrl.listView = new ionic.views.ListView({
            el: $element[0],
            listEl: $element.children()[0],
            scrollEl: scrollCtrl && scrollCtrl.element,
            scrollView: scrollCtrl && scrollCtrl.scrollView,
            onReorder: function(el, oldIndex, newIndex) {
              var itemScope = jqLite(el).scope();
              if (itemScope && itemScope.$onReorder) {
                // Make sure onReorder is called in apply cycle,
                // but also make sure it has no conflicts by doing
                // $evalAsync
                $timeout(function() {
                  itemScope.$onReorder(oldIndex, newIndex);
                });
              }
            },
            canSwipe: function() {
              return listCtrl.canSwipeItems();
            }
          });

          $scope.$on('$destroy', function() {
            if (listView) {
              listView.deregister && listView.deregister();
              listView = null;
            }
          });

          if (isDefined($attr.canSwipe)) {
            $scope.$watch('!!(' + $attr.canSwipe + ')', function(value) {
              listCtrl.canSwipeItems(value);
            });
          }
          if (isDefined($attr.showDelete)) {
            $scope.$watch('!!(' + $attr.showDelete + ')', function(value) {
              listCtrl.showDelete(value);
            });
          }
          if (isDefined($attr.showReorder)) {
            $scope.$watch('!!(' + $attr.showReorder + ')', function(value) {
              listCtrl.showReorder(value);
            });
          }

          $scope.$watch(function() {
            return listCtrl.showDelete();
          }, function(isShown, wasShown) {
            //Only use isShown=false if it was already shown
            if (!isShown && !wasShown) { return; }

            if (isShown) listCtrl.closeOptionButtons();
            listCtrl.canSwipeItems(!isShown);

            $element.children().toggleClass('list-left-editing', isShown);
            $element.toggleClass('disable-pointer-events', isShown);

            var deleteButton = jqLite($element[0].getElementsByClassName('item-delete'));
            setButtonShown(deleteButton, listCtrl.showDelete);
          });

          $scope.$watch(function() {
            return listCtrl.showReorder();
          }, function(isShown, wasShown) {
            //Only use isShown=false if it was already shown
            if (!isShown && !wasShown) { return; }

            if (isShown) listCtrl.closeOptionButtons();
            listCtrl.canSwipeItems(!isShown);

            $element.children().toggleClass('list-right-editing', isShown);
            $element.toggleClass('disable-pointer-events', isShown);

            var reorderButton = jqLite($element[0].getElementsByClassName('item-reorder'));
            setButtonShown(reorderButton, listCtrl.showReorder);
          });

          function setButtonShown(el, shown) {
            shown() && el.addClass('visible') || el.removeClass('active');
            ionic.requestAnimationFrame(function() {
              shown() && el.addClass('active') || el.removeClass('visible');
            });
          }
        }

      };
    }
  };
}]);

/**
 * @ngdoc directive
 * @name menuClose
 * @module ionic
 * @restrict AC
 *
 * @description
 * `menu-close` is an attribute directive that closes a currently opened side menu.
 * Note that by default, navigation transitions will not animate between views when
 * the menu is open. Additionally, this directive will reset the entering view's
 * history stack, making the new page the root of the history stack. This is done
 * to replicate the user experience seen in most side menu implementations, which is
 * to not show the back button at the root of the stack and show only the
 * menu button. We recommend that you also use the `enable-menu-with-back-views="false"`
 * {@link ionic.directive:ionSideMenus} attribute when using the menuClose directive.
 *
 * @usage
 * Below is an example of a link within a side menu. Tapping this link would
 * automatically close the currently opened menu.
 *
 * ```html
 * <a menu-close href="#/home" class="item">Home</a>
 * ```
 *
 * Note that if your destination state uses a resolve and that resolve asynchronously
 * takes longer than a standard transition (300ms), you'll need to set the
 * `nextViewOptions` manually as your resolve completes.
 *
 * ```js
 * $ionicHistory.nextViewOptions({
 *  historyRoot: true,
 *  disableAnimate: true,
 *  expire: 300
 * });
 * ```
 */
IonicModule
.directive('menuClose', ['$ionicHistory', '$timeout', function($ionicHistory, $timeout) {
  return {
    restrict: 'AC',
    link: function($scope, $element) {
      $element.bind('click', function() {
        var sideMenuCtrl = $element.inheritedData('$ionSideMenusController');
        if (sideMenuCtrl) {
          $ionicHistory.nextViewOptions({
            historyRoot: true,
            disableAnimate: true,
            expire: 300
          });
          // if no transition in 300ms, reset nextViewOptions
          // the expire should take care of it, but will be cancelled in some
          // cases. This directive is an exception to the rules of history.js
          $timeout( function() {
            $ionicHistory.nextViewOptions({
              historyRoot: false,
              disableAnimate: false
            });
          }, 300);
          sideMenuCtrl.close();
        }
      });
    }
  };
}]);

/**
 * @ngdoc directive
 * @name menuToggle
 * @module ionic
 * @restrict AC
 *
 * @description
 * Toggle a side menu on the given side.
 *
 * @usage
 * Below is an example of a link within a nav bar. Tapping this button
 * would open the given side menu, and tapping it again would close it.
 *
 * ```html
 * <ion-nav-bar>
 *   <ion-nav-buttons side="left">
 *    <!-- Toggle left side menu -->
 *    <button menu-toggle="left" class="button button-icon icon ion-navicon"></button>
 *   </ion-nav-buttons>
 *   <ion-nav-buttons side="right">
 *    <!-- Toggle right side menu -->
 *    <button menu-toggle="right" class="button button-icon icon ion-navicon"></button>
 *   </ion-nav-buttons>
 * </ion-nav-bar>
 * ```
 *
 * ### Button Hidden On Child Views
 * By default, the menu toggle button will only appear on a root
 * level side-menu page. Navigating in to child views will hide the menu-
 * toggle button. They can be made visible on child pages by setting the
 * enable-menu-with-back-views attribute of the {@link ionic.directive:ionSideMenus}
 * directive to true.
 *
 * ```html
 * <ion-side-menus enable-menu-with-back-views="true">
 * ```
 */
IonicModule
.directive('menuToggle', function() {
  return {
    restrict: 'AC',
    link: function($scope, $element, $attr) {
      $scope.$on('$ionicView.beforeEnter', function(ev, viewData) {
        if (viewData.enableBack) {
          var sideMenuCtrl = $element.inheritedData('$ionSideMenusController');
          if (!sideMenuCtrl.enableMenuWithBackViews()) {
            $element.addClass('hide');
          }
        } else {
          $element.removeClass('hide');
        }
      });

      $element.bind('click', function() {
        var sideMenuCtrl = $element.inheritedData('$ionSideMenusController');
        sideMenuCtrl && sideMenuCtrl.toggle($attr.menuToggle);
      });
    }
  };
});

/*
 * We don't document the ionModal directive, we instead document
 * the $ionicModal service
 */
IonicModule
.directive('ionModal', [function() {
  return {
    restrict: 'E',
    transclude: true,
    replace: true,
    controller: [function() {}],
    template: '<div class="modal-backdrop">' +
                '<div class="modal-backdrop-bg"></div>' +
                '<div class="modal-wrapper" ng-transclude></div>' +
              '</div>'
  };
}]);

IonicModule
.directive('ionModalView', function() {
  return {
    restrict: 'E',
    compile: function(element) {
      element.addClass('modal');
    }
  };
});

/**
 * @ngdoc directive
 * @name ionNavBackButton
 * @module ionic
 * @restrict E
 * @parent ionNavBar
 * @description
 * Creates a back button inside an {@link ionic.directive:ionNavBar}.
 *
 * The back button will appear when the user is able to go back in the current navigation stack. By
 * default, the markup of the back button is automatically built using platform-appropriate defaults
 * (iOS back button icon on iOS and Android icon on Android).
 *
 * Additionally, the button is automatically set to `$ionicGoBack()` on click/tap. By default, the
 * app will navigate back one view when the back button is clicked.  More advanced behavior is also
 * possible, as outlined below.
 *
 * @usage
 *
 * Recommended markup for default settings:
 *
 * ```html
 * <ion-nav-bar>
 *   <ion-nav-back-button>
 *   </ion-nav-back-button>
 * </ion-nav-bar>
 * ```
 *
 * With custom inner markup, and automatically adds a default click action:
 *
 * ```html
 * <ion-nav-bar>
 *   <ion-nav-back-button class="button-clear">
 *     <i class="ion-arrow-left-c"></i> Back
 *   </ion-nav-back-button>
 * </ion-nav-bar>
 * ```
 *
 * With custom inner markup and custom click action, using {@link ionic.service:$ionicHistory}:
 *
 * ```html
 * <ion-nav-bar ng-controller="MyCtrl">
 *   <ion-nav-back-button class="button-clear"
 *     ng-click="myGoBack()">
 *     <i class="ion-arrow-left-c"></i> Back
 *   </ion-nav-back-button>
 * </ion-nav-bar>
 * ```
 * ```js
 * function MyCtrl($scope, $ionicHistory) {
 *   $scope.myGoBack = function() {
 *     $ionicHistory.goBack();
 *   };
 * }
 * ```
 */
IonicModule
.directive('ionNavBackButton', ['$ionicConfig', '$document', function($ionicConfig, $document) {
  return {
    restrict: 'E',
    require: '^ionNavBar',
    compile: function(tElement, tAttrs) {

      // clone the back button, but as a <div>
      var buttonEle = $document[0].createElement('button');
      for (var n in tAttrs.$attr) {
        buttonEle.setAttribute(tAttrs.$attr[n], tAttrs[n]);
      }

      if (!tAttrs.ngClick) {
        buttonEle.setAttribute('ng-click', '$ionicGoBack()');
      }

      buttonEle.className = 'button back-button hide buttons ' + (tElement.attr('class') || '');
      buttonEle.innerHTML = tElement.html() || '';

      var childNode;
      var hasIcon = hasIconClass(tElement[0]);
      var hasInnerText;
      var hasButtonText;
      var hasPreviousTitle;

      for (var x = 0; x < tElement[0].childNodes.length; x++) {
        childNode = tElement[0].childNodes[x];
        if (childNode.nodeType === 1) {
          if (hasIconClass(childNode)) {
            hasIcon = true;
          } else if (childNode.classList.contains('default-title')) {
            hasButtonText = true;
          } else if (childNode.classList.contains('previous-title')) {
            hasPreviousTitle = true;
          }
        } else if (!hasInnerText && childNode.nodeType === 3) {
          hasInnerText = !!childNode.nodeValue.trim();
        }
      }

      function hasIconClass(ele) {
        return /ion-|icon/.test(ele.className);
      }

      var defaultIcon = $ionicConfig.backButton.icon();
      if (!hasIcon && defaultIcon && defaultIcon !== 'none') {
        buttonEle.innerHTML = '<i class="icon ' + defaultIcon + '"></i> ' + buttonEle.innerHTML;
        buttonEle.className += ' button-clear';
      }

      if (!hasInnerText) {
        var buttonTextEle = $document[0].createElement('span');
        buttonTextEle.className = 'back-text';

        if (!hasButtonText && $ionicConfig.backButton.text()) {
          buttonTextEle.innerHTML += '<span class="default-title">' + $ionicConfig.backButton.text() + '</span>';
        }
        if (!hasPreviousTitle && $ionicConfig.backButton.previousTitleText()) {
          buttonTextEle.innerHTML += '<span class="previous-title"></span>';
        }
        buttonEle.appendChild(buttonTextEle);

      }

      tElement.attr('class', 'hide');
      tElement.empty();

      return {
        pre: function($scope, $element, $attr, navBarCtrl) {
          // only register the plain HTML, the navBarCtrl takes care of scope/compile/link
          navBarCtrl.navElement('backButton', buttonEle.outerHTML);
          buttonEle = null;
        }
      };
    }
  };
}]);


/**
 * @ngdoc directive
 * @name ionNavBar
 * @module ionic
 * @delegate ionic.service:$ionicNavBarDelegate
 * @restrict E
 *
 * @description
 * If we have an {@link ionic.directive:ionNavView} directive, we can also create an
 * `<ion-nav-bar>`, which will create a topbar that updates as the application state changes.
 *
 * We can add a back button by putting an {@link ionic.directive:ionNavBackButton} inside.
 *
 * We can add buttons depending on the currently visible view using
 * {@link ionic.directive:ionNavButtons}.
 *
 * Note that the ion-nav-bar element will only work correctly if your content has an
 * ionView around it.
 *
 * @usage
 *
 * ```html
 * <body ng-app="starter">
 *   <!-- The nav bar that will be updated as we navigate -->
 *   <ion-nav-bar class="bar-positive">
 *   </ion-nav-bar>
 *
 *   <!-- where the initial view template will be rendered -->
 *   <ion-nav-view>
 *     <ion-view>
 *       <ion-content>Hello!</ion-content>
 *     </ion-view>
 *   </ion-nav-view>
 * </body>
 * ```
 *
 * @param {string=} delegate-handle The handle used to identify this navBar
 * with {@link ionic.service:$ionicNavBarDelegate}.
 * @param align-title {string=} Where to align the title of the navbar.
 * Available: 'left', 'right', 'center'. Defaults to 'center'.
 * @param {boolean=} no-tap-scroll By default, the navbar will scroll the content
 * to the top when tapped.  Set no-tap-scroll to true to disable this behavior.
 *
 * </table><br/>
 */
IonicModule
.directive('ionNavBar', function() {
  return {
    restrict: 'E',
    controller: '$ionicNavBar',
    scope: true,
    link: function($scope, $element, $attr, ctrl) {
      ctrl.init();
    }
  };
});


/**
 * @ngdoc directive
 * @name ionNavButtons
 * @module ionic
 * @restrict E
 * @parent ionNavView
 *
 * @description
 * Use nav buttons to set the buttons on your {@link ionic.directive:ionNavBar}
 * from within an {@link ionic.directive:ionView}. This gives each
 * view template the ability to specify which buttons should show in the nav bar,
 * overriding any default buttons already placed in the nav bar.
 *
 * Any buttons you declare will be positioned on the navbar's corresponding side. Primary
 * buttons generally map to the left side of the header, and secondary buttons are
 * generally on the right side. However, their exact locations are platform-specific.
 * For example, in iOS, the primary buttons are on the far left of the header, and
 * secondary buttons are on the far right, with the header title centered between them.
 * For Android, however, both groups of buttons are on the far right of the header,
 * with the header title aligned left.
 *
 * We recommend always using `primary` and `secondary`, so the buttons correctly map
 * to the side familiar to users of each platform. However, in cases where buttons should
 * always be on an exact side, both `left` and `right` sides are still available. For
 * example, a toggle button for a left side menu should be on the left side; in this case,
 * we'd recommend using `side="left"`, so it's always on the left, no matter the platform.
 *
 * ***Note*** that `ion-nav-buttons` must be immediate descendants of the `ion-view` or
 * `ion-nav-bar` element (basically, don't wrap it in another div).
 *
 * @usage
 * ```html
 * <ion-nav-bar>
 * </ion-nav-bar>
 * <ion-nav-view>
 *   <ion-view>
 *     <ion-nav-buttons side="primary">
 *       <button class="button" ng-click="doSomething()">
 *         I'm a button on the primary of the navbar!
 *       </button>
 *     </ion-nav-buttons>
 *     <ion-content>
 *       Some super content here!
 *     </ion-content>
 *   </ion-view>
 * </ion-nav-view>
 * ```
 *
 * @param {string} side The side to place the buttons in the
 * {@link ionic.directive:ionNavBar}. Available sides: `primary`, `secondary`, `left`, and `right`.
 */
IonicModule
.directive('ionNavButtons', ['$document', function($document) {
  return {
    require: '^ionNavBar',
    restrict: 'E',
    compile: function(tElement, tAttrs) {
      var side = 'left';

      if (/^primary|secondary|right$/i.test(tAttrs.side || '')) {
        side = tAttrs.side.toLowerCase();
      }

      var spanEle = $document[0].createElement('span');
      spanEle.className = side + '-buttons';
      spanEle.innerHTML = tElement.html();

      var navElementType = side + 'Buttons';

      tElement.attr('class', 'hide');
      tElement.empty();

      return {
        pre: function($scope, $element, $attrs, navBarCtrl) {
          // only register the plain HTML, the navBarCtrl takes care of scope/compile/link

          var parentViewCtrl = $element.parent().data('$ionViewController');
          if (parentViewCtrl) {
            // if the parent is an ion-view, then these are ion-nav-buttons for JUST this ion-view
            parentViewCtrl.navElement(navElementType, spanEle.outerHTML);

          } else {
            // these are buttons for all views that do not have their own ion-nav-buttons
            navBarCtrl.navElement(navElementType, spanEle.outerHTML);
          }

          spanEle = null;
        }
      };
    }
  };
}]);

/**
 * @ngdoc directive
 * @name navDirection
 * @module ionic
 * @restrict A
 *
 * @description
 * The direction which the nav view transition should animate. Available options
 * are: `forward`, `back`, `enter`, `exit`, `swap`.
 *
 * @usage
 *
 * ```html
 * <a nav-direction="forward" href="#/home">Home</a>
 * ```
 */
IonicModule
.directive('navDirection', ['$ionicViewSwitcher', function($ionicViewSwitcher) {
  return {
    restrict: 'A',
    priority: 1000,
    link: function($scope, $element, $attr) {
      $element.bind('click', function() {
        $ionicViewSwitcher.nextDirection($attr.navDirection);
      });
    }
  };
}]);

/**
 * @ngdoc directive
 * @name ionNavTitle
 * @module ionic
 * @restrict E
 * @parent ionNavView
 *
 * @description
 *
 * The nav title directive replaces an {@link ionic.directive:ionNavBar} title text with
 * custom HTML from within an {@link ionic.directive:ionView} template. This gives each
 * view the ability to specify its own custom title element, such as an image or any HTML,
 * rather than being text-only. Alternatively, text-only titles can be updated using the
 * `view-title` {@link ionic.directive:ionView} attribute.
 *
 * Note that `ion-nav-title` must be an immediate descendant of the `ion-view` or
 * `ion-nav-bar` element (basically don't wrap it in another div).
 *
 * @usage
 * ```html
 * <ion-nav-bar>
 * </ion-nav-bar>
 * <ion-nav-view>
 *   <ion-view>
 *     <ion-nav-title>
 *       <img src="logo.svg">
 *     </ion-nav-title>
 *     <ion-content>
 *       Some super content here!
 *     </ion-content>
 *   </ion-view>
 * </ion-nav-view>
 * ```
 *
 */
IonicModule
.directive('ionNavTitle', ['$document', function($document) {
  return {
    require: '^ionNavBar',
    restrict: 'E',
    compile: function(tElement, tAttrs) {
      var navElementType = 'title';
      var spanEle = $document[0].createElement('span');
      for (var n in tAttrs.$attr) {
        spanEle.setAttribute(tAttrs.$attr[n], tAttrs[n]);
      }
      spanEle.classList.add('nav-bar-title');
      spanEle.innerHTML = tElement.html();

      tElement.attr('class', 'hide');
      tElement.empty();

      return {
        pre: function($scope, $element, $attrs, navBarCtrl) {
          // only register the plain HTML, the navBarCtrl takes care of scope/compile/link

          var parentViewCtrl = $element.parent().data('$ionViewController');
          if (parentViewCtrl) {
            // if the parent is an ion-view, then these are ion-nav-buttons for JUST this ion-view
            parentViewCtrl.navElement(navElementType, spanEle.outerHTML);

          } else {
            // these are buttons for all views that do not have their own ion-nav-buttons
            navBarCtrl.navElement(navElementType, spanEle.outerHTML);
          }

          spanEle = null;
        }
      };
    }
  };
}]);

/**
 * @ngdoc directive
 * @name navTransition
 * @module ionic
 * @restrict A
 *
 * @description
 * The transition type which the nav view transition should use when it animates.
 * Current, options are `ios`, `android`, and `none`. More options coming soon.
 *
 * @usage
 *
 * ```html
 * <a nav-transition="none" href="#/home">Home</a>
 * ```
 */
IonicModule
.directive('navTransition', ['$ionicViewSwitcher', function($ionicViewSwitcher) {
  return {
    restrict: 'A',
    priority: 1000,
    link: function($scope, $element, $attr) {
      $element.bind('click', function() {
        $ionicViewSwitcher.nextTransition($attr.navTransition);
      });
    }
  };
}]);

/**
 * @ngdoc directive
 * @name ionNavView
 * @module ionic
 * @restrict E
 * @codepen odqCz
 *
 * @description
 * As a user navigates throughout your app, Ionic is able to keep track of their
 * navigation history. By knowing their history, transitions between views
 * correctly enter and exit using the platform's transition style. An additional
 * benefit to Ionic's navigation system is its ability to manage multiple
 * histories. For example, each tab can have it's own navigation history stack.
 *
 * Ionic uses the AngularUI Router module so app interfaces can be organized
 * into various "states". Like Angular's core $route service, URLs can be used
 * to control the views. However, the AngularUI Router provides a more powerful
 * state manager in that states are bound to named, nested, and parallel views,
 * allowing more than one template to be rendered on the same page.
 * Additionally, each state is not required to be bound to a URL, and data can
 * be pushed to each state which allows much flexibility.
 *
 * The ionNavView directive is used to render templates in your application. Each template
 * is part of a state. States are usually mapped to a url, and are defined programatically
 * using angular-ui-router (see [their docs](https://github.com/angular-ui/ui-router/wiki),
 * and remember to replace ui-view with ion-nav-view in examples).
 *
 * @usage
 * In this example, we will create a navigation view that contains our different states for the app.
 *
 * To do this, in our markup we use ionNavView top level directive. To display a header bar we use
 * the {@link ionic.directive:ionNavBar} directive that updates as we navigate through the
 * navigation stack.
 *
 * Next, we need to setup our states that will be rendered.
 *
 * ```js
 * var app = angular.module('myApp', ['ionic']);
 * app.config(function($stateProvider) {
 *   $stateProvider
 *   .state('index', {
 *     url: '/',
 *     templateUrl: 'home.html'
 *   })
 *   .state('music', {
 *     url: '/music',
 *     templateUrl: 'music.html'
 *   });
 * });
 * ```
 * Then on app start, $stateProvider will look at the url, see if it matches the index state,
 * and then try to load home.html into the `<ion-nav-view>`.
 *
 * Pages are loaded by the URLs given. One simple way to create templates in Angular is to put
 * them directly into your HTML file and use the `<script type="text/ng-template">` syntax.
 * So here is one way to put home.html into our app:
 *
 * ```html
 * <script id="home" type="text/ng-template">
 *   <!-- The title of the ion-view will be shown on the navbar -->
 *   <ion-view view-title="Home">
 *     <ion-content ng-controller="HomeCtrl">
 *       <!-- The content of the page -->
 *       <a href="#/music">Go to music page!</a>
 *     </ion-content>
 *   </ion-view>
 * </script>
 * ```
 *
 * This is good to do because the template will be cached for very fast loading, instead of
 * having to fetch them from the network.
 *
 * ## Caching
 *
 * By default, views are cached to improve performance. When a view is navigated away from, its
 * element is left in the DOM, and its scope is disconnected from the `$watch` cycle. When
 * navigating to a view that is already cached, its scope is then reconnected, and the existing
 * element that was left in the DOM becomes the active view. This also allows for the scroll
 * position of previous views to be maintained.
 *
 * Caching can be disabled and enabled in multiple ways. By default, Ionic will cache a maximum of
 * 10 views, and not only can this be configured, but apps can also explicitly state which views
 * should and should not be cached.
 *
 * Note that because we are caching these views, *we aren’t destroying scopes*. Instead, scopes
 * are being disconnected from the watch cycle. Because scopes are not being destroyed and
 * recreated, controllers are not loading again on a subsequent viewing. If the app/controller
 * needs to know when a view has entered or has left, then view events emitted from the
 * {@link ionic.directive:ionView} scope, such as `$ionicView.enter`, may be useful.
 *
 * By default, when navigating back in the history, the "forward" views are removed from the cache.
 * If you navigate forward to the same view again, it'll create a new DOM element and controller
 * instance. Basically, any forward views are reset each time. This can be configured using the
 * {@link ionic.provider:$ionicConfigProvider}:
 *
 * ```js
 * $ionicConfigProvider.views.forwardCache(true);
 * ```
 *
 * #### Disable cache globally
 *
 * The {@link ionic.provider:$ionicConfigProvider} can be used to set the maximum allowable views
 * which can be cached, but this can also be use to disable all caching by setting it to 0.
 *
 * ```js
 * $ionicConfigProvider.views.maxCache(0);
 * ```
 *
 * #### Disable cache within state provider
 *
 * ```js
 * $stateProvider.state('myState', {
 *    cache: false,
 *    url : '/myUrl',
 *    templateUrl : 'my-template.html'
 * })
 * ```
 *
 * #### Disable cache with an attribute
 *
 * ```html
 * <ion-view cache-view="false" view-title="My Title!">
 *   ...
 * </ion-view>
 * ```
 *
 *
 * ## AngularUI Router
 *
 * Please visit [AngularUI Router's docs](https://github.com/angular-ui/ui-router/wiki) for
 * more info. Below is a great video by the AngularUI Router team that may help to explain
 * how it all works:
 *
 * <iframe width="560" height="315" src="//www.youtube.com/embed/dqJRoh8MnBo"
 * frameborder="0" allowfullscreen></iframe>
 *
 * Note: We do not recommend using [resolve](https://github.com/angular-ui/ui-router/wiki#resolve)
 * of AngularUI Router. The recommended approach is to execute any logic needed before beginning the state transition.
 *
 * @param {string=} name A view name. The name should be unique amongst the other views in the
 * same state. You can have views of the same name that live in different states. For more
 * information, see ui-router's
 * [ui-view documentation](http://angular-ui.github.io/ui-router/site/#/api/ui.router.state.directive:ui-view).
 */
IonicModule
.directive('ionNavView', [
  '$state',
  '$ionicConfig',
function($state, $ionicConfig) {
  // IONIC's fork of Angular UI Router, v0.2.10
  // the navView handles registering views in the history and how to transition between them
  return {
    restrict: 'E',
    terminal: true,
    priority: 2000,
    transclude: true,
    controller: '$ionicNavView',
    compile: function(tElement, tAttrs, transclude) {

      // a nav view element is a container for numerous views
      tElement.addClass('view-container');
      ionic.DomUtil.cachedAttr(tElement, 'nav-view-transition', $ionicConfig.views.transition());

      return function($scope, $element, $attr, navViewCtrl) {
        var latestLocals;

        // Put in the compiled initial view
        transclude($scope, function(clone) {
          $element.append(clone);
        });

        var viewData = navViewCtrl.init();

        // listen for $stateChangeSuccess
        $scope.$on('$stateChangeSuccess', function() {
          updateView(false);
        });
        $scope.$on('$viewContentLoading', function() {
          updateView(false);
        });

        // initial load, ready go
        updateView(true);


        function updateView(firstTime) {
          // get the current local according to the $state
          var viewLocals = $state.$current && $state.$current.locals[viewData.name];

          // do not update THIS nav-view if its is not the container for the given state
          // if the viewLocals are the same as THIS latestLocals, then nothing to do
          if (!viewLocals || (!firstTime && viewLocals === latestLocals)) return;

          // update the latestLocals
          latestLocals = viewLocals;
          viewData.state = viewLocals.$$state;

          // register, update and transition to the new view
          navViewCtrl.register(viewLocals);
        }

      };
    }
  };
}]);

IonicModule

.config(['$provide', function($provide) {
  $provide.decorator('ngClickDirective', ['$delegate', function($delegate) {
    // drop the default ngClick directive
    $delegate.shift();
    return $delegate;
  }]);
}])

/**
 * @private
 */
.factory('$ionicNgClick', ['$parse', function($parse) {
  return function(scope, element, clickExpr) {
    var clickHandler = angular.isFunction(clickExpr) ?
      clickExpr :
      $parse(clickExpr);

    element.on('click', function(event) {
      scope.$apply(function() {
        clickHandler(scope, {$event: (event)});
      });
    });

    // Hack for iOS Safari's benefit. It goes searching for onclick handlers and is liable to click
    // something else nearby.
    element.onclick = noop;
  };
}])

.directive('ngClick', ['$ionicNgClick', function($ionicNgClick) {
  return function(scope, element, attr) {
    $ionicNgClick(scope, element, attr.ngClick);
  };
}])

.directive('ionStopEvent', function() {
  return {
    restrict: 'A',
    link: function(scope, element, attr) {
      element.bind(attr.ionStopEvent, eventStopPropagation);
    }
  };
});
function eventStopPropagation(e) {
  e.stopPropagation();
}


/**
 * @ngdoc directive
 * @name ionPane
 * @module ionic
 * @restrict E
 *
 * @description A simple container that fits content, with no side effects.  Adds the 'pane' class to the element.
 */
IonicModule
.directive('ionPane', function() {
  return {
    restrict: 'E',
    link: function(scope, element) {
      element.addClass('pane');
    }
  };
});

/*
 * We don't document the ionPopover directive, we instead document
 * the $ionicPopover service
 */
IonicModule
.directive('ionPopover', [function() {
  return {
    restrict: 'E',
    transclude: true,
    replace: true,
    controller: [function() {}],
    template: '<div class="popover-backdrop">' +
                '<div class="popover-wrapper" ng-transclude></div>' +
              '</div>'
  };
}]);

IonicModule
.directive('ionPopoverView', function() {
  return {
    restrict: 'E',
    compile: function(element) {
      element.append(jqLite('<div class="popover-arrow">'));
      element.addClass('popover');
    }
  };
});

/**
 * @ngdoc directive
 * @name ionRadio
 * @module ionic
 * @restrict E
 * @codepen saoBG
 * @description
 * The radio directive is no different than the HTML radio input, except it's styled differently.
 *
 * Radio behaves like [AngularJS radio](http://docs.angularjs.org/api/ng/input/input[radio]).
 *
 * @usage
 * ```html
 * <ion-radio ng-model="choice" ng-value="'A'">Choose A</ion-radio>
 * <ion-radio ng-model="choice" ng-value="'B'">Choose B</ion-radio>
 * <ion-radio ng-model="choice" ng-value="'C'">Choose C</ion-radio>
 * ```
 *
 * @param {string=} name The name of the radio input.
 * @param {expression=} value The value of the radio input.
 * @param {boolean=} disabled The state of the radio input.
 * @param {string=} icon The icon to use when the radio input is selected.
 * @param {expression=} ng-value Angular equivalent of the value attribute.
 * @param {expression=} ng-model The angular model for the radio input.
 * @param {boolean=} ng-disabled Angular equivalent of the disabled attribute.
 * @param {expression=} ng-change Triggers given expression when radio input's model changes
 */
IonicModule
.directive('ionRadio', function() {
  return {
    restrict: 'E',
    replace: true,
    require: '?ngModel',
    transclude: true,
    template:
      '<label class="item item-radio">' +
        '<input type="radio" name="radio-group">' +
        '<div class="radio-content">' +
          '<div class="item-content disable-pointer-events" ng-transclude></div>' +
          '<i class="radio-icon disable-pointer-events icon ion-checkmark"></i>' +
        '</div>' +
      '</label>',

    compile: function(element, attr) {
      if (attr.icon) {
        var iconElm = element.find('i');
        iconElm.removeClass('ion-checkmark').addClass(attr.icon);
      }

      var input = element.find('input');
      forEach({
          'name': attr.name,
          'value': attr.value,
          'disabled': attr.disabled,
          'ng-value': attr.ngValue,
          'ng-model': attr.ngModel,
          'ng-disabled': attr.ngDisabled,
          'ng-change': attr.ngChange,
          'ng-required': attr.ngRequired,
          'required': attr.required
      }, function(value, name) {
        if (isDefined(value)) {
            input.attr(name, value);
          }
      });

      return function(scope, element, attr) {
        scope.getValue = function() {
          return scope.ngValue || attr.value;
        };
      };
    }
  };
});


/**
 * @ngdoc directive
 * @name ionRefresher
 * @module ionic
 * @restrict E
 * @parent ionic.directive:ionContent, ionic.directive:ionScroll
 * @description
 * Allows you to add pull-to-refresh to a scrollView.
 *
 * Place it as the first child of your {@link ionic.directive:ionContent} or
 * {@link ionic.directive:ionScroll} element.
 *
 * When refreshing is complete, $broadcast the 'scroll.refreshComplete' event
 * from your controller.
 *
 * @usage
 *
 * ```html
 * <ion-content ng-controller="MyController">
 *   <ion-refresher
 *     pulling-text="Pull to refresh..."
 *     on-refresh="doRefresh()">
 *   </ion-refresher>
 *   <ion-list>
 *     <ion-item ng-repeat="item in items"></ion-item>
 *   </ion-list>
 * </ion-content>
 * ```
 * ```js
 * angular.module('testApp', ['ionic'])
 * .controller('MyController', function($scope, $http) {
 *   $scope.items = [1,2,3];
 *   $scope.doRefresh = function() {
 *     $http.get('/new-items')
 *      .success(function(newItems) {
 *        $scope.items = newItems;
 *      })
 *      .finally(function() {
 *        // Stop the ion-refresher from spinning
 *        $scope.$broadcast('scroll.refreshComplete');
 *      });
 *   };
 * });
 * ```
 *
 * @param {expression=} on-refresh Called when the user pulls down enough and lets go
 * of the refresher.
 * @param {expression=} on-pulling Called when the user starts to pull down
 * on the refresher.
 * @param {string=} pulling-text The text to display while the user is pulling down.
 * @param {string=} pulling-icon The icon to display while the user is pulling down.
 * Default: 'ion-android-arrow-down'.
 * @param {string=} spinner The {@link ionic.directive:ionSpinner} icon to display
 * after user lets go of the refresher. The SVG {@link ionic.directive:ionSpinner}
 * is now the default, replacing rotating font icons. Set to `none` to disable both the
 * spinner and the icon.
 * @param {string=} refreshing-icon The font icon to display after user lets go of the
 * refresher. This is deprecated in favor of the SVG {@link ionic.directive:ionSpinner}.
 * @param {boolean=} disable-pulling-rotation Disables the rotation animation of the pulling
 * icon when it reaches its activated threshold. To be used with a custom `pulling-icon`.
 *
 */
IonicModule
.directive('ionRefresher', [function() {
  return {
    restrict: 'E',
    replace: true,
    require: ['?^$ionicScroll', 'ionRefresher'],
    controller: '$ionicRefresher',
    template:
    '<div class="scroll-refresher invisible" collection-repeat-ignore>' +
      '<div class="ionic-refresher-content" ' +
      'ng-class="{\'ionic-refresher-with-text\': pullingText || refreshingText}">' +
        '<div class="icon-pulling" ng-class="{\'pulling-rotation-disabled\':disablePullingRotation}">' +
          '<i class="icon {{pullingIcon}}"></i>' +
        '</div>' +
        '<div class="text-pulling" ng-bind-html="pullingText"></div>' +
        '<div class="icon-refreshing">' +
          '<ion-spinner ng-if="showSpinner" icon="{{spinner}}"></ion-spinner>' +
          '<i ng-if="showIcon" class="icon {{refreshingIcon}}"></i>' +
        '</div>' +
        '<div class="text-refreshing" ng-bind-html="refreshingText"></div>' +
      '</div>' +
    '</div>',
    link: function($scope, $element, $attrs, ctrls) {

      // JS Scrolling uses the scroll controller
      var scrollCtrl = ctrls[0],
          refresherCtrl = ctrls[1];
      if (!scrollCtrl || scrollCtrl.isNative()) {
        // Kick off native scrolling
        refresherCtrl.init();
      } else {
        $element[0].classList.add('js-scrolling');
        scrollCtrl._setRefresher(
          $scope,
          $element[0],
          refresherCtrl.getRefresherDomMethods()
        );

        $scope.$on('scroll.refreshComplete', function() {
          $scope.$evalAsync(function() {
            scrollCtrl.scrollView.finishPullToRefresh();
          });
        });
      }

    }
  };
}]);

/**
 * @ngdoc directive
 * @name ionScroll
 * @module ionic
 * @delegate ionic.service:$ionicScrollDelegate
 * @codepen mwFuh
 * @restrict E
 *
 * @description
 * Creates a scrollable container for all content inside.
 *
 * @usage
 *
 * Basic usage:
 *
 * ```html
 * <ion-scroll zooming="true" direction="xy" style="width: 500px; height: 500px">
 *   <div style="width: 5000px; height: 5000px; background: url('https://upload.wikimedia.org/wikipedia/commons/a/ad/Europe_geological_map-en.jpg') repeat"></div>
 *  </ion-scroll>
 * ```
 *
 * Note that it's important to set the height of the scroll box as well as the height of the inner
 * content to enable scrolling. This makes it possible to have full control over scrollable areas.
 *
 * If you'd just like to have a center content scrolling area, use {@link ionic.directive:ionContent} instead.
 *
 * @param {string=} delegate-handle The handle used to identify this scrollView
 * with {@link ionic.service:$ionicScrollDelegate}.
 * @param {string=} direction Which way to scroll. 'x' or 'y' or 'xy'. Default 'y'.
 * @param {boolean=} locking Whether to lock scrolling in one direction at a time. Useful to set to false when zoomed in or scrolling in two directions. Default true.
 * @param {boolean=} paging Whether to scroll with paging.
 * @param {expression=} on-refresh Called on pull-to-refresh, triggered by an {@link ionic.directive:ionRefresher}.
 * @param {expression=} on-scroll Called whenever the user scrolls.
 * @param {boolean=} scrollbar-x Whether to show the horizontal scrollbar. Default true.
 * @param {boolean=} scrollbar-y Whether to show the vertical scrollbar. Default true.
 * @param {boolean=} zooming Whether to support pinch-to-zoom
 * @param {integer=} min-zoom The smallest zoom amount allowed (default is 0.5)
 * @param {integer=} max-zoom The largest zoom amount allowed (default is 3)
 * @param {boolean=} has-bouncing Whether to allow scrolling to bounce past the edges
 * of the content.  Defaults to true on iOS, false on Android.
 */
IonicModule
.directive('ionScroll', [
  '$timeout',
  '$controller',
  '$ionicBind',
  '$ionicConfig',
function($timeout, $controller, $ionicBind, $ionicConfig) {
  return {
    restrict: 'E',
    scope: true,
    controller: function() {},
    compile: function(element, attr) {
      element.addClass('scroll-view ionic-scroll');

      //We cannot transclude here because it breaks element.data() inheritance on compile
      var innerElement = jqLite('<div class="scroll"></div>');
      innerElement.append(element.contents());
      element.append(innerElement);

      var nativeScrolling = attr.overflowScroll !== "false" && (attr.overflowScroll === "true" || !$ionicConfig.scrolling.jsScrolling());

      return { pre: prelink };
      function prelink($scope, $element, $attr) {
        $ionicBind($scope, $attr, {
          direction: '@',
          paging: '@',
          $onScroll: '&onScroll',
          scroll: '@',
          scrollbarX: '@',
          scrollbarY: '@',
          zooming: '@',
          minZoom: '@',
          maxZoom: '@'
        });
        $scope.direction = $scope.direction || 'y';

        if (isDefined($attr.padding)) {
          $scope.$watch($attr.padding, function(newVal) {
            innerElement.toggleClass('padding', !!newVal);
          });
        }
        if ($scope.$eval($scope.paging) === true) {
          innerElement.addClass('scroll-paging');
        }

        if (!$scope.direction) { $scope.direction = 'y'; }
        var isPaging = $scope.$eval($scope.paging) === true;

        if (nativeScrolling) {
          $element.addClass('overflow-scroll');
        }

        $element.addClass('scroll-' + $scope.direction);

        var scrollViewOptions = {
          el: $element[0],
          delegateHandle: $attr.delegateHandle,
          locking: ($attr.locking || 'true') === 'true',
          bouncing: $scope.$eval($attr.hasBouncing),
          paging: isPaging,
          scrollbarX: $scope.$eval($scope.scrollbarX) !== false,
          scrollbarY: $scope.$eval($scope.scrollbarY) !== false,
          scrollingX: $scope.direction.indexOf('x') >= 0,
          scrollingY: $scope.direction.indexOf('y') >= 0,
          zooming: $scope.$eval($scope.zooming) === true,
          maxZoom: $scope.$eval($scope.maxZoom) || 3,
          minZoom: $scope.$eval($scope.minZoom) || 0.5,
          preventDefault: true,
          nativeScrolling: nativeScrolling
        };

        if (isPaging) {
          scrollViewOptions.speedMultiplier = 0.8;
          scrollViewOptions.bouncing = false;
        }

        $controller('$ionicScroll', {
          $scope: $scope,
          scrollViewOptions: scrollViewOptions
        });
      }
    }
  };
}]);

/**
 * @ngdoc directive
 * @name ionSideMenu
 * @module ionic
 * @restrict E
 * @parent ionic.directive:ionSideMenus
 *
 * @description
 * A container for a side menu, sibling to an {@link ionic.directive:ionSideMenuContent} directive.
 *
 * @usage
 * ```html
 * <ion-side-menu
 *   side="left"
 *   width="myWidthValue + 20"
 *   is-enabled="shouldLeftSideMenuBeEnabled()">
 * </ion-side-menu>
 * ```
 * For a complete side menu example, see the
 * {@link ionic.directive:ionSideMenus} documentation.
 *
 * @param {string} side Which side the side menu is currently on.  Allowed values: 'left' or 'right'.
 * @param {boolean=} is-enabled Whether this side menu is enabled.
 * @param {number=} width How many pixels wide the side menu should be.  Defaults to 275.
 */
IonicModule
.directive('ionSideMenu', function() {
  return {
    restrict: 'E',
    require: '^ionSideMenus',
    scope: true,
    compile: function(element, attr) {
      angular.isUndefined(attr.isEnabled) && attr.$set('isEnabled', 'true');
      angular.isUndefined(attr.width) && attr.$set('width', '275');

      element.addClass('menu menu-' + attr.side);

      return function($scope, $element, $attr, sideMenuCtrl) {
        $scope.side = $attr.side || 'left';

        var sideMenu = sideMenuCtrl[$scope.side] = new ionic.views.SideMenu({
          width: attr.width,
          el: $element[0],
          isEnabled: true
        });

        $scope.$watch($attr.width, function(val) {
          var numberVal = +val;
          if (numberVal && numberVal == val) {
            sideMenu.setWidth(+val);
          }
        });
        $scope.$watch($attr.isEnabled, function(val) {
          sideMenu.setIsEnabled(!!val);
        });
      };
    }
  };
});


/**
 * @ngdoc directive
 * @name ionSideMenuContent
 * @module ionic
 * @restrict E
 * @parent ionic.directive:ionSideMenus
 *
 * @description
 * A container for the main visible content, sibling to one or more
 * {@link ionic.directive:ionSideMenu} directives.
 *
 * @usage
 * ```html
 * <ion-side-menu-content
 *   edge-drag-threshold="true"
 *   drag-content="true">
 * </ion-side-menu-content>
 * ```
 * For a complete side menu example, see the
 * {@link ionic.directive:ionSideMenus} documentation.
 *
 * @param {boolean=} drag-content Whether the content can be dragged. Default true.
 * @param {boolean|number=} edge-drag-threshold Whether the content drag can only start if it is below a certain threshold distance from the edge of the screen.  Default false. Accepts three types of values:
   *  - If a non-zero number is given, that many pixels is used as the maximum allowed distance from the edge that starts dragging the side menu.
   *  - If true is given, the default number of pixels (25) is used as the maximum allowed distance.
   *  - If false or 0 is given, the edge drag threshold is disabled, and dragging from anywhere on the content is allowed.
 *
 */
IonicModule
.directive('ionSideMenuContent', [
  '$timeout',
  '$ionicGesture',
  '$window',
function($timeout, $ionicGesture, $window) {

  return {
    restrict: 'EA', //DEPRECATED 'A'
    require: '^ionSideMenus',
    scope: true,
    compile: function(element, attr) {
      element.addClass('menu-content pane');

      return { pre: prelink };
      function prelink($scope, $element, $attr, sideMenuCtrl) {
        var startCoord = null;
        var primaryScrollAxis = null;

        if (isDefined(attr.dragContent)) {
          $scope.$watch(attr.dragContent, function(value) {
            sideMenuCtrl.canDragContent(value);
          });
        } else {
          sideMenuCtrl.canDragContent(true);
        }

        if (isDefined(attr.edgeDragThreshold)) {
          $scope.$watch(attr.edgeDragThreshold, function(value) {
            sideMenuCtrl.edgeDragThreshold(value);
          });
        }

        // Listen for taps on the content to close the menu
        function onContentTap(gestureEvt) {
          if (sideMenuCtrl.getOpenAmount() !== 0) {
            sideMenuCtrl.close();
            gestureEvt.gesture.srcEvent.preventDefault();
            startCoord = null;
            primaryScrollAxis = null;
          } else if (!startCoord) {
            startCoord = ionic.tap.pointerCoord(gestureEvt.gesture.srcEvent);
          }
        }

        function onDragX(e) {
          if (!sideMenuCtrl.isDraggableTarget(e)) return;

          if (getPrimaryScrollAxis(e) == 'x') {
            sideMenuCtrl._handleDrag(e);
            e.gesture.srcEvent.preventDefault();
          }
        }

        function onDragY(e) {
          if (getPrimaryScrollAxis(e) == 'x') {
            e.gesture.srcEvent.preventDefault();
          }
        }

        function onDragRelease(e) {
          sideMenuCtrl._endDrag(e);
          startCoord = null;
          primaryScrollAxis = null;
        }

        function getPrimaryScrollAxis(gestureEvt) {
          // gets whether the user is primarily scrolling on the X or Y
          // If a majority of the drag has been on the Y since the start of
          // the drag, but the X has moved a little bit, it's still a Y drag

          if (primaryScrollAxis) {
            // we already figured out which way they're scrolling
            return primaryScrollAxis;
          }

          if (gestureEvt && gestureEvt.gesture) {

            if (!startCoord) {
              // get the starting point
              startCoord = ionic.tap.pointerCoord(gestureEvt.gesture.srcEvent);

            } else {
              // we already have a starting point, figure out which direction they're going
              var endCoord = ionic.tap.pointerCoord(gestureEvt.gesture.srcEvent);

              var xDistance = Math.abs(endCoord.x - startCoord.x);
              var yDistance = Math.abs(endCoord.y - startCoord.y);

              var scrollAxis = (xDistance < yDistance ? 'y' : 'x');

              if (Math.max(xDistance, yDistance) > 30) {
                // ok, we pretty much know which way they're going
                // let's lock it in
                primaryScrollAxis = scrollAxis;
              }

              return scrollAxis;
            }
          }
          return 'y';
        }

        var content = {
          element: element[0],
          onDrag: function() {},
          endDrag: function() {},
          setCanScroll: function(canScroll) {
            var c = $element[0].querySelector('.scroll');

            if (!c) {
              return;
            }

            var content = angular.element(c.parentElement);
            if (!content) {
              return;
            }

            // freeze our scroll container if we have one
            var scrollScope = content.scope();
            scrollScope.scrollCtrl && scrollScope.scrollCtrl.freezeScrollShut(!canScroll);
          },
          getTranslateX: function() {
            return $scope.sideMenuContentTranslateX || 0;
          },
          setTranslateX: ionic.animationFrameThrottle(function(amount) {
            var xTransform = content.offsetX + amount;
            $element[0].style[ionic.CSS.TRANSFORM] = 'translate3d(' + xTransform + 'px,0,0)';
            $timeout(function() {
              $scope.sideMenuContentTranslateX = amount;
            });
          }),
          setMarginLeft: ionic.animationFrameThrottle(function(amount) {
            if (amount) {
              amount = parseInt(amount, 10);
              $element[0].style[ionic.CSS.TRANSFORM] = 'translate3d(' + amount + 'px,0,0)';
              $element[0].style.width = ($window.innerWidth - amount) + 'px';
              content.offsetX = amount;
            } else {
              $element[0].style[ionic.CSS.TRANSFORM] = 'translate3d(0,0,0)';
              $element[0].style.width = '';
              content.offsetX = 0;
            }
          }),
          setMarginRight: ionic.animationFrameThrottle(function(amount) {
            if (amount) {
              amount = parseInt(amount, 10);
              $element[0].style.width = ($window.innerWidth - amount) + 'px';
              content.offsetX = amount;
            } else {
              $element[0].style.width = '';
              content.offsetX = 0;
            }
            // reset incase left gets grabby
            $element[0].style[ionic.CSS.TRANSFORM] = 'translate3d(0,0,0)';
          }),
          setMarginLeftAndRight: ionic.animationFrameThrottle(function(amountLeft, amountRight) {
            amountLeft = amountLeft && parseInt(amountLeft, 10) || 0;
            amountRight = amountRight && parseInt(amountRight, 10) || 0;

            var amount = amountLeft + amountRight;

            if (amount > 0) {
              $element[0].style[ionic.CSS.TRANSFORM] = 'translate3d(' + amountLeft + 'px,0,0)';
              $element[0].style.width = ($window.innerWidth - amount) + 'px';
              content.offsetX = amountLeft;
            } else {
              $element[0].style[ionic.CSS.TRANSFORM] = 'translate3d(0,0,0)';
              $element[0].style.width = '';
              content.offsetX = 0;
            }
            // reset incase left gets grabby
            //$element[0].style[ionic.CSS.TRANSFORM] = 'translate3d(0,0,0)';
          }),
          enableAnimation: function() {
            $scope.animationEnabled = true;
            $element[0].classList.add('menu-animated');
          },
          disableAnimation: function() {
            $scope.animationEnabled = false;
            $element[0].classList.remove('menu-animated');
          },
          offsetX: 0
        };

        sideMenuCtrl.setContent(content);

        // add gesture handlers
        var gestureOpts = { stop_browser_behavior: false };
        gestureOpts.prevent_default_directions = ['left', 'right'];
        var contentTapGesture = $ionicGesture.on('tap', onContentTap, $element, gestureOpts);
        var dragRightGesture = $ionicGesture.on('dragright', onDragX, $element, gestureOpts);
        var dragLeftGesture = $ionicGesture.on('dragleft', onDragX, $element, gestureOpts);
        var dragUpGesture = $ionicGesture.on('dragup', onDragY, $element, gestureOpts);
        var dragDownGesture = $ionicGesture.on('dragdown', onDragY, $element, gestureOpts);
        var releaseGesture = $ionicGesture.on('release', onDragRelease, $element, gestureOpts);

        // Cleanup
        $scope.$on('$destroy', function() {
          if (content) {
            content.element = null;
            content = null;
          }
          $ionicGesture.off(dragLeftGesture, 'dragleft', onDragX);
          $ionicGesture.off(dragRightGesture, 'dragright', onDragX);
          $ionicGesture.off(dragUpGesture, 'dragup', onDragY);
          $ionicGesture.off(dragDownGesture, 'dragdown', onDragY);
          $ionicGesture.off(releaseGesture, 'release', onDragRelease);
          $ionicGesture.off(contentTapGesture, 'tap', onContentTap);
        });
      }
    }
  };
}]);

IonicModule

/**
 * @ngdoc directive
 * @name ionSideMenus
 * @module ionic
 * @delegate ionic.service:$ionicSideMenuDelegate
 * @restrict E
 *
 * @description
 * A container element for side menu(s) and the main content. Allows the left and/or right side menu
 * to be toggled by dragging the main content area side to side.
 *
 * To automatically close an opened menu, you can add the {@link ionic.directive:menuClose} attribute
 * directive. The `menu-close` attribute is usually added to links and buttons within
 * `ion-side-menu-content`, so that when the element is clicked, the opened side menu will
 * automatically close.
 *
 * "Burger Icon" toggles can be added to the header with the {@link ionic.directive:menuToggle}
 * attribute directive. Clicking the toggle will open and close the side menu like the `menu-close`
 * directive. The side menu will automatically hide on child pages, but can be overridden with the
 * enable-menu-with-back-views attribute mentioned below.
 *
 * By default, side menus are hidden underneath their side menu content and can be opened by swiping
 * the content left or right or by toggling a button to show the side menu. Additionally, by adding the
 * {@link ionic.directive:exposeAsideWhen} attribute directive to an
 * {@link ionic.directive:ionSideMenu} element directive, a side menu can be given instructions about
 * "when" the menu should be exposed (always viewable).
 *
 * ![Side Menu](http://ionicframework.com.s3.amazonaws.com/docs/controllers/sidemenu.gif)
 *
 * For more information on side menus, check out:
 *
 * - {@link ionic.directive:ionSideMenuContent}
 * - {@link ionic.directive:ionSideMenu}
 * - {@link ionic.directive:menuToggle}
 * - {@link ionic.directive:menuClose}
 * - {@link ionic.directive:exposeAsideWhen}
 *
 * @usage
 * To use side menus, add an `<ion-side-menus>` parent element. This will encompass all pages that have a
 * side menu, and have at least 2 child elements: 1 `<ion-side-menu-content>` for the center content,
 * and one or more `<ion-side-menu>` directives for each side menu(left/right) that you wish to place.
 *
 * ```html
 * <ion-side-menus>
 *   <!-- Left menu -->
 *   <ion-side-menu side="left">
 *   </ion-side-menu>
 *
 *   <ion-side-menu-content>
 *   <!-- Main content, usually <ion-nav-view> -->
 *   </ion-side-menu-content>
 *
 *   <!-- Right menu -->
 *   <ion-side-menu side="right">
 *   </ion-side-menu>
 *
 * </ion-side-menus>
 * ```
 * ```js
 * function ContentController($scope, $ionicSideMenuDelegate) {
 *   $scope.toggleLeft = function() {
 *     $ionicSideMenuDelegate.toggleLeft();
 *   };
 * }
 * ```
 *
 * @param {bool=} enable-menu-with-back-views Determines whether the side menu is enabled when the
 * back button is showing. When set to `false`, any {@link ionic.directive:menuToggle} will be hidden,
 * and the user cannot swipe to open the menu. When going back to the root page of the side menu (the
 * page without a back button visible), then any menuToggle buttons will show again, and menus will be
 * enabled again.
 * @param {string=} delegate-handle The handle used to identify this side menu
 * with {@link ionic.service:$ionicSideMenuDelegate}.
 *
 */
.directive('ionSideMenus', ['$ionicBody', function($ionicBody) {
  return {
    restrict: 'ECA',
    controller: '$ionicSideMenus',
    compile: function(element, attr) {
      attr.$set('class', (attr['class'] || '') + ' view');

      return { pre: prelink };
      function prelink($scope, $element, $attrs, ctrl) {

        ctrl.enableMenuWithBackViews($scope.$eval($attrs.enableMenuWithBackViews));

        $scope.$on('$ionicExposeAside', function(evt, isAsideExposed) {
          if (!$scope.$exposeAside) $scope.$exposeAside = {};
          $scope.$exposeAside.active = isAsideExposed;
          $ionicBody.enableClass(isAsideExposed, 'aside-open');
        });

        $scope.$on('$ionicView.beforeEnter', function(ev, d) {
          if (d.historyId) {
            $scope.$activeHistoryId = d.historyId;
          }
        });

        $scope.$on('$destroy', function() {
          $ionicBody.removeClass('menu-open', 'aside-open');
        });

      }
    }
  };
}]);


/**
 * @ngdoc directive
 * @name ionSlideBox
 * @module ionic
 * @codepen AjgEB
 * @deprecated will be removed in the next Ionic release in favor of the new ion-slides component.
 * Don't depend on the internal behavior of this widget.
 * @delegate ionic.service:$ionicSlideBoxDelegate
 * @restrict E
 * @description
 * The Slide Box is a multi-page container where each page can be swiped or dragged between:
 *
 *
 * @usage
 * ```html
 * <ion-slide-box on-slide-changed="slideHasChanged($index)">
 *   <ion-slide>
 *     <div class="box blue"><h1>BLUE</h1></div>
 *   </ion-slide>
 *   <ion-slide>
 *     <div class="box yellow"><h1>YELLOW</h1></div>
 *   </ion-slide>
 *   <ion-slide>
 *     <div class="box pink"><h1>PINK</h1></div>
 *   </ion-slide>
 * </ion-slide-box>
 * ```
 *
 * @param {string=} delegate-handle The handle used to identify this slideBox
 * with {@link ionic.service:$ionicSlideBoxDelegate}.
 * @param {boolean=} does-continue Whether the slide box should loop.
 * @param {boolean=} auto-play Whether the slide box should automatically slide. Default true if does-continue is true.
 * @param {number=} slide-interval How many milliseconds to wait to change slides (if does-continue is true). Defaults to 4000.
 * @param {boolean=} show-pager Whether a pager should be shown for this slide box. Accepts expressions via `show-pager="{{shouldShow()}}"`. Defaults to true.
 * @param {expression=} pager-click Expression to call when a pager is clicked (if show-pager is true). Is passed the 'index' variable.
 * @param {expression=} on-slide-changed Expression called whenever the slide is changed.  Is passed an '$index' variable.
 * @param {expression=} active-slide Model to bind the current slide index to.
 */
IonicModule
.directive('ionSlideBox', [
  '$animate',
  '$timeout',
  '$compile',
  '$ionicSlideBoxDelegate',
  '$ionicHistory',
  '$ionicScrollDelegate',
function($animate, $timeout, $compile, $ionicSlideBoxDelegate, $ionicHistory, $ionicScrollDelegate) {
  return {
    restrict: 'E',
    replace: true,
    transclude: true,
    scope: {
      autoPlay: '=',
      doesContinue: '@',
      slideInterval: '@',
      showPager: '@',
      pagerClick: '&',
      disableScroll: '@',
      onSlideChanged: '&',
      activeSlide: '=?',
      bounce: '@'
    },
    controller: ['$scope', '$element', '$attrs', function($scope, $element, $attrs) {
      var _this = this;

      var continuous = $scope.$eval($scope.doesContinue) === true;
      var bouncing = ($scope.$eval($scope.bounce) !== false); //Default to true
      var shouldAutoPlay = isDefined($attrs.autoPlay) ? !!$scope.autoPlay : false;
      var slideInterval = shouldAutoPlay ? $scope.$eval($scope.slideInterval) || 4000 : 0;

      var slider = new ionic.views.Slider({
        el: $element[0],
        auto: slideInterval,
        continuous: continuous,
        startSlide: $scope.activeSlide,
        bouncing: bouncing,
        slidesChanged: function() {
          $scope.currentSlide = slider.currentIndex();

          // Try to trigger a digest
          $timeout(function() {});
        },
        callback: function(slideIndex) {
          $scope.currentSlide = slideIndex;
          $scope.onSlideChanged({ index: $scope.currentSlide, $index: $scope.currentSlide});
          $scope.$parent.$broadcast('slideBox.slideChanged', slideIndex);
          $scope.activeSlide = slideIndex;
          // Try to trigger a digest
          $timeout(function() {});
        },
        onDrag: function() {
          freezeAllScrolls(true);
        },
        onDragEnd: function() {
          freezeAllScrolls(false);
        }
      });

      function freezeAllScrolls(shouldFreeze) {
        if (shouldFreeze && !_this.isScrollFreeze) {
          $ionicScrollDelegate.freezeAllScrolls(shouldFreeze);

        } else if (!shouldFreeze && _this.isScrollFreeze) {
          $ionicScrollDelegate.freezeAllScrolls(false);
        }
        _this.isScrollFreeze = shouldFreeze;
      }

      slider.enableSlide($scope.$eval($attrs.disableScroll) !== true);

      $scope.$watch('activeSlide', function(nv) {
        if (isDefined(nv)) {
          slider.slide(nv);
        }
      });

      $scope.$on('slideBox.nextSlide', function() {
        slider.next();
      });

      $scope.$on('slideBox.prevSlide', function() {
        slider.prev();
      });

      $scope.$on('slideBox.setSlide', function(e, index) {
        slider.slide(index);
      });

      //Exposed for testing
      this.__slider = slider;

      var deregisterInstance = $ionicSlideBoxDelegate._registerInstance(
        slider, $attrs.delegateHandle, function() {
          return $ionicHistory.isActiveScope($scope);
        }
      );
      $scope.$on('$destroy', function() {
        deregisterInstance();
        slider.kill();
      });

      this.slidesCount = function() {
        return slider.slidesCount();
      };

      this.onPagerClick = function(index) {
        $scope.pagerClick({index: index});
      };

      $timeout(function() {
        slider.load();
      });
    }],
    template: '<div class="slider">' +
      '<div class="slider-slides" ng-transclude>' +
      '</div>' +
    '</div>',

    link: function($scope, $element, $attr) {
      // Disable ngAnimate for slidebox and its children
      $animate.enabled($element, false);

      // if showPager is undefined, show the pager
      if (!isDefined($attr.showPager)) {
        $scope.showPager = true;
        getPager().toggleClass('hide', !true);
      }

      $attr.$observe('showPager', function(show) {
        if (show === undefined) return;
        show = $scope.$eval(show);
        getPager().toggleClass('hide', !show);
      });

      var pager;
      function getPager() {
        if (!pager) {
          var childScope = $scope.$new();
          pager = jqLite('<ion-pager></ion-pager>');
          $element.append(pager);
          pager = $compile(pager)(childScope);
        }
        return pager;
      }
    }
  };
}])
.directive('ionSlide', function() {
  return {
    restrict: 'E',
    require: '?^ionSlideBox',
    compile: function(element) {
      element.addClass('slider-slide');
    }
  };
})

.directive('ionPager', function() {
  return {
    restrict: 'E',
    replace: true,
    require: '^ionSlideBox',
    template: '<div class="slider-pager"><span class="slider-pager-page" ng-repeat="slide in numSlides() track by $index" ng-class="{active: $index == currentSlide}" ng-click="pagerClick($index)"><i class="icon ion-record"></i></span></div>',
    link: function($scope, $element, $attr, slideBox) {
      var selectPage = function(index) {
        var children = $element[0].children;
        var length = children.length;
        for (var i = 0; i < length; i++) {
          if (i == index) {
            children[i].classList.add('active');
          } else {
            children[i].classList.remove('active');
          }
        }
      };

      $scope.pagerClick = function(index) {
        slideBox.onPagerClick(index);
      };

      $scope.numSlides = function() {
        return new Array(slideBox.slidesCount());
      };

      $scope.$watch('currentSlide', function(v) {
        selectPage(v);
      });
    }
  };

});


/**
 * @ngdoc directive
 * @name ionSlides
 * @module ionic
 * @delegate ionic.service:$ionicSlideBoxDelegate
 * @restrict E
 * @description
 * The Slides component is a powerful multi-page container where each page can be swiped or dragged between.
 *
 * Note: this is a new version of the Ionic Slide Box based on the [Swiper](http://www.idangero.us/swiper/#.Vmc1J-ODFBc) widget from
 * [idangerous](http://www.idangero.us/).
 *
 * ![SlideBox](http://ionicframework.com.s3.amazonaws.com/docs/controllers/slideBox.gif)
 *
 * @usage
 * ```html
 * <ion-content scroll="false">
 *   <ion-slides  options="options" slider="data.slider">
 *     <ion-slide-page>
 *       <div class="box blue"><h1>BLUE</h1></div>
 *     </ion-slide-page>
 *     <ion-slide-page>
 *       <div class="box yellow"><h1>YELLOW</h1></div>
 *     </ion-slide-page>
 *     <ion-slide-page>
 *       <div class="box pink"><h1>PINK</h1></div>
 *     </ion-slide-page>
 *   </ion-slides>
 * </ion-content>
 * ```
 *
 * ```js
 * $scope.options = {
 *   loop: false,
 *   effect: 'fade',
 *   speed: 500,
 * }
 *
 * $scope.$on("$ionicSlides.sliderInitialized", function(event, data){
 *   // data.slider is the instance of Swiper
 *   $scope.slider = data.slider;
 * });
 *
 * $scope.$on("$ionicSlides.slideChangeStart", function(event, data){
 *   console.log('Slide change is beginning');
 * });
 *
 * $scope.$on("$ionicSlides.slideChangeEnd", function(event, data){
 *   // note: the indexes are 0-based
 *   $scope.activeIndex = data.activeIndex;
 *   $scope.previousIndex = data.previousIndex;
 * });
 *
 * ```
 *
 * ## Slide Events
 *
 * The slides component dispatches events when the active slide changes
 *
 * <table class="table">
 *   <tr>
 *     <td><code>$ionicSlides.slideChangeStart</code></td>
 *     <td>This event is emitted when a slide change begins</td>
 *   </tr>
 *   <tr>
 *     <td><code>$ionicSlides.slideChangeEnd</code></td>
 *     <td>This event is emitted when a slide change completes</td>
 *   </tr>
 *   <tr>
 *     <td><code>$ionicSlides.sliderInitialized</code></td>
 *     <td>This event is emitted when the slider is initialized. It provides access to an instance of the slider.</td>
 *   </tr>
 * </table>
 *
 *
 * ## Updating Slides Dynamically
 * When applying data to the slider at runtime, typically everything will work as expected.
 *
 * In the event that the slides are looped, use the `updateLoop` method on the slider to ensure the slides update correctly.
 *
 * ```
 * $scope.$on("$ionicSlides.sliderInitialized", function(event, data){
 *   // grab an instance of the slider
 *   $scope.slider = data.slider;
 * });
 *
 * function dataChangeHandler(){
 *   // call this function when data changes, such as an HTTP request, etc
 *   if ( $scope.slider ){
 *     $scope.slider.updateLoop();
 *   }
 * }
 * ```
 *
 */
IonicModule
.directive('ionSlides', [
  '$animate',
  '$timeout',
  '$compile',
function($animate, $timeout, $compile) {
  return {
    restrict: 'E',
    transclude: true,
    scope: {
      options: '=',
      slider: '='
    },
    template: '<div class="swiper-container">' +
      '<div class="swiper-wrapper" ng-transclude>' +
      '</div>' +
        '<div ng-hide="!showPager" class="swiper-pagination"></div>' +
      '</div>',
    controller: ['$scope', '$element', function($scope, $element) {
      var _this = this;

      this.update = function() {
        $timeout(function() {
          if (!_this.__slider) {
            return;
          }

          _this.__slider.update();
          if (_this._options.loop) {
            _this.__slider.createLoop();
          }

          var slidesLength = _this.__slider.slides.length;

          // Don't allow pager to show with > 10 slides
          if (slidesLength > 10) {
            $scope.showPager = false;
          }

          // When slide index is greater than total then slide to last index
          if (_this.__slider.activeIndex > slidesLength - 1) {
            _this.__slider.slideTo(slidesLength - 1);
          }
        });
      };

      this.rapidUpdate = ionic.debounce(function() {
        _this.update();
      }, 50);

      this.getSlider = function() {
        return _this.__slider;
      };

      var options = $scope.options || {};

      var newOptions = angular.extend({
        pagination: $element.children().children()[1],
        paginationClickable: true,
        lazyLoading: true,
        preloadImages: false
      }, options);

      this._options = newOptions;

      $timeout(function() {
        var slider = new ionic.views.Swiper($element.children()[0], newOptions, $scope, $compile);

        $scope.$emit("$ionicSlides.sliderInitialized", { slider: slider });

        _this.__slider = slider;
        $scope.slider = _this.__slider;

        $scope.$on('$destroy', function() {
          slider.destroy();
          _this.__slider = null;
        });
      });

      $timeout(function() {
        // if it's a loop, render the slides again just incase
        _this.rapidUpdate();
      }, 200);

    }],

    link: function($scope) {
      $scope.showPager = true;
      // Disable ngAnimate for slidebox and its children
      //$animate.enabled(false, $element);
    }
  };
}])
.directive('ionSlidePage', [function() {
  return {
    restrict: 'E',
    require: '?^ionSlides',
    transclude: true,
    replace: true,
    template: '<div class="swiper-slide" ng-transclude></div>',
    link: function($scope, $element, $attr, ionSlidesCtrl) {
      ionSlidesCtrl.rapidUpdate();

      $scope.$on('$destroy', function() {
        ionSlidesCtrl.rapidUpdate();
      });
    }
  };
}]);

/**
* @ngdoc directive
* @name ionSpinner
* @module ionic
* @restrict E
 *
 * @description
 * The `ionSpinner` directive provides a variety of animated spinners.
 * Spinners enables you to give your users feedback that the app is
 * processing/thinking/waiting/chillin' out, or whatever you'd like it to indicate.
 * By default, the {@link ionic.directive:ionRefresher} feature uses this spinner, rather
 * than rotating font icons (previously included in [ionicons](http://ionicons.com/)).
 * While font icons are great for simple or stationary graphics, they're not suited to
 * provide great animations, which is why Ionic uses SVG instead.
 *
 * Ionic offers ten spinners out of the box, and by default, it will use the appropriate spinner
 * for the platform on which it's running. Under the hood, the `ionSpinner` directive dynamically
 * builds the required SVG element, which allows Ionic to provide all ten of the animated SVGs
 * within 3KB.
 *
 * <style>
 * .spinner-table {
 *   max-width: 280px;
 * }
 * .spinner-table tbody > tr > th, .spinner-table tbody > tr > td {
 *   vertical-align: middle;
 *   width: 42px;
 *   height: 42px;
 * }
 * .spinner {
 *   stroke: #444;
 *   fill: #444; }
 *   .spinner svg {
 *     width: 28px;
 *     height: 28px; }
 *   .spinner.spinner-inverse {
 *     stroke: #fff;
 *     fill: #fff; }
 *
 * .spinner-android {
 *   stroke: #4b8bf4; }
 *
 * .spinner-ios, .spinner-ios-small {
 *   stroke: #69717d; }
 *
 * .spinner-spiral .stop1 {
 *   stop-color: #fff;
 *   stop-opacity: 0; }
 * .spinner-spiral.spinner-inverse .stop1 {
 *   stop-color: #000; }
 * .spinner-spiral.spinner-inverse .stop2 {
 *   stop-color: #fff; }
 * </style>
 *
 * <script src="http://code.ionicframework.com/nightly/js/ionic.bundle.min.js"></script>
 * <table class="table spinner-table" ng-app="ionic">
 *  <tr>
 *    <th>
 *      <code>android</code>
 *    </th>
 *    <td>
 *      <ion-spinner icon="android"></ion-spinner>
 *    </td>
 *  </tr>
 *  <tr>
 *    <th>
 *      <code>ios</code>
 *    </th>
 *    <td>
 *      <ion-spinner icon="ios"></ion-spinner>
 *    </td>
 *  </tr>
 *  <tr>
 *    <th>
 *      <code>ios-small</code>
 *    </th>
 *    <td>
 *      <ion-spinner icon="ios-small"></ion-spinner>
 *    </td>
 *  </tr>
 *  <tr>
 *    <th>
 *      <code>bubbles</code>
 *    </th>
 *    <td>
 *      <ion-spinner icon="bubbles"></ion-spinner>
 *    </td>
 *  </tr>
 *  <tr>
 *    <th>
 *      <code>circles</code>
 *    </th>
 *    <td>
 *      <ion-spinner icon="circles"></ion-spinner>
 *    </td>
 *  </tr>
 *  <tr>
 *    <th>
 *      <code>crescent</code>
 *    </th>
 *    <td>
 *      <ion-spinner icon="crescent"></ion-spinner>
 *    </td>
 *  </tr>
 *  <tr>
 *    <th>
 *      <code>dots</code>
 *    </th>
 *    <td>
 *      <ion-spinner icon="dots"></ion-spinner>
 *    </td>
 *  </tr>
 *  <tr>
 *    <th>
 *      <code>lines</code>
 *    </th>
 *    <td>
 *      <ion-spinner icon="lines"></ion-spinner>
 *    </td>
 *  </tr>
 *  <tr>
 *    <th>
 *      <code>ripple</code>
 *    </th>
 *    <td>
 *      <ion-spinner icon="ripple"></ion-spinner>
 *    </td>
 *  </tr>
 *  <tr>
 *    <th>
 *      <code>spiral</code>
 *    </th>
 *    <td>
 *      <ion-spinner icon="spiral"></ion-spinner>
 *    </td>
 *  </tr>
 * </table>
 *
 * Each spinner uses SVG with SMIL animations, however, the Android spinner also uses JavaScript
 * so it also works on Android 4.0-4.3. Additionally, each spinner can be styled with CSS,
 * and scaled to any size.
 *
 *
 * @usage
 * The following code would use the default spinner for the platform it's running from. If it's neither
 * iOS or Android, it'll default to use `ios`.
 *
 * ```html
 * <ion-spinner></ion-spinner>
 * ```
 *
 * By setting the `icon` attribute, you can specify which spinner to use, no matter what
 * the platform is.
 *
 * ```html
 * <ion-spinner icon="spiral"></ion-spinner>
 * ```
 *
 * ## Spinner Colors
 * Like with most of Ionic's other components, spinners can also be styled using
 * Ionic's standard color naming convention. For example:
 *
 * ```html
 * <ion-spinner class="spinner-energized"></ion-spinner>
 * ```
 *
 *
 * ## Styling SVG with CSS
 * One cool thing about SVG is its ability to be styled with CSS! Some of the properties
 * have different names, for example, SVG uses the term `stroke` instead of `border`, and
 * `fill` instead of `background-color`.
 *
 * ```css
 * .spinner svg {
 *   width: 28px;
 *   height: 28px;
 *   stroke: #444;
 *   fill: #444;
 * }
 * ```
 *
*/
IonicModule
.directive('ionSpinner', function() {
  return {
    restrict: 'E',
    controller: '$ionicSpinner',
    link: function($scope, $element, $attrs, ctrl) {
      var spinnerName = ctrl.init();
      $element.addClass('spinner spinner-' + spinnerName);

      $element.on('$destroy', function onDestroy() {
        ctrl.stop();
      });
    }
  };
});

/**
 * @ngdoc directive
 * @name ionTab
 * @module ionic
 * @restrict E
 * @parent ionic.directive:ionTabs
 *
 * @description
 * Contains a tab's content.  The content only exists while the given tab is selected.
 *
 * Each ionTab has its own view history.
 *
 * @usage
 * ```html
 * <ion-tab
 *   title="Tab!"
 *   icon="my-icon"
 *   href="#/tab/tab-link"
 *   on-select="onTabSelected()"
 *   on-deselect="onTabDeselected()">
 * </ion-tab>
 * ```
 * For a complete, working tab bar example, see the {@link ionic.directive:ionTabs} documentation.
 *
 * @param {string} title The title of the tab.
 * @param {string=} href The link that this tab will navigate to when tapped.
 * @param {string=} icon The icon of the tab. If given, this will become the default for icon-on and icon-off.
 * @param {string=} icon-on The icon of the tab while it is selected.
 * @param {string=} icon-off The icon of the tab while it is not selected.
 * @param {expression=} badge The badge to put on this tab (usually a number).
 * @param {expression=} badge-style The style of badge to put on this tab (eg: badge-positive).
 * @param {expression=} on-select Called when this tab is selected.
 * @param {expression=} on-deselect Called when this tab is deselected.
 * @param {expression=} ng-click By default, the tab will be selected on click. If ngClick is set, it will not.  You can explicitly switch tabs using {@link ionic.service:$ionicTabsDelegate#select $ionicTabsDelegate.select()}.
 * @param {expression=} hidden Whether the tab is to be hidden or not.
 * @param {expression=} disabled Whether the tab is to be disabled or not.
 */
IonicModule
.directive('ionTab', [
  '$compile',
  '$ionicConfig',
  '$ionicBind',
  '$ionicViewSwitcher',
function($compile, $ionicConfig, $ionicBind, $ionicViewSwitcher) {

  //Returns ' key="value"' if value exists
  function attrStr(k, v) {
    return isDefined(v) ? ' ' + k + '="' + v + '"' : '';
  }
  return {
    restrict: 'E',
    require: ['^ionTabs', 'ionTab'],
    controller: '$ionicTab',
    scope: true,
    compile: function(element, attr) {

      //We create the tabNavTemplate in the compile phase so that the
      //attributes we pass down won't be interpolated yet - we want
      //to pass down the 'raw' versions of the attributes
      var tabNavTemplate = '<ion-tab-nav' +
        attrStr('ng-click', attr.ngClick) +
        attrStr('title', attr.title) +
        attrStr('icon', attr.icon) +
        attrStr('icon-on', attr.iconOn) +
        attrStr('icon-off', attr.iconOff) +
        attrStr('badge', attr.badge) +
        attrStr('badge-style', attr.badgeStyle) +
        attrStr('hidden', attr.hidden) +
        attrStr('disabled', attr.disabled) +
        attrStr('class', attr['class']) +
        '></ion-tab-nav>';

      //Remove the contents of the element so we can compile them later, if tab is selected
      var tabContentEle = document.createElement('div');
      for (var x = 0; x < element[0].children.length; x++) {
        tabContentEle.appendChild(element[0].children[x].cloneNode(true));
      }
      var childElementCount = tabContentEle.childElementCount;
      element.empty();

      var navViewName, isNavView;
      if (childElementCount) {
        if (tabContentEle.children[0].tagName === 'ION-NAV-VIEW') {
          // get the name if it's a nav-view
          navViewName = tabContentEle.children[0].getAttribute('name');
          tabContentEle.children[0].classList.add('view-container');
          isNavView = true;
        }
        if (childElementCount === 1) {
          // make the 1 child element the primary tab content container
          tabContentEle = tabContentEle.children[0];
        }
        if (!isNavView) tabContentEle.classList.add('pane');
        tabContentEle.classList.add('tab-content');
      }

      return function link($scope, $element, $attr, ctrls) {
        var childScope;
        var childElement;
        var tabsCtrl = ctrls[0];
        var tabCtrl = ctrls[1];
        var isTabContentAttached = false;
        $scope.$tabSelected = false;

        $ionicBind($scope, $attr, {
          onSelect: '&',
          onDeselect: '&',
          title: '@',
          uiSref: '@',
          href: '@'
        });

        tabsCtrl.add($scope);
        $scope.$on('$destroy', function() {
          if (!$scope.$tabsDestroy) {
            // if the containing ionTabs directive is being destroyed
            // then don't bother going through the controllers remove
            // method, since remove will reset the active tab as each tab
            // is being destroyed, causing unnecessary view loads and transitions
            tabsCtrl.remove($scope);
          }
          tabNavElement.isolateScope().$destroy();
          tabNavElement.remove();
          tabNavElement = tabContentEle = childElement = null;
        });

        //Remove title attribute so browser-tooltip does not apear
        $element[0].removeAttribute('title');

        if (navViewName) {
          tabCtrl.navViewName = $scope.navViewName = navViewName;
        }
        $scope.$on('$stateChangeSuccess', selectIfMatchesState);
        selectIfMatchesState();
        function selectIfMatchesState() {
          if (tabCtrl.tabMatchesState()) {
            tabsCtrl.select($scope, false);
          }
        }

        var tabNavElement = jqLite(tabNavTemplate);
        tabNavElement.data('$ionTabsController', tabsCtrl);
        tabNavElement.data('$ionTabController', tabCtrl);
        tabsCtrl.$tabsElement.append($compile(tabNavElement)($scope));


        function tabSelected(isSelected) {
          if (isSelected && childElementCount) {
            // this tab is being selected

            // check if the tab is already in the DOM
            // only do this if the tab has child elements
            if (!isTabContentAttached) {
              // tab should be selected and is NOT in the DOM
              // create a new scope and append it
              childScope = $scope.$new();
              childElement = jqLite(tabContentEle);
              $ionicViewSwitcher.viewEleIsActive(childElement, true);
              tabsCtrl.$element.append(childElement);
              $compile(childElement)(childScope);
              isTabContentAttached = true;
            }

            // remove the hide class so the tabs content shows up
            $ionicViewSwitcher.viewEleIsActive(childElement, true);

          } else if (isTabContentAttached && childElement) {
            // this tab should NOT be selected, and it is already in the DOM

            if ($ionicConfig.views.maxCache() > 0) {
              // keep the tabs in the DOM, only css hide it
              $ionicViewSwitcher.viewEleIsActive(childElement, false);

            } else {
              // do not keep tabs in the DOM
              destroyTab();
            }

          }
        }

        function destroyTab() {
          childScope && childScope.$destroy();
          isTabContentAttached && childElement && childElement.remove();
          tabContentEle.innerHTML = '';
          isTabContentAttached = childScope = childElement = null;
        }

        $scope.$watch('$tabSelected', tabSelected);

        $scope.$on('$ionicView.afterEnter', function() {
          $ionicViewSwitcher.viewEleIsActive(childElement, $scope.$tabSelected);
        });

        $scope.$on('$ionicView.clearCache', function() {
          if (!$scope.$tabSelected) {
            destroyTab();
          }
        });

      };
    }
  };
}]);

IonicModule
.directive('ionTabNav', [function() {
  return {
    restrict: 'E',
    replace: true,
    require: ['^ionTabs', '^ionTab'],
    template:
    '<a ng-class="{\'has-badge\':badge, \'tab-hidden\':isHidden(), \'tab-item-active\': isTabActive()}" ' +
      ' ng-disabled="disabled()" class="tab-item">' +
      '<span class="badge {{badgeStyle}}" ng-if="badge">{{badge}}</span>' +
      '<i class="icon {{getIcon()}}" ng-if="getIcon()"></i>' +
      '<span class="tab-title" ng-bind-html="title"></span>' +
    '</a>',
    scope: {
      title: '@',
      icon: '@',
      iconOn: '@',
      iconOff: '@',
      badge: '=',
      hidden: '@',
      disabled: '&',
      badgeStyle: '@',
      'class': '@'
    },
    link: function($scope, $element, $attrs, ctrls) {
      var tabsCtrl = ctrls[0],
        tabCtrl = ctrls[1];

      //Remove title attribute so browser-tooltip does not apear
      $element[0].removeAttribute('title');

      $scope.selectTab = function(e) {
        e.preventDefault();
        tabsCtrl.select(tabCtrl.$scope, true);
      };
      if (!$attrs.ngClick) {
        $element.on('click', function(event) {
          $scope.$apply(function() {
            $scope.selectTab(event);
          });
        });
      }

      $scope.isHidden = function() {
        if ($attrs.hidden === 'true' || $attrs.hidden === true) return true;
        return false;
      };

      $scope.getIconOn = function() {
        return $scope.iconOn || $scope.icon;
      };
      $scope.getIconOff = function() {
        return $scope.iconOff || $scope.icon;
      };

      $scope.isTabActive = function() {
        return tabsCtrl.selectedTab() === tabCtrl.$scope;
      };

      $scope.getIcon = function() {
        if ( tabsCtrl.selectedTab() === tabCtrl.$scope ) {
          // active
          return $scope.iconOn || $scope.icon;
        }
        else {
          // inactive
          return $scope.iconOff || $scope.icon;
        }
      };
    }
  };
}]);

/**
 * @ngdoc directive
 * @name ionTabs
 * @module ionic
 * @delegate ionic.service:$ionicTabsDelegate
 * @restrict E
 * @codepen odqCz
 *
 * @description
 * Powers a multi-tabbed interface with a Tab Bar and a set of "pages" that can be tabbed
 * through.
 *
 * Assign any [tabs class](/docs/components#tabs) to the element to define
 * its look and feel.
 *
 * For iOS, tabs will appear at the bottom of the screen. For Android, tabs will be at the top
 * of the screen, below the nav-bar. This follows each OS's design specification, but can be
 * configured with the {@link ionic.provider:$ionicConfigProvider}.
 *
 * See the {@link ionic.directive:ionTab} directive's documentation for more details on
 * individual tabs.
 *
 * Note: do not place ion-tabs inside of an ion-content element; it has been known to cause a
 * certain CSS bug.
 *
 * @usage
 * ```html
 * <ion-tabs class="tabs-positive tabs-icon-top">
 *
 *   <ion-tab title="Home" icon-on="ion-ios-filing" icon-off="ion-ios-filing-outline">
 *     <!-- Tab 1 content -->
 *   </ion-tab>
 *
 *   <ion-tab title="About" icon-on="ion-ios-clock" icon-off="ion-ios-clock-outline">
 *     <!-- Tab 2 content -->
 *   </ion-tab>
 *
 *   <ion-tab title="Settings" icon-on="ion-ios-gear" icon-off="ion-ios-gear-outline">
 *     <!-- Tab 3 content -->
 *   </ion-tab>
 *
 * </ion-tabs>
 * ```
 *
 * @param {string=} delegate-handle The handle used to identify these tabs
 * with {@link ionic.service:$ionicTabsDelegate}.
 */

IonicModule
.directive('ionTabs', [
  '$ionicTabsDelegate',
  '$ionicConfig',
function($ionicTabsDelegate, $ionicConfig) {
  return {
    restrict: 'E',
    scope: true,
    controller: '$ionicTabs',
    compile: function(tElement) {
      //We cannot use regular transclude here because it breaks element.data()
      //inheritance on compile
      var innerElement = jqLite('<div class="tab-nav tabs">');
      innerElement.append(tElement.contents());

      tElement.append(innerElement)
              .addClass('tabs-' + $ionicConfig.tabs.position() + ' tabs-' + $ionicConfig.tabs.style());

      return { pre: prelink, post: postLink };
      function prelink($scope, $element, $attr, tabsCtrl) {
        var deregisterInstance = $ionicTabsDelegate._registerInstance(
          tabsCtrl, $attr.delegateHandle, tabsCtrl.hasActiveScope
        );

        tabsCtrl.$scope = $scope;
        tabsCtrl.$element = $element;
        tabsCtrl.$tabsElement = jqLite($element[0].querySelector('.tabs'));

        $scope.$watch(function() { return $element[0].className; }, function(value) {
          var isTabsTop = value.indexOf('tabs-top') !== -1;
          var isHidden = value.indexOf('tabs-item-hide') !== -1;
          $scope.$hasTabs = !isTabsTop && !isHidden;
          $scope.$hasTabsTop = isTabsTop && !isHidden;
          $scope.$emit('$ionicTabs.top', $scope.$hasTabsTop);
        });

        function emitLifecycleEvent(ev, data) {
          ev.stopPropagation();
          var previousSelectedTab = tabsCtrl.previousSelectedTab();
          if (previousSelectedTab) {
            previousSelectedTab.$broadcast(ev.name.replace('NavView', 'Tabs'), data);
          }
        }

        $scope.$on('$ionicNavView.beforeLeave', emitLifecycleEvent);
        $scope.$on('$ionicNavView.afterLeave', emitLifecycleEvent);
        $scope.$on('$ionicNavView.leave', emitLifecycleEvent);

        $scope.$on('$destroy', function() {
          // variable to inform child tabs that they're all being blown away
          // used so that while destorying an individual tab, each one
          // doesn't select the next tab as the active one, which causes unnecessary
          // loading of tab views when each will eventually all go away anyway
          $scope.$tabsDestroy = true;
          deregisterInstance();
          tabsCtrl.$tabsElement = tabsCtrl.$element = tabsCtrl.$scope = innerElement = null;
          delete $scope.$hasTabs;
          delete $scope.$hasTabsTop;
        });
      }

      function postLink($scope, $element, $attr, tabsCtrl) {
        if (!tabsCtrl.selectedTab()) {
          // all the tabs have been added
          // but one hasn't been selected yet
          tabsCtrl.select(0);
        }
      }
    }
  };
}]);

/**
* @ngdoc directive
* @name ionTitle
* @module ionic
* @restrict E
*
* Used for titles in header and nav bars. New in 1.2
*
* Identical to <div class="title"> but with future compatibility for Ionic 2
*
* @usage
*
* ```html
* <ion-nav-bar>
*   <ion-title>Hello</ion-title>
* <ion-nav-bar>
* ```
*/
IonicModule
.directive('ionTitle', [function() {
  return {
    restrict: 'E',
    compile: function(element) {
      element.addClass('title');
    }
  };
}]);

/**
 * @ngdoc directive
 * @name ionToggle
 * @module ionic
 * @codepen tfAzj
 * @restrict E
 *
 * @description
 * A toggle is an animated switch which binds a given model to a boolean.
 *
 * Allows dragging of the switch's nub.
 *
 * The toggle behaves like any [AngularJS checkbox](http://docs.angularjs.org/api/ng/input/input[checkbox]) otherwise.
 *
 * @param toggle-class {string=} Sets the CSS class on the inner `label.toggle` element created by the directive.
 *
 * @usage
 * Below is an example of a toggle directive which is wired up to the `airplaneMode` model
 * and has the `toggle-calm` CSS class assigned to the inner element.
 *
 * ```html
 * <ion-toggle ng-model="airplaneMode" toggle-class="toggle-calm">Airplane Mode</ion-toggle>
 * ```
 */
IonicModule
.directive('ionToggle', [
  '$timeout',
  '$ionicConfig',
function($timeout, $ionicConfig) {

  return {
    restrict: 'E',
    replace: true,
    require: '?ngModel',
    transclude: true,
    template:
      '<div class="item item-toggle">' +
        '<div ng-transclude></div>' +
        '<label class="toggle">' +
          '<input type="checkbox">' +
          '<div class="track">' +
            '<div class="handle"></div>' +
          '</div>' +
        '</label>' +
      '</div>',

    compile: function(element, attr) {
      var input = element.find('input');
      forEach({
        'name': attr.name,
        'ng-value': attr.ngValue,
        'ng-model': attr.ngModel,
        'ng-checked': attr.ngChecked,
        'ng-disabled': attr.ngDisabled,
        'ng-true-value': attr.ngTrueValue,
        'ng-false-value': attr.ngFalseValue,
        'ng-change': attr.ngChange,
        'ng-required': attr.ngRequired,
        'required': attr.required
      }, function(value, name) {
        if (isDefined(value)) {
          input.attr(name, value);
        }
      });

      if (attr.toggleClass) {
        element[0].getElementsByTagName('label')[0].classList.add(attr.toggleClass);
      }

      element.addClass('toggle-' + $ionicConfig.form.toggle());

      return function($scope, $element) {
        var el = $element[0].getElementsByTagName('label')[0];
        var checkbox = el.children[0];
        var track = el.children[1];
        var handle = track.children[0];

        var ngModelController = jqLite(checkbox).controller('ngModel');

        $scope.toggle = new ionic.views.Toggle({
          el: el,
          track: track,
          checkbox: checkbox,
          handle: handle,
          onChange: function() {
            if (ngModelController) {
              ngModelController.$setViewValue(checkbox.checked);
              $scope.$apply();
            }
          }
        });

        $scope.$on('$destroy', function() {
          $scope.toggle.destroy();
        });
      };
    }

  };
}]);

/**
 * @ngdoc directive
 * @name ionView
 * @module ionic
 * @restrict E
 * @parent ionNavView
 *
 * @description
 * A container for view content and any navigational and header bar information. When a view
 * enters and exits its parent {@link ionic.directive:ionNavView}, the view also emits view
 * information, such as its title, whether the back button should be displayed or not, whether the
 * corresponding {@link ionic.directive:ionNavBar} should be displayed or not, which transition the view
 * should use to animate, and which direction to animate.
 *
 * *Views are cached to improve performance.* When a view is navigated away from, its element is
 * left in the DOM, and its scope is disconnected from the `$watch` cycle. When navigating to a
 * view that is already cached, its scope is reconnected, and the existing element, which was
 * left in the DOM, becomes active again. This can be disabled, or the maximum number of cached
 * views changed in {@link ionic.provider:$ionicConfigProvider}, in the view's `$state` configuration, or
 * as an attribute on the view itself (see below).
 *
 * @usage
 * Below is an example where our page will load with a {@link ionic.directive:ionNavBar} containing
 * "My Page" as the title.
 *
 * ```html
 * <ion-nav-bar></ion-nav-bar>
 * <ion-nav-view>
 *   <ion-view view-title="My Page">
 *     <ion-content>
 *       Hello!
 *     </ion-content>
 *   </ion-view>
 * </ion-nav-view>
 * ```
 *
 * ## View LifeCycle and Events
 *
 * Views can be cached, which means ***controllers normally only load once***, which may
 * affect your controller logic. To know when a view has entered or left, events
 * have been added that are emitted from the view's scope. These events also
 * contain data about the view, such as the title and whether the back button should
 * show. Also contained is transition data, such as the transition type and
 * direction that will be or was used.
 *
 * Life cycle events are emitted upwards from the transitioning view's scope. In some cases, it is
 * desirable for a child/nested view to be notified of the event.
 * For this use case, `$ionicParentView` life cycle events are broadcast downwards.
 *
 * <table class="table">
 *  <tr>
 *   <td><code>$ionicView.loaded</code></td>
 *   <td>The view has loaded. This event only happens once per
 * view being created and added to the DOM. If a view leaves but is cached,
 * then this event will not fire again on a subsequent viewing. The loaded event
 * is good place to put your setup code for the view; however, it is not the
 * recommended event to listen to when a view becomes active.</td>
 *  </tr>
 *  <tr>
 *   <td><code>$ionicView.enter</code></td>
 *   <td>The view has fully entered and is now the active view.
 * This event will fire, whether it was the first load or a cached view.</td>
 *  </tr>
 *  <tr>
 *   <td><code>$ionicView.leave</code></td>
 *   <td>The view has finished leaving and is no longer the
 * active view. This event will fire, whether it is cached or destroyed.</td>
 *  </tr>
 *  <tr>
 *   <td><code>$ionicView.beforeEnter</code></td>
 *   <td>The view is about to enter and become the active view.</td>
 *  </tr>
 *  <tr>
 *   <td><code>$ionicView.beforeLeave</code></td>
 *   <td>The view is about to leave and no longer be the active view.</td>
 *  </tr>
 *  <tr>
 *   <td><code>$ionicView.afterEnter</code></td>
 *   <td>The view has fully entered and is now the active view.</td>
 *  </tr>
 *  <tr>
 *   <td><code>$ionicView.afterLeave</code></td>
 *   <td>The view has finished leaving and is no longer the active view.</td>
 *  </tr>
 *  <tr>
 *   <td><code>$ionicView.unloaded</code></td>
 *   <td>The view's controller has been destroyed and its element has been
 * removed from the DOM.</td>
 *  </tr>
 *  <tr>
 *   <td><code>$ionicParentView.enter</code></td>
 *   <td>The parent view has fully entered and is now the active view.
 * This event will fire, whether it was the first load or a cached view.</td>
 *  </tr>
 *  <tr>
 *   <td><code>$ionicParentView.leave</code></td>
 *   <td>The parent view has finished leaving and is no longer the
 * active view. This event will fire, whether it is cached or destroyed.</td>
 *  </tr>
 *  <tr>
 *   <td><code>$ionicParentView.beforeEnter</code></td>
 *   <td>The parent view is about to enter and become the active view.</td>
 *  </tr>
 *  <tr>
 *   <td><code>$ionicParentView.beforeLeave</code></td>
 *   <td>The parent view is about to leave and no longer be the active view.</td>
 *  </tr>
 *  <tr>
 *   <td><code>$ionicParentView.afterEnter</code></td>
 *   <td>The parent view has fully entered and is now the active view.</td>
 *  </tr>
 *  <tr>
 *   <td><code>$ionicParentView.afterLeave</code></td>
 *   <td>The parent view has finished leaving and is no longer the active view.</td>
 *  </tr>
 * </table>
 *
 * ## LifeCycle Event Usage
 *
 * Below is an example of how to listen to life cycle events and
 * access state parameter data
 *
 * ```js
 * $scope.$on("$ionicView.beforeEnter", function(event, data){
 *    // handle event
 *    console.log("State Params: ", data.stateParams);
 * });
 *
 * $scope.$on("$ionicView.enter", function(event, data){
 *    // handle event
 *    console.log("State Params: ", data.stateParams);
 * });
 *
 * $scope.$on("$ionicView.afterEnter", function(event, data){
 *    // handle event
 *    console.log("State Params: ", data.stateParams);
 * });
 * ```
 *
 * ## Caching
 *
 * Caching can be disabled and enabled in multiple ways. By default, Ionic will
 * cache a maximum of 10 views. You can optionally choose to disable caching at
 * either an individual view basis, or by global configuration. Please see the
 * _Caching_ section in {@link ionic.directive:ionNavView} for more info.
 *
 * @param {string=} view-title A text-only title to display on the parent {@link ionic.directive:ionNavBar}.
 * For an HTML title, such as an image, see {@link ionic.directive:ionNavTitle} instead.
 * @param {boolean=} cache-view If this view should be allowed to be cached or not.
 * Please see the _Caching_ section in {@link ionic.directive:ionNavView} for
 * more info. Default `true`
 * @param {boolean=} can-swipe-back If this view should be allowed to use the swipe to go back gesture or not.
 * This does not enable the swipe to go back feature if it is not available for the platform it's running
 * from, or there isn't a previous view. Default `true`
 * @param {boolean=} hide-back-button Whether to hide the back button on the parent
 * {@link ionic.directive:ionNavBar} by default.
 * @param {boolean=} hide-nav-bar Whether to hide the parent
 * {@link ionic.directive:ionNavBar} by default.
 */
IonicModule
.directive('ionView', function() {
  return {
    restrict: 'EA',
    priority: 1000,
    controller: '$ionicView',
    compile: function(tElement) {
      tElement.addClass('pane');
      tElement[0].removeAttribute('title');
      return function link($scope, $element, $attrs, viewCtrl) {
        viewCtrl.init();
      };
    }
  };
});

})();