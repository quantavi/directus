/* global $ */
define([
  'utils',
  'underscore',
  'core/UIView',
  'core/notification'
], function (Utils, _, UIView, Notification) {
	
  return UIView.extend({
    template: '_system/status/input',

    events: {
      'change input[type=radio]': function (event) {
        var statusValue = $(event.currentTarget).val();

        this.$('input[type=hidden]').val(statusValue);
        this.model.set(this.name, statusValue);
        
        if ( this.model.attributes && this.options.settings.get('allow_inheritence') ) {
        	this.transferStatusToChilds(this.model.attributes, statusValue);
        }
      }
    },
    
    verifyChildsStatus: function(me, status) {
    	/**
    	 * Get root(this) priority
    	 */
    	var rootPriority = me.priority;
    	/**
    	 * Get attribute as attr
    	 */
    	for ( var attr in me ) {
    		// attr for now was only a pointer, now it contains an object
    		attr = me[attr];
    		/**
    		 * Check if attr is an Object and isn't null
    		 */
    		if (attr instanceof Object && attr != null) {
    			// Get tablename for attr
    			var location = attr.table.id;
    			// Check if attr contain models = if have any childs
    			if (attr.models && !_.isEmpty(attr.models)) {
    				// Loop through all childs
    				for ( var item in attr.models ) {
    					// item for now was only a pointer, now it contains an object
    					item = attr.models[item];
    					// Get itemID
        				var itemID = (item.attributes.data) ? item.attributes.data.id : item.attributes.id;
        				// Check if item status is same as local status
        				if ( this.getChildStatus( location, item ) != status ) {
        					// Get itemPriority
        					var itemPriority = (item.attributes.data) ? item.attributes.data.attributes.priority : 999;
            				// Check if the itemPriority is lower than the rootPriority, and setChildStatus
            				if (itemPriority > rootPriority) {
            					this.setChildStatus( location, itemID, status );
            				}
        				}
        				// Verify if all childs of the item has right status
        				this.verifyChilds( location, itemID, status );
        			}
    			// Check if attr contain attributes = if don't have any childs
    			} else if (attr.attributes && !_.isEmpty(attr.attributes)) {
    				// Get itemID
    				var itemID = attr.attributes.id;
    				// Check if item status is same as local status
    				if ( this.getChildStatus( location, attr ) != status ) {
    					// Get itemPriority
    					var itemPriority = (attr.attributes.data) ? attr.attributes.data.attributes.priority : 999;
        				// Check if the itemPriority is lower than the rootPriority, and setChildStatus
        				if (itemPriority > rootPriority) {
        					this.setChildStatus( location, itemID, status );
        				}
    				}
    				// Verify if all childs of the item has right status
    				this.verifyChilds( location, itemID, status );
    			}
    		}
    	}
    },
    
    transferStatusToChilds: function(me, status) {
    	/**
    	 * Get root(this) priority
    	 */
    	var rootPriority = me.priority;
    	/**
    	 * Get attribute as attr
    	 */
    	for ( var attr in me ) {
    		// attr for now was only a pointer, now it contains an object
    		attr = me[attr];
    		/**
    		 * Check if attr is an Object and isn't null
    		 */
    		if (attr instanceof Object && attr != null) {
    			// Get tablename for attr
    			var location = attr.table.id;
    			// Check if attr contain models = if have any childs
    			if (attr.models && !_.isEmpty(attr.models)) {
    				// Loop through all childs
    				for ( var item in attr.models ) {
    					// item for now was only a pointer, now it contains an object
    					item = attr.models[item];
    					// Get itemID
    					var itemID = (item.attributes.data) ? item.attributes.data.id : item.attributes.id;
        				// Get itemPriority
        				var itemPriority = (item.attributes.data) ? item.attributes.data.attributes.priority : 999;
        				// Check if the itemPriority is lower than the rootPriority, and setChildStatus
        				if (itemPriority > rootPriority) {
        					this.setChildStatus( location, itemID, status );
        				}
        				// Verify if all childs of the item has right status
        				this.verifyChilds( location, itemID, status, rootPriority );
        			}
    			// Check if attr contain attributes = if don't have any childs
    			} else if (attr.attributes && !_.isEmpty(attr.attributes)) {
    				// Get itemID
    				var itemID = attr.attributes.id;
    				// Get itemPriority
    				var itemPriority = (attr.attributes.data) ? attr.attributes.data.attributes.priority : 999;
    				// Check if the itemPriority is lower than the rootPriority, and setChildStatus
    				if (itemPriority > rootPriority) {
    					this.setChildStatus( location, itemID, status );
    				}
    				// Verify if all childs of the item has right status
    				this.verifyChilds( location, itemID, status, rootPriority );
    			}
    		}
    	}
    },
    
    setChildStatus: function(table, itemID, status) {
    	$.ajax({
    		  method: "PUT",
    		  url: `/directus/api/1.1/tables/${table}/rows/${itemID}`,
    		  data: { "status": status },
    		  success: function(result) {
//    			  Notification.success(`Status ${status} set for item ${itemID} in ${table}!`);
//    			  console.log(result);
    		  },
    		  error: function(error) {
    			  Notification.error(`Unable to set status ${status} to item ${itemID} in ${table}!`);
    			  console.error(error);
    		  }
    		});
    },
    
    getChildStatus: function(table, item) {
    	// Skip directus tables
    	if (!table.includes("directus_")) {
    		// Check if item has attributes
    		if (item.attributes) {
    			// Check if item.attributes has data attribiute
        		if (item.attributes.data) {
        			return item.attributes.data.attributes.status;
        		// Or not
        		} else {
        			return item.attributes.status;
        		}
        	// Or maybe item has directly accessible status
        	} else if (item.status) {
        		return item.status;
        	// Or we have a problem ;P
        	} else {
        		Notification.error(`Unable to get item ${item.id} status from ${table}!`);
        		return -1;
        	}
    	}
    },
    
    getAllChilds: function(table, itemID) {
    	return $.ajax({
  		  method: "GET",
  		  url: `/directus/api/1.1/tables/${table}/rows/${itemID}?preview=1`, // preview=1 Ignore status, return all data
  		  success: function(result) {
//  			  Notification.success(`Got childs of item ${itemID} from ${table}!`);
//  			  console.log(result);
  		  },
  		  error: function(error) {
  			  Notification.error(`Unable to get childs of the item ${itemID} from ${table}!`);
  			  console.error(error);
  		  }
  		});
    },
    
    filterChilds: function(childs, skipTable) {
    	// Prepare object for our accurate childrens
    	var accurateChilds = {};
    	// Change the childs object to childs.data
    	childs = childs.data;
    	// Loop through all given childs
    	for (var child in childs) {
    		// Assign appropriate child to variable
    		child = childs[child];
    		// Check if child is an Object, if it is not Empty and if it table is not same as restricted table
    		if (child instanceof Object && !_.isEmpty(child) && child.meta.table != skipTable) {
    			// This child is accurate
    			accurateChilds[child.meta.table] = child
    		}
    	}
    	// Return
    	return accurateChilds;
    },
    
    verifyChilds: function(location, itemID, status, rootPriority) {
    	// Wait until getAllChilds finish
    	$.when(this.getAllChilds( location, itemID )).done((childs) => {
    		// Filter unnecesary childs
			childs = this.filterChilds( childs, this.model.table.id );
			// Loop through all childs
			for (var child in childs) {
				// child for now was only a pointer, now it contains an object
				child = childs[child];
				// Get child table
				var location = child.meta.table;
				// Skip items from directus tables
				if (!location.includes("directus_")) {
					// Loop through all items in that child
					for (var item in child.data) {
						// item for now was only a pointer, now it contains an object
						item = child.data[item];
						// Get itemID
						var itemID = item.id;
//						console.log(this.getChildStatus( location, item ));
						// Check item status
						if ( this.getChildStatus( location, item ) != status ) {
//							console.log(item);
							// Get itemPriority
		    				var itemPriority = item.priority;
		    				// Check if the itemPriority is lower than the rootPriority, and setChildStatus
		    				if (itemPriority > rootPriority) {
		    					this.setChildStatus( location, itemID, status );
		    				}
						}
					}
				}
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
    	console.log(this);
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
      
      // Verify if all childs have same status as parent(this item)
      if ( this.model.attributes && this.options.settings.get('allow_inheritence') ) {
    	  this.verifyChildsStatus(this.model.attributes, currentStatus);
      }

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
