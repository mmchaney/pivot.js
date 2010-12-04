/*
 * Pivot: A photo gallery using CSS3 3D transforms.
 * 2010-11-21
 *
 * By Markus Messner-Chaney, http://markusmessnerchaney.com
 * Public Domain.
 */

/*jslint white: true, browser: true, devel: true, windows: true, onevar: true, undef: true, eqeqeq: true,
bitwise: true, regexp: true, newcap: true, immed: true, maxlen: 300, indent: 2 */
/*global pivot, Element, Function, Math, Object, WebKitCSSMatrix, Modernizr */

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
    return !!WebKitCSSMatrix;
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
  if (typeof Element !== 'undefined' && !Element.prototype.classList) {
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
(function (window) {

  var pivot = window.pivot || (window.pivot = {}),
      document = window.document,
      supplant = pivot.util.supplant,
      matrix = new WebKitCSSMatrix();

  pivot.Gallery = function (options) {

    var row, column, feedArguments;

    this.wrapper = options.wrapper || document.body;

    this.quality = options.quality || 'medium';

    this.rows = options.rows;
    this.columns = options.columns;

    this.page = 1;
    this.perPage = this.rows * this.columns;

    feedArguments = { perPage: this.rows * this.columns };

    // Choose feed
    if (options.userId) {
      this.feed = pivot.flickr.feeds.user;
      feedArguments.userId = options.userId;
    } else if (options.groupId) {
      this.feed = pivot.flickr.feeds.group;
      feedArguments.groupId = options.groupId;
    } else {
      this.feed = pivot.flickr.feeds.interesting;
    }

    // Insert feed arguments
    this.feed = supplant(this.feed, feedArguments);

    // Holds amount of photos loaded or timed out
    this.photoLoadCount = 0;

    // Holds pivot.Photos
    this.photos = [];

    // Tilt settings/variables
    // -----------------------
    this.allowedRotation = options.allowedRotation || (window.orientation) ? 120 : 90;

    // Holds how fast tilting reacts to mouse movement.
    // Lower is faster.
    this.tiltLag = 7;

    this.rotationDelta = { x: 0, y: 0 };
    this.movementCoordinates = { x: 0, y: 0 };
    this.currentRotation = { x: 0, y: 0 };

    // Bind some class methods to this object
    // --------------------------------------

    this.onFlickrResult = this.onFlickrResult.bind(this);
    this.getNextFlickrPage = this.getNextFlickrPage.bind(this);
    this.constrainLayout = this.constrainLayout.bind(this);
    this.tilt = this.tilt.bind(this);

    // Setup DOM
    // ---------

    this.container = pivot.util.makeElement('div', { 'class': 'pivot' });

    if (!options.wrapper) {
      this.container.classList.add('fullscreen');
    }

    this.wrapper.appendChild(this.container);

    this.viewport = pivot.util.makeElement('div', { 'class': 'p-viewport' });

    this.zoomPlane = pivot.util.makeElement('div', { 'class': 'p-zoom-plane' });
    this.viewport.appendChild(this.zoomPlane);

    this.tiltPlane = pivot.util.makeElement('div', { 'class': 'p-tilt-plane' });
    this.zoomPlane.appendChild(this.tiltPlane);

    this.trackingPlane = pivot.util.makeElement('div', { 'class': 'p-tracking-plane' });
    this.tiltPlane.appendChild(this.trackingPlane);

    for (row = 0; row < this.rows; row++) {
      for (column = 0; column < this.columns; column++) {
        this.photos.push(new pivot.Photo({
          container: this.trackingPlane,
          row: row,
          column: column,
          rows: this.rows,
          quality: this.quality
        }));
      }
    }

    this.controls = pivot.util.makeElement('div', { 'class': 'p-controls' });

    this.refresh = pivot.util.makeElement('button', { 'class': 'p-refresh' });
    this.controls.appendChild(this.refresh);

    this.constrainLayout();

    this.container.appendChild(this.viewport);
    this.container.appendChild(this.controls);

    // Setup events
    // ------------

    window.addEventListener('resize', this.constrainLayout, false);
    this.trackingPlane.addEventListener('load', this.onPhotoLoaded.bind(this), false);
    document.addEventListener('keydown', this.onKeyDown.bind(this), false);
    pivot.util.delegate(this.viewport, '.p-photo', 'click', this.onPhotoClickDelegate.bind(this));
    this.viewport.addEventListener('mousewheel', this.onViewportMouseWheel.bind(this), false);
    this.refresh.addEventListener('click', this.getNextFlickrPage, false);

    this.zoomOut = this.zoomOut.bind(this);
    this.container.addEventListener('click', this.zoomOut, false);

    if (Modernizr.devicemotion) {
      window.addEventListener('devicemotion', this.onDeviceMotion.bind(this), false);
      window.addEventListener('orientationchange', this.constrainLayout, false);
    } else {
      this.container.addEventListener('mousemove', this.onContainerMouseMove.bind(this), false);
    }

    if (Modernizr.touch) {
      pivot.util.preventTouchScroll(document.body);
      pivot.util.gesturize(this.viewport, 'swipeleft', this.cycle.bind(this, 'next'), true, false);
      pivot.util.gesturize(this.viewport, 'swiperight', this.cycle.bind(this, 'prev'), true, false);
    }

    // Finalize setup
    // --------------

    this.zoomOut();
    this.getFlickrPage = this.getFlickrPage.bind(this);
    setTimeout(this.getFlickrPage, 400);
    this.setSelectedPhoto(this.getPhoto(0, 0));

  };

  pivot.Gallery.prototype = {

    // Make zoomPlane square and centered within viewport
    constrainLayout: function () {
      var width = this.container.offsetWidth,
          height = this.container.offsetHeight,
          min = Math.min(width, height);

      this.zoomPlane.style.width = this.zoomPlane.style.height = min + 'px';

      if (width > height) {
        this.zoomPlane.style.left = (width - height) / 2 + 'px';
        this.zoomPlane.style.top = 0;
      } else {
        this.zoomPlane.style.top = (height - width) / 2 + 'px';
        this.zoomPlane.style.left = 0;
      }
    },

    // Photo selection
    // ---------------

    getPhoto: function (row, column) {
      var selector = supplant('.p-photo[data-row="{row}"][data-column="{column}"]', row, column);
      return this.container.querySelector(selector);
    },

    getSelectedPhoto: function () {
      return this.container.querySelector('.p-photo.selected');
    },

    setSelectedPhoto: function (photo) {
      var selectedPhoto = this.getSelectedPhoto();

      if (selectedPhoto) {
        selectedPhoto.classList.remove('selected');
        selectedPhoto.classList.remove('flipped');
      }

      photo.classList.add('selected');

      this.track();

      return photo;
    },

    cycle: function (direction) {
      var selectedPhoto = this.getSelectedPhoto(),
          row = selectedPhoto ? parseInt(selectedPhoto.getAttribute('data-row'), 10) : 0,
          column = selectedPhoto ? parseInt(selectedPhoto.getAttribute('data-column'), 10) : 0;

      switch (direction) {
      case 'left':
        column = pivot.util.mod(column - 1, this.columns);
        break;
      case 'right':
        column = (column + 1) % this.columns;
        break;
      case 'up':
        row = pivot.util.mod(row - 1, this.rows);
        break;
      case 'down':
        row = (row + 1) % this.rows;
        break;      
      case 'next':
        if (column < this.columns - 1) {
          column++;
        } else {
          column = 0;
          row = (row < this.rows - 1) ? row + 1 : 0;
        }
        break;
      case 'prev':
        if (column) { // !== 0
          column--;
        } else {
          column = this.columns - 1;
          row = row ? row - 1 : this.rows - 1;
        }
        break;
      }

      this.setSelectedPhoto(this.getPhoto(row, column));
    },

    // Flickr XHR
    // ----------

    sendFlickrRequest: function (feed) {
      this.photoLoadCount = 0;
      this.container.classList.add('gallery-loading');
      pivot.util.getJSON(feed, this.onFlickrResult);
    },

    onFlickrResult: function (data) {
      data.photos.photo.forEach(

      function (data, index) {
        this.photos[index].insertFlickrData(data);
      }, this);

      // If amount of photos returned is less than space available clear source of unused photos.
      // Increase photoLoadCount by unused amount as setting source to '' does not generate event.
      this.photoLoadCount += this.photos.length - data.photos.photo.length;
      this.photos.slice(data.photos.photo.length).forEach(

      function (photo) {
        photo.setSource('');
      });
    },

    getFlickrPage: function (page) {
      this.page = (page > 0) ? page : 1;
      this.sendFlickrRequest(supplant(this.feed, {
        page: this.page
      }));
    },

    getNextFlickrPage: function () {
      this.getFlickrPage(this.page + 1);
    },

    // 3D movement
    // -----------

    zoomIn: function () {
      this.container.classList.add('zoomed');
      this.zoomed = true;
      this.zoomPlane.style.webkitTransform = matrix;
      this.track();

      if (!this.tilting) {
        this.tilt();
      }
    },

    zoomOut: function () {
      this.container.classList.remove('zoomed');
      this.zoomed = false;
      this.zoomPlane.style.webkitTransform = matrix.translate(0, 0, -this.rows * 800);
      this.track();
    },

    track: function () {
      var selectedPhoto, trackingTransform;

      if (this.zoomed) {
        // Center selected photo in viewport
        selectedPhoto = this.getSelectedPhoto();
        trackingTransform = supplant('translate3d({x}%, {y}%, -150px)', {
          x: selectedPhoto.getAttribute('data-column') * -100,
          y: selectedPhoto.getAttribute('data-row') * -100
        });
      } else {
        // Center gallery in viewport
        trackingTransform = supplant('translate3d({x}%, {y}%, 1px)', {
          x: (this.columns / 2) * -100 + 50,
          y: (this.rows / 2) * -100 + 50
        });
      }

      this.trackingPlane.style.webkitTransform = trackingTransform;
    },

    tilt: function () {
      var allowedRotation = (this.zoomed && window.orientation === undefined) ? this.allowedRotation / 4 : this.allowedRotation;

      this.tilting = true;

      // Rotation on x and y axis is proportional to mouse position within the container or device movement
      this.rotationDelta.x = (allowedRotation * (this.movementCoordinates.y - 0.5) - this.currentRotation.x) / this.tiltLag;
      this.rotationDelta.y = (allowedRotation * (this.movementCoordinates.x - 0.5) + this.currentRotation.y) / this.tiltLag;

      this.currentRotation.x += this.rotationDelta.x;
      this.currentRotation.y -= this.rotationDelta.y;

      this.tiltPlane.style.webkitTransform = matrix.rotate(this.currentRotation.x, this.currentRotation.y, 0);
      //this.tiltPlane.style.webkitTransform = supplant('rotateX({x}deg) rotateY({y}deg)', this.currentRotation.x, this.currentRotation.y);

      // Continue tilting if deltas are still reasonably large
      if (Math.abs(this.rotationDelta.x) + Math.abs(this.rotationDelta.y) > 0.05) {
        setTimeout(this.tilt, 1000 / 30); // Continue rotation at 30 fps
      } else {
        this.tilting = false;
      }
    },

    // Event handlers
    // --------------

    onPhotoLoaded: function () {
      this.photoLoadCount++;

      if (this.photoLoadCount === this.photos.length) {
        this.container.classList.remove('gallery-loading');
      }
    },

    onPhotoClickDelegate: function (event) {
      var photo = pivot.util.ancestor(event.target, '.p-photo');

      if (event.target !== photo) {
        event.stopPropagation();
      }

      this.setSelectedPhoto(photo);
      if (!this.zoomed) {
        this.zoomIn();
      }
    },

    onViewportMouseWheel: function (event) {
      if (event.wheelDelta < 0) {
        this.zoomOut();
      } else {
        this.onPhotoClickDelegate(event);
      }
    },

    // Define some keyboard shortcuts
    onKeyDown: function (event) {
      switch (event.keyCode) {
      case 37:  // Left arrow. Previous Photo.
        this.cycle('left');
        break;
      case 39: // Right arrow. Next Photo.
        this.cycle('right');
        break;
      case 38: // Up arrow. Photo above.
        this.cycle('up');
        break;
      case 40: // Down arrow. Photo beneath.
        this.cycle('down');
        break;
      case 13: // Enter. Flip photo.
        this.getSelectedPhoto().classList.toggle('flipped');
        break;
      case 82: // R. Next page.
        this.getNextFlickrPage();
        break;
      case 32: // Spacebar. Toggle zoom.
        if (this.zoomed) {
          this.zoomOut();
        } else {
          this.zoomIn();
        }
        break;
      }
    },

    onContainerMouseMove: function (event) {
      this.movementCoordinates = pivot.util.localCoordinates(event, this.container);

      if (!this.tilting) {
        this.tilt();
      }
    },

    onDeviceMotion: function (event) {
      var portrait = (window.orientation % 180) === 0,
          vertAxis = portrait ? 'x' : 'y',
          horizAxis = portrait ? 'y' : 'x',
          mod;

      mod = {
        x: (window.orientation === 180 || window.orientation === 90) ? -1 : 1,
        y: (window.orientation === 0 || window.orientation === 90) ? -1 : 1
      };

      this.movementCoordinates.x = (mod[vertAxis] * event.accelerationIncludingGravity[vertAxis] + 10) / 20;
      this.movementCoordinates.y = (mod[horizAxis] * event.accelerationIncludingGravity[horizAxis] + 10) / 20;

      if (!this.tilting) {
        this.tilt();
      }
    },

    onOrientationChange: function (event) {
      this.constrainLayout();
    }

  };

  pivot.setup = function (options) {
    if (Modernizr && Modernizr.webkitmatchesselector && Modernizr.csstransforms3d) {
      return new pivot.Gallery(options);
    }
  };

}(this));
(function (window) {

  var pivot = window.pivot || (window.pivot = {}),
      document = window.document,
      supplant = pivot.util.supplant;

  pivot.Photo = function (options) {

    this.row = options.row;
    this.column = options.column;
    this.rows = options.rows;
    
    this.quality = options.quality;

    // Define load event to bubble towards gallery
    // when the photo is done loading (or failed loading)
    this.loadEvent = document.createEvent('Events');
    this.loadEvent.initEvent('load', true, false);

    // Setup DOM
    // ---------
    
    this.container = pivot.util.makeElement('figure', {
      'class': 'p-photo loading no-img',
      'data-row': this.row,
      'data-column': this.column
    });
    this.container.style.webkitTransform = supplant('translate3d({x}%, {y}%, 1px)', {
      x: this.column * 100,
      y: this.row * 100
    });

    this.backing = pivot.util.makeElement('div', {
      'class': 'p-backing'
    });

    // Set random starting position for backing element
    this.backing.style.cssText = supplant('-webkit-transform: translate3d({x}px, {y}px, {z}px) rotate({r}deg); opacity: 0;', {
      x: Math.random() * 2000 - 1000,
      y: Math.random() * 2000 - 1000,
      z: Math.random() * -16000,
      r: Math.random() * -16000
    });

    this.container.appendChild(this.backing);

    this.imageWrapper = pivot.util.makeElement('div', {
      'class': 'p-image-wrapper'
    });
    this.container.appendChild(this.imageWrapper);

    this.caption = pivot.util.makeElement('figcaption');
    this.imageWrapper.appendChild(this.caption);

    this.image = pivot.util.makeElement('img', {
      draggable: false
    });
    this.imageWrapper.appendChild(this.image);

    this.imagePreloader = new Image();

    options.container.appendChild(this.container);

    // Setup events
    // ------------

    this.completeLoading = this.completeLoading.bind(this);

    this.imagePreloader.addEventListener('load', this.onImagePreloaderLoad.bind(this), false);
    this.imagePreloader.addEventListener('error', this.onImagePreloaderError.bind(this), false);

    this.imageWrapper.addEventListener('click', this.onImageWrapperClick.bind(this), false);

    this.backing.addEventListener('webkitAnimationEnd', this.onBackingAnimationEnd.bind(this), false);

    // Finalize setup
    // --------------

    // Reset 'backing' transform on next redraw
    setTimeout(this.resetBackingTransform.bind(this), 0);

  };

  pivot.Photo.prototype = {

    setSource: function (source) {
      if (this.image.src !== source) {
        this.container.classList.add('loading');
        this.container.classList.remove('flipped');
        this.imagePreloader.src = source;
      } else {
        this.onImagePreloaderError();
      }
    },

    setCaption: function (caption) {
      this.caption.innerHTML = caption;
    },

    insertFlickrData: function (data) {
      // Add page url property based on flickr page url template
      data.pageURL = supplant(pivot.flickr.pageURL, data);

      data.title = data.title || 'Untitled';
      this.setCaption(supplant(pivot.flickr.captionTemplate, data));
      this.setSource(supplant(pivot.flickr.sourceURLs[this.quality], data));
    },

    resetBackingTransform: function () {
      this.backing.style.cssText = '';
    },

    completeLoading: function () {
      // Set source of visible image
      this.image.src = this.imagePreloader.src;

      // Check aspect ratio of new image
      var ar = this.image.naturalWidth / this.image.naturalHeight;

      // Setup dimensions/offsets so image wrapper is centered
      if (ar > 1) {
        this.wrapperDimensions = supplant('top: {top}%; left: 5%; width: 90%; height: {height}%;', {
          top: (100 - 90 / ar) / 2,
          height: 90 / ar
        });
      } else {
        this.wrapperDimensions = supplant('top: 5%; left: {left}%; width: {width}%; height: 90%;', {
          left: (100 - 90 * ar) / 2,
          width: 90 * ar
        });
      }
      
      this.imageWrapper.style.cssText = this.wrapperDimensions;

      // Unhides image wrapper
      this.container.classList.remove('loading');
      this.container.classList.remove('no-img');

      // Plays 'fly-in' animation
      this.container.classList.add('done-loading');

      // Bubble a load event for the gallery to catch
      this.container.dispatchEvent(this.loadEvent);
    },

    // Event handlers
    // --------------

    onBackingAnimationEnd: function (event) {
      // Set backing size to recently calculated dimensions/offset.
      // This ensures that the backing flying aways has the same size as the photo being replaced.
      this.backing.style.cssText = this.wrapperDimensions;
      this.container.classList.remove('done-loading');
    },

    onImagePreloaderLoad: function () {
      // Delay setting of image src
      setTimeout(this.completeLoading, (this.column + this.row * this.rows) * 250);
    },

    onImagePreloaderError: function () {
      this.container.classList.add('no-img');
      // On error dispatch event anyway to signal gallery that
      // this image isn't loading anymore
      this.container.dispatchEvent(this.loadEvent);
    },

    onImageWrapperClick: function (event) {
      if (this.container.webkitMatchesSelector('.pivot.zoomed .p-photo.selected')) {
        event.stopPropagation();    
        this.container.classList.toggle('flipped');
      }
    }

  };

}(this));
(function (window) {

  var pivot = window.pivot || (window.pivot = {});

  pivot.flickr = {
    captionTemplate: '<h1><a href="{pageURL}" target="blank" tabindex="-1">{title}</a></h1><p> By {ownername}</p>',
    
    sourceURLs: {
      high: 'http://farm{farm}.static.flickr.com/{server}/{id}_{secret}_b.jpg',
      medium: 'http://farm{farm}.static.flickr.com/{server}/{id}_{secret}_z.jpg',
      low: 'http://farm{farm}.static.flickr.com/{server}/{id}_{secret}_m.jpg'
    },
    
    pageURL: 'http://www.flickr.com/photos/{owner}/{id}',

    feeds: {
      user: 'http://api.flickr.com/services/rest/?method=flickr.people.getPublicPhotos&api_key=6fff138dbd0fbe330c07a67c47c9cc21&user_id={userId}&per_page={perPage}&page={page}&extras=description,owner_name&format=json&nojsoncallback=1',

      group: 'http://api.flickr.com/services/rest/?method=flickr.groups.pools.getPhotos&api_key=6fff138dbd0fbe330c07a67c47c9cc21&group_id={groupId}&per_page={perPage}&page={page}&extras=description,owner_name&format=json&nojsoncallback=1',

      interesting: 'http://api.flickr.com/services/rest/?method=flickr.interestingness.getList&api_key=6fff138dbd0fbe330c07a67c47c9cc21&per_page={perPage}&page={page}&extras=description,owner_name&format=json&nojsoncallback=1'
    }
  };

}(this));