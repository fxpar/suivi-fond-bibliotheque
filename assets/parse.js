/* Lecture des extractions (xlsx, xls, ods, csv) et normalisation des lignes. */
'use strict';
window.SF = window.SF || {};

(function (SF) {
  const norm = s => String(s == null ? '' : s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  SF.norm = norm;

  // Synonymes des en-têtes (forme normalisée : minuscules, sans accents ni ponctuation)
  const COLS = {
    fonds:   ['fonds', 'localisation', 'section', 'sous localisation'],
    cote:    ['cote', 'cote exemplaire'],
    titre:   ['titre', 'titre propre', 'titre principal'],
    serie:   ['titre ensemble', 'titre d ensemble', 'serie', 'titre de serie', 'titre de la serie'],
    auteur:  ['auteur', 'auteurs', 'auteur principal', 'responsabilite'],
    cb:      ['code barre', 'code barres', 'codebarre', 'cb', 'numero d exemplaire', 'no exemplaire'],
    statut:  ['disponibilite', 'statut', 'statut exemplaire', 'situation', 'etat de disponibilite'],
    dernier: ['dernier emprunt', 'date dernier emprunt', 'date du dernier emprunt', 'dernier pret', 'date dernier pret', 'date du dernier pret'],
    pa:      ['nb prets annee', 'nombre de prets annee', 'prets annee', 'nb prets de l annee', 'prets de l annee', 'nb prets an', 'prets annee en cours'],
    pv:      ['nb prets vie', 'prets vie', 'nb prets total', 'nombre total de prets', 'total prets', 'nb prets', 'nombre de prets'],
    pub:     ['date de publication', 'annee de publication', 'date publication', 'annee d edition', 'date d edition', 'annee'],
    crea:    ['creation exemplaire', 'date creation exemplaire', 'date de creation exemplaire', 'date de creation', 'date creation', 'date d acquisition', 'date acquisition', 'date d entree']
  };
  const LABELS = {
    fonds: 'Fonds', cote: 'Cote', titre: 'Titre', serie: 'Titre d\'ensemble', auteur: 'Auteur',
    cb: 'Code-barres', statut: 'Statut', dernier: 'Dernier emprunt', pa: 'Prêts de l\'année',
    pv: 'Prêts totaux', pub: 'Publication', crea: 'Création exemplaire'
  };
  SF.COL_LABELS = LABELS;

  function mapHeaders(row) {
    const heads = row.map(norm);
    const map = {};
    const used = new Set();
    // 1) correspondance exacte
    for (const key of Object.keys(COLS)) {
      const i = heads.findIndex((h, j) => !used.has(j) && COLS[key].includes(h));
      if (i >= 0) { map[key] = i; used.add(i); }
    }
    // 2) correspondance partielle pour ce qui manque
    for (const key of Object.keys(COLS)) {
      if (map[key] != null) continue;
      const i = heads.findIndex((h, j) => !used.has(j) && h && COLS[key].some(s => s.length > 3 && h.includes(s)));
      if (i >= 0) { map[key] = i; used.add(i); }
    }
    return map;
  }

  function findHeaderRow(rows) {
    let best = { idx: -1, score: 0 };
    const all = new Set([].concat(...Object.values(COLS)));
    for (let r = 0; r < Math.min(rows.length, 25); r++) {
      const score = (rows[r] || []).filter(c => all.has(norm(c))).length;
      if (score > best.score) best = { idx: r, score };
    }
    return best.score >= 3 ? best.idx : -1;
  }

  // ---- conversions ----
  function toDate(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date) return isNaN(v) ? null : new Date(v.getFullYear(), v.getMonth(), v.getDate(), 12);
    if (typeof v === 'number') {
      if (v > 20000 && v < 80000) { // numéro de série Excel
        const d = new Date(Math.round((v - 25569) * 86400000));
        return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12);
      }
      return null;
    }
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], 12);
    m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1], 12);
    m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], 12);
    return null;
  }
  function toInt(v) {
    if (v == null || v === '') return null;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.').replace(/\s/g, ''));
    return isFinite(n) ? Math.round(n) : null;
  }
  function toYear(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date) return v.getFullYear();
    if (typeof v === 'number') { if (v > 1400 && v < 2200) return Math.round(v); const d = toDate(v); return d ? d.getFullYear() : null; }
    const m = String(v).match(/(1[4-9]\d\d|20\d\d)/);
    return m ? +m[1] : null;
  }
  const str = v => (v == null ? '' : String(v).trim());

  function cleanTitle(t) {
    let s = str(t).split(' / ')[0];
    s = s.replace(/\s*\[?(Texte imprimé|Document sonore|Image fixe)\]?\s*/gi, ' ').replace(/\s+bande dessinée$/i, '').replace(/\s+/g, ' ').trim();
    return s;
  }

  // "Abe Sapien 3" -> {serie:"Abe Sapien", tome:3}
  function splitSerie(s) {
    s = str(s);
    if (!s) return { serie: '', tome: null };
    const m = s.match(/^(.*?[A-Za-zÀ-ÿ].*?)[\s,;.:]*(?:t\.?\s*|tome\s*|vol\.?\s*|n°\s*)?(?<!\d)(\d{1,3})$/i);
    if (m && m[1].trim().length >= 2) return { serie: m[1].trim().replace(/[\s,;.:]+$/, ''), tome: parseInt(m[2], 10) };
    return { serie: s, tome: null };
  }
  // "Bidochon (Les)" et "Les Bidochon" -> même clé
  function serieKey(s) {
    let n = norm(s);
    const m = n.match(/^(.*) (le|la|les|l|the)$/);
    if (m) n = m[2] + ' ' + m[1];
    return n.replace(/^l /, 'l');
  }
  SF.serieKey = serieKey;

  function statutCode(s) {
    const m = str(s).match(/\(([A-Z]{1,4})\)\s*$/);
    if (m) return m[1];
    const n = norm(s);
    if (/^disponible|en rayon/.test(n)) return 'DI';
    if (/retard/.test(n)) return 'RT';
    if (/reserv/.test(n)) return 'RE';
    if (/prete|en pret|emprunt/.test(n)) return 'PR';
    if (/perdu/.test(n)) return 'DP';
    return '';
  }

  function fondsLabel(f) {
    const s = str(f);
    const m = s.match(/^[A-Z0-9]{2,6}\s*-\s*(.+)$/);
    return m ? m[1] : s;
  }

  /** Lit un fichier et renvoie { items, sheets:[{file,name,rows,map,skipped}] } */
  SF.readFile = async function (file) {
    if (/\.zip$/i.test(file.name)) return SF.readBackupZip(file); // sauvegarde classeur + photos
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true, codepage: 65001 });
    // Classeur de pistes déjà annoté : on en tire les décisions, pas des exemplaires
    if (SF.isDecisionBook(wb)) return { items: [], sheets: [], decisions: SF.readDecisionBook(wb) };
    const items = [];
    const sheets = [];
    for (const name of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null, blankrows: false });
      const h = findHeaderRow(rows);
      if (h < 0) { sheets.push({ file: file.name, name, rows: 0, skipped: 'en-têtes non reconnus' }); continue; }
      const map = mapHeaders(rows[h]);
      if (map.titre == null && map.cote == null) { sheets.push({ file: file.name, name, rows: 0, skipped: 'ni titre ni cote' }); continue; }
      if (map.dernier == null && map.pa == null && map.pv == null) { sheets.push({ file: file.name, name, rows: 0, skipped: 'aucune donnée de prêt' }); continue; }
      const g = (r, k) => (map[k] == null ? null : r[map[k]]);
      let n = 0;
      for (let r = h + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.every(c => c == null || c === '')) continue;
        const titreBrut = str(g(row, 'titre'));
        const cote = str(g(row, 'cote'));
        if (!titreBrut && !cote) continue;
        const sr = splitSerie(g(row, 'serie'));
        const fondsRaw = str(g(row, 'fonds')) || name;
        items.push({
          fonds: fondsLabel(fondsRaw),
          fondsRaw,
          onglet: name,
          cote,
          titreComplet: titreBrut,
          titre: cleanTitle(titreBrut) || '(sans titre)',
          serieBrute: str(g(row, 'serie')),
          serie: sr.serie,
          serieKey: sr.serie ? serieKey(sr.serie) : '',
          tome: sr.tome,
          auteur: str(g(row, 'auteur')).replace(/,\s*\d{3}\b/g, '').replace(/\s+/g, ' '),
          cb: str(g(row, 'cb')),
          statut: str(g(row, 'statut')),
          code: statutCode(g(row, 'statut')),
          dernier: toDate(g(row, 'dernier')),
          pa: toInt(g(row, 'pa')),
          pv: toInt(g(row, 'pv')),
          pub: toYear(g(row, 'pub')),
          crea: toDate(g(row, 'crea'))
        });
        n++;
      }
      sheets.push({ file: file.name, name, rows: n, map, missing: Object.keys(COLS).filter(k => map[k] == null) });
    }
    return { items, sheets };
  };
})(window.SF);
