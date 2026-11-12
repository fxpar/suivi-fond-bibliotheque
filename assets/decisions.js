/* Décisions de l'équipe : choix par liste, sauvegarde dans le navigateur, réimport de l'Excel annoté.
   La source durable est l'Excel exporté ; le navigateur ne sert que de filet de sécurité. */
'use strict';
window.SF = window.SF || {};

(function (SF) {
  // Nom des feuilles de l'export Excel (sert aussi à reconnaître un classeur annoté)
  SF.SHEETS = {
    dormants: 'Retirer - sans prêt',
    doublons: 'Retirer - doublons',
    usure: 'Remplacer - usure',
    demande: 'Renforcer - demande',
    series: 'Séries à compléter',
    regul: 'À régulariser'
  };

  // Choix proposés selon la liste (le premier est « on ne touche à rien »)
  SF.CHOICES = {
    dormants: ['Garder', 'Mettre en avant', 'Transférer', 'Retirer'],
    doublons: ['Garder', 'Retirer'],
    usure: ['État correct', 'Réparer', 'Remplacer', 'Retirer'],
    demande: ['Non', 'Commander'],
    series: ['Ne pas compléter', 'Commander'],
    regul: ['À faire', 'Fait']
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

  // ---------- stockage ----------
  const LS = 'suivi-fonds-decisions-v1';
  let store = {};
  try { store = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (_) { store = {}; }
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(store)); } catch (_) { /* navigation privée : tant pis, l'Excel reste la sauvegarde */ } };

  SF.dec = {
    get: k => store[k] || null,
    set(k, d, com) {
      if (!d) { delete store[k]; } else { store[k] = { d, date: today(), com: com != null ? com : (store[k] && store[k].com) || '' }; }
      save();
    },
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
      const pid = byName[name];
      if (!pid) continue;
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
        entries.push({ key, d: d || 'À revoir', com, date: date || today() });
      }
    }
    return entries;
  };
})(window.SF);
