define(function (require, exports, module) {
  'use strict';

  var UIView = require('core/UIView');
  var slug = require('libs/node-slug');
  var app = require('app');

  module.exports = UIView.extend({
    template: 'slug/input',

    events: {
      'input input': 'sluggifyAndSave'
    },

    serialize: function () {
      var statusMapping = app.statusMapping.get('*').toJSON().mapping.toJSON();
      var status = this.options.model.attributes.status || 1;
      var length = this.options.schema.get('char_length');
      var value = this.options.value || '';

      var onlyOnCreation = this.options.settings.get('only_on_creation');
      var isNew = this.model.isNew();

      return {
        size: this.options.settings.get('size'),
        value: value,
        name: this.options.name,
        maxLength: length,
        readOnly:
          (onlyOnCreation === true && isNew === false) ||
          this.options.settings.get('read_only') ||
          (this.options.canWrite === false) ||
          status ? statusMapping[status].read_only : false
      };
    },

    afterRender: function () {
      var mirroredField = this.options.settings.get('mirrored_field');

      // Add event listener to the mirrored fields input change event
      if (mirroredField) {
        // Bind the UIView to make sure we have access to this.model in the callback
        document.getElementById(mirroredField).addEventListener('input', this.sluggifyAndSave.bind(this));
      }
    },

    /**
     * Sluggify the value found in event.currentTarget.value and save it to the
     *   parent model
     * @param  {Object} event InputEvent
     */
    sluggifyAndSave: function (event) {
      var onlyOnCreation = this.options.settings.get('only_on_creation');
      var isNew = this.model.isNew();

      if (onlyOnCreation === true && isNew === false) {
        return;
      }

      var value = event.currentTarget.value;

      var sluggedValue = slug(value, {
        lower: this.options.settings.get('force_lowercase')
      });

      // Save slugged value to parent model
      this.model.set(this.name, sluggedValue);

      // Set input value to slug to reflect value that is going to be saved
      this.el.querySelector('input').value = sluggedValue;
    }
  });
});
