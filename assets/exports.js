/* Exports : Excel (ExcelJS), PowerPoint (PptxGenJS), résumé texte pour une IA.
   Les bibliothèques sont chargées à la demande, au premier clic. */
'use strict';
window.SF = window.SF || {};

(function (SF) {
  const F = SF.fmt;
  const LIBS = {
    exceljs: 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',
    pptx: 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'
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

  SF.download = function (blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const slug = s => SF.norm(s).replace(/ /g, '-').slice(0, 40) || 'fonds';
  const stamp = d => d.toISOString().slice(0, 10);
  const strip = h => h.replace(/<[^>]+>/g, '');

  const SHEETS = {
    dormants: 'Retirer - sans prêt',
    doublons: 'Retirer - doublons',
    usure: 'Remplacer - usure',
    demande: 'Renforcer - demande',
    series: 'Séries à compléter',
    regul: 'À régulariser'
  };
  const DECISIONS = '"À garder,À retirer,À remplacer,À réparer,À acheter,À transférer,À revoir"';
  const C = { ink: '1F2933', blue: '1C5CAB', blueL: 'DCE9F9', amber: 'FFF1D6', grey: 'F3F2EE', line: 'D9D7D0' };

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
    line(['Chaque ligne indique son motif. Remplissez la colonne « Décision » (liste déroulante) et, si besoin, « Commentaire ». Les lignes surlignées demandent une attention particulière (tome d\'une série active, titre réservé, tome 1 absent).']);
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
          multi && { header: 'Fonds', key: 'fonds', width: 18 },
          { header: 'Cote', key: 'cote', width: 14 },
          { header: 'Série', key: 'serie', width: 36 },
          { header: 'Tomes présents', key: 'pres', width: 20 },
          { header: 'Tomes manquants', key: 'manq', width: 18 },
          { header: 'Dans un autre fonds', key: 'ail', width: 24 },
          { header: 'Prêts an (série)', key: 'pa', width: 14 },
          { header: 'Motif', key: 'motif', width: 26 },
          { header: 'Décision', key: 'dec', width: 14 },
          { header: 'Commentaire', key: 'com', width: 34 }
        ].filter(Boolean);
        ws.columns = cols;
        rows.sort((a, b) => a.prio - b.prio || cmp(a.serie.cote, b.serie.cote) || cmp(a.serie.nom, b.serie.nom));
        for (const r of rows) {
          const row = ws.addRow({ fonds: r.serie.fonds, cote: r.serie.cote, serie: r.serie.nom, pres: SF.compact(r.serie.tomes), manq: SF.compact(r.missing), ail: r.ailleurs, pa: r.serie.pa, motif: r.motif });
          if (r.prio === 0) row.getCell('motif').fill = fill(C.amber);
        }
      } else {
        cols = [
          multi && { header: 'Fonds', key: 'fonds', width: 16 },
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
          { header: 'Décision', key: 'dec', width: 14 },
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
            motif: r.motif, note: r.note
          });
          if (r.prio === 0 || r.flag) row.getCell('note').fill = fill(C.amber);
        }
      }
      styleHeader(ws);
      const decCol = ws.getColumn('dec').number;
      for (let i = 2; i <= ws.rowCount; i++) {
        ws.getRow(i).getCell(decCol).dataValidation = { type: 'list', allowBlank: true, formulae: [DECISIONS] };
        ws.getRow(i).alignment = { vertical: 'top', wrapText: true };
      }
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
    }

    const buf = await wb.xlsx.writeBuffer();
    SF.download(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `pistes-${slug(c.label)}-${stamp(c.ctx.ref)}.xlsx`);
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

  // ================= POWERPOINT =================
  SF.exportPptx = async function (c) {
    await loadScript(LIBS.pptx);
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE'; // 13,33 x 7,5 pouces
    pptx.title = `Suivi du fonds — ${c.label}`;
    const W = 13.33, M = 0.6, FONT = 'Calibri';
    const INK = '1F2933', MUTED = '5F6B76', BLUE = '1C5CAB', LIGHT = 'F4F6F8';
    const t = c.ov.total, ctx = c.ctx;
    const foot = `${c.label} · données au ${F.date(ctx.ref)}`;

    const base = (title, lead) => {
      const s = pptx.addSlide();
      s.background = { color: 'FFFFFF' };
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: BLUE }, line: { color: BLUE } });
      s.addText(title, { x: M, y: 0.4, w: W - 2 * M, h: 0.7, fontFace: FONT, fontSize: 28, bold: true, color: INK, margin: 0 });
      if (lead) s.addText(lead, { x: M, y: 1.1, w: W - 2 * M, h: 0.6, fontFace: FONT, fontSize: 15, color: MUTED, margin: 0, valign: 'top' });
      s.addText(foot, { x: M, y: 7.0, w: W - 2 * M, h: 0.3, fontFace: FONT, fontSize: 10, color: MUTED, margin: 0 });
      return s;
    };

    // 1. Titre
    {
      const s = pptx.addSlide();
      s.background = { color: 'FFFFFF' };
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.18, fill: { color: BLUE }, line: { color: BLUE } });
      s.addText('Suivi du fonds', { x: M + 0.3, y: 2.3, w: 11, h: 1, fontFace: FONT, fontSize: 44, bold: true, color: INK, margin: 0 });
      s.addText(c.label, { x: M + 0.3, y: 3.3, w: 11, h: 0.7, fontFace: FONT, fontSize: 26, color: BLUE, margin: 0 });
      s.addText(`Données au ${F.date(ctx.ref)} · ${F.int(t.n)} exemplaires`, { x: M + 0.3, y: 4.1, w: 11, h: 0.5, fontFace: FONT, fontSize: 16, color: MUTED, margin: 0 });
    }

    // 2. Chiffres clés + constats
    {
      const s = base('En un coup d\'œil');
      const k = [
        [F.int(t.n), 'documents', ctx.has.crea ? `dont ${F.int(t.nouv12)} entrés en 12 mois` : ''],
        ctx.has.pa && [F.int(t.pa), 'prêts sur l\'année', `${F.dec(t.rotation)} par document`],
        ctx.has.dernier && [F.pct(t.tauxActif), 'sortis en 12 mois', `${F.int(t.actif12)} documents`],
        ctx.has.statut && [F.pct(t.tauxPret), 'en prêt aujourd\'hui', `${F.int(t.enPret)} documents`]
      ].filter(Boolean);
      const bw = (W - 2 * M - (k.length - 1) * 0.3) / k.length;
      k.forEach(([v, l, sub], i) => {
        const x = M + i * (bw + 0.3);
        s.addShape(pptx.ShapeType.rect, { x, y: 1.4, w: bw, h: 1.9, fill: { color: LIGHT }, line: { color: LIGHT } });
        s.addText(v, { x: x + 0.25, y: 1.55, w: bw - 0.5, h: 0.85, fontFace: FONT, fontSize: 38, bold: true, color: BLUE, margin: 0 });
        s.addText(l, { x: x + 0.25, y: 2.4, w: bw - 0.5, h: 0.4, fontFace: FONT, fontSize: 16, color: INK, margin: 0 });
        s.addText(sub, { x: x + 0.25, y: 2.8, w: bw - 0.5, h: 0.35, fontFace: FONT, fontSize: 12, color: MUTED, margin: 0 });
      });
      const items = c.constats.slice(0, 4).map(x => ({ text: strip(x).replace(/&nbsp;/g, ' '), options: { bullet: { indent: 18 }, paraSpaceAfter: 10 } }));
      if (items.length) s.addText(items, { x: M, y: 3.7, w: W - 2 * M, h: 3.1, fontFace: FONT, fontSize: 17, color: INK, valign: 'top', margin: 0 });
    }

    // 3. Circulation
    if (ctx.has.dernier) {
      const rows = c.ov.fonds.length > 1 ? [...c.ov.fonds, Object.assign({ name: 'Ensemble' }, t)] : [Object.assign({ name: c.label }, t)];
      const s = base('Un fonds qui circule', `${F.pct(t.tauxActif)} des documents sont sortis au moins une fois ces 12 derniers mois.`);
      const data = SF.FRAICHEUR.map((name, i) => ({ name, labels: rows.map(r => r.name), values: rows.map(r => r.n ? r.fresh[i] / r.n : 0) }));
      s.addChart(pptx.ChartType.bar, data, {
        x: M, y: 1.8, w: W - 2 * M, h: Math.min(4.9, 1.2 + rows.length * 0.9),
        barDir: 'bar', barGrouping: 'percentStacked', barGapWidthPct: 40,
        chartColors: ['184F95', '2A78D6', '6DA7EC', 'B7D3F6', 'C9C7BF'],
        catAxisLabelFontSize: 13, catAxisLabelFontFace: FONT, catAxisOrientation: 'maxMin',
        valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
        showLegend: true, legendPos: 't', legendFontSize: 12, legendFontFace: FONT,
        showValue: true, dataLabelFormatCode: '[<0.05]"";0%', dataLabelFontSize: 11, dataLabelColor: 'FFFFFF', dataLabelFontFace: FONT
      });
      s.addText('Lecture : chaque barre répartit les exemplaires selon la date de leur dernier prêt.' + (ctx.histTronque ? ` Historique des prêts disponible depuis ${F.mois(ctx.histStart)}.` : ''), { x: M, y: 6.55, w: W - 2 * M, h: 0.35, fontFace: FONT, fontSize: 11, color: MUTED, margin: 0, italic: true });
    }

    // 4. Poids des fonds
    if (c.ov.fonds.length > 1 && ctx.has.pa) {
      const fs = c.ov.fonds;
      const s = base('Le poids de chaque fonds', 'Part des documents et part des prêts : un fonds plus demandé que sa taille mérite d\'être conforté.');
      s.addChart(pptx.ChartType.bar, [
        { name: 'Part du fonds', labels: fs.map(f => f.name), values: fs.map(f => f.partStock) },
        { name: 'Part des prêts', labels: fs.map(f => f.name), values: fs.map(f => f.partPrets) }
      ], {
        x: M, y: 1.8, w: 7.2, h: 4.8, barDir: 'col', barGrouping: 'clustered', barGapWidthPct: 60,
        chartColors: ['2A78D6', 'EB6834'], catAxisLabelFontSize: 13, catAxisLabelFontFace: FONT,
        valAxisHidden: true, valGridLine: { style: 'none' },
        showLegend: true, legendPos: 't', legendFontSize: 12, legendFontFace: FONT,
        showValue: true, dataLabelFormatCode: '0%', dataLabelFontSize: 12, dataLabelFontFace: FONT
      });
      const tbl = [[hd('Fonds'), hd('Docs'), hd('Prêts/doc.'), hd('Sortis 12 m.')]].concat(fs.map(f => [f.name, F.int(f.n), F.dec(f.rotation), F.pct(f.tauxActif)].map(v => ({ text: v, options: { fontSize: 12, color: INK } }))));
      s.addTable(tbl, { x: 8.2, y: 2.2, w: 4.5, colW: [1.7, 0.8, 1.05, 0.95], fontFace: FONT, border: { type: 'solid', color: 'E3E1DA', pt: 0.75 }, valign: 'middle', rowH: 0.42 });
    }

    // 5. Âge des collections
    if (ctx.has.pub && ctx.has.pa) {
      const ps = SF.PERIODES.map((p, i) => ({ label: p.label, ...t.periodes[i] })).filter(r => r.n >= 15);
      const age = c.constats.find(x => /publiés avant 2010/.test(x));
      const s = base('Les documents anciens sortent-ils encore ?', age ? strip(age) : 'Prêts moyens sur l\'année par document, selon la date de publication.');
      s.addChart(pptx.ChartType.bar, [{ name: 'Prêts par document sur l\'année', labels: ps.map(r => `${r.label} (${F.int(r.n)} doc.)`), values: ps.map(r => Math.round(r.rot * 10) / 10) }], {
        x: M, y: 2.0, w: W - 2 * M, h: 4.5, barDir: 'bar', barGapWidthPct: 45, chartColors: ['2A78D6'],
        catAxisLabelFontSize: 13, catAxisLabelFontFace: FONT, catAxisOrientation: 'maxMin',
        valAxisHidden: true, valGridLine: { style: 'none' }, showLegend: false,
        showValue: true, dataLabelFormatCode: '0.0', dataLabelFontSize: 12, dataLabelFontFace: FONT
      });
    }

    // 6. Pistes de gestion
    {
      const s = base('Pistes de gestion', 'Repérées dans les données, puis vérifiées en rayon par l\'équipe avant toute décision.');
      const lab = { dormants: 'Retirer ?', doublons: 'Retirer un exemplaire ?', usure: 'Remplacer ?', demande: 'Renforcer ?', series: 'Compléter ?', regul: 'Régulariser' };
      const tbl = [[hd('Piste'), hd('Volume'), hd('Critère')]].concat(c.pistes.filter(p => p.rows.length).map(p => [
        { text: lab[p.id], options: { bold: true, fontSize: 14, color: INK } },
        { text: `${F.int(p.rows.length)} ${p.kind === 'series' ? F.plural(p.rows.length, 'série') : 'ex.'}`, options: { fontSize: 14, color: BLUE, bold: true } },
        { text: p.title + ' — ' + p.why, options: { fontSize: 12, color: MUTED } }
      ]));
      s.addTable(tbl, { x: M, y: 1.9, w: W - 2 * M, colW: [2.6, 1.5, W - 2 * M - 4.1], fontFace: FONT, border: { type: 'solid', color: 'E3E1DA', pt: 0.75 }, valign: 'middle', rowH: 0.62 });
      s.addText(`Méthode : extraction du SIGB analysée localement. Seuils retenus : sans prêt depuis ${c.pistes.opts.dormant} mois, usure dès ${c.pistes.opts.usure} prêts, forte demande dès ${c.pistes.opts.demande} prêts par exemplaire et par an. Aucun retrait automatique : l'état physique, l'intérêt patrimonial et la cohérence des séries sont appréciés par l'équipe.`, { x: M, y: 6.1, w: W - 2 * M, h: 0.8, fontFace: FONT, fontSize: 11, color: MUTED, margin: 0, valign: 'bottom' });
    }

    function hd(t) { return { text: t, options: { bold: true, color: 'FFFFFF', fill: { color: BLUE }, fontSize: 12 } }; }
    const blob = await pptx.write({ outputType: 'blob' });
    SF.download(blob, `synthese-${slug(c.label)}-${stamp(ctx.ref)}.pptx`);
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
