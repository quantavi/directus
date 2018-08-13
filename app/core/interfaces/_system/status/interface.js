/* global $ */
define([
  'utils',
  'underscore',
  'core/UIView',
  'app'
], function (Utils, _, UIView, app) {
  return UIView.extend({
    template: '_system/status/input',

    events: {
      'change input[type=radio]': function (event) {
        var statusValue = $(event.currentTarget).val();

        this.$('input[type=hidden]').val(statusValue);
        this.model.set(this.name, statusValue);
        
        if (this.options.settings.get('allow_inheritance')) {
        	this.legacySubmit();
        }
      }
    },
    
    legacySubmit: function () {
    	var rootID = this.model.get('id');
    	var rootPosition = this.options.settings.get('position');
    	var status = this.model.get('status');
    	var tableURL = this.model.getTable().get('url');
    	var token = app.user.get('token');
    	var debug = this.options.settings.get('debug');
    	
    	var data = {
    			'rid': rootID,
    			'position': rootPosition,
    			'status': status,
    			'table': tableURL,
    			'token': token,
    			'debug': debug
    	};
    	
    	this.sendLegacy(data);
    	
//    	console.log(this);
//    	console.log(app);
    },
    
    sendLegacy: function (data) {
    	let encoded = JSON.stringify(data);
    	
    	// Send data to Legacy Submit Custom Endpoint
		$.ajax({
		  method: "POST",
		  url: `${app.PATH}api/legacySubmit`,
		  async: false, // When enabled there is loading screen, looks a little smoother
		  data: { data: encoded },
		  success: function(result) {
			  console.log(result);
		  },
		  error: function(error) {
			  console.error(error);
		  }
		});
    },

    // NOTE: Force status interface visibility on new items
    visible: function () {
      if (this.model.isNew()) {
        return true;
      }
    },

    serialize: function () {
      var model = this.model;
      var currentStatus = this.options.value;
      var table = model.table;
      var fieldName = this.name;

      if (this.model.isNew() && Utils.isNothing(currentStatus)) {
        currentStatus = this.options.schema.get('default_value');
      }

      var statuses = model.getStatusVisible().map(function (status) {
        var item = status.toJSON();

        // NOTE: do not strictly compare as status can (will) be string
        item.selected = status.get('id') == currentStatus; // eslint-disable-line eqeqeq
        item.model = status;
        // NOTE: identifier of each field, as it can be duplicated
        // when another column in overlay has the same name
        item.identifier = table.id + '_' + fieldName + '_' + item.name;

        return item;
      });

      // Make sure the order is right
      statuses.sort(function (a, b) {
        return a.sort - b.sort;
      });

      return {
        table: table.id,
        name: this.name,
        value: this.options.value,
        readonly: !this.options.canWrite,
        statuses: statuses
      };
    }
  });
});
