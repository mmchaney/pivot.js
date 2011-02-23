
(function (window) {

  var pivot = window.pivot || (window.pivot = {}),
      document = window.document,
      supplant = pivot.util.supplant;

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

    // Add untransformed matrix to efficiently apply transforms
    matrix: Modernizr.webkitcssmatrix ? new WebKitCSSMatrix() : undefined,   

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
      this.zoomPlane.style.webkitTransform = this.matrix;
      this.track();

      if (!this.tilting) {
        this.tilt();
      }
    },

    zoomOut: function () {
      this.container.classList.remove('zoomed');
      this.zoomed = false;
      this.zoomPlane.style.webkitTransform = this.matrix.translate(0, 0, -this.rows * 800);
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

      this.tiltPlane.style.webkitTransform = this.matrix.rotate(this.currentRotation.x, this.currentRotation.y, 0);
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
    if (Modernizr && Modernizr.webkitcssmatrix && Modernizr.webkitmatchesselector && Modernizr.csstransforms3d) {
      return new pivot.Gallery(options);
    }
  };

}(this));