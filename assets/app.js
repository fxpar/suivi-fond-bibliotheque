/* Interface : dépôt, vue d'ensemble, pistes, exports. */
'use strict';
(function (SF) {
  const F = SF.fmt;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ALL = '__tous__';

  const state = { items: [], sheets: [], files: [], ctx: null, fonds: ALL, opts: Object.assign({}, SF.DEFAULTS), tab: 'overview', open: null, shown: 100, hideDone: false, c: null };
  SF.state = state;

  // ---------- chargement ----------
  const input = $('#fileInput'), drop = $('#drop');
  input.addEventListener('change', () => input.files.length && load([...input.files]));
  ['dragenter', 'dragover'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', ev => ev.dataTransfer.files.length && load([...ev.dataTransfer.files]));
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files.length && !$('#results').hidden) load([...e.dataTransfer.files]); });
  /** Retour à l'écran de dépôt. Le fichier en cours reste en mémoire tant qu'on n'en dépose pas un autre. */
  function reset() {
    input.value = '';
    $('#results').hidden = true; $('#dropSection').hidden = false;
    $('#btnReset').hidden = true; $('#btnMenu').hidden = true;
    const bar = $('#backBar');
    if (state.items.length) {
      const names = state.files.length ? state.files.join(', ') : 'au fichier en cours';
      $('#backName').textContent = state.files.length ? `« ${names} »` : names;
      bar.hidden = false;
    } else bar.hidden = true;
    closeDrawer();
    window.scrollTo(0, 0);
  }
  function showResultsView() {
    $('#dropSection').hidden = true; $('#results').hidden = false; $('#backBar').hidden = true;
    $('#btnReset').hidden = false; $('#btnMenu').hidden = false;
    $('#loadError').hidden = true;
  }
  $('#btnBack').addEventListener('click', () => { showResultsView(); window.scrollTo(0, 0); });
  // Avant de changer de fichier : proposer de télécharger la sauvegarde
  SF.computedAll = () => { const f = state.fonds; state.fonds = ALL; try { return SF.computed(); } finally { state.fonds = f; } };
  async function askReset() {
    closeDrawer();
    const nd = SF.dec.count(), np = await SF.photos.count();
    if (!nd && !np) return reset();
    const dlg = $('#confirmNew');
    const parts = [nd && `${F.int(nd)} ${F.plural(nd, 'décision ou note', 'décisions ou notes')}`, np && `${F.int(np)} ${F.plural(np, 'photo')}`].filter(Boolean).join(' et ');
    $('#confirmText').innerHTML = `Vous avez <strong>${parts}</strong>. Elles restent gardées dans ce navigateur, sur cet appareil, mais seul un fichier téléchargé est une vraie sauvegarde.`;
    $('#confirmSave').textContent = np ? 'Télécharger la sauvegarde (ZIP) puis changer' : 'Télécharger le classeur puis changer';
    dlg.returnValue = '';
    dlg.showModal();
  }
  $('#confirmNew').addEventListener('close', async () => {
    const v = $('#confirmNew').returnValue;
    if (v === 'save') {
      try {
        const c = SF.computedAll();
        if (await SF.photos.count()) await SF.exportZip(c); else await SF.exportXlsx(c);
        toast('Sauvegarde téléchargée.');
      } catch (e) { console.error(e); toast('Échec de la sauvegarde : ' + (e.message || e)); return; }
      reset();
    } else if (v === 'nosave') reset();
  });
  $('#btnReset').addEventListener('click', askReset);
  $('#drawerReset').addEventListener('click', askReset);

  // ---------- thème jour / nuit ----------
  const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => (document.documentElement.getAttribute('data-theme') || (mqDark.matches ? 'dark' : 'light')) === 'dark';
  function paintTheme() {
    const d = isDark();
    document.documentElement.classList.toggle('is-dark', d);
    $('#btnTheme').setAttribute('aria-label', d ? 'Passer en mode clair' : 'Passer en mode sombre');
    $('#drawerTheme').textContent = d ? '☀ Mode clair' : '☾ Mode sombre';
  }
  function toggleTheme() {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('suivi-fonds-theme', next); } catch (_) { /* rien */ }
    paintTheme();
  }
  $('#btnTheme').addEventListener('click', toggleTheme);
  $('#drawerTheme').addEventListener('click', toggleTheme);
  mqDark.addEventListener?.('change', paintTheme);
  paintTheme();

  // ---------- menu latéral (mobile) ----------
  function openDrawer() { $('#drawer').hidden = false; $('#drawerBack').hidden = false; requestAnimationFrame(() => $('#drawer').classList.add('in')); }
  function closeDrawer() { $('#drawer').classList.remove('in'); $('#drawer').hidden = true; $('#drawerBack').hidden = true; }
  $('#btnMenu').addEventListener('click', openDrawer);
  $('#fondsBtn').addEventListener('click', openDrawer);
  $('#drawerClose').addEventListener('click', closeDrawer);
  $('#drawerBack').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#drawer').hidden) closeDrawer(); });

  async function load(files) {
    const err = $('#loadError'); err.hidden = true;
    drop.classList.add('busy');
    try {
      const items = [], sheets = [], decs = [];
      let nPh = 0;
      for (const f of files) {
        const r = await SF.readFile(f);
        items.push(...r.items); sheets.push(...r.sheets);
        if (r.decisions) decs.push(...r.decisions);
        nPh += r.photos || 0;
      }
      const nDec = decs.length ? SF.dec.merge(decs) : 0;
      const msg = [nDec && `${F.int(nDec)} ${F.plural(nDec, 'décision')} ${nDec > 1 ? 'reprises' : 'reprise'}`, nPh && `${F.int(nPh)} ${F.plural(nPh, 'photo')} ${nPh > 1 ? 'reprises' : 'reprise'}`].filter(Boolean).join(', ');
      if (!items.length) {
        if ((decs.length || nPh) && state.items.length) { render(); showResultsView(); toast(msg ? `${msg} depuis la sauvegarde.` : 'Rien de nouveau dans cette sauvegarde.'); return; }
        if (decs.length || nPh) throw new Error(`Sauvegarde lue (${msg || 'rien de nouveau'}). Déposez maintenant l'extraction du fonds pour les retrouver.`);
        throw new Error('Aucune ligne exploitable trouvée. Vérifiez que la feuille contient bien des en-têtes comme « Cote », « Titre », « Dernier emprunt », « Nb prêts année »…');
      }
      if (msg) setTimeout(() => toast(`${msg} depuis la sauvegarde.`), 300);
      // texte de recherche pré-calculé (titre, série, auteur)
      for (const it of items) it._s = SF.norm(`${it.titre} ${it.serie} ${it.tome ?? ""} ${it.auteur}`);
      Object.assign(state, { items, sheets, files: files.map(f => f.name), ctx: SF.context(items), fonds: ALL, open: null, allP: null });
      showResultsView();
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
    // repère : un seul fonds affiché alors que le fichier en compte plusieurs -> chiffres de l'ensemble
    const refAll = state.fonds !== ALL && fondsNames().length > 1 ? Object.assign(SF.stats(state.items, state.ctx), { name: 'Tous les fonds (repère)' }) : null;
    return { items, ov, pistes, constats: SF.constats(ov, state.ctx, pistes), ctx: state.ctx, label: SF.selLabel(), refAll };
  };
  /** Périmètre des exports : le fonds affiché, ou tous les fonds (choix de l'onglet Exporter) */
  const exportData = () => (state.exportAll && state.fonds !== ALL ? SF.computedAll() : SF.computed());

  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
    state.tab = b.dataset.tab;
    document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-selected', x === b));
    document.querySelectorAll('.panel').forEach(p => { p.hidden = p.id !== 'tab-' + state.tab; });
  }));

  function render() {
    state.allP = null;
    const c = SF.computed();
    renderContext();
    renderChips();
    renderOverview(c);
    renderReview(c);
    renderExport(exportData());
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
    const box = $('#fondsChips'), dbox = $('#drawerFonds');
    if (names.length < 2) { box.innerHTML = ''; dbox.innerHTML = '<p class="muted">Un seul fonds dans ce fichier.</p>'; box.parentElement.hidden = true; return; }
    box.parentElement.hidden = false;
    const count = n => state.items.filter(i => i.fonds === n).length;
    const opts = [[ALL, 'Tous les fonds', state.items.length], ...names.map(n => [n, n, count(n)])];
    box.innerHTML = opts.map(([v, l, n]) => `<button class="chip" role="tab" aria-selected="${state.fonds === v}" data-v="${esc(v)}">${esc(l)} <span>${F.int(n)}</span></button>`).join('');
    dbox.innerHTML = opts.map(([v, l, n]) => `<button class="dopt" type="button" aria-pressed="${state.fonds === v}" data-v="${esc(v)}"><span>${esc(l)}</span><small>${F.int(n)}</small></button>`).join('');
    const cur = opts.find(o => o[0] === state.fonds);
    $('#fondsBtn').innerHTML = `${esc(cur[1])} <span>${F.int(cur[2])}</span> <b aria-hidden="true">▾</b>`;
    const pick = v => { state.fonds = v; state.open = null; closeDrawer(); render(); };
    box.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => pick(b.dataset.v)));
    dbox.querySelectorAll('.dopt').forEach(b => b.addEventListener('click', () => pick(b.dataset.v)));
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
  const isDone = (p, r) => SF.dec.isDone(SF.decKey(p.id, r));
  const doneCount = p => p.rows.reduce((a, r) => a + (isDone(p, r) ? 1 : 0), 0);
  const doneLabel = p => { const n = doneCount(p); return n ? `${F.int(n)} ${F.plural(n, 'décidé')} sur ${F.int(p.rows.length)}` : ''; };

  function renderReview(c) {
    state.c = c;
    const o = state.opts;
    const sel = (id, label, vals, unit) => `<label>${label} <select data-opt="${id}">${vals.map(v => `<option value="${v}"${v === o[id] ? ' selected' : ''}>${v} ${unit}</option>`).join('')}</select></label>`;
    let h = `<div class="settings">
      <span class="settings-t">Seuils</span>
      ${sel('dormant', 'Sans prêt depuis', [12, 18, 24, 36], 'mois')}
      ${sel('usure', 'Usure au-delà de', [60, 80, 100, 120, 150], 'prêts')}
      ${sel('demande', 'Forte demande dès', [6, 8, 10, 12, 15], 'prêts/an')}
    </div>
    <p class="disclaimer">Ce sont des <strong>pistes à vérifier en rayon</strong>, pas des décisions. L'outil ne voit ni l'état des documents, ni leur intérêt patrimonial, ni vos choix de politique documentaire. Notez vos choix ligne par ligne : ils sont repris dans l'export Excel, qui sert de sauvegarde.</p>`;
    const groups = [...new Set(c.pistes.map(p => p.group))];
    for (const g of groups) {
      const ps = c.pistes.filter(p => p.group === g);
      h += `<h2 class="gh">${g}</h2><div class="pcards">`;
      for (const p of ps) {
        const open = state.open === p.id;
        const nd = doneCount(p);
        h += `<article class="pcard ${p.tone}${open ? ' open' : ''}${p.rows.length ? '' : ' empty'}">
          <div class="pc-head">
            <span class="pc-n">${F.int(p.rows.length)}</span>
            <div><h3>${esc(p.title)}</h3><p>${esc(p.why)}</p></div>
          </div>
          <p class="pc-c">${esc(p.caution)}</p>
          ${p.rows.length ? `<div class="prog" data-prog="${p.id}"${nd ? '' : ' hidden'}><span style="width:${(nd / p.rows.length) * 100}%"></span></div><p class="pc-done" data-done="${p.id}">${doneLabel(p)}</p>` : ''}
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
    box.querySelector('[data-hide]')?.addEventListener('change', e => { state.hideDone = e.target.checked; renderReview(SF.computed()); });
  }

  // Un seul écouteur pour tous les boutons de décision (la liste est redessinée souvent)
  // (listes et fiche partagent les mêmes boutons et les mêmes clés)
  document.addEventListener('click', e => {
    const b = e.target.closest('.dec button');
    if (!b) return;
    const wrap = b.parentElement, k = wrap.dataset.k, ch = b.dataset.d;
    const cur = SF.dec.get(k);
    const off = !!cur && cur.d === ch;
    SF.dec.set(k, off ? null : ch);
    wrap.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(!off && x === b)));
    const tr = wrap.closest('tr');
    if (tr) { tr.classList.toggle('done', !off); tr.querySelector('.dmeta')?.remove(); }
    if (wrap.closest('#fiche')) { state.ficheDirty = true; navigator.vibrate?.(20); }
    const p = state.c && state.c.pistes.find(x => x.id === wrap.dataset.p);
    if (p) {
      const nd = doneCount(p);
      const lab = document.querySelector(`[data-done="${p.id}"]`); if (lab) lab.textContent = doneLabel(p);
      const prog = document.querySelector(`[data-prog="${p.id}"]`); if (prog) { prog.hidden = !nd; prog.firstElementChild.style.width = (nd / p.rows.length) * 100 + '%'; }
      const top = document.querySelector('[data-donetop]'); if (top) top.textContent = doneLabel(p) || 'Aucune ligne décidée';
    }
    renderExport(exportData());
  });

  function decCell(p, r) {
    return `<td class="dcell">${decGroup(p.id, SF.decKey(p.id, r))}</td>`;
  }

  function decGroup(pid, k, noCom) {
    const cur = SF.dec.get(k);
    const choices = SF.CHOICES[pid];
    const other = cur && cur.d && !choices.includes(cur.d) ? `${esc(cur.d)} · ` : '';
    const meta = cur && (cur.d || (cur.com && !noCom)) ? `<small class="dmeta">${other}le ${esc(cur.date.split('-').reverse().join('/'))}${cur.com && !noCom ? ' · ' + esc(cur.com) : ''}</small>` : '';
    return `<div class="dec" data-k="${esc(k)}" data-p="${pid}" role="group" aria-label="Décision">${choices.map(ch => `<button type="button" data-d="${esc(ch)}" aria-pressed="${!!cur && cur.d === ch}">${esc(ch)}</button>`).join('')}</div>${meta}`;
  }

  function listTable(p) {
    const visible = state.hideDone ? p.rows.filter(r => !isDone(p, r)) : p.rows;
    const rows = visible.slice(0, state.shown);
    const multi = fondsNames().length > 1 && state.fonds === ALL;
    let h = `<div class="ltools"><label><input type="checkbox" data-hide${state.hideDone ? ' checked' : ''}> Masquer les lignes déjà décidées</label><span class="muted" data-donetop>${doneLabel(p) || 'Aucune ligne décidée'}</span></div>`;
    h += '<div class="tscroll"><table class="tl-list"><thead><tr>';
    if (p.kind === 'series') {
      h += `<th>Cote</th><th>Série</th>${multi ? '<th>Fonds</th>' : ''}<th>À faire</th><th>Détail</th><th>Décision</th></tr></thead><tbody>`;
      h += rows.map(r => `<tr class="${r.prio === 0 ? 'prio' : ''}${isDone(p, r) ? ' done' : ''}"><td class="cote" data-l="Cote">${esc(r.serie.cote)}</td><td class="ttl"><strong>${esc(r.serie.nom)}</strong></td>${multi ? `<td data-l="Fonds">${esc(r.serie.fonds)}</td>` : ''}<td data-l="À faire">${esc(r.motif)}</td><td class="muted" data-l="Détail">${esc(r.note)}</td>${decCell(p, r)}</tr>`).join('');
    } else {
      h += `<th>Cote</th><th>Titre</th>${multi ? '<th>Fonds</th>' : ''}<th>Motif</th><th class="num">Prêts an</th><th class="num">Total</th><th>Statut</th><th>Décision</th></tr></thead><tbody>`;
      h += rows.map(r => {
        const it = r.it;
        return `<tr class="${r.prio === 0 || r.flag ? 'prio' : ''}${isDone(p, r) ? ' done' : ''}"><td class="cote" data-l="Cote">${esc(it.cote)}</td>
          <td class="ttl"><strong>${esc(it.titre)}</strong>${it.serie ? `<br><small>${esc(it.serie)}${it.tome != null ? ' · t. ' + it.tome : ''}</small>` : ''}${it.auteur ? `<br><small class="muted">${esc(it.auteur.split(/[,;]/)[0])}</small>` : ''}</td>
          ${multi ? `<td data-l="Fonds">${esc(it.fonds)}</td>` : ''}
          <td data-l="Motif">${esc(r.motif)}${r.note ? `<br><small class="${r.prio === 0 || r.flag ? 'warn' : 'muted'}">${esc(r.note)}</small>` : ''}</td>
          <td class="num" data-l="Prêts an">${it.pa ?? '–'}</td><td class="num" data-l="Total">${it.pv ?? '–'}</td><td data-l="Statut"><small>${esc((it.statut || '').replace(/\s*\([A-Z]+\)$/, ''))}</small></td>${decCell(p, r)}</tr>`;
      }).join('');
    }
    h += '</tbody></table></div>';
    if (visible.length > rows.length) h += `<p class="more"><button class="btn ghost small" data-more>Afficher plus (${F.int(visible.length - rows.length)} restants)</button> <span class="muted">La liste complète est dans l'export Excel.</span></p>`;
    return h;
  }

  // ---------- exports ----------
  function renderExport(c) {
    const nb = c.pistes.reduce((a, p) => a + p.rows.length, 0);
    const nd = c.pistes.reduce((a, p) => a + doneCount(p), 0);
    const total = SF.dec.count();
    $('#tab-export').innerHTML = `
      ${state.fonds !== ALL && fondsNames().length > 1
        ? `<div class="scope" role="radiogroup" aria-label="Fonds exportés"><span>Exporter :</span>
            <label><input type="radio" name="scope" value="sel"${state.exportAll ? '' : ' checked'}> le fonds affiché, <strong>${esc(state.fonds)}</strong></label>
            <label><input type="radio" name="scope" value="all"${state.exportAll ? ' checked' : ''}> <strong>tous les fonds</strong></label></div>
           <p class="sub">Les seuils réglés dans « À examiner » s'appliquent. Pour un seul fonds, la synthèse ajoute une barre « Tous les fonds » en repère.</p>`
        : `<p class="sub">Les exports reprennent <strong>${esc(c.label)}</strong> et les seuils réglés dans « À examiner ».</p>`}
      <div class="exports">
        <article class="ex">
          <h3>Liste à examiner <span class="fmt">Excel</span></h3>
          <p>Un onglet par piste (${F.int(nb)} lignes), triées par cote pour le passage en rayon, avec une colonne <em>Décision</em> à choix et une colonne commentaire.${nd ? ` <strong>Vos ${F.int(nd)} ${F.plural(nd, 'décision')} y ${nd > 1 ? 'sont reprises' : 'est reprise'}.</strong>` : ''}</p>
          <button class="btn" id="exXlsx">Télécharger le classeur</button>
        </article>
        <article class="ex">
          <h3>Synthèse pour la direction <span class="fmt">PowerPoint</span> <span class="fmt">PDF</span></h3>
          <p>Six pages au plus : chiffres clés, circulation, poids des fonds, âge des collections, pistes de gestion et leur volume. Le PowerPoint garde des graphiques modifiables ; le PDF se transmet tel quel.</p>
          <div class="btnrow"><button class="btn" id="exPptx">PowerPoint</button><button class="btn" id="exPdf">PDF</button></div>
        </article>
        <article class="ex">
          <h3>Demander un avis à une IA <span class="fmt">Texte</span></h3>
          <p>Copie un résumé chiffré et quelques titres « en sommeil » à coller dans l'assistant de votre choix. Rien n'est envoyé par l'outil : vous gardez la main sur ce que vous partagez.</p>
          <button class="btn ghost" id="exIA">Copier le résumé</button>
        </article>
      </div>
      <div class="card savebox">
        <h3>Sauvegarder votre travail</h3>
        <p><strong>${F.int(total)} ${F.plural(total, 'décision ou note', 'décisions ou notes')}</strong> et <strong><span id="phCount">…</span></strong> sont gardées dans ce navigateur, sur cet appareil seulement : c'est un filet de sécurité, pas une sauvegarde (vider le cache les efface).</p>
        <ol>
          <li><strong>Téléchargez la sauvegarde complète</strong> : un ZIP avec le classeur Excel et un dossier « photos ». Une fois décompressé, l'onglet « Notes de rayon » du classeur ouvre chaque photo d'un clic. Les photos sont nommées <em>cote - titre - code-barres - date - n°</em>.</li>
          <li><strong>Redéposez le ZIP (ou le classeur seul)</strong> plus tard, avec ou sans nouvelle extraction : décisions et photos reviennent, et les titres déjà examinés apparaissent comme tels.</li>
        </ol>
        <div class="btnrow"><button class="btn" id="exZip">Sauvegarde complète (ZIP)</button>${total ? '<button class="btn ghost small" id="decClear">Tout effacer de ce navigateur</button>' : '<button class="btn ghost small" id="decClear" hidden>Tout effacer de ce navigateur</button>'}</div>
      </div>`;
    SF.photos.count().then(n => {
      const el = $('#phCount'); if (el) el.textContent = `${F.int(n)} ${F.plural(n, 'photo')}`;
      if (n) $('#decClear').hidden = false;
    });
    $('#exZip').addEventListener('click', e => run(e.target, () => SF.exportZip(exportData())));
    document.querySelectorAll('#tab-export input[name=scope]').forEach(r => r.addEventListener('change', () => {
      state.exportAll = r.value === 'all' && r.checked;
      renderExport(exportData());
    }));
    $('#decClear')?.addEventListener('click', async () => {
      if (!confirm('Effacer toutes les décisions, notes et photos gardées dans ce navigateur ? Ce qui a déjà été téléchargé (classeur, ZIP) n\'est pas touché.')) return;
      SF.dec.clear(); await SF.photos.clear(); render(); toast('Décisions et photos effacées de ce navigateur.');
    });
    $('#exXlsx').addEventListener('click', e => run(e.target, () => SF.exportXlsx(exportData())));
    $('#exPptx').addEventListener('click', e => run(e.target, () => SF.exportPptx(exportData())));
    $('#exPdf').addEventListener('click', e => run(e.target, () => SF.exportPdf(exportData())));
    $('#exIA').addEventListener('click', async () => {
      const txt = SF.promptIA(exportData());
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

  // ---------- recherche d'un exemplaire ----------
  const qIn = $('#q'), sres = $('#sresults');
  const cmpFr = (a, b) => String(a || '').localeCompare(String(b || ''), 'fr', { numeric: true });
  const allPistes = () => (state.allP = state.allP || SF.pistes(state.items, state.ctx, state.opts));

  function search(q) {
    const n = SF.norm(q);
    if (n.length < 2) return [];
    const dg = q.replace(/\D/g, ''), compact = n.replace(/ /g, ''), toks = n.split(' ');
    const out = [];
    for (const it of state.items) {
      let score = 0;
      if (dg.length >= 4 && it.cb) score = it.cb === dg ? 100 : it.cb.includes(dg) ? 60 : 0;
      if (!score && compact.length >= 3 && SF.norm(it.cote).replace(/ /g, '').includes(compact)) score = 40;
      if (!score && toks.every(t => it._s.includes(t))) score = it._s.startsWith(n) ? 30 : 20;
      if (score) out.push([score, it]);
    }
    out.sort((a, b) => b[0] - a[0] || cmpFr(a[1].cote, b[1].cote) || cmpFr(a[1].titre, b[1].titre));
    return out.map(x => x[1]);
  }

  function showResults(q) {
    if (!q.trim()) { sres.hidden = true; return; }
    const list = search(q);
    state.results = list;
    if (!list.length) { sres.innerHTML = '<p class="sempty">Aucun exemplaire trouvé.</p>'; sres.hidden = false; return; }
    sres.innerHTML = list.slice(0, 30).map((it, i) => {
      const noted = SF.dec.get(SF.decKey('rayon', { it }));
      return `<button type="button" class="sitem" role="option" data-i="${i}"><span class="cote">${esc(it.cote)}</span><span class="st"><strong>${esc(it.titre)}</strong><small>${it.serie ? esc(it.serie) + (it.tome != null ? ' · t. ' + it.tome : '') + ' · ' : ''}${esc(it.fonds)}${it.cb ? ' · ' + esc(it.cb) : ''}</small></span>${noted ? '<span class="sdot" title="Constat noté"></span>' : ''}</button>`;
    }).join('') + (list.length > 30 ? `<p class="sempty">${F.int(list.length - 30)} autres résultats : précisez la recherche.</p>` : '');
    sres.hidden = false;
  }
  let qT;
  qIn.addEventListener('input', () => { clearTimeout(qT); qT = setTimeout(() => showResults(qIn.value), 120); });
  qIn.addEventListener('focus', () => { if (qIn.value.trim()) showResults(qIn.value); });
  qIn.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); showResults(qIn.value); if (state.results && state.results.length === 1) openFiche(state.results[0]); }
    if (e.key === 'Escape') { qIn.value = ''; sres.hidden = true; }
  });
  sres.addEventListener('click', e => { const b = e.target.closest('.sitem'); if (b) openFiche(state.results[+b.dataset.i]); });
  document.addEventListener('click', e => { if (!e.target.closest('.search')) sres.hidden = true; });

  /** Utilisé par le scanner : ouvre la fiche si le code désigne un seul exemplaire */
  SF.findCode = function (code) {
    const digits = String(code).replace(/\D/g, '');
    qIn.value = digits.length >= 6 ? digits : String(code).trim();
    showResults(qIn.value);
    const exact = state.items.filter(it => it.cb && it.cb === digits);
    if (exact.length === 1) { sres.hidden = true; openFiche(exact[0]); return true; }
    if (state.results && state.results.length === 1) { sres.hidden = true; openFiche(state.results[0]); return true; }
    const isbn = /^97[89]\d{10}$/.test(digits);
    toast(state.results && state.results.length ? `${state.results.length} exemplaires correspondent : choisissez dans la liste.`
      : isbn ? `${digits} est l'ISBN du livre (code de l'éditeur), absent de l'extraction. Scannez plutôt l'étiquette de l'exemplaire.`
        : `Code ${qIn.value} introuvable dans cette extraction.`);
    qIn.focus();
    return false;
  };

  // ---------- fiche d'un exemplaire ----------
  const fiche = $('#fiche');
  function openFiche(it) {
    if (!it) return;
    sres.hidden = true;
    state.ficheDirty = false;
    const secs = [];
    for (const p of allPistes()) {
      const r = p.kind === 'series' ? p.rows.find(x => x.serie.items.includes(it)) : p.rows.find(x => x.it === it);
      if (r) secs.push({ p, r, k: SF.decKey(p.id, r) });
    }
    const rk = SF.decKey('rayon', { it }), rc = SF.dec.get(rk);
    const fact = (l, v) => (v == null || v === '' ? '' : `<div><dt>${l}</dt><dd>${esc(v)}</dd></div>`);
    $('#ficheBody').innerHTML = `
      <div class="f-head">
        <div><p class="f-cote">${esc(it.cote)} · ${esc(it.fonds)}</p><h2>${esc(it.titre)}</h2>
        <p class="muted">${it.serie ? esc(it.serie) + (it.tome != null ? ' · t. ' + it.tome : '') : ''}${it.serie && it.auteur ? ' — ' : ''}${esc((it.auteur || '').split(/[,;]/)[0])}</p></div>
        <button class="iconbtn f-close" type="button" aria-label="Fermer la fiche">✕</button>
      </div>
      <dl class="facts">
        ${fact('Code-barres', it.cb)}${fact('Statut', (it.statut || '').replace(/\s*\([A-Z]+\)$/, ''))}${fact('Dernier prêt', it.dernier ? F.date(it.dernier) : 'aucun connu')}
        ${fact('Prêts de l\'année', it.pa)}${fact('Prêts au total', it.pv)}${fact('Publication', it.pub)}${fact('Entrée', it.crea ? F.date(it.crea) : '')}
      </dl>
      ${secs.length ? '<h3 class="f-h">Repéré dans les listes</h3>' + secs.map(s => `<section class="f-sec ${s.p.tone}"><p><strong>${esc(s.p.group)}</strong> ${esc(s.p.title)}<br><span>${esc(s.r.motif)}</span>${s.r.note ? `<br><small class="muted">${esc(s.r.note)}</small>` : ''}</p>${decGroup(s.p.id, s.k)}</section>`).join('')
        : '<p class="muted f-none">Cet exemplaire n\'apparaît dans aucune liste avec les seuils actuels.</p>'}
      <h3 class="f-h">Constat en rayon</h3>
      ${decGroup('rayon', rk, true)}
      <label class="f-note">Note libre <textarea data-k="${esc(rk)}" rows="3" placeholder="Ex. : dos décollé, pages tachées, à montrer à l'équipe…">${esc(rc ? rc.com : '')}</textarea></label>
      <div class="f-photos">
        <div class="thumbs" id="thumbs"></div>
        <label class="btn ghost small addphoto">
          <input type="file" accept="image/*" capture="environment" multiple hidden id="photoIn">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>
          Ajouter une photo
        </label>
      </div>
      <p class="f-save muted">Enregistré au fur et à mesure. Notes dans l'export Excel (onglet « Notes de rayon ») ; photos dans la sauvegarde ZIP.</p>`;
    paintThumbs(rk);
    $('#photoIn').addEventListener('change', async e => {
      const files = [...e.target.files];
      e.target.value = '';
      if (!files.length) return;
      toast(files.length > 1 ? 'Enregistrement des photos…' : 'Enregistrement de la photo…');
      for (const f of files) { try { await SF.photos.add(rk, f); } catch (err) { console.error(err); toast('Photo illisible : ' + f.name); } }
      if (!SF.photos.persistent) toast('Attention : ce navigateur ne garde pas les photos après fermeture. Téléchargez la sauvegarde ZIP.');
      state.ficheDirty = true;
      paintThumbs(rk);
    });
    fiche.querySelector('.f-close').addEventListener('click', () => fiche.close());
    let t;
    fiche.querySelector('textarea').addEventListener('input', e => {
      clearTimeout(t);
      t = setTimeout(() => { SF.dec.setCom(e.target.dataset.k, e.target.value); state.ficheDirty = true; }, 300);
    });
    if (!fiche.open) fiche.showModal();
    fiche.scrollTop = 0;
  }
  SF.openFiche = openFiche;

  // vignettes : URL temporaires libérées à chaque rafraîchissement
  let thumbUrls = [];
  async function paintThumbs(k) {
    const box = $('#thumbs');
    if (!box) return;
    thumbUrls.forEach(u => URL.revokeObjectURL(u)); thumbUrls = [];
    const list = (await SF.photos.list(k)).sort((a, b) => a.id - b.id);
    box.innerHTML = list.map(r => {
      const u = URL.createObjectURL(r.blob); thumbUrls.push(u);
      return `<figure class="thumb"><a href="${u}" target="_blank" rel="noopener" title="Agrandir"><img src="${u}" alt="Photo du ${esc(r.date.split('-').reverse().join('/'))}"></a><button type="button" class="tdel" data-id="${r.id}" aria-label="Supprimer la photo">✕</button></figure>`;
    }).join('');
    box.querySelectorAll('.tdel').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Supprimer cette photo ?')) return;
      await SF.photos.remove(+b.dataset.id); state.ficheDirty = true; paintThumbs(k);
    }));
  }
  fiche.addEventListener('click', e => { if (e.target === fiche) fiche.close(); }); // clic sur le fond
  fiche.addEventListener('close', () => {
    const ta = fiche.querySelector('textarea');
    if (ta) { // dernière frappe, si elle n'a pas encore été enregistrée
      const cur = SF.dec.get(ta.dataset.k);
      if ((cur ? cur.com : '') !== ta.value.trim()) { SF.dec.setCom(ta.dataset.k, ta.value); state.ficheDirty = true; }
    }
    if (state.ficheDirty) { const y = window.scrollY; render(); window.scrollTo(0, y); }
  });
  SF.toast = msg => toast(msg);

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
