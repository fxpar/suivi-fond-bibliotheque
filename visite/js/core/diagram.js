/*!
 * MicroLearn — schémas interactifs (pyramide, entonnoir, cycle, processus, matrice, hub, puzzle).
 * SVG paramétriques générés à la volée (s'adaptent au nombre d'éléments), inspirés des
 * "SmartArt" / OpenNapkinAI, avec une couche d'interactivité : chaque partie se découvre au clic,
 * un panneau détaille la partie active, la synthèse (citation « > ») se révèle quand tout est exploré.
 *
 * Utilisation dans un format :  MLS.diagram.mount(root, data, ctx, 'pyramid');
 */
(function (MLS) {
  'use strict';

  var COLORS = ['var(--mls-primary)', 'var(--mls-secondary)', 'var(--mls-accent)', '#f2a81d', '#2bb6d6', '#e5484d', '#8b5cf6', '#4f7e4d'];
  var MAX = { matrix: 4, puzzle: 6, pyramid: 7, funnel: 7, cycle: 8, hub: 8, process: 7 };
  var uidN = 0;

  function color(i) { return COLORS[i % COLORS.length]; }
  function esc(s) { return MLS.util.escapeHtml(s); }
  function f(n) { return Math.round(n * 10) / 10; }

  /** Coupe un libellé en lignes d'environ `max` caractères (3 lignes au plus). */
  function wrap(text, max) {
    var words = String(text || '').split(/\s+/), lines = [], cur = '';
    max = Math.max(4, Math.floor(max));
    words.forEach(function (w) {
      if (!cur) cur = w;
      else if ((cur + ' ' + w).length <= max) cur += ' ' + w;
      else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    if (lines.length > 3) { lines = lines.slice(0, 3); lines[2] = lines[2].replace(/.{0,2}$/, '…'); }
    return lines;
  }

  function label(x, y, text, size, maxChars, cls) {
    var lines = wrap(text, maxChars), lh = size * 1.18, y0 = y - (lines.length - 1) * lh / 2;
    return '<text class="' + (cls || 'dg-label') + '" x="' + f(x) + '" y="' + f(y0) + '" font-size="' + size + '" text-anchor="middle" dominant-baseline="middle">' +
      lines.map(function (l, k) { return '<tspan x="' + f(x) + '" dy="' + (k ? f(lh) : 0) + '">' + esc(l) + '</tspan>'; }).join('') + '</text>';
  }

  function part(i, item, shape, text, extraStyle) {
    return '<g class="dg-part" data-part="' + i + '" style="--c:' + color(i) + ';' + (extraStyle || '') + '" tabindex="0" role="button" aria-label="' +
      esc(item.number + '. ' + item.termText) + '">' + shape + text + '</g>';
  }

  function poly(points) { return '<polygon class="dg-shape" points="' + points.map(function (p) { return f(p[0]) + ',' + f(p[1]); }).join(' ') + '"/>'; }

  function svg(w, h, inner, cls) {
    return '<svg class="dg-svg ' + (cls || '') + '" viewBox="0 0 ' + f(w) + ' ' + f(h) + '" preserveAspectRatio="xMidYMid meet" focusable="false">' + inner + '</svg>';
  }

  /* ------------------------------------------------------------ Formes */

  var shapes = {};

  /** Pyramide (pointe en haut, élément 1 au sommet) ou entonnoir (invert). */
  function stack(items, invert) {
    var n = items.length, W = 600, top = 10, lv = Math.max(58, Math.min(92, 440 / n)), gap = 7, total = n * lv;
    function half(y) { return invert ? 285 - (y / total) * (285 - 80) : 18 + (y / total) * 267; }
    var out = '';
    items.forEach(function (it, i) {
      var y0 = i * lv, y1 = (i + 1) * lv - gap;
      var tip = !invert && i === 0;
      var pts = tip
        ? [[300, top + y0], [300 + half(y1), top + y1], [300 - half(y1), top + y1]]
        : [[300 - half(y0), top + y0], [300 + half(y0), top + y0], [300 + half(y1), top + y1], [300 - half(y1), top + y1]];
      var cy = top + (tip ? y0 + (y1 - y0) * 0.64 : (y0 + y1) / 2);
      var width = 2 * half(tip ? y0 + (y1 - y0) * 0.64 : (y0 + y1) / 2);
      var size = n > 5 ? 21 : 24;
      out += part(i, it, poly(pts), label(300, cy, it.termText, size, (width - 24) / (size * 0.56)));
    });
    return svg(W, top + total + 4, out);
  }
  shapes.pyramid = function (items) { return stack(items, false); };
  shapes.funnel = function (items) { return stack(items, true); };

  /** Processus en chevrons : horizontal (grand écran) + vertical (mobile). */
  shapes.process = function (items) {
    var n = items.length, s = 580 / n, d = 24, h = '', v = '';
    items.forEach(function (it, i) {
      var x = 10 + i * s, first = i === 0;
      var pts = [[x, 10], [x + s - 4, 10], [x + s - 4 + d, 75], [x + s - 4, 140], [x, 140]];
      if (!first) pts.push([x + d, 75]);
      h += part(i, it, poly(pts), label(x + s / 2 + (first ? 0 : d / 2) - 2, 75, it.termText, 20, (s - d - 8) / 11));
      var y = 10 + i * 84;
      var vp = first ? [[10, y], [330, y], [330, y + 64], [170, y + 84], [10, y + 64]]
        : [[10, y], [170, y + 20], [330, y], [330, y + 64], [170, y + 84], [10, y + 64]];
      v += part(i, it, poly(vp), label(170, y + (first ? 36 : 44), it.termText, 21, 24));
    });
    return svg(600 + d, 150, h, 'dg-h') + svg(340, 10 + n * 84 + 24, v, 'dg-v');
  };

  /** Cycle : nœuds sur un cercle reliés par des flèches. */
  shapes.cycle = function (items, opts) {
    var n = items.length, cx = 300, cy = 300, R = 215, r = Math.min(78, Math.PI * R / n * 0.78), id = 'dgm' + (++uidN), out = '';
    out += '<defs><marker id="' + id + '" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0,0 L10,5 L0,10 z" class="dg-arrowhead"/></marker></defs>';
    var ang = function (i) { return -Math.PI / 2 + i * 2 * Math.PI / n; };
    var delta = (r + 12) / R;
    for (var i = 0; i < n; i++) {
      var a1 = ang(i) + delta, a2 = ang(i + 1) - delta;
      out += '<path class="dg-link" marker-end="url(#' + id + ')" d="M' + f(cx + R * Math.cos(a1)) + ',' + f(cy + R * Math.sin(a1)) +
        ' A' + R + ',' + R + ' 0 0 1 ' + f(cx + R * Math.cos(a2)) + ',' + f(cy + R * Math.sin(a2)) + '"/>';
    }
    if (opts.center) out += '<circle class="dg-center" cx="' + cx + '" cy="' + cy + '" r="' + f(R - r - 30) + '"/>' + label(cx, cy, opts.center, 24, (R - r - 40) / 6.5, 'dg-label dg-center-label');
    items.forEach(function (it, i) {
      var x = cx + R * Math.cos(ang(i)), y = cy + R * Math.sin(ang(i));
      out += part(i, it, '<circle class="dg-shape" cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '"/>', label(x, y, it.termText, r > 60 ? 21 : 18, r / 5.6));
    });
    return svg(600, 600, out);
  };

  /** Hub : concept central et satellites. */
  shapes.hub = function (items, opts) {
    var n = items.length, cx = 300, cy = 300, R = 210, r = Math.min(76, Math.PI * R / n * 0.7), rc = 88, out = '';
    var ang = function (i) { return -Math.PI / 2 + i * 2 * Math.PI / n; };
    items.forEach(function (it, i) {
      var a = ang(i);
      out += '<line class="dg-link dg-spoke" data-spoke="' + i + '" x1="' + f(cx + rc * Math.cos(a)) + '" y1="' + f(cy + rc * Math.sin(a)) +
        '" x2="' + f(cx + (R - r) * Math.cos(a)) + '" y2="' + f(cy + (R - r) * Math.sin(a)) + '"/>';
    });
    out += '<circle class="dg-center" cx="' + cx + '" cy="' + cy + '" r="' + rc + '"/>' + label(cx, cy, opts.center || '', 23, rc / 6.4, 'dg-label dg-center-label');
    items.forEach(function (it, i) {
      var x = cx + R * Math.cos(ang(i)), y = cy + R * Math.sin(ang(i));
      out += part(i, it, '<circle class="dg-shape" cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '"/>', label(x, y, it.termText, r > 60 ? 21 : 18, r / 5.6));
    });
    return svg(600, 600, out);
  };

  /** Matrice 2 × 2 avec axes (items : haut-gauche, haut-droite, bas-gauche, bas-droite). */
  shapes.matrix = function (items, opts) {
    var x0 = 74, y0 = 12, w = 255, h = 205, g = 12, out = '';
    items.forEach(function (it, i) {
      var x = x0 + (i % 2) * (w + g), y = y0 + Math.floor(i / 2) * (h + g);
      out += part(i, it, '<rect class="dg-shape" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="18"/>', label(x + w / 2, y + h / 2, it.termText, 25, 16));
    });
    var bottom = y0 + 2 * h + g, right = x0 + 2 * w + g;
    out += '<path class="dg-axis" d="M' + (x0 - 22) + ',' + (bottom + 8) + ' L' + (x0 - 22) + ',' + (y0 + 4) + ' M' + (x0 - 30) + ',' + (y0 + 16) + ' L' + (x0 - 22) + ',' + (y0 + 4) + ' L' + (x0 - 14) + ',' + (y0 + 16) + '"/>';
    out += '<path class="dg-axis" d="M' + (x0 - 22) + ',' + (bottom + 22) + ' L' + (right + 4) + ',' + (bottom + 22) + ' M' + (right - 8) + ',' + (bottom + 14) + ' L' + (right + 4) + ',' + (bottom + 22) + ' L' + (right - 8) + ',' + (bottom + 30) + '"/>';
    if (opts.axisY) out += '<text class="dg-axis-label" font-size="17" text-anchor="middle" transform="translate(' + (x0 - 40) + ',' + f(y0 + h + g / 2) + ') rotate(-90)">' + esc(opts.axisY) + '</text>';
    if (opts.axisX) out += '<text class="dg-axis-label" font-size="17" text-anchor="middle" x="' + f(x0 + w + g / 2) + '" y="' + (bottom + 50) + '">' + esc(opts.axisX) + '</text>';
    return svg(right + 10, bottom + 62, out);
  };

  /** Puzzle : pièces à encoches, dispersées au départ, mises en place au clic. */
  shapes.puzzle = function (items) {
    var n = items.length, cols = n <= 3 ? n : n === 4 ? 2 : 3, rows = Math.ceil(n / cols), S = 170, M = 56, out = '';
    // e = sens de l'encoche des bords internes (+1 : vers la droite / le bas)
    function edgeV(r, c) { return (r + c) % 2 ? 1 : -1; }   // entre (r,c) et (r,c+1)
    function edgeH(r, c) { return (r + c) % 2 ? -1 : 1; }   // entre (r,c) et (r+1,c)
    function edge(ax, ay, bx, by, sign) {
      if (!sign) return ' L' + f(bx) + ',' + f(by);
      var dx = bx - ax, dy = by - ay, nx = dy * sign, ny = -dx * sign;
      var p = function (t, k) { return f(ax + dx * t + nx * k) + ',' + f(ay + dy * t + ny * k); };
      return ' L' + p(0.36, 0) + ' C' + p(0.22, 0.32) + ' ' + p(0.78, 0.32) + ' ' + p(0.64, 0) + ' L' + f(bx) + ',' + f(by);
    }
    items.forEach(function (it, i) {
      var r = Math.floor(i / cols), c = i % cols, x = M + c * S, y = M + r * S;
      var hasRight = c < cols - 1 && i + 1 < n, hasBottom = r < rows - 1 && i + cols < n;
      var top = r > 0 ? -edgeH(r - 1, c) : 0, right = hasRight ? edgeV(r, c) : 0, bottom = hasBottom ? edgeH(r, c) : 0, left = c > 0 ? -edgeV(r, c - 1) : 0;
      var d = 'M' + x + ',' + y + edge(x, y, x + S, y, top) + edge(x + S, y, x + S, y + S, right) + edge(x + S, y + S, x, y + S, bottom) + edge(x, y + S, x, y, left) + ' Z';
      var dx = ((i * 37) % 7 - 3) * 16 + (c === 0 ? -14 : 14), dy = (((i * 53) % 5) - 2) * 12 + (r === 0 ? -8 : 14), rot = ((i * 29) % 5 - 2) * 7 || 6;
      out += part(i, it, '<path class="dg-shape" d="' + d + '"/>', label(x + S / 2, y + S / 2, it.termText, 21, 12),
        '--dx:' + dx + 'px;--dy:' + dy + 'px;--rot:' + rot + 'deg');
    });
    var W = 2 * M + cols * S, H = 2 * M + rows * S;
    return svg(W, H, '<rect class="dg-puzzle-frame" x="' + M + '" y="' + M + '" width="' + cols * S + '" height="' + rows * S + '" rx="10"/>' + out);
  };

  /* ----------------------------------------------------- Interactivité */

  function mount(root, data, ctx, type) {
    var host = root.querySelector('.dg') || root;
    var body = root.querySelector('.dg-body');
    var tpl = root.querySelector('.dg-data');
    var contents = tpl ? (tpl.content ? tpl.content.children : tpl.children) : [];
    var items = data.items.slice(0, MAX[type] || 8);
    var n = items.length;
    var t = ctx.t;
    if (!n) { body.innerHTML = '<p class="mls-muted">' + esc(t('dg.empty')) + '</p>'; return; }

    var opts = {
      center: data.meta.center || (type === 'hub' ? data.title : ''),
      axisX: data.meta['axis-x'] || '', axisY: data.meta['axis-y'] || ''
    };
    var playable = type === 'cycle' || type === 'process';
    var synth = data.quotes.length ? data.quotes.map(function (q) { return q.html; }).join('') : '';

    body.innerHTML =
      '<div class="dg-wrap">' +
      '  <div class="dg-canvas">' + shapes[type](items, opts) + '</div>' +
      '  <div class="dg-side">' +
      '    <p class="dg-hint"><i class="bi ' + (type === 'puzzle' ? 'bi-puzzle' : 'bi-hand-index-thumb') + '"></i> ' +
             esc(t(type === 'puzzle' ? 'dg.hintPuzzle' : 'dg.hint')) + '</p>' +
      '    <div class="dg-detail mls-card" data-mls-speak hidden aria-live="polite"></div>' +
      '    <div class="dg-controls">' +
      '      <button type="button" class="mls-btn mls-btn-ghost dg-prev" aria-label="' + esc(t('dg.prev')) + '"><i class="bi bi-chevron-left"></i></button>' +
      '      <span class="dg-count"></span>' +
      '      <button type="button" class="mls-btn mls-btn-ghost dg-next" aria-label="' + esc(t('dg.next')) + '"><i class="bi bi-chevron-right"></i></button>' +
      (playable ? '      <button type="button" class="mls-btn dg-play"><i class="bi bi-play-fill"></i> <span>' + esc(t('dg.play')) + '</span></button>' : '') +
      '    </div>' +
      (synth ? '    <div class="dg-synthesis mls-card" data-mls-speak hidden><div class="dg-synthesis-label"><i class="bi bi-stars"></i> ' + esc(t('dg.synthesis')) + '</div>' + synth + '</div>' : '') +
      '  </div>' +
      '</div>';

    var parts = [].slice.call(body.querySelectorAll('.dg-part'));
    var detail = body.querySelector('.dg-detail');
    var count = body.querySelector('.dg-count');
    var synthEl = body.querySelector('.dg-synthesis');
    var playBtn = body.querySelector('.dg-play');
    var seen = ctx.state.seen || (ctx.state.seen = {});
    var cur = -1, timer = null;

    function refresh() {
      var k = Object.keys(seen).length;
      count.textContent = t('dg.explored', { n: k, total: n });
      parts.forEach(function (p) {
        var i = +p.getAttribute('data-part');
        p.classList.toggle('is-seen', !!seen[i]);
        p.classList.toggle('is-active', i === cur);
        p.setAttribute('aria-pressed', i === cur);
      });
      host.classList.toggle('dg-has-active', cur >= 0);
      body.querySelectorAll('[data-spoke]').forEach(function (s) { s.classList.toggle('is-active', +s.getAttribute('data-spoke') === cur); });
      var done = k === n;
      host.classList.toggle('dg-complete', done);
      if (synthEl && done && synthEl.hidden) {
        synthEl.hidden = false;
        ctx.speakable(synthEl);
      }
    }

    function activate(i, user) {
      i = (i + n) % n;
      cur = i;
      ctx.state.cur = i;
      var first = !seen[i];
      seen[i] = true;
      var c = contents[i];
      detail.innerHTML = '<div class="dg-detail-head"><span class="dg-num" style="--c:' + color(i) + '">' + (i + 1) + '</span>' +
        (c ? c.querySelector('.dg-t').innerHTML : esc(items[i].termText)) + '</div>' +
        '<div class="mls-prose">' + (c ? c.querySelector('.dg-d').innerHTML : '') + '</div>';
      detail.hidden = false;
      detail.style.setProperty('--c', color(i));
      var before = Object.keys(seen).length;
      refresh();
      ctx.speakable(detail);
      if (user) {
        ctx.speak(detail);
        if (type === 'puzzle' && first && before === n) ctx.announce(t('dg.complete'));
        else ctx.announce(detail.textContent.trim());
      }
    }

    function stop() {
      if (!timer) return;
      clearInterval(timer); timer = null;
      if (playBtn) { playBtn.querySelector('span').textContent = t('dg.play'); playBtn.querySelector('i').className = 'bi bi-play-fill'; }
    }

    parts.forEach(function (p) {
      var i = +p.getAttribute('data-part');
      p.addEventListener('click', function () { stop(); activate(i, true); });
      p.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stop(); activate(i, true); }
        else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); focusPart(i + 1); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); focusPart(i - 1); }
      });
    });
    function focusPart(i) {
      i = (i + n) % n;
      var vis = parts.filter(function (p) { return +p.getAttribute('data-part') === i && p.getClientRects().length; })[0];
      if (vis) { vis.focus(); stop(); activate(i, true); }
    }
    body.querySelector('.dg-prev').addEventListener('click', function () { stop(); activate(cur < 0 ? n - 1 : cur - 1, true); });
    body.querySelector('.dg-next').addEventListener('click', function () { stop(); activate(cur + 1, true); });
    if (playBtn) playBtn.addEventListener('click', function () {
      if (timer) { stop(); return; }
      playBtn.querySelector('span').textContent = t('dg.pause');
      playBtn.querySelector('i').className = 'bi bi-pause-fill';
      activate(cur + 1, true);
      timer = setInterval(function () { activate(cur + 1, true); }, 3200);
    });
    ctx.onLeave(stop);

    if (ctx.state.cur != null) activate(ctx.state.cur, false); else refresh();
  }

  MLS.diagram = { mount: mount, shapes: shapes, wrap: wrap };
})(window.MLS);
