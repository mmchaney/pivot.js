
(function (window) {

  var pivot = window.pivot || (window.pivot = {}),
      document = window.document,
      supplant = pivot.util.supplant,
      transform = Modernizr.prefixed("Transform");

  pivot.Photo = function (options) {

    this.row = options.row;
    this.column = options.column;
    this.rows = options.rows;

    this.quality = options.quality;

    // Define load event to bubble towards gallery
    // when the photo is done loading (or failed loading)
    this.loadEvent = document.createEvent("Events");
    this.loadEvent.initEvent("load", true, false);

    // Setup DOM
    // ---------

    this.container = pivot.util.makeElement("figure", {
      "class": "p-photo loading no-img",
      "data-row": this.row,
      "data-column": this.column
    });
    this.container.style[transform] = supplant("translate3d({x}%, {y}%, 1px)", {
      x: this.column * 100,
      y: this.row * 100
    });

    this.backing = pivot.util.makeElement("div", {
      "class": "p-backing"
    });

    // Set random starting position for backing element
    this.backing.style[transform] = supplant("translate3d({x}px, {y}px, {z}px) rotate({r}deg)", {
      x: Math.random() * 2000 - 1000,
      y: Math.random() * 2000 - 1000,
      z: Math.random() * -16000,
      r: Math.random() * -16000
    });

    this.backing.style.opacity = 0;

    this.container.appendChild(this.backing);

    this.imageWrapper = pivot.util.makeElement("div", {
      "class": "p-image-wrapper"
    });
    this.container.appendChild(this.imageWrapper);

    this.caption = pivot.util.makeElement("figcaption");
    this.imageWrapper.appendChild(this.caption);

    this.image = pivot.util.makeElement("img", {
      draggable: false
    });
    this.imageWrapper.appendChild(this.image);

    this.imagePreloader = new Image();

    options.container.appendChild(this.container);

    // Setup events
    // ------------

    this.completeLoading = this.completeLoading.bind(this);

    this.imagePreloader.addEventListener("load", this.onImagePreloaderLoad.bind(this), false);
    this.imagePreloader.addEventListener("error", this.onImagePreloaderError.bind(this), false);

    this.imageWrapper.addEventListener("click", this.onImageWrapperClick.bind(this), false);

    this.backing.addEventListener("webkitAnimationEnd", this.onBackingAnimationEnd = this.onBackingAnimationEnd.bind(this), false);
    this.backing.addEventListener('animationend', this.onBackingAnimationEnd, false);

    // Finalize setup
    // --------------

    // Reset 'backing' transform on next redraw
    setTimeout(this.resetBackingTransform.bind(this), 0);

  };

  pivot.Photo.prototype = {

    setSource: function (source) {
      if (this.image.src !== source) {
        this.container.classList.add("loading");
        this.container.classList.remove("flipped");
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

      data.title = data.title || "Untitled";
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
        this.wrapperDimensions = supplant("top: {top}%; left: 5%; width: 90%; height: {height}%;", {
          top: (100 - 90 / ar) / 2,
          height: 90 / ar
        });
      } else {
        this.wrapperDimensions = supplant("top: 5%; left: {left}%; width: {width}%; height: 90%;", {
          left: (100 - 90 * ar) / 2,
          width: 90 * ar
        });
      }

      this.imageWrapper.style.cssText = this.wrapperDimensions;

      // Unhides image wrapper
      this.container.classList.remove("loading");
      this.container.classList.remove("no-img");

      // Plays 'fly-in' animation
      this.container.classList.add("done-loading");

      // Bubble a load event for the gallery to catch
      this.container.dispatchEvent(this.loadEvent);
    },

    // Event handlers
    // --------------

    onBackingAnimationEnd: function (event) {
      // Set backing size to recently calculated dimensions/offset.
      // This ensures that the backing flying aways has the same size as the photo being replaced.
      this.backing.style.cssText = this.wrapperDimensions;
      this.container.classList.remove("done-loading");
    },

    onImagePreloaderLoad: function () {
      // Delay setting of image src
      setTimeout(this.completeLoading, (this.column + this.row * this.rows) * 250);
    },

    onImagePreloaderError: function () {
      this.container.classList.add("no-img");
      // On error dispatch event anyway to signal gallery that
      // this image isn't loading anymore
      this.container.dispatchEvent(this.loadEvent);
    },

    onImageWrapperClick: function (event) {
      if (pivot.util.matchesSelector(this.container, ".pivot.zoomed .p-photo.selected")) {
        event.stopPropagation();
        this.container.classList.toggle("flipped");
      }
    }

  };

}(this));
