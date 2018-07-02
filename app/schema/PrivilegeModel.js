define(['app', 'backbone'] ,function(app, Backbone) {
  'use strict';

  return Backbone.Model.extend({

    url: function () {
      var url = app.API_URL + 'tables/directus_privileges/rows';

      if (!this.isNew()) {
        url += '/' + this.id;
      }

      return url;
    },

    parse: function(result) {
      return result.data ? result.data : result;
    },
    
    groupView: function() {
    	return this.get('allow_view') === 3;
    },
    
    groupEdit: function() {
    	return this.get('allow_edit') === 3;
    },
    
    groupDelete: function() {
    	return this.get('allow_delete') === 3;
    },

    canBeListed: function () {
      return this.get('nav_listed') > 0
    },

    canView: function () {
      return this.can('view');
    },

    canAdd: function () {
      return this.can('add');
    },

    canEdit: function () {
      return this.can('edit');
    },

    canDelete: function () {
      return this.can('delete');
    },

    can: function (permission) {
      // Partial, only own items
      var permissionLevel = 1;
      
      if (permission.indexOf('big') === 0) {
        permissionLevel = 2;
        permission= permission.substr(3);
      }

      if (permission.indexOf('allow_') !== 0) {
        permission = 'allow_' + permission;
      }
      
      return this.get(permission) >= permissionLevel;
    }
  });

});
