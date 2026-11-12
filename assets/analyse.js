/* Indicateurs et pistes de gestion. Règles transparentes, seuils réglables. */
'use strict';
window.SF = window.SF || {};

(function (SF) {
  const DAY = 86400000;
  const months = (a, b) => (b - a) / (30.44 * DAY);
  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const OUT = new Set(['PR', 'RT', 'RE', 'PC']);

  const F = SF.fmt = {
    int: n => (n == null ? '–' : Math.round(n).toLocaleString('fr-FR')),
    dec: (n, d = 1) => (n == null || !isFinite(n) ? '–' : n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })),
    pct: (n, d = 0) => (n == null || !isFinite(n) ? '–' : (n * 100).toLocaleString('fr-FR', { maximumFractionDigits: d }) + ' %'),
    mois: d => (d ? MOIS[d.getMonth()] + ' ' + d.getFullYear() : '–'),
    date: d => (d ? d.toLocaleDateString('fr-FR') : ''),
    plural: (n, s, p) => (n > 1 ? (p || s + 's') : s)
  };

  SF.DEFAULTS = { dormant: 24, usure: 100, demande: 12 };

  SF.PERIODES = [
    { label: 'Avant 1990', test: y => y < 1990 },
    { label: '1990–1999', test: y => y >= 1990 && y < 2000 },
    { label: '2000–2009', test: y => y >= 2000 && y < 2010 },
    { label: '2010–2014', test: y => y >= 2010 && y < 2015 },
    { label: '2015–2019', test: y => y >= 2015 && y < 2020 },
    { label: '2020 et après', test: y => y >= 2020 }
  ];
  SF.FRAICHEUR = ['Moins de 6 mois', '6 à 12 mois', '12 à 24 mois', 'Plus de 24 mois', 'Aucun prêt connu'];

  /** Contexte global : date de référence (≈ date d'extraction), profondeur d'historique, colonnes présentes */
  SF.context = function (items) {
    let ref = 0, hist = Infinity;
    const has = { dernier: 0, pa: 0, pv: 0, pub: 0, crea: 0, serie: 0, statut: 0 };
    for (const it of items) {
      if (it.dernier) { ref = Math.max(ref, +it.dernier); hist = Math.min(hist, +it.dernier); has.dernier++; }
      if (it.crea) { ref = Math.max(ref, +it.crea); has.crea++; }
      if (it.pa != null) has.pa++;
      if (it.pv != null) has.pv++;
      if (it.pub) has.pub++;
      if (it.tome != null) has.serie++;
      if (it.statut) has.statut++;
    }
    const refDate = ref ? new Date(ref) : new Date();
    const histStart = isFinite(hist) ? new Date(hist) : null;
    // Si le plus ancien "dernier emprunt" est récent, l'historique a sans doute été tronqué (migration de SIGB…)
    const histMonths = histStart ? months(histStart, refDate) : 0;
    return { ref: refDate, histStart, histMonths, histTronque: histStart && histMonths < 60, has, n: items.length };
  };

  function stats(list, ctx) {
    const ref = ctx.ref;
    const s = { n: list.length, pa: 0, actif12: 0, enPret: 0, nouv12: 0, fresh: [0, 0, 0, 0, 0], pubs: [], periodes: SF.PERIODES.map(() => ({ n: 0, pa: 0 })), pvMax: 0 };
    for (const it of list) {
      s.pa += it.pa || 0;
      if (OUT.has(it.code) && it.code !== 'RE') s.enPret++;
      if (it.crea && months(it.crea, ref) <= 12) s.nouv12++;
      if (it.dernier) {
        const m = months(it.dernier, ref);
        if (m <= 12) s.actif12++;
        s.fresh[m <= 6 ? 0 : m <= 12 ? 1 : m <= 24 ? 2 : 3]++;
      } else s.fresh[4]++;
      if (it.pub) {
        s.pubs.push(it.pub);
        const k = SF.PERIODES.findIndex(p => p.test(it.pub));
        if (k >= 0) { s.periodes[k].n++; s.periodes[k].pa += it.pa || 0; }
      }
      if (it.pv > s.pvMax) s.pvMax = it.pv;
    }
    s.rotation = s.n ? s.pa / s.n : 0;
    s.tauxActif = s.n ? s.actif12 / s.n : 0;
    s.tauxPret = s.n ? s.enPret / s.n : 0;
    s.renouv = s.n ? s.nouv12 / s.n : 0;
    s.pubs.sort((a, b) => a - b);
    s.pubMed = s.pubs.length ? s.pubs[Math.floor(s.pubs.length / 2)] : null;
    s.periodes.forEach(p => { p.rot = p.n ? p.pa / p.n : null; });
    delete s.pubs;
    return s;
  }
  SF.stats = stats;

  /** Indicateurs par fonds + total */
  SF.overview = function (items, ctx) {
    const groups = new Map();
    for (const it of items) {
      if (!groups.has(it.fonds)) groups.set(it.fonds, []);
      groups.get(it.fonds).push(it);
    }
    const total = stats(items, ctx);
    const fonds = [...groups.entries()].map(([name, list]) => {
      const s = stats(list, ctx);
      s.name = name;
      s.partStock = total.n ? s.n / total.n : 0;
      s.partPrets = total.pa ? s.pa / total.pa : 0;
      s.ipr = s.partStock ? s.partPrets / s.partStock : null; // indice de performance relative
      return s;
    }).sort((a, b) => b.n - a.n);
    return { total, fonds };
  };

  /** Constats rédigés : courts, factuels, seulement ce qui est notable */
  SF.constats = function (ov, ctx, pistes) {
    const t = ov.total, out = [];
    if (ctx.has.dernier) {
      const q = t.tauxActif >= 0.85 ? 'un fonds très vivant' : t.tauxActif >= 0.65 ? 'un fonds qui circule bien' : t.tauxActif >= 0.45 ? 'une circulation moyenne' : 'une part importante du fonds reste en rayon';
      out.push(`<strong>${F.pct(t.tauxActif)}</strong> des documents sont sortis au moins une fois ces 12 derniers mois : ${q}.`);
    }
    if (ctx.has.pa) out.push(`En moyenne, chaque document est emprunté <strong>${F.dec(t.rotation)} fois</strong> sur l'année.`);
    if (ov.fonds.length > 1 && ctx.has.pa) {
      const sorted = ov.fonds.filter(f => f.n >= 30).sort((a, b) => b.ipr - a.ipr);
      const hi = sorted[0], lo = sorted[sorted.length - 1];
      if (hi && lo && hi !== lo && hi.ipr - lo.ipr > 0.25) {
        out.push(`« ${hi.name} » pèse ${F.pct(hi.partStock)} du fonds mais ${F.pct(hi.partPrets)} des prêts ; « ${lo.name} » ${F.pct(lo.partStock)} du fonds pour ${F.pct(lo.partPrets)} des prêts.`);
      }
    }
    if (ctx.has.pub && ctx.has.pa) {
      const p = t.periodes;
      const old = p.slice(0, 3).reduce((a, b) => ({ n: a.n + b.n, pa: a.pa + b.pa }), { n: 0, pa: 0 });
      const mid = { n: p[3].n + p[4].n, pa: p[3].pa + p[4].pa };
      const rec = p[5];
      if (old.n >= 30 && mid.n >= 30) {
        const ro = old.pa / old.n, rm = mid.pa / mid.n;
        const nouv = rec.n >= 30 && rec.pa / rec.n > rm * 1.3 ? ` Seules les parutions depuis 2020 sortent nettement plus (${F.dec(rec.pa / rec.n)}) : l'effet nouveauté.` : '';
        if (ro >= rm * 0.75) out.push(`Les documents publiés avant 2010 sortent encore <strong>${F.dec(ro)} fois/an</strong>, presque autant que ceux des années 2010 (${F.dec(rm)}) : l'âge seul n'est pas un bon critère de retrait ici.${nouv}`);
        else out.push(`Les documents publiés avant 2010 sortent ${F.dec(ro)} fois/an contre ${F.dec(rm)} pour ceux des années 2010 : l'ancienneté pèse sur la circulation, à regarder titre par titre.${nouv}`);
      }
    }
    if (pistes) {
      const u = pistes.find(p => p.id === 'usure');
      if (u && u.rows.length) out.push(`${F.int(u.rows.length)} ${F.plural(u.rows.length, 'exemplaire')} ${u.rows.length > 1 ? 'dépassent' : 'dépasse'} ${pistes.opts.usure} prêts : un passage en rayon pour vérifier leur état est conseillé.`);
    }
    return out;
  };

  /** Pistes de gestion. Chaque ligne porte son motif lisible. */
  SF.pistes = function (items, ctx, opts) {
    opts = Object.assign({}, SF.DEFAULTS, opts);
    const ref = ctx.ref;
    const histOK = ctx.histStart ? months(ctx.histStart, ref) >= opts.dormant : false;

    // --- séries ---
    const series = new Map();
    for (const it of items) {
      if (!it.serieKey || it.tome == null) continue;
      const k = it.fonds + '|' + it.serieKey;
      if (!series.has(k)) series.set(k, { key: k, nom: it.serie, fonds: it.fonds, items: [] });
      series.get(k).items.push(it);
    }
    for (const s of series.values()) {
      s.tomes = [...new Set(s.items.map(i => i.tome))].sort((a, b) => a - b);
      s.max = s.tomes[s.tomes.length - 1];
      s.pa = s.items.reduce((a, i) => a + (i.pa || 0), 0);
      s.actifs = s.items.filter(i => i.dernier && months(i.dernier, ref) <= 12).length;
      const cotes = {};
      s.items.forEach(i => { cotes[i.cote] = (cotes[i.cote] || 0) + 1; });
      s.cote = Object.entries(cotes).sort((a, b) => b[1] - a[1])[0][0];
    }

    // --- dormants ---
    const isDormant = it => {
      if (OUT.has(it.code)) return null;
      if (it.crea && months(it.crea, ref) < opts.dormant) return null; // acquisition récente
      if (!ctx.has.dernier) return it.pa === 0 ? { m: null, txt: 'Aucun prêt cette année' } : null;
      if (it.dernier) {
        const m = months(it.dernier, ref);
        return m >= opts.dormant ? { m, txt: `Dernier prêt : ${F.mois(it.dernier)}` } : null;
      }
      if (it.pa > 0) return null;
      if (it.crea && ctx.histStart && it.crea >= ctx.histStart) return { m: months(it.crea, ref), txt: `Jamais emprunté depuis son entrée (${F.mois(it.crea)})` };
      if (histOK) return { m: ctx.histMonths, txt: `Aucun prêt enregistré depuis ${F.mois(ctx.histStart)}` };
      return null;
    };
    const dormRows = [];
    for (const it of items) {
      const d = isDormant(it);
      if (!d) continue;
      let note = '';
      let prio = 1;
      if (it.serieKey && it.tome != null) {
        const s = series.get(it.fonds + '|' + it.serieKey);
        if (s && s.tomes.length > 1) {
          if (s.actifs > 0) { note = `Série active (${s.actifs} ${F.plural(s.actifs, 'tome')} ${s.actifs > 1 ? 'sortis' : 'sorti'} sur 12 mois) : retirer ce tome casserait la série`; prio = 2; }
          else note = `Toute la série (${s.items.length} ex.) est en sommeil : à traiter d'un bloc`;
        }
      }
      const motif = [d.txt, it.pv != null ? `${it.pv} ${F.plural(it.pv, 'prêt')} au total` : ''].filter(Boolean).join(' · ');
      dormRows.push({ it, motif, note, prio, flag: prio === 2, tri: -(d.m || 0) });
    }

    // --- doublons ---
    const keyOf = it => it.fonds + '|' + SF.norm(it.titre) + '|' + it.serieKey + '|' + (it.tome ?? '');
    const groups = new Map();
    for (const it of items) {
      const k = keyOf(it);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(it);
    }
    const doubRows = [];
    if (ctx.has.pa) {
      for (const g of groups.values()) {
        if (g.length < 2) continue;
        const pa = g.reduce((a, i) => a + (i.pa || 0), 0);
        if (pa / g.length >= 1.5) continue;
        // on garde l'exemplaire le moins usé (moins de prêts totaux), on propose les autres
        const sorted = [...g].sort((a, b) => (a.pv ?? 0) - (b.pv ?? 0));
        sorted.slice(1).forEach(it => doubRows.push({
          it, motif: `${g.length} exemplaires, ${pa} ${F.plural(pa, 'prêt')} sur l'année au total`,
          note: `Exemplaire gardé : le moins usé (${sorted[0].pv ?? '?'} prêts, ${sorted[0].cb || sorted[0].cote})`, prio: 1, tri: -pa
        }));
      }
    }

    // --- usure ---
    const usRows = items.filter(it => it.pv != null && it.pv >= opts.usure).map(it => ({
      it, motif: `${it.pv} prêts${it.crea ? ' depuis ' + it.crea.getFullYear() : ''}`,
      note: it.pa >= 3 ? 'Toujours très demandé : remplacer plutôt que retirer' : (it.pa === 0 ? 'Ne sort plus : remplacer n\'est peut-être pas utile' : ''),
      prio: 1, tri: -it.pv
    }));

    // --- forte demande ---
    const demRows = [];
    if (ctx.has.pa) {
      for (const g of groups.values()) {
        const pa = g.reduce((a, i) => a + (i.pa || 0), 0);
        if (pa / g.length < opts.demande) continue;
        const best = [...g].sort((a, b) => (b.pa || 0) - (a.pa || 0))[0];
        const res = g.some(i => i.code === 'RE');
        demRows.push({
          it: best, motif: `${pa} prêts sur l'année pour ${g.length} ${F.plural(g.length, 'exemplaire')}`,
          note: res ? 'Réservé en ce moment' : '', prio: res ? 0 : 1, tri: -pa / g.length
        });
      }
    }

    // --- séries à compléter ---
    const serRows = [];
    for (const s of series.values()) {
      if (s.tomes.length < 2 || s.max > 80 || s.pa === 0) continue;
      const missing = [];
      for (let t = 1; t <= s.max; t++) if (!s.tomes.includes(t)) missing.push(t);
      if (!missing.length || missing.length > Math.max(2, s.tomes.filter(t => t > 0).length)) continue;
      // tomes manquants présents dans un autre fonds ?
      const ailleurs = [];
      for (const o of series.values()) {
        if (o === s || o.key.split('|')[1] !== s.key.split('|')[1]) continue;
        const t = missing.filter(m => o.tomes.includes(m));
        if (t.length) ailleurs.push(`${compact(t)} en « ${o.fonds} »`);
      }
      const t1 = missing[0] === 1;
      const motif = (t1 ? `Tome 1 absent${missing.length > 1 ? ` (manquent : ${compact(missing)})` : ''}` : `${missing.length > 1 ? 'Tomes manquants' : 'Tome manquant'} : ${compact(missing)}`);
      serRows.push({
        serie: s, it: s.items[0], motif,
        note: [`Présents : ${compact(s.tomes)}`, `${s.pa} prêts sur l'année pour la série`, ailleurs.length ? `Ailleurs : ${ailleurs.join(', ')}` : ''].filter(Boolean).join(' · '),
        missing, ailleurs: ailleurs.join(', '), prio: t1 && missing.length <= 3 && !ailleurs.length ? 0 : 1, tri: -s.pa
      });
    }

    // --- à régulariser ---
    const regRows = items.filter(it => ['DP', 'PC', 'TP', 'TC'].includes(it.code) || /perdu|contest|r[ée]paration|manquant/i.test(it.statut))
      .map(it => ({ it, motif: it.statut, note: it.dernier ? `Dernier prêt : ${F.mois(it.dernier)}` : '', prio: 1, tri: 0 }));

    const pistes = [
      {
        id: 'dormants', group: 'Retirer ?', action: 'Retirer', tone: 'retirer',
        title: `Pas sortis depuis ${opts.dormant} mois`, rows: dormRows,
        why: `Exemplaires en rayon dont le dernier prêt remonte à plus de ${opts.dormant} mois (hors acquisitions récentes).`,
        caution: 'Les tomes d\'une série encore active sont surlignés en fin de liste : les retirer gênerait les lecteurs de la série.' +
          (ctx.histTronque ? ` L'historique des prêts ne remonte qu'à ${F.mois(ctx.histStart)}.` : '')
      },
      {
        id: 'doublons', group: 'Retirer ?', action: 'Retirer un exemplaire', tone: 'retirer',
        title: 'Exemplaires en double peu demandés', rows: doubRows,
        why: 'Titres présents en plusieurs exemplaires dans le même fonds, avec moins de 1,5 prêt par exemplaire sur l\'année.',
        caution: 'L\'outil propose de garder l\'exemplaire le moins emprunté, donc a priori le moins abîmé.'
      },
      {
        id: 'usure', group: 'Remplacer ?', action: 'Vérifier l\'état', tone: 'remplacer',
        title: `Plus de ${opts.usure} prêts`, rows: usRows,
        why: `Exemplaires très empruntés : au-delà de ${opts.usure} prêts, une BD est souvent fatiguée.`,
        caution: 'Seul un coup d\'œil en rayon dit s\'il faut réparer, remplacer ou laisser vivre.'
      },
      {
        id: 'demande', group: 'Renforcer ?', action: 'Ajouter un exemplaire', tone: 'renforcer',
        title: `Au moins ${opts.demande} prêts par exemplaire sur l'année`, rows: demRows,
        why: 'Titres qui tournent sans arrêt : un exemplaire supplémentaire réduirait l\'attente.',
        caution: 'Les titres réservés en ce moment sont en tête. Le seuil se règle selon le rythme de votre fonds.'
      },
      {
        id: 'series', group: 'Renforcer ?', action: 'Compléter la série', tone: 'renforcer', kind: 'series',
        title: 'Séries incomplètes qui circulent', rows: serRows,
        why: 'Séries empruntées auxquelles il manque un ou quelques tomes (dont le tome 1, en priorité).',
        caution: 'Repéré d\'après la numérotation du titre d\'ensemble : une série volontairement partielle peut apparaître ici. Les tomes parus après le dernier possédé ne sont pas détectés.'
      },
      {
        id: 'regul', group: 'Régulariser', action: 'Régulariser', tone: 'regul',
        title: 'Statuts à régulariser', rows: regRows,
        why: 'Documents perdus, prêts contestés, en réparation ou en traitement.',
        caution: 'À traiter dans le SIGB : remplacement, relance ou retrait du catalogue.'
      }
    ];
    for (const p of pistes) p.rows.sort((a, b) => a.prio - b.prio || a.tri - b.tri || (a.it.cote || '').localeCompare(b.it.cote || '', 'fr') || a.it.titre.localeCompare(b.it.titre, 'fr'));
    pistes.opts = opts;
    pistes.series = series;
    return pistes;
  };

  function compact(nums) {
    const out = [];
    for (let i = 0; i < nums.length; i++) {
      let j = i;
      while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
      out.push(j > i + 1 ? `${nums[i]}–${nums[j]}` : j === i + 1 ? `${nums[i]}, ${nums[j]}` : `${nums[i]}`);
      i = j;
    }
    return out.join(', ');
  }
  SF.compact = compact;
})(window.SF);
