/*!
 * Parseur de cours : Markdown structuré -> modèle de slides -> données de gabarit.
 *
 *  ---                       front-matter YAML (title, characters, theme…)
 *  ---                       séparateur de slides (ligne seule, hors bloc de code)
 *  <!-- clé: valeur -->      métadonnées de slide (slide, character-role…)
 */
(function (MLS) {
  'use strict';

  var COMMENT_RE = /<!--\s*([\w-]+)\s*:\s*([\s\S]*?)\s*-->/g;
  var MARKER_RE = /^@@(ROLE|EXPR):([^@]*)@@$/;
  var SPEAKER_RE = /^@([\w-]+)(?:\(([\w-]+)\))?\s*:\s*/;

  function normalizeFormat(id) {
    id = String(id || '').trim().toLowerCase();
    if (!id) return 'format-content';
    return id.indexOf('format-') === 0 ? id : 'format-' + id;
  }

  /** Découpe le Markdown complet en front-matter + slides brutes (avec positions). */
  function split(md) {
    md = String(md || '').replace(/\r\n?/g, '\n');
    var frontRaw = '';
    var bodyStart = 0;
    var fm = md.match(/^﻿?\s*---\n([\s\S]*?)\n---[ \t]*(\n|$)/);
    if (fm) { frontRaw = fm[1]; bodyStart = fm[0].length; }

    var slides = [];
    var lines = md.slice(bodyStart).split('\n');
    var offset = bodyStart;
    var line = md.slice(0, bodyStart).split('\n').length;
    var cur = { start: offset, line: line, lines: [] };
    var fence = null;

    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      var f = l.match(/^\s*(```|~~~)/);
      if (f) fence = fence ? (fence === f[1] ? null : fence) : f[1];
      if (!fence && /^---\s*$/.test(l)) {
        slides.push(cur);
        cur = { start: offset + l.length + 1, line: line + 1, lines: [] };
      } else {
        cur.lines.push(l);
      }
      offset += l.length + 1;
      line++;
    }
    slides.push(cur);

    return {
      frontRaw: frontRaw,
      slides: slides
        .map(function (s) { s.raw = s.lines.join('\n'); s.end = s.start + s.raw.length; delete s.lines; return s; })
        .filter(function (s) { return s.raw.trim() !== ''; })
    };
  }

  /** Extrait les commentaires de métadonnées et laisse des marqueurs pour les rôles. */
  function parseSlide(raw) {
    var meta = {};
    var roleSeq = [];
    var body = raw.replace(COMMENT_RE, function (_, key, value) {
      key = key.toLowerCase();
      value = value.trim();
      if (key === 'character-role') {
        roleSeq.push(value);
        if (!meta[key]) meta[key] = value;
        return '\n\n@@ROLE:' + value + '@@\n\n';
      }
      if (key === 'character-expression') {
        if (!meta[key]) meta[key] = value;
        return '\n\n@@EXPR:' + value + '@@\n\n';
      }
      meta[key] = value;
      return '';
    });
    return {
      format: normalizeFormat(meta.slide || meta.format),
      meta: meta,
      roles: roleSeq,
      body: body
    };
  }

  function normalizeRoles(fm) {
    var chars = fm.characters || {};
    var roles = [];
    Object.keys(chars).forEach(function (role) {
      var v = chars[role];
      if (v && typeof v === 'object') {
        roles.push({ role: role, label: v.label || v.name || role, defaultId: v.default || v.character || null });
      } else {
        roles.push({ role: role, label: v == null || v === '' ? role : String(v), defaultId: null });
      }
    });
    return roles;
  }

  /**
   * Analyse complète d'un cours.
   * @param {string} md
   * @param {{formats?: string[]}} opts  identifiants de formats connus (pour les avertissements)
   */
  function parseCourse(md, opts) {
    opts = opts || {};
    var parts = split(md);
    var fm = {};
    var warnings = [];
    try { fm = MLS.yaml.parse(parts.frontRaw); } catch (e) { warnings.push({ slide: -1, code: 'frontmatter', params: { msg: e.message }, msg: 'Front-matter illisible : ' + e.message }); }
    var roles = normalizeRoles(fm);
    var roleIds = roles.map(function (r) { return r.role; });

    var slides = parts.slides.map(function (s, i) {
      var p = parseSlide(s.raw);
      p.index = i;
      p.start = s.start;
      p.end = s.end;
      p.line = s.line;
      if (opts.formats && opts.formats.indexOf(p.format) === -1) {
        warnings.push({ slide: i, line: s.line, code: 'unknownFormat', params: { format: p.format }, msg: 'Format inconnu « ' + p.format + ' » (rendu en format-content).' });
      }
      p.roles.forEach(function (r) {
        r.split(',').forEach(function (one) {
          one = one.trim();
          if (one && roleIds.indexOf(one) === -1) {
            warnings.push({ slide: i, line: s.line, code: 'unknownRole', params: { role: one }, msg: 'Rôle « ' + one + ' » non déclaré dans le front-matter (characters).' });
          }
        });
      });
      return p;
    });

    var modN = parseInt(fm.module, 10), modT = parseInt(fm.modules, 10);
    if (modN && modT && modN > modT) warnings.push({ slide: -1, code: 'moduleRange', params: { n: modN, total: modT }, msg: 'module (' + modN + ') est supérieur à modules (' + modT + ').' });
    if (!slides.length) warnings.push({ slide: -1, code: 'noSlides', msg: 'Aucune slide : séparez vos slides par une ligne « --- ».' });

    return {
      meta: fm,
      title: fm.title || (slides[0] && firstHeading(slides[0].body)) || 'Cours sans titre',
      roles: roles,
      slides: slides,
      warnings: warnings
    };
  }

  function firstHeading(body) {
    var m = body.match(/^#{1,6}\s+(.+)$/m);
    return m ? m[1].trim() : '';
  }

  /** Index de la slide contenant la position `pos` du Markdown. */
  function slideIndexAt(course, pos) {
    var idx = 0;
    for (var i = 0; i < course.slides.length; i++) {
      if (course.slides[i].start <= pos) idx = i; else break;
    }
    return idx;
  }

  function isImageParagraph(t) {
    if (t.type !== 'paragraph' || !t.tokens || !t.tokens.length) return false;
    var hasImg = false;
    for (var i = 0; i < t.tokens.length; i++) {
      var c = t.tokens[i];
      if (c.type === 'image') hasImg = true;
      else if (!(c.type === 'br' || (c.type === 'text' && !c.text.trim()))) return false;
    }
    return hasImg;
  }

  function inline(md) { return MLS.marked.parseInline(String(md || '').trim()); }

  function buildItem(it, i) {
    var text = it.text || '';
    var firstLine = text.split('\n')[0];
    var nested = text.indexOf('\n') !== -1 ? text.slice(firstLine.length + 1) : '';
    var parts = firstLine.split(/\s*::\s*/);
    var partsHtml = parts.map(inline);
    return {
      index: i,
      number: i + 1,
      html: inline(firstLine) + (nested.trim() ? MLS.marked.parse(nested) : ''),
      text: MLS.util.stripTags(inline(firstLine)),
      term: partsHtml[0] || '',
      termText: MLS.util.stripTags(partsHtml[0] || ''),
      def: partsHtml.length > 1 ? partsHtml[1] : '',
      extra: partsHtml.length > 2 ? partsHtml.slice(2).join(' ') : '',
      parts: partsHtml,
      hasDef: partsHtml.length > 1,
      task: !!it.task,
      checked: !!it.checked,
      sub: nested.trim() ? MLS.marked.parse(nested) : ''
    };
  }

  /**
   * Construit l'objet de données exposé aux gabarits d'un format.
   * Les personnages sont résolus plus tard par le player (rôle -> visuel choisi).
   */
  function slideData(slide) {
    var tokens = MLS.marked.lexer(slide.body);
    var data = {
      id: 'slide-' + (slide.index + 1),
      index: slide.index,
      number: slide.index + 1,
      format: slide.format,
      meta: slide.meta,
      title: '', titleHtml: '',
      text: '', body: '',
      items: [], lists: [], quotes: [], images: [], sections: [],
      role: (slide.meta['character-role'] || '').split(',')[0].trim(),
      expression: slide.meta['character-expression'] || 'neutral'
    };
    var curRole = data.role, curExpr = data.expression;
    var bodyTokens = [], textTokens = [], contentTokens = [];
    var section = null;
    var titleDepth = 0;

    tokens.forEach(function (t) {
      if (t.type === 'space') return;
      var mk = t.type === 'paragraph' && t.text.trim().match(MARKER_RE);
      if (mk) {
        if (mk[1] === 'ROLE') { curRole = mk[2].split(',')[0].trim(); curExpr = data.expression; }
        else curExpr = mk[2].trim();
        return;
      }
      if (t.type === 'heading' && !data.title) {
        data.title = MLS.util.stripTags(inline(t.text));
        data.titleHtml = inline(t.text);
        titleDepth = t.depth;
        return;
      }
      bodyTokens.push(t);
      if (!isImageParagraph(t)) contentTokens.push(t);

      if (t.type === 'heading' && t.depth >= titleDepth) {
        section = { index: data.sections.length, number: data.sections.length + 1, title: MLS.util.stripTags(inline(t.text)), titleHtml: inline(t.text), tokens: [] };
        data.sections.push(section);
        return;
      }
      if (section) section.tokens.push(t);

      if (t.type === 'list') {
        var list = { ordered: !!t.ordered, items: t.items.map(function (it, i) { return buildItem(it, data.items.length + i); }) };
        data.lists.push(list);
        data.items = data.items.concat(list.items);
        return;
      }
      if (t.type === 'blockquote') {
        var qtext = t.text.trim();
        var role = curRole, expr = curExpr;
        var sp = qtext.match(SPEAKER_RE);
        if (sp) { role = sp[1]; expr = sp[2] || 'neutral'; qtext = qtext.replace(SPEAKER_RE, ''); }
        var qhtml = MLS.marked.parse(qtext);
        data.quotes.push({ index: data.quotes.length, number: data.quotes.length + 1, html: qhtml, text: MLS.util.stripTags(qhtml), role: role, expression: expr });
        return;
      }
      if (isImageParagraph(t)) {
        t.tokens.forEach(function (c) { if (c.type === 'image') data.images.push({ src: c.href, alt: c.text || '', title: c.title || '' }); });
        return;
      }
      if (!section) textTokens.push(t);
    });

    data.body = MLS.marked.parser(bodyTokens);
    data.text = MLS.marked.parser(textTokens);
    data.content = MLS.marked.parser(contentTokens);
    data.sections.forEach(function (s) { s.html = MLS.marked.parser(s.tokens); delete s.tokens; });
    data.image = data.images[0] || null;
    data.hasItems = data.items.length > 0;
    data.hasQuotes = data.quotes.length > 0;
    data.hasImage = !!data.image;
    data.hasText = !!data.text.trim();
    data.correctCount = data.items.filter(function (i) { return i.checked; }).length;
    data.multiple = data.correctCount > 1;
    return data;
  }

  MLS.marked = window.marked;
  if (MLS.marked && MLS.marked.setOptions) MLS.marked.setOptions({ gfm: true, breaks: false });

  MLS.parser = {
    split: split,
    parseSlide: parseSlide,
    parseCourse: parseCourse,
    slideData: slideData,
    slideIndexAt: slideIndexAt,
    normalizeFormat: normalizeFormat
  };
})(window.MLS);
