/* Interface : dépôt, vue d'ensemble, pistes, exports. */
'use strict';
(function (SF) {
  const F = SF.fmt;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ALL = '__tous__';

  const state = { items: [], sheets: [], files: [], ctx: null, fonds: ALL, opts: Object.assign({}, SF.DEFAULTS), tab: 'overview', open: null, shown: 100 };
  SF.state = state;

  // ---------- chargement ----------
  const input = $('#fileInput'), drop = $('#drop');
  input.addEventListener('change', () => input.files.length && load([...input.files]));
  ['dragenter', 'dragover'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', ev => ev.dataTransfer.files.length && load([...ev.dataTransfer.files]));
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files.length && !$('#results').hidden) load([...e.dataTransfer.files]); });
  $('#btnReset').addEventListener('click', () => {
    Object.assign(state, { items: [], sheets: [], files: [], ctx: null, fonds: ALL, open: null });
    input.value = '';
    $('#results').hidden = true; $('#dropSection').hidden = false; $('#topActions').hidden = true;
  });

  async function load(files) {
    const err = $('#loadError'); err.hidden = true;
    drop.classList.add('busy');
    try {
      const items = [], sheets = [];
      for (const f of files) {
        const r = await SF.readFile(f);
        items.push(...r.items); sheets.push(...r.sheets);
      }
      if (!items.length) throw new Error('Aucune ligne exploitable trouvée. Vérifiez que la feuille contient bien des en-têtes comme « Cote », « Titre », « Dernier emprunt », « Nb prêts année »…');
      Object.assign(state, { items, sheets, files: files.map(f => f.name), ctx: SF.context(items), fonds: ALL, open: null });
      $('#dropSection').hidden = true; $('#results').hidden = false; $('#topActions').hidden = false;
      render();
      window.scrollTo(0, 0);
    } catch (e) {
      console.error(e);
      err.textContent = e.message || 'Lecture impossible.';
      err.hidden = false;
    } finally { drop.classList.remove('busy'); }
  }

  // ---------- sélection ----------
  const selItems = () => (state.fonds === ALL ? state.items : state.items.filter(i => i.fonds === state.fonds));
  SF.selItems = selItems;
  SF.selLabel = () => (state.fonds === ALL ? (fondsNames().length > 1 ? 'Tous les fonds' : fondsNames()[0]) : state.fonds);
  const fondsNames = () => [...new Set(state.items.map(i => i.fonds))];
  SF.computed = () => {
    const items = selItems();
    const ov = SF.overview(items, state.ctx);
    const pistes = SF.pistes(items, state.ctx, state.opts);
    return { items, ov, pistes, constats: SF.constats(ov, state.ctx, pistes), ctx: state.ctx, label: SF.selLabel() };
  };

  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
    state.tab = b.dataset.tab;
    document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-selected', x === b));
    document.querySelectorAll('.panel').forEach(p => { p.hidden = p.id !== 'tab-' + state.tab; });
  }));

  function render() {
    const c = SF.computed();
    renderContext();
    renderChips();
    renderOverview(c);
    renderReview(c);
    renderExport(c);
    const n = c.pistes.filter(p => p.id !== 'regul').reduce((a, p) => a + p.rows.length, 0);
    $('#reviewCount').textContent = F.int(n);
  }

  function renderContext() {
    const ctx = state.ctx, nf = fondsNames().length;
    const ok = state.sheets.filter(s => !s.skipped), ko = state.sheets.filter(s => s.skipped);
    const missing = [...new Set(ok.flatMap(s => s.missing || []))].filter(k => !['fonds', 'auteur', 'cb'].includes(k));
    let html = `<p><strong>${F.int(ctx.n)}</strong> exemplaires · ${nf} ${F.plural(nf, 'fonds', 'fonds')} · ${ok.length} ${F.plural(ok.length, 'onglet')} lu${ok.length > 1 ? 's' : ''}`;
    if (ctx.has.dernier) html += ` · données au <strong>${F.date(ctx.ref)}</strong>`;
    html += '</p>';
    const notes = [];
    if (ctx.histTronque) notes.push(`Les dates de dernier emprunt commencent en ${F.mois(ctx.histStart)} : l'historique a sans doute été remis à zéro (changement de SIGB ?). Un document « sans prêt connu » a pu sortir avant.`);
    if (missing.length) notes.push(`Colonnes non trouvées : ${missing.map(k => SF.COL_LABELS[k]).join(', ')}. Les analyses qui en dépendent sont masquées.`);
    if (ko.length) notes.push(`Onglets ignorés : ${ko.map(s => `« ${esc(s.name)} » (${s.skipped})`).join(', ')}.`);
    if (notes.length) html += `<ul class="notes">${notes.map(n => `<li>${n}</li>`).join('')}</ul>`;
    $('#context').innerHTML = html;
  }

  function renderChips() {
    const names = fondsNames();
    const box = $('#fondsChips');
    if (names.length < 2) { box.innerHTML = ''; box.parentElement.hidden = true; return; }
    box.parentElement.hidden = false;
    const count = n => state.items.filter(i => i.fonds === n).length;
    box.innerHTML = [[ALL, 'Tous les fonds', state.items.length], ...names.map(n => [n, n, count(n)])]
      .map(([v, l, n]) => `<button class="chip" role="tab" aria-selected="${state.fonds === v}" data-v="${esc(v)}">${esc(l)} <span>${F.int(n)}</span></button>`).join('');
    box.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => { state.fonds = b.dataset.v; state.open = null; render(); }));
  }

  // ---------- vue d'ensemble ----------
  function renderOverview(c) {
    const { ov, ctx } = c, t = ov.total;
    const tiles = [
      ['Documents', F.int(t.n), t.nouv12 && ctx.has.crea ? `dont ${F.int(t.nouv12)} entrés en 12 mois` : ''],
      ctx.has.pa && ['Prêts sur l\'année', F.int(t.pa), `soit ${F.dec(t.rotation)} par document`],
      ctx.has.dernier && ['Sortis en 12 mois', F.pct(t.tauxActif), `${F.int(t.actif12)} documents`],
      ctx.has.statut && ['En prêt aujourd\'hui', F.pct(t.tauxPret), `${F.int(t.enPret)} documents`]
    ].filter(Boolean);
    let h = `<div class="tiles">${tiles.map(([l, v, s]) => `<div class="tile"><span class="tl">${l}</span><span class="tv">${v}</span><span class="ts">${s}</span></div>`).join('')}</div>`;

    if (c.constats.length) h += `<div class="card constats"><h3>Ce qu'il faut retenir</h3><ul>${c.constats.map(x => `<li>${x}</li>`).join('')}</ul></div>`;

    const grid = [];
    if (ctx.has.dernier) grid.push(chartFraicheur(ov));
    if (ov.fonds.length > 1) grid.push(tableFonds(ov, ctx));
    if (ctx.has.pub && ctx.has.pa) grid.push(chartPeriodes(t));
    h += grid.join('');
    $('#tab-overview').innerHTML = h;
    bindTips($('#tab-overview'));
  }

  const FRESH_CLS = ['f0', 'f1', 'f2', 'f3', 'f4'];
  function chartFraicheur(ov) {
    const rows = ov.fonds.length > 1 ? [...ov.fonds, Object.assign({ name: 'Ensemble', isTotal: true }, ov.total)] : [Object.assign({ name: ov.fonds[0].name }, ov.total)];
    const bar = r => `<div class="srow${r.isTotal ? ' total' : ''}"><span class="sl">${esc(r.name)}</span><div class="stack" role="img" aria-label="${esc(r.name)} : ${r.fresh.map((v, i) => SF.FRAICHEUR[i] + ' ' + F.pct(v / r.n)).join(', ')}">${r.fresh.map((v, i) => v ? `<span class="${FRESH_CLS[i]}" style="flex-grow:${v}" data-tip="<b>${esc(r.name)}</b><br>${SF.FRAICHEUR[i]} : ${F.int(v)} doc. (${F.pct(v / r.n)})">${v / r.n >= 0.08 ? F.pct(v / r.n) : ''}</span>` : '').join('')}</div></div>`;
    return `<div class="card">
      <h3>Quand les documents sont-ils sortis pour la dernière fois ?</h3>
      <p class="sub">Part des exemplaires selon l'ancienneté de leur dernier prêt.</p>
      <div class="legend">${SF.FRAICHEUR.map((l, i) => `<span><i class="${FRESH_CLS[i]}"></i>${l}</span>`).join('')}</div>
      <div class="stacks">${rows.map(bar).join('')}</div>
    </div>`;
  }

  function tableFonds(ov, ctx) {
    const max = Math.max(...ov.fonds.map(f => Math.max(f.partStock, f.partPrets)));
    return `<div class="card">
      <h3>Chaque fonds pèse-t-il autant dans les prêts que dans les rayons ?</h3>
      <p class="sub">Une barre « prêts » plus longue que la barre « fonds » signale un fonds plus demandé que sa taille.</p>
      <div class="legend"><span><i class="s1"></i>Part du fonds</span><span><i class="s2"></i>Part des prêts</span></div>
      <div class="tscroll"><table class="tf">
        <thead><tr><th>Fonds</th><th class="num">Documents</th><th class="bars-h">Fonds / prêts</th><th class="num">Prêts par doc.</th>${ctx.has.dernier ? '<th class="num">Sortis 12 mois</th>' : ''}${ctx.has.crea ? '<th class="num">Entrés 12 mois</th>' : ''}</tr></thead>
        <tbody>${ov.fonds.map(f => `<tr>
          <td>${esc(f.name)}</td><td class="num">${F.int(f.n)}</td>
          <td class="bars"><div class="pair" data-tip="<b>${esc(f.name)}</b><br>${F.pct(f.partStock, 1)} des documents<br>${F.pct(f.partPrets, 1)} des prêts">
            <span class="s1" style="width:${(f.partStock / max) * 100}%"></span><em>${F.pct(f.partStock)}</em>
            <span class="s2" style="width:${(f.partPrets / max) * 100}%"></span><em>${F.pct(f.partPrets)}</em></div></td>
          <td class="num">${F.dec(f.rotation)}</td>${ctx.has.dernier ? `<td class="num">${F.pct(f.tauxActif)}</td>` : ''}${ctx.has.crea ? `<td class="num">${F.int(f.nouv12)}</td>` : ''}</tr>`).join('')}</tbody>
      </table></div>
    </div>`;
  }

  function chartPeriodes(t) {
    const rows = SF.PERIODES.map((p, i) => ({ label: p.label, ...t.periodes[i] })).filter(r => r.n > 0);
    const max = Math.max(...rows.map(r => r.rot || 0));
    return `<div class="card">
      <h3>Les documents anciens sortent-ils encore ?</h3>
      <p class="sub">Prêts moyens sur l'année par document, selon la date de publication.</p>
      <div class="hbars">${rows.map(r => `<div class="hrow${r.n < 15 ? ' faint' : ''}" data-tip="<b>${r.label}</b><br>${F.int(r.n)} documents<br>${F.int(r.pa)} prêts sur l'année">
        <span class="hl">${r.label}</span><div class="htrack"><span class="hb" style="width:${max ? (r.rot / max) * 100 : 0}%"></span></div>
        <span class="hv">${F.dec(r.rot)} <small>· ${F.int(r.n)} doc.</small></span></div>`).join('')}</div>
    </div>`;
  }

  // ---------- à examiner ----------
  function renderReview(c) {
    const o = state.opts;
    const sel = (id, label, vals, unit) => `<label>${label} <select data-opt="${id}">${vals.map(v => `<option value="${v}"${v === o[id] ? ' selected' : ''}>${v} ${unit}</option>`).join('')}</select></label>`;
    let h = `<div class="settings">
      <span class="settings-t">Seuils</span>
      ${sel('dormant', 'Sans prêt depuis', [12, 18, 24, 36], 'mois')}
      ${sel('usure', 'Usure au-delà de', [60, 80, 100, 120, 150], 'prêts')}
      ${sel('demande', 'Forte demande dès', [6, 8, 10, 12, 15], 'prêts/an')}
    </div>
    <p class="disclaimer">Ce sont des <strong>pistes à vérifier en rayon</strong>, pas des décisions. L'outil ne voit ni l'état des documents, ni leur intérêt patrimonial, ni vos choix de politique documentaire.</p>`;
    const groups = [...new Set(c.pistes.map(p => p.group))];
    for (const g of groups) {
      const ps = c.pistes.filter(p => p.group === g);
      h += `<h2 class="gh">${g}</h2><div class="pcards">`;
      for (const p of ps) {
        const open = state.open === p.id;
        h += `<article class="pcard ${p.tone}${open ? ' open' : ''}${p.rows.length ? '' : ' empty'}">
          <div class="pc-head">
            <span class="pc-n">${F.int(p.rows.length)}</span>
            <div><h3>${esc(p.title)}</h3><p>${esc(p.why)}</p></div>
          </div>
          <p class="pc-c">${esc(p.caution)}</p>
          ${p.rows.length ? `<button class="btn small" data-open="${p.id}" aria-expanded="${open}">${open ? 'Masquer la liste' : 'Voir la liste'}</button>` : '<p class="pc-c">Rien à signaler avec ces seuils.</p>'}
        </article>`;
        if (open) h += `<div class="plist">${listTable(p)}</div>`;
      }
      h += '</div>';
    }
    const box = $('#tab-review');
    box.innerHTML = h;
    box.querySelectorAll('select[data-opt]').forEach(s => s.addEventListener('change', () => { state.opts[s.dataset.opt] = +s.value; render(); }));
    box.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => {
      state.open = state.open === b.dataset.open ? null : b.dataset.open; state.shown = 100; renderReview(SF.computed());
      if (state.open) document.querySelector('.plist')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }));
    box.querySelector('[data-more]')?.addEventListener('click', () => { state.shown += 200; renderReview(SF.computed()); });
  }

  function listTable(p) {
    const rows = p.rows.slice(0, state.shown);
    const multi = fondsNames().length > 1 && state.fonds === ALL;
    let h = '<div class="tscroll"><table class="tl-list"><thead><tr>';
    if (p.kind === 'series') {
      h += `<th>Cote</th><th>Série</th>${multi ? '<th>Fonds</th>' : ''}<th>À faire</th><th>Détail</th></tr></thead><tbody>`;
      h += rows.map(r => `<tr class="${r.prio === 0 ? 'prio' : ''}"><td class="cote">${esc(r.serie.cote)}</td><td><strong>${esc(r.serie.nom)}</strong></td>${multi ? `<td>${esc(r.serie.fonds)}</td>` : ''}<td>${esc(r.motif)}</td><td class="muted">${esc(r.note)}</td></tr>`).join('');
    } else {
      h += `<th>Cote</th><th>Titre</th>${multi ? '<th>Fonds</th>' : ''}<th>Motif</th><th class="num">Prêts an</th><th class="num">Total</th><th>Statut</th></tr></thead><tbody>`;
      h += rows.map(r => {
        const it = r.it;
        return `<tr class="${r.prio === 0 || r.flag ? 'prio' : ''}"><td class="cote">${esc(it.cote)}</td>
          <td><strong>${esc(it.titre)}</strong>${it.serie ? `<br><small>${esc(it.serie)}${it.tome != null ? ' · t. ' + it.tome : ''}</small>` : ''}${it.auteur ? `<br><small class="muted">${esc(it.auteur.split(/[,;]/)[0])}</small>` : ''}</td>
          ${multi ? `<td>${esc(it.fonds)}</td>` : ''}
          <td>${esc(r.motif)}${r.note ? `<br><small class="${r.prio === 0 || r.flag ? 'warn' : 'muted'}">${esc(r.note)}</small>` : ''}</td>
          <td class="num">${it.pa ?? '–'}</td><td class="num">${it.pv ?? '–'}</td><td><small>${esc((it.statut || '').replace(/\s*\([A-Z]+\)$/, ''))}</small></td></tr>`;
      }).join('');
    }
    h += '</tbody></table></div>';
    if (p.rows.length > rows.length) h += `<p class="more"><button class="btn ghost small" data-more>Afficher plus (${F.int(p.rows.length - rows.length)} restants)</button> <span class="muted">La liste complète est dans l'export Excel.</span></p>`;
    return h;
  }

  // ---------- exports ----------
  function renderExport(c) {
    const nb = c.pistes.reduce((a, p) => a + p.rows.length, 0);
    $('#tab-export').innerHTML = `
      <p class="sub">Les exports reprennent le fonds sélectionné (<strong>${esc(c.label)}</strong>) et les seuils réglés dans « À examiner ».</p>
      <div class="exports">
        <article class="ex">
          <h3>Liste à examiner <span class="fmt">Excel</span></h3>
          <p>Un onglet par piste (${F.int(nb)} lignes), triées par cote pour le passage en rayon, avec une colonne <em>Décision</em> à choix (garder, retirer, remplacer…) et une colonne commentaire. Prête à imprimer en paysage.</p>
          <button class="btn" id="exXlsx">Télécharger le classeur</button>
        </article>
        <article class="ex">
          <h3>Synthèse pour la direction <span class="fmt">PowerPoint</span></h3>
          <p>Six diapositives au plus : chiffres clés, circulation, poids des fonds, âge des collections, pistes de gestion et leur volume. Graphiques modifiables.</p>
          <button class="btn" id="exPptx">Télécharger la synthèse</button>
        </article>
        <article class="ex">
          <h3>Demander un avis à une IA <span class="fmt">Texte</span></h3>
          <p>Copie un résumé chiffré et quelques titres « en sommeil » à coller dans l'assistant de votre choix. Rien n'est envoyé par l'outil : vous gardez la main sur ce que vous partagez.</p>
          <button class="btn ghost" id="exIA">Copier le résumé</button>
        </article>
      </div>`;
    $('#exXlsx').addEventListener('click', e => run(e.target, () => SF.exportXlsx(SF.computed())));
    $('#exPptx').addEventListener('click', e => run(e.target, () => SF.exportPptx(SF.computed())));
    $('#exIA').addEventListener('click', async () => {
      const txt = SF.promptIA(SF.computed());
      try { await navigator.clipboard.writeText(txt); toast('Résumé copié : collez-le dans votre assistant IA.'); }
      catch (_) { SF.download(new Blob([txt], { type: 'text/plain;charset=utf-8' }), 'resume-fonds.txt'); toast('Copie impossible : le résumé a été téléchargé en .txt'); }
    });
  }

  async function run(btn, fn) {
    const t = btn.textContent;
    btn.disabled = true; btn.textContent = 'Préparation…';
    try { await fn(); toast('Fichier prêt.'); }
    catch (e) { console.error(e); toast('Échec de l\'export : ' + (e.message || e)); }
    finally { btn.disabled = false; btn.textContent = t; }
  }

  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 3500);
  }

  // ---------- infobulles ----------
  let tip;
  function bindTips(root) {
    if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; document.body.appendChild(tip); }
    root.querySelectorAll('[data-tip]').forEach(el => {
      el.addEventListener('mouseenter', () => { tip.innerHTML = el.dataset.tip; tip.hidden = false; });
      el.addEventListener('mousemove', e => {
        const w = tip.offsetWidth, x = Math.min(e.clientX + 14, window.innerWidth - w - 8);
        tip.style.transform = `translate(${x}px, ${e.clientY + 16}px)`;
      });
      el.addEventListener('mouseleave', () => { tip.hidden = true; });
    });
  }
})(window.SF);
