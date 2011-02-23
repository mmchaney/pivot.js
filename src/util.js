
(function (window) {

  var pivot = window.pivot || (window.pivot = {}),
      document = window.document;

  pivot.util = {};
  pivot.util.slice = [].slice;
  
  // Add class to body for Windows Chrome.
  // CSS styles are then set differently to prevent severe aliasing on Windows Chrome.
  Modernizr.addTest('skia', function () {
    return (/Win/).test(window.navigator.platform) && (/Chrome/).test(window.navigator.userAgent);
  });

  Modernizr.addTest('devicemotion', function () {
    return window.ondevicemotion !== undefined;
  });
  
  Modernizr.addTest('webkitmatchesselector', function () {
    return Element && !!Element.prototype.webkitMatchesSelector;
  });

  Modernizr.addTest('webkitcssmatrix', function () {
    return !!window.WebKitCSSMatrix;
  });

  // Utility functions
  // -----------------

  function makeElement(tagName, attributes) {
    var element = document.createElement(tagName),
        prop;

    for (prop in attributes) {
      if (prop === 'class') {
        element.className = attributes[prop];
      } else {
        element.setAttribute(prop, attributes[prop]);
      }
    }

    return element;
  }
  
  function delegate(element, selector, type, listener) {
    element.addEventListener(type, function (event) {
      var target = event.target,
      nodes = pivot.util.slice.call(element.querySelectorAll(selector));
      while (target && nodes.indexOf(target) < 0) {
        target = target.parentNode;
      }
      if (target && target !== element && target !== document) {
        listener.call(target, event);
      }
    }, false);
  }  
  
  function ancestor(element, selector) {
    while (element !== document && !element.webkitMatchesSelector(selector)) {
      element = element.parentNode;
    } 
    return element;
  }

  function supplant(string) {
    var args = pivot.util.slice.call(arguments),
        i = 0,
        arg;
    if (typeof(args[1]) === 'object') {
      return string.replace(/\{(\w+)\}/g, function () {
        return (args[1][arguments[1]] !== undefined) ? args[1][arguments[1]] : arguments[0];
      });
    } else {
      return string.replace(/\{(\w*)\}/g, function () {
        arg = args[++i];
        return (arg !== undefined) ? arg : arguments[0];
      });
    }
  }

  function getJSON(url, callback) {
    var request = new XMLHttpRequest();

    request.addEventListener("readystatechange", function (event) {
      if (request.readyState === 4 && request.status === 200) {
        callback(JSON.parse(request.responseText));
      }
    }, false);

    request.open("GET", url, true);
    request.send();
  }

  // Normalized mouse position local to element
  function localCoordinates(event, target) {
    var box;

    target = target || event.target;
    box = target.getBoundingClientRect();

    return {
      x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)),
      y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)),
      box: box
    };
  }

  function mod(a, b) {
    return (a % b + b) % b;
  }

  function Gesturized(element, type, handler) {
    this.element = element;
    this.setType(type);
    
    this.element.addEventListener(type, handler, false);
    
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);

    this.element.addEventListener('touchstart', this.onTouchStart, false);
  }
  
  Gesturized.availableEvents = ['swipeleft', 'swiperight'];

  Gesturized.prototype = {
    
    setType: function (type) {
      this.type = type.toLowerCase();
      this.event = document.createEvent('Events');
      this.event.initEvent(type, true, false);              
    },
    
    dispatchEvent: function (target, type) {
      if (this.type === type.toLowerCase()) {
        target.dispatchEvent(this.event);
      }
    },
    
    getCoords: function (event) {
      return {
        x: event.touches[0].pageX,
        y: event.touches[0].pageY
      };
    },    

    onTouchStart: function (event) {
      if ((this.startCoords = this.getCoords(event))) {
        this.element.addEventListener('touchend', this.onTouchEnd, false);
        this.element.addEventListener('touchmove', this.onTouchMove, false);
      }
    },

    onTouchMove: function (event) {
      this.moveCoords = this.getCoords(event);
    },

    onTouchEnd: function (event) {  
      var diff;

      this.element.removeEventListener('touchend', this.onTouchEnd, false);
      this.element.removeEventListener('touchmove', this.onTouchMove, false);

      // Check for swipes   
      if (this.moveCoords) {
        diff = {
          x: this.startCoords.x - this.moveCoords.x,
          y: this.startCoords.y - this.moveCoords.y
        };
        if (Math.abs(diff.x) > 30 || Math.abs(diff.y) > 30) {
          this.dispatchEvent(event.target, (diff.x > 0) ? 'swipeleft' : 'swiperight');
        }
        delete this.moveCoords;         
      }
    }
  };

  function gesturize(element, type, handler) {
    return new Gesturized(element, type, handler);
  }
  
  function preventTouchScroll(element) {
    var preventScroll = function (event) {
          event.preventDefault();
        };
    element.addEventListener('touchmove', preventScroll, false);
  }

  pivot.util.makeElement = makeElement;
  pivot.util.delegate = delegate;
  pivot.util.ancestor = ancestor;
  pivot.util.supplant = supplant;
  pivot.util.getJSON = getJSON;
  pivot.util.localCoordinates = localCoordinates;
  pivot.util.mod = mod;
  pivot.util.gesturize = gesturize;
  pivot.util.preventTouchScroll = preventTouchScroll;
  
  // ES5 Polyfills
  // -------------
  
  Function.prototype.bind = Function.prototype.bind ||
  function (thisArg) {
    var fn = this,
        args = pivot.util.slice.call(arguments, 1);

    return function () {
      return fn.apply(thisArg, args.concat(pivot.util.slice.call(arguments)));
    };
  };

  // Emulate ES5 getter/setter API using legacy APIs
  if (Object.prototype.__defineGetter__ && !Object.defineProperty) {
    Object.defineProperty = function (obj, prop, desc) {
      if ("get" in desc) {
        obj.__defineGetter__(prop, desc.get);
      }
      if ("set" in desc) {
        obj.__defineSetter__(prop, desc.set);
      }
    };
  }

  // Element::classList (does not fully implement ES5 spec)
  if (typeof Element !== 'undefined' && !Element.hasOwnProperty.call(Element.prototype, 'classList')) {
    (function () {
      var classRE = function (token) {
            return new RegExp('(^|\\s)' + token + '(\\s|$)');
          },
          ClassList = function (element) {
            this.element = element;
          },
          getClassList = function () {
            return new ClassList(this);
          };

      ClassList.prototype = {
        contains: function (token) {
          return classRE(token).test(this.element.className);
        },
        add: function (token) {
          if (!this.contains(token)) {
            this.element.className += (this.element.className ? ' ' : '') + token;
          }
        },
        remove: function (token) {
          this.element.className = this.element.className.replace(classRE(token), ' ').trim();
        },
        toggle: function (token) {
          var boundClassRE = classRE(token);
          if (boundClassRE.test(this.element.className)) {
            this.element.className = this.element.className.replace(boundClassRE, ' ').trim();
          } else {
            this.element.className += (this.element.className ? ' ' : '') + token;
          }
        }
      };

      Object.defineProperty(Element.prototype, 'classList', {
        get: getClassList
      });
    }());
  }

}(this));