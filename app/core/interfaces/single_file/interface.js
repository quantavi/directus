/* global $ */
define([
  'app',
  'underscore',
  'core/t',
  'utils',
  'helpers/file',
  'core/UIView',
  'core/table/table.view',
  'core/overlays/overlays',
  'core/notification',
  './lib/cropperjs/dist/cropper'
], function (app, _, __t, Utils, FileHelper, UIView, TableView, Overlays, Notification, Cropper) {
  'use strict';
  
  var cropper, cData, rData = [];
  var ratiosType = {
	free: {
		objName: 'free',
		title: 'Free',
		value: 0
	},
	16.9: {
		objName: 'sixteen_nine',
		title: '16:9',
		value: 16/9
	},
	4.3: {
		objName: 'four_three',
		title: '4:3',
		value: 4/3
	},
	3.2: {
		objName: 'three_two',
		title: '3:2',
		value: 3/2
	},
	1.1: {
		objName: 'one_one',
		title: '1:1',
		value: 1/1
	}
  };
  
  return UIView.extend({
    // Interface template file
    // the template path is relative to UIs directory
    template: 'single_file/interface',

    openModal: function () {
      app.router.openFileModal(this.fileModel.id);
    },

    chooseFromComputer: function () {
      this.$('#fileInput').click();
    },

    chooseFromUrl: function (event) {
      // Prevent this button from submitting the form
      event.preventDefault();
      app.router.openModal({
        type: 'prompt',
        text: __t('enter_the_url_to_a_file'),
        callback: _.bind(function (url) {
          this.getLinkData(url);
        }, this)
      });
    },

    removeFile: function (event) {
      // stop the event from bubbling and open the modal window
      event.stopPropagation();

      this.fileModel.clear();
      this.fileModel.set({id: null});
    },

    getLinkData: function (url) {
      if (!url) {
        return;
      }

      var model = this.fileModel;
      model.setLink(url, this.options.settings.get('allowed_filetypes'));
    },

    chooseFromSystem: function (event) {
      // Prevent this button from submitting the form
      event.preventDefault();

      var collection = app.files;
      var model;
      var fileModel = this.fileModel;

      var view = new Overlays.ListSelect({collection: collection, selectable: true});
      app.router.overlayPage(view);

      collection.fetch();
      view.itemClicked = _.bind(function (e) {
        var id = $(e.target).closest('tr').attr('data-id');
        model = collection.get(id);

        if (model.isAllowed(this.options.settings.get('allowed_filetypes'))) {
          fileModel.clear({silent: true});
          fileModel.set(_.clone(model.attributes));
        }

        app.router.removeOverlayPage(view);
      }, this);
    },

    edit: function () {
      var OverlayEditView = require('modules/tables/views/OverlayEditView'); // eslint-disable-line import/no-unresolved
      var model = this.fileModel;

      var view = new OverlayEditView({
        model: model,
        onSave: function () {
          model.set(model.diff(view.editView.data()));
          
          //console.log(model);
          app.router.removeOverlayPage(this);
        }
      });
     
     app.router.overlayPage(view);

      // Fetch first time to get the nested tables
      if (!model.isNew()) {
        model.fetch();
      }
    },

    onInputChange: function (event) {
      var target = $(event.currentTarget);
      var file = target[0].files[0];
      var model = this.fileModel;
      var allowed;

      this.uploading = true;
      this.render();

      allowed = model.setFile(file, this.options.settings.get('allowed_filetypes'));
      
      if (allowed === false) {
        this.uploading = false;
        this.render();
        Utils.clearElement(target);
      }
    },

    onModelChange: function () {
      this.uploading = false;
      this.render();
    },
    
    // CROPPER METHODS START
    
    getRatios: function() {
    	let ratios = [];
		if ( this.options.settings.get('available_ratios') ) {
			let rawRatios = this.options.settings.get('available_ratios');
				rawRatios = rawRatios.substring( 1, rawRatios.length-1 );
	        ratios = rawRatios.split(',').map( ratio => {
	        	return ratiosType[ ratio ];
	        });
	    }
		return ratios;
    },
    
    toggleCropper: function(event) {
    	// Set core variables
    	let _ = event.target;
    	let __ = $('.cropper-toggle.active')[0];
    	let newObject = _.dataset.object;
    	let activeObject = __.dataset.object;
    	let preview = $('.c-preview-container').find('.preview');
    	let pImg = preview.find('img');
    	
    	// Prevent cropper-toggle from replacing him self
    	if ( newObject === activeObject || _.id === __.id ) return;
    	
    	// Save last data
    	rData[activeObject] = {
			title: rData[activeObject].title,
			name: rData[activeObject].name,
			preview: rData[activeObject].preview,
			cropData: {
				src: pImg[0].src,
				parentHeight: preview.css('height'),
				parentWidth: preview.css('width'),
				display: pImg.css('display'),
				width: pImg.css('width'),
				height: pImg.css('height'),
				minWidth: pImg.css('min-width'),
				minHeight: pImg.css('min-height'),
				maxWidth: pImg.css('max-width'),
				maxHeight: pImg.css('max-height'),
				imageOrientation: pImg.css('image-orientation'),
				transform: pImg.css('transform')
			},
			aspectRatio: rData[activeObject].aspectRatio,
			data: cropper.getData(),
			containerData: cropper.getContainerData(),
			imageData: cropper.getImageData(),
			canvasData: cropper.getCanvasData(),
			cropBoxData: cropper.getCropBoxData(),
			isNew: false 
    	}
    	
    	//Reset Cropper
    	cropper.reset();
    	
    	//Set new aspect ratio
    	cropper.setAspectRatio( rData[newObject].aspectRatio );
    	
    	//Check if new data source !isNew and load data if true
    	if ( !rData[newObject].isNew ) {
    		cropper.setData( rData[newObject].data );
    		cropper.setCanvasData( rData[newObject].canvasData );
    		cropper.setCropBoxData( rData[newObject].cropBoxData );
    	}
    	
    	//Toggle 'active' class at new
    	$("#" + _.id).addClass('active');
    	
    	//Toggle 'active' class at old
    	$("#" + __.id).removeClass('active');
    	
    },
    
    reset: function() {
    	cropper.reset();
    },
    
    setActive: function( obj ) {
    	// Toggle 'active' class
    	$('.cropper-toggle').removeClass('active');
    	$('#' + obj.name).addClass('active');
    	
    	// Reset
		cropper.reset();
		
		// Set data
		cropper.setAspectRatio( obj.aspectRatio );
		
		// Check if object !isNew and set data if true
		if ( !obj.isNew ) {
			cropper.setData( obj.data );
    		cropper.setCanvasData( obj.canvasData );
    		cropper.setCropBoxData( obj.cropBoxData );
		}
    },
    
    saveCroppedImages: function( croppedImages ) {
    	let encoded = JSON.stringify( croppedImages );
//    	console.log(encoded);
    	
    	// Send data to Ratios Custom Endpoint
		$.ajax({
		  method: "POST",
		  url: "/directus/api/ratios",
		  data: { data: encoded },
		  success: function(result) {
			  console.log(result);
		  },
		  error: function(error) {
			  console.warn(error);
		  }
		})
    },
    
    cropAndSave: function() {
    	console.log('Cropping Started...');

    	var croppedImages = [];
    	
    	cData.ratios.forEach( x => {
    		// Obj declaration
    		let obj = rData[x.objName];
    		
    		// Log
    		console.log('Cropping ' + obj.title);
    		
    		// setActive
    		this.setActive( obj );
    		
    		/*// Toggle 'active' class
    		$('.cropper-toggle').removeClass('active');
    		$('#' + obj.name).addClass('active');
    		
    		// Reset
    		cropper.reset();
    		
    		// Set data
    		cropper.setAspectRatio( obj.aspectRatio );
    		
    		// Check if object !isNew and set data if true
    		if ( !obj.isNew ) {
    			cropper.setData( obj.data );
        		cropper.setCanvasData( obj.canvasData );
        		cropper.setCropBoxData( obj.cropBoxData );
    		}*/
    		
    		// Crop
    		let cropped = cropper.getCroppedCanvas({
				maxWidth: 4096,
				maxHeight: 4096,
				imageSmoothingEnabled: true,
				imageSmoothingQuality: 'high'
			});
    		
    		// Prepare vars
    		let bFile = this.fileModel.attributes;
    		let bFileName = bFile.name.substring(0, bFile.name.indexOf('.'));
    		let bFileSuffix = bFile.name.substring( bFile.name.indexOf('.'), bFile.name.length );
    		
    		// Get ratio from string
    		let r = obj.title.split(":");
    		
    		// Check if r[1] is empty, and give it r[0] value
    		if ( r[1] == undefined )
    			r[1] = r[0];
    		
    		// Create Name and Title
    		let name = bFileName + "-" + r[0] + "-" + r[1] + bFileSuffix;
    		let title = bFile.title + "-" + r[0] + "-" + r[1];
    		
    		// Save to array
    		croppedImages.push({
				title: title,
				name: name,
				ratio: obj.title,
				dir: obj.name,
				encoded: cropped.toDataURL()
    		});
    	} );
		
		console.log('All Cropped!');
		
    	console.log( croppedImages );
    	
    	this.setActive( rData[cData.ratios[0].objName] );
    	
    	this.saveCroppedImages( croppedImages );
    	
    	/*// Open each cropped image in new tab
    	croppedImages.forEach( y => {
    		window.open(y.encoded, '_blank');
    	} );*/
    },
    
    // CROPPER METHODS STOP
    
    initialize: function () {
      console.log('Initialize');
      
      var FilesModel = require('modules/files/FilesModel'); // eslint-disable-line import/no-unresolved
      var parentModel = this.options.model;

      this.uploading = false;
      this.userId = app.user.id;
      if (!(this.options.value instanceof FilesModel)) {
        // Add the files table privileges, preferences and structure
        // the method isNew need the structure
        // See EntriesModel.isNew
        // See https://github.com/directus/directus/issues/1961
        this.options.value = new FilesModel(this.options.value || {}, app.schemaManager.getFullSchema('directus_files'));
        parentModel.set(this.name, this.options.value);
      }

      this.fileModel = this.options.value;

      if (parentModel.isTracking() && !this.fileModel.isTracking()) {
        this.fileModel.startTracking();
      }

      this.listenTo(this.fileModel, 'change', this.onModelChange);

      if (this.collection) {
        this.listenTo(this.collection, 'reset', this.render);
      }
    },
    
    beforeRender: function() {
		console.log('Before Render');
	},
    
    serialize: function () {
    	console.log('Serialize');
        var url;
        var link;
        var fileAvailable = false;

        if (this.fileModel.has('name')) {
          fileAvailable = true;
          if (this.fileModel.isNew()) {
            link = '#';
            url = this.fileModel.get('thumbnailData') || this.fileModel.get('url');
          } else {
            link = this.fileModel.makeFileUrl();
            url = this.fileModel.makeFileUrl(true) || link;
          }
        }

        var data = this.fileModel.toJSON();
        var type = this.fileModel.has('type') ? this.fileModel.get('type').substring(0, this.fileModel.get('type').indexOf('/')) : '';
        var isImage = _.contains(['image', 'embed'], type);
        // TODO: Fix this path
        var thumbUrl = isImage ? url : app.PATH + 'assets/imgs/missing-thumbnail.svg';

        switch (data.type) {
          case 'embed/youtube':
          case 'embed/vimeo':
            data.size = app.seconds_convert(data.size);
            break;
          default:
            data.size = app.bytesToSize(data.size, 0);
        }

        var html = this.fileModel.get('html');
        if (html) {
          html = $(html).css({width: 280, height: 160}).prop('outerHTML');
        }

        data.type = this.fileModel.getSubType(true);
        data.cid = this.fileModel.cid;
        
        // Cropper
        cData = {
			sourceImageAvailable: fileAvailable && isImage,
			sourceImageURL: link,
			shortcutsAllowed: this.options.settings.get('allow_shortcuts'),
			movementAllowed: this.options.settings.get('allow_image_movement'),
			rotationAllowed: this.options.settings.get('allow_image_rotation'),
			flippingAllowed: this.options.settings.get('allow_image_flipping'),
			ratios: this.getRatios()
		};
        // End

        data = {
          uploading: this.uploading,
          isImage: isImage,
          name: this.options.name,
          url: url,
          html: html,
          thumbUrl: thumbUrl,
          comment: this.options.schema.get('comment'),
          allowed_filetypes: this.options.settings.get('allowed_filetypes'),
          model: data,
          link: link,
          cData: cData
        };
        
		//console.log(this.fileModel);
		//console.log( this.options.settings.get('available_ratios').substring(1, this.options.settings.get('available_ratios').length-1) );
        
		return data;
    },
    
    afterRender: function () {
    	console.log('After Render');
    	console.log(this.fileModel);
    	
    	// Cropper
    	
    	if ( cData.sourceImageAvailable ) {
    		var sourceImageHook = $('#c-source-image')[0];
	        var previewHook = $('.c-preview-container').find('.preview');
	        	//previewHook.css('height', $('.c-area').css('height')); // DZIAŁA 50/50, POTRZEBNE INNE ROZWIĄZANIE PROBLEMU
	        															// ROZWIĄZAŁEM PROBLEM, PARENT HEIGHT 50% CHILD 100%
			cropper = new Cropper(sourceImageHook, {
			  aspectRatio: cData.ratios[0].value,
			  movable: cData.movementAllowed,
			  rotatable: cData.rotationAllowed,
			  zoomable: this.options.settings.get('allow_image_zooming'),
			  preview: previewHook,
			  responsive: true,
			  restore: true,
			  crop: function(e) {
				  /* Nothing */
			  },
			  ready: function() {
				  console.log("Cropper Ready!");
				  //console.log(previewHook);
			  }
			});
			
			document.querySelectorAll('.cropper-toggle')[0].className += ' active';
			
			cData.ratios.forEach( x => {
				rData[x.objName] = {
					title: x.title,
					name: x.objName,
					preview: previewHook,
					cropData: null,
					aspectRatio: x.value,
					data: null,
					containerData: null,
					imageData: null,
					canvasData: null,
					cropBoxData: null,
					isNew: true 
				}
			} );
			
			console.log(rData);
    	}
		
		// End
    	
        var timer;
        var $dropzone = this.$('.dropzone');
        var model = this.fileModel;

        if ($dropzone.length === 0) {
          return;
        }

        $dropzone.on('dragover', function (e) {
          clearInterval(timer);
          e.stopPropagation();
          e.preventDefault();
          $dropzone.addClass('dragover');
        });

        $dropzone.on('dragleave', function () {
          clearInterval(timer);
          timer = setInterval(function () {
            $dropzone.removeClass('dragover');
            clearInterval(timer);
          }, 50);
        });

        // Since data transfer is not supported by jquery...
        // XHR2, FormData
        $dropzone[0].ondrop = _.bind(function (e) {
          e.stopPropagation();
          e.preventDefault();

          if (e.dataTransfer.files.length > 1) {
            Notification.error('Single File', __t('one_file_only_please'));
            return;
          }

          var file = e.dataTransfer.files[0];
          model.setFile(file, this.options.settings.get('allowed_filetypes'));
          $dropzone.removeClass('dragover');
        }, this);

        // Show fallback image if file missing
        FileHelper.hideOnImageError(this.$('.js-image img'));
    },
    
    events: {
        'click .js-modal': 'openModal',
        'click .js-from-computer': 'chooseFromComputer',
        'click .js-from-system': 'chooseFromSystem',
        'click .js-from-url': 'chooseFromUrl',
        'click .js-remove': 'removeFile',
        'click .js-title': 'edit',
        'change input[type=file]': 'onInputChange',
        'click .crop-and-save': 'cropAndSave',
        'click .cropper-toggle': 'toggleCropper',
        'click .reset-active': 'reset'
      }
  });
});
