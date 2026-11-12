/*!
 * MicroLearn Player — moteur de slideshow interactif.
 * Utilisé à l'identique dans l'aperçu du Studio, le Format Lab et le paquet exporté.
 *
 *   var p = new MLS.Player(element, { formats: [...], catalog: MLS_CHARACTERS, mode: 'standalone' });
 *   p.load(markdown);
 */
(function (MLS) {
  'use strict';

  var U = MLS.util;
  var FILTERS = ['all', 'femme', 'homme', 'non-binaire', 'senior', 'jeune', 'handicap'];

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function Player(root, opts) {
    this.root = root;
    this.opts = opts || {};
    this.mode = this.opts.mode || 'standalone';
    this.catalog = this.opts.catalog || window.MLS_CHARACTERS || { characters: [] };
    this.setFormats(this.opts.formats || []);
    this.index = 0;
    this.cast = {};
    this.scores = {};
    this.gradable = {};
    this.state = {};
    this.hooks = {};
    this.started = false;
    this.lang = 'fr';
    this.t = MLS.i18n.translator('fr');
    this.build();
  }

  Player.prototype.setFormats = function (formats) {
    var self = this;
    this.formats = formats;
    this.formatsById = {};
    formats.forEach(function (f) { self.formatsById[f.id] = f; });
    this.fnCache = {};
    var css = formats.map(function (f) {
      return '/* ' + f.id + ' */\n' + String(f.css || '').replace(/:scope/g, '.mls-slide[data-format="' + f.id + '"]');
    }).join('\n');
    var style = document.getElementById('mls-format-css');
    if (!style) { style = el('style'); style.id = 'mls-format-css'; document.head.appendChild(style); }
    style.textContent = css;
  };

  /* ------------------------------------------------------------------ DOM */

  Player.prototype.build = function () {
    var self = this;
    this.root.innerHTML = '';
    this.root.classList.add('mls-player');
    this.root.innerHTML =
      '<div class="mls-bg" aria-hidden="true"><span class="mls-blob b1"></span><span class="mls-blob b2"></span><span class="mls-blob b3"></span></div>' +
      '<header class="mls-top">' +
      '  <button type="button" class="mls-icon-btn" data-act="toc" data-pt-label="p.toc"><i class="bi bi-list"></i></button>' +
      '  <div class="mls-course-title"><span class="mls-ct-main"></span><span class="mls-ct-sub"></span></div>' +
      '  <div class="mls-top-actions">' +
      '    <button type="button" class="mls-icon-btn mls-stop-speech" data-act="stop-speech" data-pt-label="p.stopAudio" hidden><i class="bi bi-stop-circle-fill"></i></button>' +
      '    <button type="button" class="mls-icon-btn" data-act="cast" data-pt-label="p.castAudio"><i class="bi bi-people"></i></button>' +
      '    <button type="button" class="mls-icon-btn" data-act="fullscreen" data-pt-label="p.fullscreen"><i class="bi bi-arrows-fullscreen"></i></button>' +
      '  </div>' +
      '  <div class="mls-progress" role="progressbar" data-pt-aria="p.progress" aria-valuemin="0" aria-valuemax="100"><span></span></div>' +
      '</header>' +
      '<main class="mls-stage"></main>' +
      '<nav class="mls-nav" data-pt-aria="p.navigation">' +
      '  <button type="button" class="mls-nav-btn" data-act="prev"><i class="bi bi-arrow-left"></i><span data-pt="p.prev"></span></button>' +
      '  <div class="mls-counter" aria-live="polite"></div>' +
      '  <button type="button" class="mls-nav-btn mls-primary" data-act="next"><span></span><i class="bi bi-arrow-right"></i></button>' +
      '</nav>' +
      '<aside class="mls-toc" hidden><div class="mls-toc-head"><strong data-pt="p.toc"></strong>' +
      '<button type="button" class="mls-icon-btn" data-act="toc-close" data-pt-label="p.closeToc"><i class="bi bi-x-lg"></i></button></div><ol></ol></aside>' +
      '<div class="mls-overlay mls-welcome" hidden></div>' +
      '<div class="mls-overlay mls-end" hidden></div>' +
      '<div class="mls-sr" aria-live="polite"></div>';

    this.$ = function (s) { return self.root.querySelector(s); };
    this.stage = this.$('.mls-stage');

    this.root.addEventListener('click', function (e) {
      var sb = e.target.closest('.mls-speak-btn');
      if (sb && self.root.contains(sb)) {
        e.stopPropagation();
        var target = sb.parentNode;
        if (target.classList.contains('mls-speaking')) MLS.speech.cancel();
        else self.speakEls([target]);
        return;
      }
      var b = e.target.closest('[data-act]');
      if (!b || !self.root.contains(b)) return;
      var act = b.getAttribute('data-act');
      if (act === 'prev') self.prev();
      else if (act === 'next') self.next();
      else if (act === 'toc') self.toggleToc(true);
      else if (act === 'toc-close') self.toggleToc(false);
      else if (act === 'cast') self.openWelcome(true);
      else if (act === 'fullscreen') self.toggleFullscreen();
      else if (act === 'stop-speech') MLS.speech.cancel();
    });

    document.addEventListener('keydown', function (e) {
      if (!self.course || self.overlayOpen()) {
        if (e.key === 'Escape') { self.toggleToc(false); }
        return;
      }
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); self.next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); self.prev(); }
      else if (e.key === 'Home') { self.goTo(0); }
      else if (e.key === 'End') { self.goTo(self.course.slides.length - 1); }
    });

    // Balayage tactile (mobile)
    var sx = null, sy = null;
    this.stage.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    }, { passive: true });
    this.stage.addEventListener('touchend', function (e) {
      if (sx == null) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      sx = null;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) { if (dx < 0) self.next(); else self.prev(); }
    }, { passive: true });
  };

  Player.prototype.translateChrome = function () {
    var t = this.t;
    this.root.querySelectorAll('[data-pt]').forEach(function (e) { e.textContent = t(e.getAttribute('data-pt')); });
    this.root.querySelectorAll('[data-pt-label]').forEach(function (e) { var v = t(e.getAttribute('data-pt-label')); e.setAttribute('aria-label', v); e.title = v; });
    this.root.querySelectorAll('[data-pt-aria]').forEach(function (e) { e.setAttribute('aria-label', t(e.getAttribute('data-pt-aria'))); });
  };

  /** Textes d'un format pour la langue du cours : dictionnaire du player + format.i18n (repli FR). */
  Player.prototype.formatTexts = function (fmt) {
    var out = MLS.i18n.table(this.lang);
    var tr = (fmt && fmt.i18n) || {};
    var l = MLS.i18n.pick(this.lang);
    [tr.fr || {}, tr[l] || {}].forEach(function (d) { Object.keys(d).forEach(function (k) { if (k.charAt(0) !== '$') out[k] = d[k]; }); });
    return out;
  };

  Player.prototype.overlayOpen = function () {
    return !this.$('.mls-welcome').hidden || !this.$('.mls-end').hidden;
  };

  /* --------------------------------------------------------------- Cours */

  Player.prototype.load = function (markdown, o) {
    o = o || {};
    if (o.formats) this.setFormats(o.formats);
    var keep = this.index;
    this.course = MLS.parser.parseCourse(markdown, { formats: Object.keys(this.formatsById) });
    var fm = this.course.meta;
    this.courseKey = 'course.' + (U.slugify(this.course.title) || 'sans-titre');
    this.lang = String(fm.lang || 'fr');
    this.t = MLS.i18n.translator(this.lang);
    this.root.setAttribute('lang', MLS.i18n.pick(this.lang));
    this.translateChrome();
    this.loadCast();
    this.setupAudio();

    // thème
    var r = this.root;
    r.className = r.className.replace(/\bmls-theme-\S+/g, '').trim();
    r.classList.add('mls-theme-' + U.slugify(fm.theme || 'violet'));
    if (fm.color) r.style.setProperty('--mls-primary', fm.color); else r.style.removeProperty('--mls-primary');
    if (fm.accent) r.style.setProperty('--mls-secondary', fm.accent); else r.style.removeProperty('--mls-secondary');
    this.$('.mls-ct-main').textContent = this.course.title;
    this.setupParcours();
    if (this.mode === 'standalone') document.title = this.course.title;

    this.scores = {}; this.gradable = {}; this.state = {}; this.hooks = {};
    this.renderSlides();
    this.computeChapters();
    this.renderToc();

    var idx = o.index != null ? o.index : (o.keepIndex ? keep : 0);
    this.root.classList.add('mls-no-anim');
    this.goTo(Math.max(0, Math.min(idx, this.course.slides.length - 1)), { silent: true });
    var self = this;
    requestAnimationFrame(function () { requestAnimationFrame(function () { self.root.classList.remove('mls-no-anim'); }); });

    if (o.welcome) this.openWelcome(false);
    return this.course;
  };

  /* -------------------------------------------------------- Personnages */

  Player.prototype.chars = function () { return this.catalog.characters || []; };
  Player.prototype.charById = function (id) {
    var list = this.chars();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  };

  Player.prototype.loadCast = function () {
    var saved = MLS.store.get(this.courseKey + '.cast', null) || MLS.store.get('cast', {}) || {};
    var self = this, used = {};
    var chars = this.chars();
    this.cast = {};
    this.course.roles.forEach(function (r, i) {
      var id = saved[r.role];
      if (!self.charById(id)) id = r.defaultId && self.charById(r.defaultId) ? r.defaultId : null;
      if (!id) {
        for (var k = 0; k < chars.length; k++) {
          var c = chars[(i * 3 + k) % chars.length];
          if (!used[c.id]) { id = c.id; break; }
        }
      }
      if (id) { self.cast[r.role] = id; used[id] = true; }
    });
  };

  Player.prototype.saveCast = function () {
    MLS.store.set(this.courseKey + '.cast', this.cast);
    MLS.store.set('cast', this.cast);
  };

  Player.prototype.roleLabel = function (role) {
    var roles = this.course ? this.course.roles : [];
    for (var i = 0; i < roles.length; i++) if (roles[i].role === role) return roles[i].label;
    return role;
  };

  /** Personnage résolu pour un rôle et une expression, prêt pour les gabarits. */
  Player.prototype.character = function (role, expression) {
    if (!role) return null;
    expression = expression || 'neutral';
    var id = this.cast[role];
    if (!id) {
      var chars = this.chars();
      var c0 = chars.length ? chars[Math.abs(hash(role)) % chars.length] : null;
      id = c0 && c0.id;
      if (id) this.cast[role] = id;
    }
    var c = this.charById(id);
    var label = this.roleLabel(role);
    if (!c) {
      return { role: role, label: label, name: label, img: '', alt: label, expression: expression,
        avatar: '<span class="mls-avatar mls-avatar-empty" data-mls-role="' + U.escapeHtml(role) + '"><i class="bi bi-person"></i></span>',
        nameTag: '<span data-mls-role-name="' + U.escapeHtml(role) + '">' + U.escapeHtml(label) + '</span>' };
    }
    var img = (c.images && (c.images[expression] || c.images.neutral)) || '';
    var alt = c.name + ' (' + label + ')';
    return {
      role: role, label: label, id: c.id, name: c.name, description: MLS.i18n.local(c.description, this.lang),
      img: img, alt: alt, expression: expression,
      avatar: '<img class="mls-avatar" src="' + U.escapeHtml(img) + '" alt="' + U.escapeHtml(alt) + '" data-mls-role="' +
        U.escapeHtml(role) + '" data-mls-expr="' + U.escapeHtml(expression) + '">',
      nameTag: '<span data-mls-role-name="' + U.escapeHtml(role) + '">' + U.escapeHtml(c.name) + '</span>'
    };
  };

  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

  /** Met à jour, sans re-rendu, tous les avatars affichés après un changement de casting. */
  Player.prototype.refreshAvatars = function () {
    var self = this;
    this.root.querySelectorAll('img[data-mls-role]').forEach(function (img) {
      var ch = self.character(img.getAttribute('data-mls-role'), img.getAttribute('data-mls-expr'));
      if (ch && ch.img) { img.src = ch.img; img.alt = ch.alt; }
    });
    this.root.querySelectorAll('[data-mls-role-name]').forEach(function (n) {
      var ch = self.character(n.getAttribute('data-mls-role-name'));
      if (ch) n.textContent = ch.name;
    });
  };

  Player.prototype.setExpression = function (img, expression) {
    if (!img) return;
    var ch = this.character(img.getAttribute('data-mls-role'), expression);
    img.setAttribute('data-mls-expr', expression);
    if (ch && ch.img) img.src = ch.img;
  };

  /* --------------------------------------------------------------- Rendu */

  Player.prototype.enrich = function (data) {
    var self = this;
    data.course = { title: this.course.title, meta: this.course.meta };
    data.total = this.course.slides.length;
    data.character = data.role ? this.character(data.role, data.expression) : null;
    var sides = {}, n = 0;
    data.quotes.forEach(function (q) {
      q.character = q.role ? self.character(q.role, q.expression) : data.character;
      var key = q.role || '_';
      if (!(key in sides)) sides[key] = (n++ % 2 === 0) ? 'left' : 'right';
      q.side = sides[key];
      q.right = q.side === 'right';
    });
    data.lines = data.quotes;
    data.cast = this.course.roles.map(function (r) { return self.character(r.role); });
    return data;
  };

  Player.prototype.renderSlides = function () {
    var self = this;
    this.stage.innerHTML = '';
    this.slideEls = this.course.slides.map(function (slide) {
      var fmt = self.formatsById[slide.format] || self.formatsById['format-content'];
      var sec = el('section', 'mls-slide');
      sec.setAttribute('data-format', fmt ? fmt.id : 'none');
      sec.setAttribute('data-index', slide.index);
      sec.setAttribute('aria-roledescription', 'slide');
      sec.setAttribute('aria-label', self.t('p.slideOf', { n: slide.index + 1, total: self.course.slides.length }));
      var inner = el('div', 'mls-slide-inner');
      sec.appendChild(inner);
      self.stage.appendChild(sec);

      var data;
      try {
        data = self.enrich(MLS.parser.slideData(slide));
        data.t = self.formatTexts(fmt);
        data.lang = MLS.i18n.pick(self.lang);
        slide.title = data.title;
        inner.innerHTML = fmt ? MLS.template.render(fmt.template, data) : data.body;
      } catch (err) {
        self.showError(inner, slide, 'template', err);
        return sec;
      }
      if (fmt && fmt.js && String(fmt.js).trim()) {
        try {
          var key = fmt.id + '::' + fmt.js;
          var fn = self.fnCache[key] || (self.fnCache[key] = new Function('root', 'data', 'ctx', fmt.js));
          fn.call(null, inner, data, self.ctx(slide.index, inner));
        } catch (err2) {
          self.showError(inner, slide, 'script', err2, true);
        }
      }
      self.decorateSpeech(inner, slide.index);
      return sec;
    });
  };

  Player.prototype.showError = function (inner, slide, kind, err, append) {
    var msg = this.mode === 'standalone'
      ? this.t('p.slideError')
      : this.t('p.devError', { kind: this.t('p.kind.' + kind), format: slide.format, n: slide.index + 1, msg: U.escapeHtml(err.message) });
    var box = '<div class="mls-error"><i class="bi bi-exclamation-triangle"></i> ' + msg + '</div>';
    if (append) inner.insertAdjacentHTML('afterbegin', box); else inner.innerHTML = box;
    if (this.opts.onError) this.opts.onError({ slide: slide.index, kind: kind, message: err.message });
    if (window.console) console.error(err);
  };

  /** Contexte passé au script de chaque format. */
  Player.prototype.ctx = function (index, root) {
    var self = this;
    if (!this.state[index]) this.state[index] = {};
    return {
      player: this,
      index: index,
      root: root,
      mode: this.mode,
      state: this.state[index],
      next: function () { self.next(); },
      prev: function () { self.prev(); },
      goTo: function (i) { self.goTo(i); },
      gradable: function () { self.gradable[index] = true; },
      score: function (ok) { self.gradable[index] = true; self.scores[index] = !!ok; },
      character: function (role, expr) { return self.character(role, expr); },
      setExpression: function (img, expr) { self.setExpression(img, expr); },
      announce: function (text) { self.announce(text); },
      speak: function (el) { self.speakOnReveal(el, index); },
      speakable: function (el) { self.decorateSpeech(el, index); },
      onEnter: function (fn) { (self.hooks[index] = self.hooks[index] || { enter: [], leave: [] }).enter.push(fn); },
      onLeave: function (fn) { (self.hooks[index] = self.hooks[index] || { enter: [], leave: [] }).leave.push(fn); },
      escape: U.escapeHtml,
      lang: MLS.i18n.pick(this.lang),
      t: function (key, vars) {
        var tx = self.formatTexts(self.formatsById[self.course.slides[index].format]);
        return MLS.i18n.format(tx[key] != null ? tx[key] : key, vars);
      }
    };
  };

  Player.prototype.announce = function (text) {
    var sr = this.$('.mls-sr');
    sr.textContent = '';
    setTimeout(function () { sr.textContent = text; }, 30);
  };

  Player.prototype.renderToc = function () {
    var self = this;
    var ol = this.$('.mls-toc ol');
    ol.innerHTML = '';
    this.course.slides.forEach(function (s, i) {
      var ch = self.chapters.filter(function (c) { return c.start === i; })[0];
      if (ch) {
        var head = el('li', 'mls-toc-chapter');
        head.textContent = self.t('p.chapterOf', { n: ch.number, total: self.chapters.length }) + ' · ' + ch.title;
        ol.appendChild(head);
      }
      var li = el('li');
      var b = el('button', 'mls-toc-item');
      b.type = 'button';
      var fmt = self.formatsById[s.format];
      b.innerHTML = '<span class="mls-toc-num">' + (i + 1) + '</span><i class="bi ' + U.escapeHtml((fmt && fmt.icon) || 'bi-file-text') +
        '"></i><span>' + U.escapeHtml(s.title || self.t('p.slide', { n: i + 1 })) + '</span>';
      b.addEventListener('click', function () { self.toggleToc(false); self.goTo(i); });
      li.appendChild(b);
      ol.appendChild(li);
    });
  };

  Player.prototype.toggleToc = function (open) {
    var toc = this.$('.mls-toc');
    toc.hidden = !open;
    if (open) {
      var items = toc.querySelectorAll('.mls-toc-item');
      items.forEach(function (b, i) { b.classList.toggle('is-current', i === this.index); }, this);
      if (items[this.index]) items[this.index].focus();
    }
  };

  Player.prototype.toggleFullscreen = function () {
    var d = document;
    if (d.fullscreenElement) { d.exitFullscreen(); return; }
    if (this.root.requestFullscreen) this.root.requestFullscreen().catch(function () {});
  };

  /* ---------------------------------------------------------- Navigation */

  Player.prototype.goTo = function (i, o) {
    o = o || {};
    if (!this.course || !this.slideEls.length) return;
    i = Math.max(0, Math.min(i, this.slideEls.length - 1));
    var prev = this.index;
    var dir = i >= prev ? 'fwd' : 'back';
    var self = this;
    MLS.speech.cancel();
    if (this.hooks[prev] && prev !== i) this.hooks[prev].leave.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
    this.slideEls.forEach(function (s, k) {
      s.classList.toggle('is-active', k === i);
      s.classList.toggle('is-before', k < i);
      s.setAttribute('aria-hidden', k === i ? 'false' : 'true');
      if (k === i) s.removeAttribute('inert'); else s.setAttribute('inert', '');
    });
    this.root.setAttribute('data-dir', dir);
    this.index = i;
    var cur = this.slideEls[i];
    cur.scrollTop = 0;
    if (this.hooks[i]) this.hooks[i].enter.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });

    var n = this.slideEls.length;
    var pct = n > 1 ? Math.round(i / (n - 1) * 100) : 100;
    this.$('.mls-progress span').style.width = pct + '%';
    this.$('.mls-progress').setAttribute('aria-valuenow', pct);
    this.$('.mls-counter').textContent = (i + 1) + ' / ' + n;
    this.updateSubtitle(i);
    this.$('[data-act="prev"]').disabled = i === 0;
    var nextBtn = this.$('[data-act="next"]');
    var last = i === n - 1;
    nextBtn.querySelector('span').textContent = this.t(last ? 'p.finish' : 'p.next');
    nextBtn.querySelector('i').className = 'bi ' + (last ? 'bi-flag' : 'bi-arrow-right');
    nextBtn.disabled = last && this.mode === 'lab';

    if (!o.silent && o.focus !== false) {
      var h = cur.querySelector('h1, h2, h3');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
    if (!o.silent && this.audioMode() === 'auto' && !this.overlayOpen()) {
      clearTimeout(this.autoTimer);
      this.autoTimer = setTimeout(function () { if (self.index === i) self.speakSlide(i); }, 500);
    }
    if (this.mode === 'standalone' && this.started) {
      MLS.store.set(this.courseKey + '.location', i);
      MLS.scorm.setLocation(i);
    }
    if (this.opts.onSlide) this.opts.onSlide(i);
  };

  Player.prototype.next = function () {
    if (!this.course) return;
    if (this.index >= this.slideEls.length - 1) { if (this.mode !== 'lab') this.openEnd(); return; }
    this.goTo(this.index + 1);
  };
  Player.prototype.prev = function () { this.goTo(this.index - 1); };

  /* ------------------------------------------------ Lecture à voix haute */

  Player.prototype.setupAudio = function () {
    var fm = this.course.meta;
    var self = this;
    this.audioOn = MLS.speech.supported && fm.audio !== false && !/^(off|non)$/i.test(String(fm.audio || ''));
    this.audioMin = Number(fm['audio-min']) || 120;
    this.tts = MLS.speech.settings();
    this.voices = MLS.store.get(this.courseKey + '.voices', {}) || {};
    this.applyAudioClass();
    if (!this.voiceHooked && MLS.speech.supported) {
      this.voiceHooked = true;
      MLS.speech.onVoices(function () { self.fillVoiceSelects(); });
    }
  };

  Player.prototype.audioMode = function () { return this.audioOn ? this.tts.mode : 'off'; };
  Player.prototype.applyAudioClass = function () { this.root.classList.toggle('mls-audio-off', this.audioMode() === 'off'); };

  /** Voix d'un rôle (null = narrateur) : choix de l'apprenant, sinon une voix différente par rôle. */
  Player.prototype.voiceFor = function (role) {
    var uri = role ? this.voices[role] : this.voices._narrator;
    if (uri && MLS.speech.findVoice(uri)) return uri;
    var list = MLS.speech.voicesFor(this.lang);
    if (!list.length) return null;
    var k = role ? this.course.roles.map(function (r) { return r.role; }).indexOf(role) + 1 : 0;
    return list[Math.max(0, k) % list.length].voiceURI;
  };

  Player.prototype.speechText = function (el) {
    var c = el.cloneNode(true);
    c.querySelectorAll('.mls-speak-btn, [data-mls-nospeak], script, style, template').forEach(function (n) { n.remove(); });
    // marque une pause après les titres, paragraphes, éléments de liste… (sinon "TitreTexte" est lu d'un bloc)
    c.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,div,blockquote,td,th,dt,dd,figcaption,.fc-term-sm').forEach(function (n) {
      var t = (n.textContent || '').trim();
      n.appendChild(document.createTextNode(t && !/[.!?…:;,]$/.test(t) ? '. ' : ' '));
    });
    return (c.textContent || '').replace(/\s+/g, ' ').replace(/(\.\s*){2,}/g, '. ').trim();
  };

  function slideAudioFlag(slide) { return slide ? String(slide.meta.audio || '').toLowerCase() : ''; }

  /**
   * Ajoute l'icône audio aux éléments [data-mls-speak] suffisamment longs.
   *   data-mls-speak            texte lisible (icône si long)
   *   data-mls-speak="always"   icône quelle que soit la longueur (ex. répliques)
   *   data-mls-speak="reveal"   pas d'icône, lu seulement à l'ouverture (ctx.speak)
   *   data-mls-speak-role="…"   voix du personnage de ce rôle
   */
  Player.prototype.decorateSpeech = function (scope, index) {
    if (!this.audioOn || !scope) return;
    var flag = slideAudioFlag(this.course.slides[index]);
    if (flag === 'off' || flag === 'non') return;
    var self = this;
    var els = [].slice.call(scope.querySelectorAll('[data-mls-speak]'));
    if (scope.hasAttribute('data-mls-speak')) els.unshift(scope);
    els.forEach(function (el) {
      var kind = el.getAttribute('data-mls-speak');
      var text = self.speechText(el);
      var ok = !!text && (kind === 'always' || flag === 'all' || flag === 'oui' || text.length >= self.audioMin);
      if (ok) el.setAttribute('data-mls-qualified', ''); else el.removeAttribute('data-mls-qualified');
      if (!ok || kind === 'reveal' || el.querySelector(':scope > .mls-speak-btn')) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mls-speak-btn';
      b.setAttribute('aria-label', self.t('a.listen'));
      b.title = self.t('a.listen');
      b.innerHTML = '<i class="bi bi-volume-up-fill"></i>';
      el.insertBefore(b, el.firstChild);
    });
  };

  Player.prototype.speakEls = function (els) {
    var self = this;
    var items = els.map(function (el) {
      return { text: self.speechText(el), voice: self.voiceFor(el.getAttribute('data-mls-speak-role') || null), ref: el };
    }).filter(function (it) { return it.text; });
    if (!items.length) return;
    var stop = this.$('.mls-stop-speech');
    function setIcon(n, on) {
      var b = n.querySelector(':scope > .mls-speak-btn');
      if (!b) return;
      b.innerHTML = on ? '<i class="bi bi-stop-fill"></i>' : '<i class="bi bi-volume-up-fill"></i>';
      b.setAttribute('aria-label', self.t(on ? 'a.stop' : 'a.listen'));
    }
    function clear() {
      self.root.querySelectorAll('.mls-speaking').forEach(function (n) { n.classList.remove('mls-speaking'); setIcon(n, false); });
    }
    MLS.speech.speak(items, {
      rate: this.tts.rate,
      lang: this.lang,
      onItem: function (it) { clear(); it.ref.classList.add('mls-speaking'); setIcon(it.ref, true); stop.hidden = false; },
      onEnd: function () { clear(); stop.hidden = true; }
    });
  };

  /** Appelé par les formats quand l'apprenant ouvre un contenu (hotspot, carte, onglet…). */
  Player.prototype.speakOnReveal = function (el, index) {
    var m = this.audioMode();
    if ((m !== 'interact' && m !== 'auto') || !el) return;
    var flag = slideAudioFlag(this.course.slides[index]);
    if (flag === 'off' || flag === 'non') return;
    this.speakEls([el]);
  };

  /** Mode automatique : lit les textes longs visibles de la slide. */
  Player.prototype.speakSlide = function (i) {
    var els = [].slice.call(this.slideEls[i].querySelectorAll('[data-mls-qualified]')).filter(function (e) {
      return e.getAttribute('data-mls-speak') !== 'reveal' && e.getClientRects().length > 0;
    });
    if (els.length) this.speakEls(els);
  };

  Player.prototype.voiceOptions = function (selected) {
    var mine = MLS.speech.voicesFor(this.lang);
    var others = MLS.speech.voices().filter(function (v) { return mine.indexOf(v) === -1; });
    var online = this.t('a.online');
    function opt(v) {
      return '<option value="' + U.escapeHtml(v.voiceURI) + '"' + (v.voiceURI === selected ? ' selected' : '') + '>' +
        U.escapeHtml(v.name) + ' (' + U.escapeHtml(v.lang) + ')' + (v.localService ? '' : ' · ' + online) + '</option>';
    }
    var def = mine.length ? '' : '<option value=""' + (selected ? '' : ' selected') + '>' + U.escapeHtml(this.t('a.defaultVoice')) + '</option>';
    return def + (mine.length ? '<optgroup label="' + this.t('a.groupMine') + '">' + mine.map(opt).join('') + '</optgroup>' : '') +
      (others.length ? '<optgroup label="' + this.t('a.groupOther') + '">' + others.map(opt).join('') + '</optgroup>' : '');
  };

  Player.prototype.fillVoiceSelects = function () {
    var self = this;
    var w = this.$('.mls-welcome');
    if (w.hidden) return;
    var has = MLS.speech.voices().length > 0;
    w.querySelectorAll('select[data-voice]').forEach(function (s) {
      var r = s.getAttribute('data-voice');
      s.innerHTML = has ? self.voiceOptions(self.voiceFor(r === '_narrator' ? null : r)) : '<option>' + self.t('a.noVoiceShort') + '</option>';
      s.disabled = !has;
    });
    w.querySelectorAll('[data-test-voice]').forEach(function (b) { b.disabled = !has; });
    var none = w.querySelector('.mls-no-voice');
    if (none) none.hidden = has;
  };

  Player.prototype.voiceRow = function (key, label) {
    var id = 'mls-v-' + (U.slugify(key) || 'narrateur');
    return '<div class="mls-voice-row"><label for="' + id + '"><i class="bi bi-soundwave"></i> ' + label + '</label>' +
      '<select id="' + id + '" data-voice="' + U.escapeHtml(key) + '"></select>' +
      '<button type="button" class="mls-chip" data-test-voice="' + U.escapeHtml(key) + '"><i class="bi bi-play-fill"></i> ' + this.t('a.test') + '</button></div>';
  };

  Player.prototype.audioSettingsHtml = function () {
    var mode = this.tts.mode, t = this.t;
    return '<section class="mls-audio">' +
      '<h2 class="mls-welcome-h2"><i class="bi bi-volume-up"></i> ' + t('a.title') + '</h2>' +
      '<p class="mls-welcome-hint">' + t('a.hint') + '</p>' +
      '<div class="mls-filters" role="group" aria-label="' + t('a.modeAria') + '">' +
      MLS.speech.MODES.map(function (m) {
        return '<button type="button" class="mls-chip' + (m.id === mode ? ' is-on' : '') + '" data-mode="' + m.id + '" aria-pressed="' + (m.id === mode) + '">' +
          '<i class="bi ' + m.icon + '"></i> ' + t('a.mode.' + m.id) + '</button>';
      }).join('') + '</div>' +
      '<p class="mls-mode-hint">' + t('a.hint.' + mode) + '</p>' +
      '<div class="mls-audio-grid">' + this.voiceRow('_narrator', t('a.narrator')) +
      '<div class="mls-voice-row"><label for="mls-rate"><i class="bi bi-speedometer2"></i> ' + t('a.speed') + '</label>' +
      '<input type="range" id="mls-rate" min="0.6" max="1.6" step="0.1" value="' + this.tts.rate + '">' +
      '<output for="mls-rate">' + Number(this.tts.rate).toFixed(1) + '×</output></div></div>' +
      '<p class="mls-no-voice" hidden><i class="bi bi-exclamation-circle"></i> ' + t('a.noVoice') + '</p>' +
      '</section>';
  };

  Player.prototype.testVoice = function (key) {
    var text;
    if (key === '_narrator') text = this.t('a.testNarrator');
    else { var ch = this.character(key); text = this.t('a.testRole', { name: ch.name, label: ch.label }); }
    MLS.speech.speak([{ text: text, voice: this.voiceFor(key === '_narrator' ? null : key) }], { rate: this.tts.rate, lang: this.lang });
  };

  /* ---------------------------------------------------- Écran d'accueil */

  Player.prototype.openWelcome = function (fromMenu) {
    var self = this;
    MLS.speech.cancel();
    var w = this.$('.mls-welcome');
    var fm = this.course.meta;
    var roles = this.course.roles;
    var resume = this.mode === 'standalone' && !fromMenu ? (MLS.scorm.getLocation() || MLS.store.get(this.courseKey + '.location', 0)) : 0;
    var html = '<div class="mls-welcome-card" role="dialog" aria-modal="true" aria-labelledby="mls-wt">';
    if (fromMenu) html += '<button type="button" class="mls-icon-btn mls-close" data-w="close" aria-label="' + this.t('p.close') + '"><i class="bi bi-x-lg"></i></button>';
    var pc = this.parcours;
    html += '<div class="mls-eyebrow"><i class="bi bi-mortarboard"></i> ' + U.escapeHtml(pc.name || fm.subtitle || this.t('p.moduleEyebrow')) +
      (pc.n ? ' · ' + U.escapeHtml(this.t('p.moduleOf', { n: pc.n, total: pc.total || '?' })) : '') + '</div>';
    html += '<h1 id="mls-wt">' + U.escapeHtml(this.course.title) + '</h1>';
    if (fm.description) html += '<p class="mls-welcome-desc">' + U.escapeHtml(fm.description) + '</p>';
    if (pc.total > 1) html += this.pathHtml(false);
    html += '<div class="mls-welcome-meta"><span><i class="bi bi-collection"></i> ' + this.t('p.slidesCount', { n: this.course.slides.length }) + '</span>' +
      (this.chapters.length ? '<span><i class="bi bi-bookmark"></i> ' + this.t('p.chaptersCount', { n: this.chapters.length }) + '</span>' : '') +
      (fm.duration ? '<span><i class="bi bi-clock"></i> ' + U.escapeHtml(fm.duration) + '</span>' : '') +
      (fm.author ? '<span><i class="bi bi-person-badge"></i> ' + U.escapeHtml(fm.author) + '</span>' : '') + '</div>';

    if (roles.length && this.chars().length) {
      html += '<h2 class="mls-welcome-h2">' + this.t('p.chooseCast') + '</h2>' +
        '<p class="mls-welcome-hint">' + this.t('p.chooseCastHint') + '</p>' +
        '<div class="mls-filters" role="group" aria-label="' + this.t('p.filterAria') + '">' +
        FILTERS.map(function (f, i) {
          return '<button type="button" class="mls-chip' + (i === 0 ? ' is-on' : '') + '" data-filter="' + f + '" aria-pressed="' + (i === 0) + '">' + self.t('p.filter.' + f) + '</button>';
        }).join('') + '</div>';
      roles.forEach(function (r) {
        var ch = self.character(r.role);
        html += '<section class="mls-role" data-role="' + U.escapeHtml(r.role) + '">' +
          '<div class="mls-role-current">' + ch.avatar +
          '<div><div class="mls-role-label">' + U.escapeHtml(r.label) + '</div>' +
          '<div class="mls-role-name">' + ch.nameTag + '</div>' +
          '<div class="mls-role-desc">' + U.escapeHtml(ch.description || '') + '</div></div></div>' +
          '<div class="mls-char-grid" role="group" aria-label="' + U.escapeHtml(self.t('p.castFor', { label: r.label })) + '">' +
          self.chars().map(function (c) {
            var on = self.cast[r.role] === c.id;
            return '<button type="button" class="mls-char' + (on ? ' is-on' : '') + '" data-id="' + U.escapeHtml(c.id) + '" data-tags="' +
              U.escapeHtml((c.tags || []).join(' ')) + '" aria-pressed="' + on + '" title="' + U.escapeHtml(MLS.i18n.local(c.description, self.lang) || c.name) + '">' +
              '<img src="' + U.escapeHtml(c.images.neutral) + '" alt=""><span>' + U.escapeHtml(c.name) + '</span></button>';
          }).join('') +
          '</div>' + (self.audioOn ? self.voiceRow(r.role, self.t('a.voice')) : '') + '</section>';
      });
    }
    if (this.audioOn) html += this.audioSettingsHtml();
    html += '<div class="mls-welcome-actions">';
    if (resume > 0) {
      html += '<button type="button" class="mls-btn mls-btn-ghost" data-w="start">' + this.t('p.restart') + '</button>' +
        '<button type="button" class="mls-btn" data-w="resume"><i class="bi bi-play-fill"></i> ' + this.t('p.resume', { n: resume + 1 }) + '</button>';
    } else {
      html += '<button type="button" class="mls-btn" data-w="' + (fromMenu ? 'close' : 'start') + '">' +
        (fromMenu ? '<i class="bi bi-check-lg"></i> ' + this.t('p.validate') : '<i class="bi bi-play-fill"></i> ' + this.t('p.start')) + '</button>';
    }
    html += '</div></div>';
    w.innerHTML = html;
    w.hidden = false;
    this.toggleToc(false);
    this.fillVoiceSelects();

    w.onchange = function (e) {
      var s = e.target.closest('select[data-voice]');
      if (!s) return;
      self.voices[s.getAttribute('data-voice')] = s.value;
      MLS.store.set(self.courseKey + '.voices', self.voices);
      self.testVoice(s.getAttribute('data-voice'));
    };
    w.oninput = function (e) {
      if (e.target.id !== 'mls-rate') return;
      self.tts.rate = parseFloat(e.target.value);
      w.querySelector('output[for="mls-rate"]').textContent = self.tts.rate.toFixed(1) + '×';
      MLS.speech.saveSettings(self.tts);
    };

    w.onclick = function (e) {
      var mb = e.target.closest('[data-mode]');
      if (mb) {
        self.tts.mode = mb.getAttribute('data-mode');
        MLS.speech.saveSettings(self.tts);
        self.applyAudioClass();
        w.querySelectorAll('[data-mode]').forEach(function (c) { var on = c === mb; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', on); });
        w.querySelector('.mls-mode-hint').innerHTML = self.t('a.hint.' + self.tts.mode);
        if (self.tts.mode === 'off') MLS.speech.cancel();
        return;
      }
      var tv = e.target.closest('[data-test-voice]');
      if (tv) { self.testVoice(tv.getAttribute('data-test-voice')); return; }
      var chip = e.target.closest('[data-filter]');
      if (chip) {
        var f = chip.getAttribute('data-filter');
        w.querySelectorAll('[data-filter]').forEach(function (c) { var on = c === chip; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', on); });
        w.querySelectorAll('.mls-char').forEach(function (b) {
          b.hidden = f !== 'all' && (' ' + b.getAttribute('data-tags') + ' ').indexOf(' ' + f + ' ') === -1;
        });
        return;
      }
      var cb = e.target.closest('.mls-char');
      if (cb) {
        var sec = cb.closest('.mls-role');
        var role = sec.getAttribute('data-role');
        self.cast[role] = cb.getAttribute('data-id');
        self.saveCast();
        sec.querySelectorAll('.mls-char').forEach(function (b) { var on = b === cb; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
        var ch = self.character(role);
        var cur = sec.querySelector('.mls-role-current .mls-avatar');
        if (cur && ch.img) { cur.src = ch.img; cur.alt = ch.alt; }
        sec.querySelector('.mls-role-desc').textContent = ch.description || '';
        self.refreshAvatars();
        self.announce(self.t('p.castAnnounce', { name: ch.name, label: ch.label }));
        return;
      }
      var act = e.target.closest('[data-w]');
      if (!act) return;
      var a = act.getAttribute('data-w');
      w.hidden = true;
      self.started = true;
      if (a === 'resume') self.goTo(resume);
      else if (a === 'start') self.goTo(0);
      else self.goTo(self.index, { focus: true });
    };
    var first = w.querySelector('.mls-btn, .mls-char.is-on');
    if (first) setTimeout(function () { first.focus(); }, 50);
  };

  /* --------------------------------------------- Parcours et chapitres */

  /** En-tête : course (nom du parcours), module (position), modules (total), next {title, url}. */
  Player.prototype.setupParcours = function () {
    var fm = this.course.meta;
    var next = fm.next;
    if (typeof next === 'string') next = { title: next };
    if (next && typeof next === 'object' && !next.title && !next.url) next = null;
    var n = parseInt(fm.module, 10) || 0, total = parseInt(fm.modules, 10) || 0;
    this.parcours = {
      name: fm.course ? String(fm.course) : '',
      n: n, total: Math.max(total, n),
      next: next || null
    };
    this.parcoursKey = 'parcours.' + (U.slugify(this.parcours.name) || 'default');
  };

  /** Chapitres : chaque slide format-title (hors première) ou portant <!-- chapter: … --> ouvre un chapitre. */
  Player.prototype.computeChapters = function () {
    var self = this, list = [];
    this.course.slides.forEach(function (s, i) {
      var explicit = s.meta.chapter;
      var no = /^(no|non|false|off)$/i.test(String(explicit || ''));
      if (no) return;
      if (explicit || s.format === 'format-title') {
        var title = explicit && !/^(yes|oui|true|on)$/i.test(String(explicit)) ? String(explicit) : (s.title || self.t('p.slide', { n: i + 1 }));
        list.push({ start: i, title: title });
      }
    });
    if (list.length && list[0].start > 0) list.unshift({ start: 0, title: this.t('p.intro') });
    this.chapters = list.length > 1 ? list : [];
    this.chapters.forEach(function (c, k) { c.number = k + 1; });
    // repères sur la barre de progression
    var bar = this.$('.mls-progress');
    bar.querySelectorAll('.mls-tick').forEach(function (t) { t.remove(); });
    var n = this.course.slides.length;
    this.chapters.forEach(function (c) {
      if (!c.start || n < 2) return;
      var t = el('i', 'mls-tick');
      t.style.left = (c.start / (n - 1) * 100) + '%';
      bar.appendChild(t);
    });
  };

  Player.prototype.chapterAt = function (i) {
    var cur = null;
    this.chapters.forEach(function (c) { if (c.start <= i) cur = c; });
    return cur;
  };

  Player.prototype.updateSubtitle = function (i) {
    var parts = [], pc = this.parcours;
    if (pc.n) parts.push(this.t('p.moduleOf', { n: pc.n, total: pc.total || '?' }));
    var ch = this.chapterAt(i);
    if (ch) parts.push(this.t('p.chapterOf', { n: ch.number, total: this.chapters.length }) + ' · ' + ch.title);
    var sub = this.$('.mls-ct-sub');
    sub.textContent = parts.join(' · ');
    sub.hidden = !parts.length;
  };

  Player.prototype.modulesDone = function () { return MLS.store.get(this.parcoursKey, {}) || {}; };

  Player.prototype.markModuleDone = function () {
    if (!this.parcours.n || this.mode !== 'standalone') return;
    var done = this.modulesDone();
    done[this.parcours.n] = true;
    MLS.store.set(this.parcoursKey, done);
  };

  /** Pastilles de progression du parcours (modules faits / en cours / à faire). */
  Player.prototype.pathHtml = function (atEnd) {
    var pc = this.parcours, done = this.modulesDone(), t = this.t, html = '';
    for (var k = 1; k <= pc.total; k++) {
      var isCur = k === pc.n, isDone = done[k] || (atEnd && isCur);
      var state = isDone ? 'done' : isCur ? 'current' : 'todo';
      html += '<li class="mls-path-' + state + '"' + (isCur ? ' aria-current="step"' : '') + '>' +
        '<span class="mls-sr">' + U.escapeHtml(t('p.path.' + state, { n: k })) + '</span>' +
        '<span aria-hidden="true">' + (isDone ? '<i class="bi bi-check-lg"></i>' : k) + '</span></li>';
    }
    return '<div class="mls-path-wrap"><div class="mls-path-label">' + U.escapeHtml(t('p.courseProgress')) + '</div>' +
      '<ol class="mls-path" style="--n:' + pc.total + '">' + html + '</ol></div>';
  };

  /** Encadré « À suivre » : lien sur le web, message en SCORM (c'est le LMS qui enchaîne). */
  Player.prototype.nextHtml = function () {
    var nx = this.parcours.next;
    if (!nx) return '';
    var html = '<div class="mls-next"><div class="mls-next-label"><i class="bi bi-signpost-split"></i> ' + U.escapeHtml(this.t('p.upNext')) + '</div>' +
      (nx.title ? '<div class="mls-next-title">' + U.escapeHtml(nx.title) + '</div>' : '');
    if (MLS.scorm.isActive()) {
      html += '<p class="mls-next-hint">' + U.escapeHtml(this.t('p.backToLms')) + '</p>';
    } else if (nx.url) {
      html += '<a class="mls-btn" href="' + U.escapeHtml(nx.url) + '"' + (this.mode === 'standalone' ? '' : ' target="_blank" rel="noopener"') + '>' +
        U.escapeHtml(this.t('p.goNext')) + ' <i class="bi bi-arrow-right"></i></a>';
    } else {
      html += '<p class="mls-next-hint">' + U.escapeHtml(this.t('p.nextNoLink')) + '</p>';
    }
    return html + '</div>';
  };

  /* ----------------------------------------------------- Écran de fin */

  Player.prototype.openEnd = function () {
    var self = this;
    MLS.speech.cancel();
    var total = Object.keys(this.gradable).length;
    var ok = Object.keys(this.scores).filter(function (k) { return self.scores[k]; }).length;
    var pct = total ? Math.round(ok / total * 100) : 100;
    var end = this.$('.mls-end');
    var mentor = this.course.roles[0] ? this.character(this.course.roles[0].role, pct >= 50 ? 'happy' : 'encouraging') : null;
    var pc = this.parcours;
    this.markModuleDone();
    var lastModule = pc.total && pc.n === pc.total;
    var endTitle = lastModule ? this.t('p.courseDone') : pc.n ? this.t('p.moduleDone', { n: pc.n, total: pc.total || '?' }) : this.t('p.endTitle');
    end.innerHTML =
      '<div class="mls-welcome-card mls-end-card" role="dialog" aria-modal="true" aria-labelledby="mls-et">' +
      (mentor ? '<div class="mls-end-avatar">' + mentor.avatar + '</div>' : '<div class="mls-end-icon"><i class="bi bi-trophy"></i></div>') +
      '<h1 id="mls-et">' + U.escapeHtml(endTitle) + '</h1>' +
      (pc.name ? '<p class="mls-end-course">' + U.escapeHtml(pc.name) + '</p>' : '') +
      (total ? '<div class="mls-score" style="--p:' + pct + '"><span>' + ok + '<small>/' + total + '</small></span></div>' +
        '<p>' + this.t(pct === 100 ? 'p.endPerfect' : pct >= 50 ? 'p.endGood' : 'p.endLow') + '</p>'
        : '<p>' + this.t('p.endThanks') + '</p>') +
      (pc.total > 1 ? this.pathHtml(true) : '') +
      this.nextHtml() +
      '<div class="mls-welcome-actions">' +
      '<button type="button" class="mls-btn mls-btn-ghost" data-e="review"><i class="bi bi-arrow-counterclockwise"></i> ' + this.t('p.review') + '</button>' +
      '<button type="button" class="mls-btn" data-e="close"><i class="bi bi-check-lg"></i> ' + this.t('p.close') + '</button>' +
      '</div></div>';
    end.hidden = false;
    MLS.scorm.complete(ok, total);
    if (this.mode === 'standalone') MLS.store.set(this.courseKey + '.location', 0);
    end.onclick = function (e) {
      var b = e.target.closest('[data-e]');
      if (!b) return;
      end.hidden = true;
      if (b.getAttribute('data-e') === 'review') self.goTo(0);
    };
    var btn = end.querySelector('.mls-btn');
    if (btn) btn.focus();
  };

  MLS.Player = Player;
})(window.MLS);
