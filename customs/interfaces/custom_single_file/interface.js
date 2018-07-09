/* global $ */
define([
  'app',
  'underscore',
  'core/t',
  'utils',
  'helpers/file',
  'core/CustomUIView',
  'core/table/table.view',
  'core/overlays/overlays',
  'core/notification',
  './lib/cropperjs/dist/cropper'
], function (app, _, __t, Utils, FileHelper, UIView, TableView, Overlays, Notification, Cropper) {
  'use strict';
  
  var cropper, cData = null, rData = [];
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
    template: 'custom_single_file/interface',

    events: {
      'click .js-modal': 'openModal',
      'click .js-from-computer': 'chooseFromComputer',
      'click .js-from-system': 'chooseFromSystem',
      'click .js-from-url': 'chooseFromUrl',
      'click .js-remove': 'removeFile',
      'click .js-title': 'edit',
      'change input[type=file]': 'onInputChange',
      'click .cropper-toggle': 'toggleCropper',
      'click .origin-mirroring': 'toggleOriginMirroring',
      'input #rotation': 'applyRotation',
      'click .reset-current': 'resetCurrent',
      'click .crop-current-and-save': 'cropCurrentAndSave',
      'click .crop-all-and-save': 'cropAllAndSave',
      'click .reset-all': 'resetAll'
    },

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

    afterRender: function () {
    	if ( cData.sourceImageAvailable && cData.croppingAllowed ) {
			var sourceImageHook = $('#c-source-image')[0];
			var previewHook = $('.c-preview-container').find('.preview');
			
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
					// console.log("Cropper Ready!");
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
					crossData: null,
					isNew: true 
				}
			});
			console.log(rData);
		}
    	
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

    serialize: function () {
      var url;
      var link;
      var fileAvailable = false;
      
      var statusMapping = app.statusMapping.get('*').toJSON().mapping.toJSON();
      var status = this.options.model.attributes.status || 1;

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
      
		cData = {
			sourceImageAvailable: fileAvailable && isImage,
			sourceImageURL: link,
			croppingAllowed: this.options.settings.get('allow_cropping'),
			shortcutsAllowed: this.options.settings.get('allow_shortcuts'),
			movementAllowed: this.options.settings.get('allow_image_movement'),
			rotationAllowed: this.options.settings.get('allow_image_rotation'),
			flippingAllowed: this.options.settings.get('allow_image_flipping'),
			ratios: this.getRatios(),
			globalCrossData: {
				data: null,
				isEnabled: false
			}
		};

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
        readOnly: status ? statusMapping[status].read_only : false,
        cData: cData
      };
      console.log(data);
      return data;
    },

    onModelChange: function () {
      this.uploading = false;
      this.render();
    },

    initialize: function () {
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
    
    getCrossData: function( dataSource ) {
    	return {
    		x: (dataSource.width / 2) + dataSource.left,
    		y: (dataSource.height / 2) + dataSource.top
    	}
    },
    
    originMirroring: function(event) {
    	if ( event.target.checked ) {
    		cData.globalCrossData = {
    				data: this.getCrossData( cropper.getCropBoxData() ),
    				isEnabled: true
    		};
    		Notification.info('Cropper', 'Origin Mirroring turned on');
    	} else {
    		cData.globalCrossData = {
    				data: null,
    				isEnabled: false
    		};
    		Notification.info('Cropper', 'Origin Mirroring turned off');
    	}
    },
    
    toggleOriginMirroring: function(event) {
    	var toggle = event.currentTarget;
    	toggle.classList.toggle("enabled");
    	if (/enabled/.test(toggle.className)) {
    		cData.globalCrossData = {
    				data: this.getCrossData( cropper.getCropBoxData() ),
    				isEnabled: true
    		};
    		Notification.info('Cropper', 'Origin Mirroring turned on');
    	} else {
    		cData.globalCrossData = {
    				data: null,
    				isEnabled: false
    		};
    		Notification.info('Cropper', 'Origin Mirroring turned off');
    	}
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
			crossData: this.getCrossData( cropper.getCropBoxData() ),
			isNew: false 
    	}
    	
    	//Reset Cropper
    	cropper.reset();
    	
    	//Reset options
    	$('#rotation')[0].value = 0;
    	$('#rotation-value')[0].innerHTML = 0;
    	
    	//Set new aspect ratio
    	cropper.setAspectRatio( rData[newObject].aspectRatio );
    	
    	//Check if new data source !isNew and load data if true
    	if ( !rData[newObject].isNew ) {
    		//Load rest of data
    		cropper.setData( rData[newObject].data );
    		cropper.setCanvasData( rData[newObject].canvasData );
    		cropper.setCropBoxData( rData[newObject].cropBoxData );
    		
    		//Load options
    		$('#rotation')[0].value = rData[newObject].imageData.rotate;
    		$('#rotation-value')[0].innerHTML = rData[newObject].imageData.rotate;
    	}
    	
    	//Check if Origin Mirroring isEnabled
    	if ( cData.globalCrossData.isEnabled ) {
    		//Update crossData
    		cData.globalCrossData = {
        			data: rData[activeObject].crossData,
        			isEnabled: cData.globalCrossData.isEnabled
        	}
    		
    		//Prepare
    		let Old = (rData[newObject].cropBoxData != null) ? rData[newObject].cropBoxData : cropper.getCropBoxData();
    		let OldCross = (rData[newObject].crossData !=null) ? rData[newObject].crossData : this.getCrossData( cropper.getCropBoxData() );
    		let NewCross = cData.globalCrossData.data;
    		let newTop = Old.top;
    		let newLeft = Old.left;
    		let newWidth = Old.width;
    		let newHeight = Old.height;
    		
    		//Calculate
    		let crossXGap = NewCross.x - OldCross.x;
    		let crossYGap = NewCross.y - OldCross.y;
	    		newTop += crossYGap;
	    		newLeft += crossXGap;
    		
    		//Set
    		cropper.setCropBoxData({
    			top: newTop,
    			left: newLeft,
    			width: newWidth,
    			height: newHeight
    		});
    	}
    	
    	//Toggle 'active' class at new
    	$("#" + _.id).addClass('active');
    	
    	//Toggle 'active' class at old
    	$("#" + __.id).removeClass('active');
    	
    },
    
    resetCurrent: function() {
    	cropper.reset();
    	$('#rotation')[0].value = 0;
    	$('#rotation-value')[0].innerHTML = 0;
    	Notification.info('Cropper', 'Current image have been reseted to default state');
    },
    
    resetAll: function() {
    	this.resetCurrent();
    	cData.ratios.forEach( x => {
			rData[x.objName] = {
				title: x.title,
				name: x.objName,
				preview: $('.c-preview-container').find('.preview'),
				cropData: null,
				aspectRatio: x.value,
				data: null,
				containerData: null,
				imageData: null,
				canvasData: null,
				cropBoxData: null,
				crossData: null,
				isNew: true 
			}
		});
    	Notification.info('Cropper', 'All images have been reseted to default state');
    },
    
    applyRotation: function() {
    	cropper.rotateTo( parseInt( $('#rotation')[0].value ) );
    	$('#rotation-value')[0].innerHTML = $('#rotation')[0].value;
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
    	
    	// Send data to Ratios Custom Endpoint
		$.ajax({
		  method: "POST",
		  url: "/directus/api/ratios",
		  data: { data: encoded },
		  success: function(result) {
			  Notification.success('Cropper', 'Images have been cropped and uploaded!');
		  },
		  error: function(error) {
			  Notification.error('Cropper', 'Images have not been uploaded!\n(See the console for details)');
			  console.error(error);
		  }
		});
    },
    
    cropCurrentAndSave: function() {
    	var croppedImages = [];
    	
    	console.log($('.cropper-toggle.active')[0].dataset.object);
    	
    	// Obj declaration
		let obj = rData[$('.cropper-toggle.active')[0].dataset.object];
    	
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
		
		this.saveCroppedImages( croppedImages );
    },
    
    cropAllAndSave: function() {
    	var croppedImages = [];
    	
    	cData.ratios.forEach( x => {
    		// Obj declaration
    		let obj = rData[x.objName];

    		// setActive
    		this.setActive( obj );
    		
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
    	this.setActive( rData[cData.ratios[0].objName] );
    	this.saveCroppedImages( croppedImages );
    }
  });
});
