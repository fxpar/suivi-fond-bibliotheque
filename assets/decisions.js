/* Décisions de l'équipe : choix par liste, sauvegarde dans le navigateur, réimport de l'Excel annoté.
   La source durable est l'Excel exporté ; le navigateur ne sert que de filet de sécurité. */
'use strict';
window.SF = window.SF || {};

(function (SF) {
  // Nom des feuilles de l'export Excel (sert aussi à reconnaître un classeur annoté)
  SF.SHEETS = {
    prio: 'Priorités',
    faibles: 'Sortent moins (rayon)',
    dormants: 'Retirer - sans prêt',
    doublons: 'Retirer - doublons',
    usure: 'Remplacer - usure',
    demande: 'Renforcer - demande',
    series: 'Séries à compléter',
    regul: 'À régulariser',
    rayon: 'Notes de rayon'
  };

  // Choix proposés selon la liste (le premier est « on ne touche à rien »)
  SF.CHOICES = {
    prio: ['Garder', 'Mettre en avant', 'Transférer', 'Retirer'],
    faibles: ['Garder', 'Mettre en avant', 'Transférer', 'Retirer'],
    dormants: ['Garder', 'Mettre en avant', 'Transférer', 'Retirer'],
    doublons: ['Garder', 'Retirer'],
    usure: ['État correct', 'Réparer', 'Remplacer', 'Retirer'],
    demande: ['Non', 'Commander'],
    series: ['Ne pas compléter', 'Commander'],
    regul: ['À faire', 'Fait'],
    // fiche d'un exemplaire trouvé en rayon : toutes les catégories
    rayon: ['Garder', 'Mettre en avant', 'Transférer', 'Réparer', 'Remplacer', 'Retirer', 'Commander']
  };

  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  /** Clé stable d'une ligne : liste + code-barres (ou cote + titre) ; pour une série : fonds + série */
  SF.decKey = function (pisteId, row) {
    if (row.serie && pisteId === 'series') return `${pisteId}|S|${SF.norm(row.serie.fonds)}|${SF.serieKey(row.serie.nom)}`;
    const it = row.it;
    return `${pisteId}|${it.cb ? 'CB' + it.cb : 'T' + SF.norm(it.cote) + '|' + SF.norm(it.titre)}`;
  };

  // ---------- rayons et règles de protection (gardés avec les décisions) ----------
  SF.SEG_STATUS = ['À conserver', 'À repenser en bloc']; // vide = examiné exemplaire par exemplaire
  SF.RULES_SHEET = 'Rayons et protections';
  SF.segDecKey = (fonds, seg) => `seg|${SF.norm(fonds)}|${seg}`;
  SF.ruleKey = (type, value) => `rule|${type}|${SF.norm(value)}`;
  SF.RULE_TYPES = { cote: 'Cote contenant', titre: 'Titre ou série contenant' };
  /** Règles actives : [{ key, type, value }] (le texte saisi est gardé dans le commentaire) */
  SF.rules = () => Object.keys(store).filter(k => k.startsWith('rule|') && store[k].d)
    .map(k => ({ key: k, type: k.split('|')[1], value: store[k].com || k.split('|').slice(2).join('|'), norm: k.split('|').slice(2).join('|') }));
  /** « Garder » ou « Mettre en avant » déjà décidé pour cet exemplaire, dans une liste ou sur sa fiche */
  SF.isKept = it => ['prio', 'dormants', 'doublons', 'rayon'].some(pid => {
    const e = store[SF.decKey(pid, { it })];
    return e && (e.d === 'Garder' || e.d === 'Mettre en avant');
  });

  // ---------- stockage ----------
  const LS = 'suivi-fonds-decisions-v1';
  let store = {};
  try { store = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (_) { store = {}; }
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(store)); } catch (_) { /* navigation privée : tant pis, l'Excel reste la sauvegarde */ } };

  SF.dec = {
    get: k => store[k] || null,
    set(k, d) {
      const com = (store[k] && store[k].com) || '';
      if (!d && !com) delete store[k];
      else store[k] = { d: d || '', date: today(), com };
      save();
    },
    /** note libre, conservée même sans décision */
    setCom(k, com) {
      const d = (store[k] && store[k].d) || '';
      com = (com || '').trim();
      if (!d && !com) delete store[k];
      else store[k] = { d, date: today(), com };
      save();
    },
    /** une ligne est « décidée » quand un choix est fait (une simple note ne suffit pas) */
    isDone: k => !!(store[k] && store[k].d),
    count: () => Object.keys(store).length,
    clear() { store = {}; save(); },
    /** fusionne des décisions importées : la plus récente l'emporte, l'import gagne à date égale */
    merge(entries) {
      let n = 0;
      for (const e of entries) {
        const cur = store[e.key];
        if (!cur || (e.date || '') >= (cur.date || '')) { store[e.key] = { d: e.d, date: e.date || today(), com: e.com || '' }; n++; }
      }
      save();
      return n;
    }
  };

  // ---------- réimport ----------
  /** Un classeur exporté par l'outil contient « Mode d'emploi » et au moins une feuille de pistes */
  SF.isDecisionBook = wb => wb.SheetNames.includes('Mode d\'emploi') && wb.SheetNames.some(n => Object.values(SF.SHEETS).includes(n));

  SF.readDecisionBook = function (wb) {
    const entries = [];
    const byName = Object.fromEntries(Object.entries(SF.SHEETS).map(([k, v]) => [v, k]));
    for (const name of wb.SheetNames) {
      if (name === SF.RULES_SHEET) { entries.push(...readRules(wb.Sheets[name])); continue; }
      const pid0 = byName[name];
      if (!pid0) continue;
      const pid = pid0 === 'faibles' ? 'prio' : pid0; // mêmes décisions que la liste ciblée
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null });
      if (rows.length < 2) continue;
      const h = rows[0].map(SF.norm);
      const col = label => h.indexOf(SF.norm(label));
      const iD = col('Décision'), iC = col('Commentaire'), iDate = col('Décidé le');
      if (iD < 0) continue;
      const iF = col('Fonds'), iCB = col('Code-barres'), iCote = col('Cote'), iT = col('Titre'), iS = col('Série');
      for (const r of rows.slice(1)) {
        const d = r[iD] == null ? '' : String(r[iD]).trim();
        const com = iC >= 0 && r[iC] != null ? String(r[iC]).trim() : '';
        if (!d && !com) continue;
        let date = null;
        if (iDate >= 0 && r[iDate]) {
          const v = r[iDate];
          const dt = v instanceof Date ? v : null;
          date = dt ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}` : (String(v).match(/^\d{4}-\d{2}-\d{2}/) || [null])[0];
        }
        let key;
        if (pid === 'series') key = SF.decKey('series', { serie: { fonds: r[iF] || '', nom: r[iS] || '' } });
        else key = SF.decKey(pid, { it: { cb: r[iCB] != null ? String(r[iCB]).trim() : '', cote: r[iCote] || '', titre: r[iT] || '' } });
        entries.push({ key, d, com, date: date || today() });
      }
    }
    return entries;
  };

  /** Feuille « Rayons et protections » : statut de chaque rayon et règles de protection */
  function readRules(ws) {
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
    if (rows.length < 2) return [];
    const h = rows[0].map(SF.norm);
    const col = l => h.indexOf(SF.norm(l));
    const iType = col('Type'), iF = col('Fonds'), iV = col('Rayon ou règle'), iS = col('Statut');
    if (iType < 0 || iV < 0 || iS < 0) return [];
    const out = [];
    for (const r of rows.slice(1)) {
      const type = SF.norm(r[iType]), v = r[iV] == null ? '' : String(r[iV]).trim(), st = r[iS] == null ? '' : String(r[iS]).trim();
      if (!v || !st) continue;
      if (type === 'rayon') out.push({ key: SF.segDecKey(r[iF] || '', v), d: st, com: '', date: today() });
      else if (type.startsWith('regle')) {
        const t = /titre|serie/.test(type) ? 'titre' : 'cote';
        out.push({ key: SF.ruleKey(t, v), d: 'Protégé', com: v, date: today() });
      }
    }
    return out;
  }
})(window.SF);
