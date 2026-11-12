/*!
 * Moteur de gabarits minimaliste, syntaxe "Mustache" :
 *   {{var}}            valeur échappée
 *   {{{var}}} {{&var}} valeur HTML brute
 *   {{#liste}}…{{/liste}}  boucle sur un tableau / bloc si vrai
 *   {{^liste}}…{{/liste}}  bloc si faux ou vide
 *   {{.}}              élément courant     {{a.b.c}} chemin pointé
 *   {{! commentaire }}
 */
(function (MLS) {
  'use strict';

  var cache = {};
  var TAG = /\{\{\{\s*([^}]+?)\s*\}\}\}|\{\{\s*([#^\/!&]?)\s*([^}]*?)\s*\}\}/g;

  function compile(tpl) {
    if (cache[tpl]) return cache[tpl];
    var root = { children: [] };
    var stack = [root];
    var last = 0, m;
    TAG.lastIndex = 0;
    while ((m = TAG.exec(tpl))) {
      var cur = stack[stack.length - 1];
      if (m.index > last) cur.children.push({ t: 'text', v: tpl.slice(last, m.index) });
      last = TAG.lastIndex;
      if (m[1] !== undefined) { cur.children.push({ t: 'raw', k: m[1] }); continue; }
      var sigil = m[2], key = m[3];
      if (sigil === '!') continue;
      if (sigil === '&') { cur.children.push({ t: 'raw', k: key }); continue; }
      if (sigil === '#' || sigil === '^') {
        var node = { t: sigil === '#' ? 'section' : 'inverted', k: key, children: [] };
        cur.children.push(node);
        stack.push(node);
        continue;
      }
      if (sigil === '/') {
        var open = stack.pop();
        if (!open || open === root || open.k !== key) {
          throw new Error('Gabarit : balise fermante {{/' + key + '}} inattendue' +
            (open && open.k ? ' (attendu {{/' + open.k + '}})' : ''));
        }
        continue;
      }
      cur.children.push({ t: 'var', k: key });
    }
    if (stack.length > 1) throw new Error('Gabarit : section {{#' + stack[stack.length - 1].k + '}} non fermée');
    if (last < tpl.length) root.children.push({ t: 'text', v: tpl.slice(last) });
    cache[tpl] = root;
    return root;
  }

  function lookup(stack, path) {
    if (path === '.' || path === 'this') return stack[stack.length - 1];
    var parts = path.split('.');
    for (var i = stack.length - 1; i >= 0; i--) {
      var ctx = stack[i];
      if (ctx != null && typeof ctx === 'object' && parts[0] in ctx) {
        var v = ctx;
        for (var p = 0; p < parts.length; p++) { v = v == null ? undefined : v[parts[p]]; }
        return v;
      }
    }
    return undefined;
  }

  function truthy(v) {
    return Array.isArray(v) ? v.length > 0 : !!v;
  }

  function renderNodes(nodes, stack) {
    var out = '';
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i], v;
      switch (n.t) {
        case 'text': out += n.v; break;
        case 'var': v = lookup(stack, n.k); out += v == null ? '' : MLS.util.escapeHtml(v); break;
        case 'raw': v = lookup(stack, n.k); out += v == null ? '' : String(v); break;
        case 'section':
          v = lookup(stack, n.k);
          if (Array.isArray(v)) {
            for (var j = 0; j < v.length; j++) out += renderNodes(n.children, stack.concat([v[j]]));
          } else if (v && typeof v === 'object') {
            out += renderNodes(n.children, stack.concat([v]));
          } else if (v) {
            out += renderNodes(n.children, stack);
          }
          break;
        case 'inverted':
          v = lookup(stack, n.k);
          if (!truthy(v)) out += renderNodes(n.children, stack);
          break;
      }
    }
    return out;
  }

  MLS.template = {
    render: function (tpl, data) { return renderNodes(compile(tpl || '').children, [data]); },
    compile: compile
  };
})(window.MLS);
