define(['core/UIView', 'app'], function (UIView, app) {
  'use strict';

  return UIView.extend({
    template: 'slider/input',

    events: {
      'input input[type=range]': 'onInputChange'
    },

    onInputChange: function (event) {
      var value = event.target.value;

      this.$('span.slider-value').html(value + ' ' + this.options.settings.get('unit'));
      this.model.set(this.name, value);
    },

    serialize: function () {
      var statusMapping = app.statusMapping.get('*').toJSON().mapping.toJSON();
      var status = this.options.model.attributes.status;
      if (this.options.model.isNew() && this.options.schema.has('default_value')) {
        this.options.value = this.options.schema.get('default_value');
      }

      return {
        value: this.options.value || 0,
        name: this.options.name,
        readOnly: this.options.settings.get('read_only') || !this.options.canWrite || status ? statusMapping[status].read_only : false,
        min: this.options.settings.get('minimum'),
        max: this.options.settings.get('maximum'),
        step: this.options.settings.get('step'),
        comment: this.options.schema.get('comment'),
        unit: this.options.settings.get('unit')
      };
    }
  });
});
