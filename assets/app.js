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
  $('#btnReset').addEventListener('click', () => {
    Object.assign(state, { items: [], sheets: [], files: [], ctx: null, fonds: ALL, open: null });
    input.value = '';
    $('#results').hidden = true; $('#dropSection').hidden = false; $('#topActions').hidden = true;
  });

  async function load(files) {
    const err = $('#loadError'); err.hidden = true;
    drop.classList.add('busy');
    try {
      const items = [], sheets = [], decs = [];
      for (const f of files) {
        const r = await SF.readFile(f);
        items.push(...r.items); sheets.push(...r.sheets);
        if (r.decisions) decs.push(...r.decisions);
      }
      const nDec = decs.length ? SF.dec.merge(decs) : 0;
      if (!items.length) {
        if (decs.length && state.items.length) { render(); toast(`${F.int(nDec)} ${F.plural(nDec, 'décision')} ${nDec > 1 ? 'reprises' : 'reprise'} depuis le classeur annoté.`); return; }
        if (decs.length) throw new Error(`Classeur de décisions lu (${F.int(nDec)} ${F.plural(nDec, 'décision')} ${nDec > 1 ? 'reprises' : 'reprise'}). Déposez maintenant l'extraction du fonds pour les retrouver dans les listes.`);
        throw new Error('Aucune ligne exploitable trouvée. Vérifiez que la feuille contient bien des en-têtes comme « Cote », « Titre », « Dernier emprunt », « Nb prêts année »…');
      }
      if (nDec) setTimeout(() => toast(`${F.int(nDec)} ${F.plural(nDec, 'décision')} ${nDec > 1 ? 'reprises' : 'reprise'} depuis le classeur annoté.`), 300);
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
  const isDone = (p, r) => !!SF.dec.get(SF.decKey(p.id, r));
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
  $('#tab-review').addEventListener('click', e => {
    const b = e.target.closest('.dec button');
    if (!b) return;
    const wrap = b.parentElement, k = wrap.dataset.k, ch = b.dataset.d;
    const cur = SF.dec.get(k);
    const off = !!cur && cur.d === ch;
    SF.dec.set(k, off ? null : ch);
    wrap.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(!off && x === b)));
    const tr = wrap.closest('tr');
    tr.classList.toggle('done', !off);
    tr.querySelector('.dmeta')?.remove();
    const p = state.c && state.c.pistes.find(x => x.id === wrap.dataset.p);
    if (p) {
      const nd = doneCount(p);
      const lab = document.querySelector(`[data-done="${p.id}"]`); if (lab) lab.textContent = doneLabel(p);
      const prog = document.querySelector(`[data-prog="${p.id}"]`); if (prog) { prog.hidden = !nd; prog.firstElementChild.style.width = (nd / p.rows.length) * 100 + '%'; }
      const top = document.querySelector('[data-donetop]'); if (top) top.textContent = doneLabel(p) || 'Aucune ligne décidée';
    }
    renderExport(state.c);
  });

  function decCell(p, r) {
    const k = SF.decKey(p.id, r), cur = SF.dec.get(k);
    const choices = SF.CHOICES[p.id];
    const other = cur && !choices.includes(cur.d) ? `${esc(cur.d)} · ` : '';
    return `<td class="dcell"><div class="dec" data-k="${esc(k)}" data-p="${p.id}" role="group" aria-label="Décision">${choices.map(ch => `<button type="button" data-d="${esc(ch)}" aria-pressed="${!!cur && cur.d === ch}">${esc(ch)}</button>`).join('')}</div>${cur ? `<small class="dmeta">${other}le ${esc(cur.date.split('-').reverse().join('/'))}${cur.com ? ' · ' + esc(cur.com) : ''}</small>` : ''}</td>`;
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
      <p class="sub">Les exports reprennent le fonds sélectionné (<strong>${esc(c.label)}</strong>) et les seuils réglés dans « À examiner ».</p>
      <div class="exports">
        <article class="ex">
          <h3>Liste à examiner <span class="fmt">Excel</span></h3>
          <p>Un onglet par piste (${F.int(nb)} lignes), triées par cote pour le passage en rayon, avec une colonne <em>Décision</em> à choix et une colonne commentaire.${nd ? ` <strong>Vos ${F.int(nd)} ${F.plural(nd, 'décision')} y ${nd > 1 ? 'sont reprises' : 'est reprise'}.</strong>` : ''}</p>
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
      </div>
      <div class="card savebox">
        <h3>Garder vos décisions</h3>
        <p><strong>${F.int(total)} ${F.plural(total, 'décision')}</strong> ${total > 1 ? 'sont gardées' : 'est gardée'} dans ce navigateur, sur cet appareil seulement : c'est un filet de sécurité, pas une sauvegarde (vider le cache les efface).</p>
        <ol>
          <li><strong>Téléchargez le classeur Excel</strong> : il contient vos décisions et se partage avec l'équipe. On peut aussi les compléter directement dans Excel.</li>
          <li><strong>Redéposez-le ici</strong> plus tard, seul ou avec une nouvelle extraction : les décisions reviennent, et les titres déjà examinés apparaissent comme tels au lieu de revenir comme neufs.</li>
        </ol>
        ${total ? '<button class="btn ghost small" id="decClear">Effacer les décisions de ce navigateur</button>' : ''}
      </div>`;
    $('#decClear')?.addEventListener('click', () => {
      if (!confirm('Effacer toutes les décisions gardées dans ce navigateur ? Celles déjà enregistrées dans un classeur Excel ne sont pas touchées.')) return;
      SF.dec.clear(); render(); toast('Décisions effacées de ce navigateur.');
    });
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
