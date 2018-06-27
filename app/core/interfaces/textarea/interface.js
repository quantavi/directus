define(['core/UIView', 'app'], function (UIView, app) {
  'use strict';

  return UIView.extend({
    template: 'textarea/input',

    events: {
      'keydown textarea': 'onKeyDown',
      'input textarea': 'onChange'
    },

    onKeyDown: function (event) {
      var key = event.keyCode || event.which;

      if (key === 13) {
        event.stopPropagation();
      }
    },

    onChange: function (event) {
      var target = event.currentTarget;

      this.model.set(this.name, target.value);
    },

    serialize: function () {
      var statusMapping = app.statusMapping.get('*').toJSON().mapping.toJSON();
      var status = this.options.model.attributes.status;

      return {
        value: this.options.value,
        name: this.options.name,
        rows: this.options.settings.get('rows'),
        placeholder: this.options.settings.get('placeholder'),
        comment: this.options.schema.get('comment'),
        readOnly: this.options.settings.get('read_only') || !this.options.canWrite || status ? statusMapping[status].read_only : false
      };
    }
  });
});
