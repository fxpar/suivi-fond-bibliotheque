/*!
 * Registre des formats de slides (Studio + Format Lab).
 * Un format = objet sérialisable { id, name, icon, description, sample, template, css, js }.
 * Les formats intégrés sont déclarés dans js/formats/*.js ; les formats créés ou modifiés
 * dans le Format Lab sont stockés dans le localStorage et prennent le pas sur les intégrés.
 */
(function (MLS) {
  'use strict';

  var builtins = {};
  var order = [];
  var KEY = 'formats.custom';

  function custom() { return MLS.store.get(KEY, {}) || {}; }

  MLS.formats = {
    FIELDS: ['id', 'name', 'icon', 'category', 'description', 'sample', 'template', 'css', 'js', 'i18n'],

    register: function (def) {
      def.builtin = true;
      if (!builtins[def.id]) order.push(def.id);
      builtins[def.id] = def;
    },

    builtin: function (id) { return builtins[id] ? MLS.util.clone(builtins[id]) : null; },

    /** Tous les formats effectifs, intégrés (éventuellement surchargés) puis personnalisés. */
    all: function () {
      var c = custom();
      var list = order.map(function (id) {
        if (c[id]) {
          var o = MLS.util.clone(c[id]);
          o.builtin = true; o.modified = true;
          if (!o.i18n && builtins[id].i18n) o.i18n = MLS.util.clone(builtins[id].i18n); // anciennes surcharges
          return o;
        }
        return MLS.util.clone(builtins[id]);
      });
      Object.keys(c).forEach(function (id) {
        if (!builtins[id]) { var o = MLS.util.clone(c[id]); o.builtin = false; list.push(o); }
      });
      return list;
    },

    get: function (id) {
      var all = this.all();
      for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
      return null;
    },

    /** Version "propre" (sans drapeaux internes) pour l'export ou l'envoi au player. */
    serialize: function (f) {
      var o = {};
      this.FIELDS.forEach(function (k) { if (f[k] != null) o[k] = f[k]; });
      return o;
    },

    save: function (def) {
      var c = custom();
      c[def.id] = this.serialize(def);
      return MLS.store.set(KEY, c);
    },

    remove: function (id) {
      var c = custom();
      delete c[id];
      MLS.store.set(KEY, c);
    },

    isBuiltin: function (id) { return !!builtins[id]; },

    /**
     * Champ localisé d'un format : i18n[lang].$name / $description / $sample / $category,
     * sinon le champ de base (rédigé en français pour les formats intégrés).
     */
    text: function (f, field, lang) {
      var l = MLS.i18n.pick(lang);
      var tr = f.i18n && f.i18n[l];
      return (tr && tr['$' + field] != null) ? tr['$' + field] : (f[field] || '');
    }
  };
})(window.MLS);
