/* Exports : Excel (ExcelJS), PowerPoint (PptxGenJS), résumé texte pour une IA.
   Les bibliothèques sont chargées à la demande, au premier clic. */
'use strict';
window.SF = window.SF || {};

(function (SF) {
  const F = SF.fmt;
  const LIBS = {
    exceljs: 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',
    pptx: 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js',
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  };
  const loaded = {};
  function loadScript(url) {
    if (!loaded[url]) loaded[url] = new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = url; s.onload = ok; s.onerror = () => ko(new Error('bibliothèque d\'export indisponible (connexion ?)'));
      document.head.appendChild(s);
    });
    return loaded[url];
  }

  SF.loadScript = loadScript;
  SF.download = function (blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const slug = s => SF.norm(s).replace(/ /g, '-').slice(0, 40) || 'fonds';
  const stamp = d => d.toISOString().slice(0, 10);
  const strip = h => h.replace(/<[^>]+>/g, '');

  const SHEETS = SF.SHEETS;
  const C = { ink: '1F2933', blue: '487D96', blueL: 'E4EEF2', amber: 'FBF3CC', grey: 'F3F2EE', line: 'D9D7D0' };

  // ================= EXCEL =================
  SF.exportXlsx = async function (c) {
    await loadScript(LIBS.exceljs);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Suivi de fonds';
    wb.created = new Date();
    const multi = c.ov.fonds.length > 1;

    // --- Mode d'emploi ---
    const info = wb.addWorksheet('Mode d\'emploi', { properties: { tabColor: { argb: 'FF' + C.blue } } });
    info.columns = [{ width: 30 }, { width: 22 }, { width: 90 }];
    const line = (vals, opt = {}) => { const r = info.addRow(vals); if (opt.bold) r.font = { bold: true }; if (opt.size) r.font = { bold: true, size: opt.size, color: { argb: 'FF' + C.ink } }; return r; };
    line([`Pistes de gestion — ${c.label}`], { size: 16 });
    line([`Données au ${F.date(c.ctx.ref)} · ${F.int(c.items.length)} exemplaires · seuils : sans prêt depuis ${c.pistes.opts.dormant} mois, usure dès ${c.pistes.opts.usure} prêts, forte demande dès ${c.pistes.opts.demande} prêts/an`]);
    line([]);
    line(['Ces listes sont des pistes à vérifier en rayon, pas des décisions automatiques.'], { bold: true });
    line(['Chaque ligne indique son motif. Remplissez la colonne « Décision » (liste déroulante, saisie libre possible) et, si besoin, « Commentaire ». Les lignes surlignées demandent une attention particulière (tome d\'une série active, titre réservé, tome 1 absent).']);
    line(['Ce classeur sert de sauvegarde : redéposez-le dans l\'outil (seul ou avec une nouvelle extraction) pour retrouver les décisions. Gardez les noms d\'onglets et les colonnes Fonds, Cote, Titre, Série et Code-barres.']);
    line([]);
    const hr = line(['Onglet', 'Lignes', 'Ce qu\'il contient'], { bold: true });
    hr.eachCell(cl => { cl.fill = fill(C.blueL); });
    for (const p of c.pistes) line([SHEETS[p.id], p.rows.length, `${p.why} ${p.caution}`]);
    line(['Synthèse', '', 'Indicateurs par fonds.']);
    if (c.ctx.histTronque) { line([]); line([`Attention : les dates de dernier emprunt commencent en ${F.mois(c.ctx.histStart)} (historique probablement remis à zéro).`]); }
    info.getColumn(3).alignment = { wrapText: true, vertical: 'top' };

    // --- Synthèse ---
    const syn = wb.addWorksheet('Synthèse');
    syn.columns = [
      { header: 'Fonds', key: 'name', width: 30 },
      { header: 'Documents', key: 'n', width: 12 },
      { header: 'Part du fonds', key: 'ps', width: 14, style: { numFmt: '0.0%' } },
      { header: 'Prêts sur l\'année', key: 'pa', width: 16 },
      { header: 'Part des prêts', key: 'pp', width: 14, style: { numFmt: '0.0%' } },
      { header: 'Prêts par document', key: 'rot', width: 18, style: { numFmt: '0.0' } },
      { header: 'Sortis en 12 mois', key: 'act', width: 16, style: { numFmt: '0%' } },
      { header: 'En prêt aujourd\'hui', key: 'enp', width: 18, style: { numFmt: '0%' } },
      { header: 'Entrés en 12 mois', key: 'nv', width: 16 },
      { header: 'Année de publication médiane', key: 'med', width: 18 }
    ];
    const synRow = (name, s) => ({ name, n: s.n, ps: s.partStock ?? 1, pa: s.pa, pp: s.partPrets ?? 1, rot: s.rotation, act: s.tauxActif, enp: s.tauxPret, nv: s.nouv12, med: s.pubMed });
    c.ov.fonds.forEach(f => syn.addRow(synRow(f.name, f)));
    if (multi) { const r = syn.addRow(synRow('Ensemble', c.ov.total)); r.font = { bold: true }; }
    styleHeader(syn);
    syn.addRow([]);
    const hp = syn.addRow(['Période de publication', 'Documents', '', 'Prêts sur l\'année', '', 'Prêts par document']);
    hp.font = { bold: true };
    SF.PERIODES.forEach((p, i) => { const x = c.ov.total.periodes[i]; if (x.n) syn.addRow([p.label, x.n, '', x.pa, '', x.rot]); });

    // --- Listes ---
    for (const p of c.pistes) {
      if (!p.rows.length) continue;
      const ws = wb.addWorksheet(SHEETS[p.id], {
        views: [{ state: 'frozen', ySplit: 1 }],
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, printTitlesRow: '1:1', margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
        headerFooter: { oddFooter: `&L${SHEETS[p.id]} — ${c.label}&RPage &P / &N` }
      });
      const rows = [...p.rows];
      let cols;
      if (p.kind === 'series') {
        cols = [
          { header: 'Fonds', key: 'fonds', width: 18 },
          { header: 'Cote', key: 'cote', width: 14 },
          { header: 'Série', key: 'serie', width: 36 },
          { header: 'Tomes présents', key: 'pres', width: 20 },
          { header: 'Tomes manquants', key: 'manq', width: 18 },
          { header: 'Dans un autre fonds', key: 'ail', width: 24 },
          { header: 'Prêts an (série)', key: 'pa', width: 14 },
          { header: 'Motif', key: 'motif', width: 26 },
          { header: 'Décision', key: 'dec', width: 16 },
          { header: 'Décidé le', key: 'dated', width: 12, style: { numFmt: 'dd/mm/yyyy' } },
          { header: 'Commentaire', key: 'com', width: 34 }
        ].filter(Boolean);
        ws.columns = cols;
        rows.sort((a, b) => a.prio - b.prio || cmp(a.serie.cote, b.serie.cote) || cmp(a.serie.nom, b.serie.nom));
        for (const r of rows) {
          const row = ws.addRow({ fonds: r.serie.fonds, cote: r.serie.cote, serie: r.serie.nom, pres: SF.compact(r.serie.tomes), manq: SF.compact(r.missing), ail: r.ailleurs, pa: r.serie.pa, motif: r.motif, ...decOf(p, r) });
          if (r.prio === 0) row.getCell('motif').fill = fill(C.amber);
        }
      } else {
        cols = [
          { header: 'Fonds', key: 'fonds', width: 16 },
          { header: 'Cote', key: 'cote', width: 14 },
          { header: 'Titre', key: 'titre', width: 40 },
          { header: 'Série', key: 'serie', width: 22 },
          { header: 'Tome', key: 'tome', width: 7 },
          { header: 'Auteur', key: 'auteur', width: 22 },
          { header: 'Code-barres', key: 'cb', width: 17, style: { numFmt: '@' } },
          { header: 'Statut', key: 'statut', width: 14 },
          { header: 'Dernier prêt', key: 'dernier', width: 12, style: { numFmt: 'dd/mm/yyyy' } },
          { header: 'Prêts an', key: 'pa', width: 9 },
          { header: 'Prêts total', key: 'pv', width: 10 },
          { header: 'Publication', key: 'pub', width: 11 },
          { header: 'Entrée', key: 'crea', width: 12, style: { numFmt: 'dd/mm/yyyy' } },
          { header: 'Motif', key: 'motif', width: 34 },
          { header: 'À noter', key: 'note', width: 40 },
          { header: 'Décision', key: 'dec', width: 16 },
          { header: 'Décidé le', key: 'dated', width: 12, style: { numFmt: 'dd/mm/yyyy' } },
          { header: 'Commentaire', key: 'com', width: 30 }
        ].filter(Boolean);
        ws.columns = cols;
        // tri pour le passage en rayon : fonds, cote, série, tome, titre
        rows.sort((a, b) => cmp(a.it.fonds, b.it.fonds) || cmp(a.it.cote, b.it.cote) || cmp(a.it.serie, b.it.serie) || (a.it.tome ?? 0) - (b.it.tome ?? 0) || cmp(a.it.titre, b.it.titre));
        for (const r of rows) {
          const it = r.it;
          const row = ws.addRow({
            fonds: it.fonds, cote: it.cote, titre: it.titre, serie: it.serie, tome: it.tome, auteur: it.auteur.split(/[,;]\s*(?=[A-ZÀ-Ý])/)[0],
            cb: it.cb, statut: it.statut.replace(/\s*\([A-Z]+\)$/, ''), dernier: utc(it.dernier), pa: it.pa, pv: it.pv, pub: it.pub, crea: utc(it.crea),
            motif: r.motif, note: r.note, ...decOf(p, r)
          });
          if (r.prio === 0 || r.flag) row.getCell('note').fill = fill(C.amber);
        }
      }
      styleHeader(ws);
      const decCol = ws.getColumn('dec').number;
      for (let i = 2; i <= ws.rowCount; i++) {
        const cell = ws.getRow(i).getCell(decCol);
        // liste propre à l'onglet, mais saisie libre acceptée (showErrorMessage: false)
        cell.dataValidation = { type: 'list', allowBlank: true, showErrorMessage: false, formulae: [`"${SF.CHOICES[p.id].join(',')}"`] };
        if (cell.value) cell.fill = fill(C.blueL);
        ws.getRow(i).alignment = { vertical: 'top', wrapText: true };
      }
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
    }

    // --- Notes de rayon (constats saisis depuis la fiche d'un exemplaire) ---
    const notes = c.items.map(it => ({ it, d: SF.dec.get(SF.decKey('rayon', { it })) })).filter(x => x.d);
    if (notes.length) {
      const ws = wb.addWorksheet(SHEETS.rayon, {
        views: [{ state: 'frozen', ySplit: 1 }],
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, printTitlesRow: '1:1' }
      });
      const cols = [
        { header: 'Fonds', key: 'fonds', width: 16 }, { header: 'Cote', key: 'cote', width: 14 }, { header: 'Titre', key: 'titre', width: 40 },
        { header: 'Série', key: 'serie', width: 22 }, { header: 'Tome', key: 'tome', width: 7 }, { header: 'Auteur', key: 'auteur', width: 22 },
        { header: 'Code-barres', key: 'cb', width: 17, style: { numFmt: '@' } }, { header: 'Statut', key: 'statut', width: 14 },
        { header: 'Dernier prêt', key: 'dernier', width: 12, style: { numFmt: 'dd/mm/yyyy' } }, { header: 'Prêts an', key: 'pa', width: 9 },
        { header: 'Prêts total', key: 'pv', width: 10 },
        { header: 'Décision', key: 'dec', width: 16 }, { header: 'Décidé le', key: 'dated', width: 12, style: { numFmt: 'dd/mm/yyyy' } },
        { header: 'Commentaire', key: 'com', width: 40 }
      ];
      ws.columns = cols;
      notes.sort((a, b) => cmp(a.it.fonds, b.it.fonds) || cmp(a.it.cote, b.it.cote) || cmp(a.it.titre, b.it.titre));
      for (const { it } of notes) {
        ws.addRow({
          fonds: it.fonds, cote: it.cote, titre: it.titre, serie: it.serie, tome: it.tome, auteur: it.auteur.split(/[,;]\s*(?=[A-ZÀ-Ý])/)[0],
          cb: it.cb, statut: it.statut.replace(/\s*\([A-Z]+\)$/, ''), dernier: utc(it.dernier), pa: it.pa, pv: it.pv,
          ...decOf({ id: 'rayon' }, { it })
        });
      }
      styleHeader(ws);
      const decCol = ws.getColumn('dec').number;
      for (let i = 2; i <= ws.rowCount; i++) {
        ws.getRow(i).getCell(decCol).dataValidation = { type: 'list', allowBlank: true, showErrorMessage: false, formulae: [`"${SF.CHOICES.rayon.join(',')}"`] };
        ws.getRow(i).alignment = { vertical: 'top', wrapText: true };
      }
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
      line([SHEETS.rayon, notes.length, 'Constats notés depuis la fiche d\'un exemplaire (recherche ou scan en rayon).']);
    }

    const buf = await wb.xlsx.writeBuffer();
    SF.download(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `pistes-${slug(c.label)}-${stamp(c.ctx.ref)}.xlsx`);
  };

  const decOf = (p, r) => {
    const d = SF.dec.get(SF.decKey(p.id, r));
    if (!d) return {};
    const [y, m, j] = d.date.split('-').map(Number);
    return { dec: d.d || null, com: d.com || null, dated: new Date(Date.UTC(y, m - 1, j)) };
  };
  const cmp = (a, b) => String(a || '').localeCompare(String(b || ''), 'fr', { numeric: true });
  const fill = hex => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex } });
  const utc = d => (d ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) : null);
  function styleHeader(ws) {
    const h = ws.getRow(1);
    h.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    h.fill = fill(C.blue);
    h.alignment = { vertical: 'middle', wrapText: true };
    h.height = 30;
  }

  // ================= SYNTHÈSE : PowerPoint ou PDF =================
  // Une seule description des diapositives (deck), deux moteurs de rendu (pptx, pdf).
  const PAL = { INK: '1F2933', MUTED: '5F6B76', BLUE: '487D96', DEEP: '2F5F75', GOLD: 'D9B600', LIGHT: 'EEF3F5', LINE: 'E3E1DA', WHITE: 'FFFFFF' };
  const FRESH_COLORS = ['234E62', '487D96', '7FA8BB', 'B9D1DC', 'C9C7BF'];
  const SW = 13.33, SH = 7.5, SM = 0.6; // diapositive 16:9 en pouces
  const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

  function deck(c, R) {
    const { INK, MUTED, BLUE, DEEP, GOLD, LIGHT, WHITE } = PAL;
    const W = SW, M = SM;
    const t = c.ov.total, ctx = c.ctx;
    const foot = `${c.label} · données au ${F.date(ctx.ref)}`;
    const hd = text => ({ text, bold: true, color: WHITE, fill: BLUE, size: 12 });
    const base = (title, lead) => {
      R.slide();
      R.rect(0, 0, 0.12, SH, BLUE);
      R.text(title, { x: M, y: 0.4, w: W - 2 * M, h: 0.7, size: 28, bold: true, color: INK });
      R.rect(M, 1.0, 0.9, 0.06, GOLD);
      if (lead) R.text(lead, { x: M, y: 1.2, w: W - 2 * M, h: 0.6, size: 15, color: MUTED, valign: 'top' });
      R.text(foot, { x: M, y: 7.0, w: W - 2 * M, h: 0.3, size: 10, color: MUTED });
    };

    // 1. Titre
    R.slide();
    R.rect(0, 0, W, 0.9, BLUE);
    R.rect(0, 0.9, W, 0.08, GOLD);
    R.text('Suivi du fonds', { x: M + 0.3, y: 2.3, w: 11, h: 1, size: 44, bold: true, color: INK });
    R.text(c.label, { x: M + 0.3, y: 3.3, w: 11, h: 0.7, size: 26, color: DEEP });
    R.text(`Données au ${F.date(ctx.ref)} · ${F.int(t.n)} exemplaires`, { x: M + 0.3, y: 4.1, w: 11, h: 0.5, size: 16, color: MUTED });

    // 2. Chiffres clés + constats
    base('En un coup d\'œil');
    const k = [
      [F.int(t.n), 'documents', ctx.has.crea ? `dont ${F.int(t.nouv12)} entrés en 12 mois` : ''],
      ctx.has.pa && [F.int(t.pa), 'prêts sur l\'année', `${F.dec(t.rotation)} par document`],
      ctx.has.dernier && [F.pct(t.tauxActif), 'sortis en 12 mois', `${F.int(t.actif12)} documents`],
      ctx.has.statut && [F.pct(t.tauxPret), 'en prêt aujourd\'hui', `${F.int(t.enPret)} documents`]
    ].filter(Boolean);
    const bw = (W - 2 * M - (k.length - 1) * 0.3) / k.length;
    k.forEach(([v, l, sub], i) => {
      const x = M + i * (bw + 0.3);
      R.rect(x, 1.4, bw, 1.9, LIGHT);
      R.text(v, { x: x + 0.25, y: 1.55, w: bw - 0.5, h: 0.85, size: 38, bold: true, color: DEEP });
      R.text(l, { x: x + 0.25, y: 2.4, w: bw - 0.5, h: 0.4, size: 16, color: INK });
      R.text(sub, { x: x + 0.25, y: 2.8, w: bw - 0.5, h: 0.35, size: 12, color: MUTED });
    });
    const items = c.constats.slice(0, 4).map(x => strip(x).replace(/&nbsp;/g, ' '));
    if (items.length) R.bullets(items, { x: M, y: 3.7, w: W - 2 * M, h: 3.1, size: 17, color: INK });

    // 3. Circulation
    if (ctx.has.dernier) {
      const rows = c.ov.fonds.length > 1 ? [...c.ov.fonds, Object.assign({ name: 'Ensemble' }, t)] : [Object.assign({ name: c.label }, t)];
      base('Un fonds qui circule', `${F.pct(t.tauxActif)} des documents sont sortis au moins une fois ces 12 derniers mois.`);
      R.chart('hstack100', {
        labels: rows.map(r => r.name), colors: FRESH_COLORS,
        series: SF.FRAICHEUR.map((name, i) => ({ name, values: rows.map(r => (r.n ? r.fresh[i] / r.n : 0)) }))
      }, { x: M, y: 1.8, w: W - 2 * M, h: Math.min(4.9, 1.2 + rows.length * 0.9) });
      R.text('Lecture : chaque barre répartit les exemplaires selon la date de leur dernier prêt.' + (ctx.histTronque ? ` Historique des prêts disponible depuis ${F.mois(ctx.histStart)}.` : ''), { x: M, y: 6.55, w: W - 2 * M, h: 0.35, size: 11, color: MUTED, italic: true });
    }

    // 4. Poids des fonds
    if (c.ov.fonds.length > 1 && ctx.has.pa) {
      const fs = c.ov.fonds;
      base('Le poids de chaque fonds', 'Part des documents et part des prêts : un fonds plus demandé que sa taille mérite d\'être conforté.');
      R.chart('col2', {
        labels: fs.map(f => f.name), colors: [BLUE, GOLD], fmt: 'pct',
        series: [{ name: 'Part du fonds', values: fs.map(f => f.partStock) }, { name: 'Part des prêts', values: fs.map(f => f.partPrets) }]
      }, { x: M, y: 1.8, w: 7.2, h: 4.8 });
      R.table([[hd('Fonds'), hd('Docs'), hd('Prêts/doc.'), hd('Sortis 12 m.')]].concat(fs.map(f => [f.name, F.int(f.n), F.dec(f.rotation), F.pct(f.tauxActif)].map(v => ({ text: v, size: 12, color: INK })))),
        { x: 8.2, y: 2.2, w: 4.5, colW: [1.55, 0.8, 1.05, 1.1], rowH: 0.42 });
    }

    // 5. Âge des collections
    if (ctx.has.pub && ctx.has.pa) {
      const ps = SF.PERIODES.map((p, i) => ({ label: p.label, ...t.periodes[i] })).filter(r => r.n >= 15);
      const age = c.constats.find(x => /publiés avant 2010/.test(x));
      base('Les documents anciens sortent-ils encore ?', age ? strip(age) : 'Prêts moyens sur l\'année par document, selon la date de publication.');
      R.chart('hbar', {
        labels: ps.map(r => `${r.label} (${F.int(r.n)} doc.)`), colors: [BLUE], fmt: 'dec1',
        series: [{ name: 'Prêts par document sur l\'année', values: ps.map(r => Math.round(r.rot * 10) / 10) }]
      }, { x: M, y: 2.0, w: W - 2 * M, h: 4.5 });
    }

    // 6. Pistes de gestion
    base('Pistes de gestion', 'Repérées dans les données, puis vérifiées en rayon par l\'équipe avant toute décision.');
    const lab = { dormants: 'Retirer ?', doublons: 'Retirer un exemplaire ?', usure: 'Remplacer ?', demande: 'Renforcer ?', series: 'Compléter ?', regul: 'Régulariser' };
    R.table([[hd('Piste'), hd('Volume'), hd('Critère')]].concat(c.pistes.filter(p => p.rows.length).map(p => [
      { text: lab[p.id], bold: true, size: 14, color: INK },
      { text: `${F.int(p.rows.length)} ${p.kind === 'series' ? F.plural(p.rows.length, 'série') : 'ex.'}`, size: 14, color: DEEP, bold: true },
      { text: p.title + ' — ' + p.why, size: 12, color: MUTED }
    ])), { x: M, y: 1.9, w: W - 2 * M, colW: [2.6, 1.5, W - 2 * M - 4.1], rowH: 0.62 });
    R.text(`Méthode : extraction du SIGB analysée localement. Seuils retenus : sans prêt depuis ${c.pistes.opts.dormant} mois, usure dès ${c.pistes.opts.usure} prêts, forte demande dès ${c.pistes.opts.demande} prêts par exemplaire et par an. Aucun retrait automatique : l'état physique, l'intérêt patrimonial et la cohérence des séries sont appréciés par l'équipe.`,
      { x: M, y: 6.1, w: W - 2 * M, h: 0.8, size: 11, color: MUTED, valign: 'bottom' });
  }

  const fmtVal = (v, fmt) => (fmt === 'pct' ? Math.round(v * 100) + ' %' : fmt === 'dec1' ? F.dec(v) : String(v));

  // ---------- moteur PowerPoint (graphiques natifs, modifiables) ----------
  function pptxRenderer(pptx) {
    const FONT = 'Calibri';
    let s;
    return {
      slide() { s = pptx.addSlide(); s.background = { color: PAL.WHITE }; },
      rect(x, y, w, h, color) { s.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color }, line: { color } }); },
      text(str, o) { s.addText(str, { x: o.x, y: o.y, w: o.w, h: o.h, fontFace: FONT, fontSize: o.size, bold: !!o.bold, italic: !!o.italic, color: o.color, margin: 0, valign: o.valign || 'middle' }); },
      bullets(items, o) { s.addText(items.map(text => ({ text, options: { bullet: { indent: 18 }, paraSpaceAfter: 10 } })), { x: o.x, y: o.y, w: o.w, h: o.h, fontFace: FONT, fontSize: o.size, color: o.color, valign: 'top', margin: 0 }); },
      chart(kind, d, b) {
        const data = d.series.map(se => ({ name: se.name, labels: d.labels, values: se.values }));
        const common = { x: b.x, y: b.y, w: b.w, h: b.h, chartColors: d.colors, catAxisLabelFontSize: 13, catAxisLabelFontFace: FONT, valAxisHidden: true, valGridLine: { style: 'none' }, dataLabelFontFace: FONT };
        if (kind === 'hstack100') s.addChart(pptx.ChartType.bar, data, Object.assign(common, { barDir: 'bar', barGrouping: 'percentStacked', barGapWidthPct: 40, catAxisOrientation: 'maxMin', catGridLine: { style: 'none' }, showLegend: true, legendPos: 't', legendFontSize: 12, legendFontFace: FONT, showValue: true, dataLabelFormatCode: '[<0.05]"";0%', dataLabelFontSize: 11, dataLabelColor: 'FFFFFF' }));
        if (kind === 'col2') s.addChart(pptx.ChartType.bar, data, Object.assign(common, { barDir: 'col', barGrouping: 'clustered', barGapWidthPct: 60, showLegend: true, legendPos: 't', legendFontSize: 12, legendFontFace: FONT, showValue: true, dataLabelFormatCode: '0%', dataLabelFontSize: 12 }));
        if (kind === 'hbar') s.addChart(pptx.ChartType.bar, data, Object.assign(common, { barDir: 'bar', barGapWidthPct: 45, catAxisOrientation: 'maxMin', showLegend: false, showValue: true, dataLabelFormatCode: '0.0', dataLabelFontSize: 12 }));
      },
      table(rows, o) {
        s.addTable(rows.map(r => r.map(cl => ({ text: cl.text, options: { bold: !!cl.bold, fontSize: cl.size || 12, color: cl.color || PAL.INK, fill: cl.fill ? { color: cl.fill } : undefined } }))),
          { x: o.x, y: o.y, w: o.w, colW: o.colW, fontFace: FONT, border: { type: 'solid', color: PAL.LINE, pt: 0.75 }, valign: 'middle', rowH: o.rowH });
      }
    };
  }

  // ---------- moteur PDF (jsPDF, tracé vectoriel) ----------
  function pdfRenderer(doc) {
    let first = true;
    const LH = 1.18;
    const rgb = h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    // Helvetica standard (WinAnsi) : on remplace les espaces fines insécables du formatage français
    const clean = s => String(s == null ? '' : s).replace(/[   ]/g, ' ');
    const font = o => {
      doc.setFont('helvetica', o.bold && o.italic ? 'bolditalic' : o.bold ? 'bold' : o.italic ? 'italic' : 'normal');
      doc.setFontSize(o.size);
      doc.setTextColor(...rgb(o.color || PAL.INK));
    };
    const lh = size => (size * LH) / 72;
    const asc = size => (size * 0.78) / 72;
    const wrap = (str, o) => { font(o); return doc.splitTextToSize(clean(str), o.w); };
    function block(str, o) {
      const ls = wrap(str, o);
      const bh = ls.length * lh(o.size);
      const va = o.valign || 'middle';
      const y0 = va === 'top' ? o.y : va === 'bottom' ? o.y + o.h - bh : o.y + (o.h - bh) / 2;
      ls.forEach((l, i) => doc.text(l, o.align === 'right' ? o.x + o.w : o.align === 'center' ? o.x + o.w / 2 : o.x, y0 + i * lh(o.size) + asc(o.size), { align: o.align || 'left' }));
      return bh;
    }
    const rect = (x, y, w, h, color) => { doc.setFillColor(...rgb(color)); doc.rect(x, y, w, h, 'F'); };
    function legend(series, colors, x, y) {
      font({ size: 11, color: PAL.INK });
      let cx = x;
      series.forEach((se, i) => {
        rect(cx, y - 0.11, 0.14, 0.14, colors[i]);
        font({ size: 11, color: PAL.INK });
        doc.text(clean(se.name), cx + 0.2, y);
        cx += 0.2 + doc.getTextWidth(clean(se.name)) + 0.35;
      });
      return cx - x;
    }
    return {
      slide() { if (!first) doc.addPage([SW, SH], 'landscape'); first = false; },
      rect,
      text(str, o) { block(str, o); },
      bullets(items, o) {
        let y = o.y;
        for (const it of items) {
          font(o);
          doc.text('•', o.x, y + asc(o.size));
          y += block(it, Object.assign({}, o, { x: o.x + 0.3, w: o.w - 0.3, y, h: 0, valign: 'top' })) + 0.14;
        }
      },
      chart(kind, d, b) {
        const n = d.labels.length;
        if (kind === 'hstack100' || kind === 'hbar') {
          const top = kind === 'hstack100' ? 0.55 : 0.1;
          if (kind === 'hstack100') {
            font({ size: 11 });
            const lw = d.series.reduce((a, se) => a + 0.55 + doc.getTextWidth(clean(se.name)), 0);
            legend(d.series, d.colors, b.x + (b.w - lw) / 2, b.y + 0.25);
          }
          const labelW = kind === 'hbar' ? 2.6 : 1.9;
          const x0 = b.x + labelW + 0.15, bwid = b.w - labelW - 0.15 - (kind === 'hbar' ? 0.6 : 0);
          const rowH = (b.h - top) / n, barH = rowH * 0.68;
          const max = kind === 'hbar' ? Math.max(...d.series[0].values) || 1 : 1;
          d.labels.forEach((lab, i) => {
            const y = b.y + top + i * rowH + (rowH - barH) / 2;
            block(lab, { x: b.x, y, w: labelW, h: barH, size: 13, color: PAL.INK, align: 'right' });
            if (kind === 'hbar') {
              const v = d.series[0].values[i];
              const w = (v / max) * bwid;
              rect(x0, y, w, barH, d.colors[0]);
              block(fmtVal(v, d.fmt), { x: x0 + w + 0.08, y, w: 0.8, h: barH, size: 12, color: PAL.INK });
            } else {
              const tot = d.series.reduce((a, se) => a + se.values[i], 0) || 1;
              let x = x0;
              d.series.forEach((se, k) => {
                const w = (se.values[i] / tot) * bwid;
                if (w <= 0) return;
                rect(x, y, Math.max(w - 0.02, 0.005), barH, d.colors[k]);
                if (se.values[i] / tot >= 0.05) block(Math.round((se.values[i] / tot) * 100) + ' %', { x, y, w, h: barH, size: 11, color: k < 2 ? PAL.WHITE : PAL.INK, align: 'center' });
                x += w;
              });
            }
          });
        }
        if (kind === 'col2') {
          font({ size: 11 });
          const lw = d.series.reduce((a, se) => a + 0.55 + doc.getTextWidth(clean(se.name)), 0);
          legend(d.series, d.colors, b.x + (b.w - lw) / 2, b.y + 0.25);
          const plotTop = b.y + 0.75, base = b.y + b.h - 0.45;
          const max = Math.max(...d.series.flatMap(se => se.values)) || 1;
          const gw = b.w / n, cw = gw * 0.3;
          doc.setDrawColor(...rgb('BFBFBF')); doc.setLineWidth(0.01); doc.line(b.x, base, b.x + b.w, base);
          d.labels.forEach((lab, i) => {
            const gx = b.x + i * gw + (gw - 2 * cw) / 2;
            d.series.forEach((se, k) => {
              const v = se.values[i], h = (v / max) * (base - plotTop - 0.3);
              rect(gx + k * cw, base - h, cw - 0.02, h, d.colors[k]);
              block(fmtVal(v, d.fmt), { x: gx + k * cw, y: base - h - 0.3, w: cw, h: 0.28, size: 12, color: PAL.INK, align: 'center' });
            });
            block(lab, { x: b.x + i * gw, y: base + 0.08, w: gw, h: 0.3, size: 13, color: PAL.INK, align: 'center' });
          });
        }
      },
      table(rows, o) {
        const pad = 0.1;
        let y = o.y;
        doc.setDrawColor(...rgb(PAL.LINE)); doc.setLineWidth(0.01);
        for (const r of rows) {
          const hs = r.map((cl, j) => wrap(cl.text, { size: cl.size || 12, bold: cl.bold, w: o.colW[j] - 2 * pad }).length * lh(cl.size || 12) + 2 * pad);
          const rh = Math.max(o.rowH, ...hs);
          let x = o.x;
          r.forEach((cl, j) => {
            const w = o.colW[j];
            if (cl.fill) rect(x, y, w, rh, cl.fill);
            doc.rect(x, y, w, rh, 'S');
            block(cl.text, { x: x + pad, y, w: w - 2 * pad, h: rh, size: cl.size || 12, bold: cl.bold, color: cl.color || PAL.INK });
            x += w;
          });
          y += rh;
        }
      }
    };
  }

  SF.exportPptx = async function (c) {
    await loadScript(LIBS.pptx);
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE'; // 13,33 x 7,5 pouces
    pptx.title = `Suivi du fonds — ${c.label}`;
    deck(c, pptxRenderer(pptx));
    const blob = await pptx.write({ outputType: 'blob' });
    // type MIME explicite : sinon certains téléphones ajoutent « .zip » au nom du fichier
    SF.download(new Blob([blob], { type: PPTX_MIME }), `synthese-${slug(c.label)}-${stamp(c.ctx.ref)}.pptx`);
  };

  SF.exportPdf = async function (c) {
    await loadScript(LIBS.jspdf);
    const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'in', format: [SW, SH] });
    doc.setProperties({ title: `Suivi du fonds — ${c.label}`, creator: 'Suivi de fonds' });
    deck(c, pdfRenderer(doc));
    SF.download(doc.output('blob'), `synthese-${slug(c.label)}-${stamp(c.ctx.ref)}.pdf`);
  };

  // ================= RÉSUMÉ POUR IA =================
  SF.promptIA = function (c) {
    const t = c.ov.total, ctx = c.ctx, L = [];
    L.push('Tu es un·e bibliothécaire expérimenté·e en politique documentaire. Voici la synthèse chiffrée d\'un fonds (extraction de SIGB). Je ne veux pas de désherbage automatique : aide-moi à réfléchir.');
    L.push('');
    L.push(`FONDS : ${c.label} — données au ${F.date(ctx.ref)}${ctx.histTronque ? ` (historique des prêts disponible depuis ${F.mois(ctx.histStart)} seulement)` : ''}`);
    L.push(`- ${t.n} exemplaires ; ${t.pa} prêts sur l'année (${F.dec(t.rotation)} par document) ; ${F.pct(t.tauxActif)} sortis en 12 mois ; ${t.nouv12} entrés en 12 mois ; année de publication médiane ${t.pubMed ?? '?'}`);
    if (c.ov.fonds.length > 1) {
      L.push('', 'PAR FONDS (documents / part du fonds / part des prêts / prêts par doc. / sortis 12 mois) :');
      c.ov.fonds.forEach(f => L.push(`- ${f.name} : ${f.n} / ${F.pct(f.partStock)} / ${F.pct(f.partPrets)} / ${F.dec(f.rotation)} / ${F.pct(f.tauxActif)}`));
    }
    L.push('', 'PRÊTS PAR DOCUMENT SELON LA PÉRIODE DE PUBLICATION :');
    SF.PERIODES.forEach((p, i) => { const x = t.periodes[i]; if (x.n) L.push(`- ${p.label} : ${F.dec(x.rot)} (${x.n} doc.)`); });
    L.push('', `PISTES REPÉRÉES (seuils : ${c.pistes.opts.dormant} mois sans prêt, usure ${c.pistes.opts.usure} prêts, demande ${c.pistes.opts.demande} prêts/an) :`);
    c.pistes.forEach(p => L.push(`- ${p.title} : ${p.rows.length}`));
    const dorm = c.pistes.find(p => p.id === 'dormants').rows.slice(0, 40);
    if (dorm.length) {
      L.push('', 'EXEMPLES DE DOCUMENTS EN SOMMEIL (cote | titre | série | publication | motif) :');
      dorm.forEach(r => L.push(`- ${r.it.cote} | ${r.it.titre} | ${r.it.serie ? r.it.serie + (r.it.tome != null ? ' t.' + r.it.tome : '') : '-'} | ${r.it.pub ?? '?'} | ${r.motif}${r.note ? ' | ' + r.note : ''}`));
    }
    const ser = c.pistes.find(p => p.id === 'series').rows.slice(0, 15);
    if (ser.length) { L.push('', 'SÉRIES INCOMPLÈTES QUI CIRCULENT :'); ser.forEach(r => L.push(`- ${r.serie.nom} : ${r.motif} (${r.note})`)); }
    L.push('', 'Ce que j\'attends :',
      '1. Une lecture de la santé de ce fonds en 5 lignes, pour la direction.',
      '2. Parmi les titres en sommeil listés, ceux qui mériteraient d\'être gardés (classiques, patrimoine, auteurs reconnus, séries de référence) et pourquoi.',
      '3. Des pistes de valorisation (mise en avant, table thématique, animation) avant tout retrait.',
      '4. Les questions que l\'équipe devrait se poser, et les limites de ces chiffres.');
    return L.join('\n');
  };
})(window.SF);
