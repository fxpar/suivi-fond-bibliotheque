/*!
 * Mini parseur YAML (sous-ensemble) pour le front-matter des cours.
 * Gère : clés/valeurs, chaînes entre guillemets, nombres, booléens,
 * maps imbriquées par indentation, listes "- item" et listes inline [a, b].
 */
(function (MLS) {
  'use strict';

  function scalar(raw) {
    var v = raw.trim();
    if (v === '') return '';
    if ((v[0] === '"' && v[v.length - 1] === '"') || (v[0] === "'" && v[v.length - 1] === "'")) {
      var inner = v.slice(1, -1);
      return v[0] === '"' ? inner.replace(/\\"/g, '"').replace(/\\n/g, '\n') : inner.replace(/''/g, "'");
    }
    if (v[0] === '[' && v[v.length - 1] === ']') {
      return v.slice(1, -1).split(',').map(function (x) { return scalar(x); }).filter(function (x) { return x !== ''; });
    }
    if (/^(true|yes|oui)$/i.test(v)) return true;
    if (/^(false|no|non)$/i.test(v)) return false;
    if (/^(null|~)$/i.test(v)) return null;
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    // retire un commentaire en fin de ligne (" # ...")
    return v.replace(/\s+#.*$/, '');
  }

  function parse(text) {
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    var root = {};
    // pile de contextes : { indent, container, key (pour un enfant en attente) }
    var stack = [{ indent: -1, container: root }];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line.trim() || /^\s*#/.test(line)) continue;
      var indent = line.match(/^\s*/)[0].length;
      var content = line.trim();

      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
      var parent = stack[stack.length - 1];

      // Élément de liste
      if (content.indexOf('- ') === 0 || content === '-') {
        if (!Array.isArray(parent.container)) {
          // le parent attendait une valeur : on la transforme en liste
          if (parent.pendingKey != null) {
            parent.owner[parent.pendingKey] = [];
            parent.container = parent.owner[parent.pendingKey];
          } else continue;
        }
        var itemText = content.slice(1).trim();
        var kv = itemText.match(/^([^:"']+?):\s+(.*)$/);
        if (kv) {
          var obj = {};
          obj[kv[1].trim()] = scalar(kv[2]);
          parent.container.push(obj);
          stack.push({ indent: indent, container: obj });
        } else {
          parent.container.push(scalar(itemText));
        }
        continue;
      }

      var m = content.match(/^([^:]+?):(\s+(.*))?$/);
      if (!m) continue;
      var key = m[1].trim().replace(/^["']|["']$/g, '');
      var rest = m[3];
      var target = parent.container;
      if (Array.isArray(target)) continue;

      if (rest === undefined || rest.trim() === '' || rest.trim() === '|' || rest.trim() === '>') {
        if (rest && (rest.trim() === '|' || rest.trim() === '>')) {
          // bloc multi-ligne
          var folded = rest.trim() === '>';
          var buf = [];
          var j = i + 1;
          for (; j < lines.length; j++) {
            if (lines[j].trim() && lines[j].match(/^\s*/)[0].length <= indent) break;
            buf.push(lines[j].trim());
          }
          i = j - 1;
          target[key] = buf.join(folded ? ' ' : '\n').trim();
          continue;
        }
        target[key] = {};
        stack.push({ indent: indent, container: target[key], owner: target, pendingKey: key });
      } else {
        target[key] = scalar(rest);
      }
    }
    return root;
  }

  MLS.yaml = { parse: parse };
})(window.MLS);
