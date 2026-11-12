/*!
 * MicroLearn Studio — espace de noms commun (Studio, Format Lab, Player exporté)
 * 100 % client-side, aucune dépendance réseau.
 */
(function (global) {
  'use strict';

  var MLS = global.MLS || {};

  MLS.version = '1.0.0';

  /** Fichiers nécessaires au player (utilisés par l'aperçu ET par l'export). */
  MLS.PLAYER_FILES = {
    css: [
      'vendor/bootstrap/css/bootstrap.min.css',
      'vendor/bootstrap-icons/bootstrap-icons.min.css',
      'css/player.css'
    ],
    js: [
      'vendor/marked/marked.min.js',
      'js/core/mls.js',
      'js/core/i18n.js',
      'js/core/yaml.js',
      'js/core/template.js',
      'js/core/parser.js',
      'js/core/scorm.js',
      'js/core/speech.js',
      'js/core/diagram.js',
      'js/core/player.js',
      'assets/characters/catalog.js'
    ],
    binary: [
      'vendor/bootstrap-icons/fonts/bootstrap-icons.woff2',
      'vendor/bootstrap-icons/fonts/bootstrap-icons.woff'
    ]
  };

  MLS.util = {
    escapeHtml: function (s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    stripTags: function (html) {
      var d = document.createElement('div');
      d.innerHTML = html || '';
      return (d.textContent || '').trim();
    },
    debounce: function (fn, ms) {
      var t;
      return function () {
        var args = arguments, self = this;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(self, args); }, ms);
      };
    },
    uid: function (prefix) {
      return (prefix || 'id') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    },
    slugify: function (s) {
      return String(s || '').toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    },
    clone: function (o) { return JSON.parse(JSON.stringify(o)); }
  };

  /** Accès localStorage tolérant aux erreurs (navigation privée, file://, quota). */
  MLS.store = {
    get: function (key, fallback) {
      try {
        var v = global.localStorage.getItem('mls.' + key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try {
        global.localStorage.setItem('mls.' + key, JSON.stringify(value));
        return true;
      } catch (e) { return false; }
    },
    remove: function (key) {
      try { global.localStorage.removeItem('mls.' + key); } catch (e) { /* ignore */ }
    }
  };

  global.MLS = MLS;
})(window);
