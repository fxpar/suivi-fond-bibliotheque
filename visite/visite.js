/*!
 * Visite guidée de Suivi de fonds, jouée par le moteur MicroLearn (copié tel quel dans ce dossier).
 * Ce fichier ajoute deux formats propres à la visite et lance le diaporama à partir de visite.md :
 *   format-prenom : le guide demande le prénom ; il remplace ensuite les {prenom} du texte
 *   format-sms    : dialogue façon messagerie, les répliques arrivent seules (durée selon le nombre de mots)
 */
(function () {
  'use strict';
  var KEY = 'suivi-fonds-prenom';
  var esc = MLS.util.escapeHtml;

  /* ------------------------------------------------ textes de l'interface (tutoiement)
     Le lecteur MicroLearn vouvoie et parle de « module » : ici, c'est une visite entre collègues. */
  MLS.i18n.add('fr', {
    'p.moduleEyebrow': 'Visite guidée',
    'p.slidesCount': '{n} étapes',
    'p.slide': 'Étape {n}',
    'p.slideOf': 'Étape {n} sur {total}',
    'p.chooseCast': 'Choisis tes guides',
    'p.chooseCastHint': 'Ils t’accompagnent tout au long de la visite. Tu pourras les changer à tout moment avec le bouton <i class="bi bi-people"></i>.',
    'p.castAudio': 'Guides et lecture audio',
    'p.start': 'Commencer la visite',
    'p.restart': 'Recommencer',
    'p.resume': 'Reprendre (étape {n})',
    'p.endTitle': 'Visite terminée !',
    'p.endPerfect': 'Parfait, toutes tes réponses sont justes.',
    'p.endGood': 'Bien joué ! Tu peux revoir les points manqués.',
    'p.endLow': 'Tu peux revoir la visite pour consolider tout ça.',
    'p.endThanks': 'Merci d’avoir suivi la visite. À toi de jouer !',
    'p.review': 'Revoir la visite',
    'p.upNext': 'Et maintenant ?',
    'p.goNext': 'Ouvrir l’outil',
    'p.nextNoLink': 'Ouvre l’outil depuis sa page d’accueil.',
    'p.backToLms': 'Ouvre l’outil depuis sa page d’accueil.',
    'dg.hint': 'Clique sur chaque partie pour la découvrir.',
    'dg.hintPuzzle': 'Reconstitue le puzzle : clique sur chaque pièce pour la mettre en place.',
    'a.hint': 'Pour écouter les textes un peu longs plutôt que de les lire. Cet outil de confort ne remplace pas ton lecteur d’écran et n’interfère pas avec lui.',
    'a.hint.click': 'Une icône <i class="bi bi-volume-up-fill"></i> apparaît à côté des textes longs : touche-la pour les écouter.',
    'a.hint.interact': 'Icônes, et lecture quand tu ouvres un élément : carte, étape, onglet, réplique, correction de quiz…',
    'a.hint.auto': 'Les textes longs et les dialogues sont lus dès l’affichage de chaque étape, ainsi que les éléments que tu ouvres.',
    'a.mode.interact': 'Quand j’ouvre un élément',
    'a.groupMine': 'Langue de la visite',
    'a.testNarrator': 'Bonjour ! Voici la voix qui lira les textes de cette visite.',
    'a.testRole': 'Salut, je suis {name}, {label}.'
  });
  // Consignes des formats intégrés, au tutoiement
  (function () {
    var f = MLS.formats.builtin('format-flashcards');
    if (f && f.i18n && f.i18n.fr) { f.i18n.fr.hint = 'Touche une carte pour la retourner'; MLS.formats.register(f); }
  })();

  function getName() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function setName(n) { try { localStorage.setItem(KEY, n); } catch (e) { /* navigation privée */ } }

  /** Remplit toutes les marques {prenom}, {, prenom}… (sans prénom, la marque disparaît avec sa ponctuation) */
  function applyName(name) {
    document.querySelectorAll('.sf-prenom').forEach(function (s) {
      s.textContent = name ? (s.getAttribute('data-pre') || '') + name + (s.getAttribute('data-post') || '') : '';
    });
  }
  window.SFV = { applyName: applyName, getName: getName, setName: setName };

  /* ------------------------------------------------------------- format-prenom */
  MLS.formats.register({
    id: 'format-prenom',
    name: 'Demande du prénom',
    icon: 'bi-person-vcard',
    category: 'Personnages',
    description: 'Le personnage pose une question (citation « > ») et l’apprenant tape son prénom, réutilisé dans le texte grâce à {prenom}.',
    i18n: { fr: { label: 'Ton prénom', ok: 'C’est parti', hint: 'Facultatif. Il reste dans ton navigateur, rien n’est envoyé.', skip: 'Continuer sans prénom', hello: 'Ravi de te rencontrer' } },
    template: '<div class="pn">' +
      '{{#title}}<h2 class="mls-title">{{{titleHtml}}}</h2>{{/title}}' +
      '{{#lines}}<div class="pn-row">{{#character}}<div class="pn-who">{{{avatar}}}<span class="pn-name">{{{nameTag}}}</span></div>{{/character}}' +
      '<div class="pn-bubble" data-mls-speak="always" data-mls-speak-role="{{role}}">{{{html}}}</div></div>{{/lines}}' +
      '<form class="pn-form" novalidate><label class="pn-label">{{t.label}}' +
      '<span class="pn-field"><input class="pn-in" type="text" autocomplete="given-name" maxlength="40" enterkeyhint="go">' +
      '<button class="mls-btn" type="submit"><i class="bi bi-arrow-right"></i> {{t.ok}}</button></span></label>' +
      '<p class="pn-hint">{{t.hint}}</p><button type="button" class="pn-skip">{{t.skip}}</button></form></div>',
    css: ':scope .pn { max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.4rem; }\n' +
      ':scope .pn-row { display: flex; gap: 1rem; align-items: flex-end; }\n' +
      ':scope .pn-who { display: flex; flex-direction: column; align-items: center; gap: .3rem; flex: none; width: 120px; }\n' +
      ':scope .pn-who .mls-avatar { width: 112px; height: 112px; }\n' +
      ':scope .pn-name { font-weight: 700; font-size: .85rem; }\n' +
      ':scope .pn-bubble { background: var(--mls-surface); border-radius: 22px; border-bottom-left-radius: 6px; padding: 1rem 1.25rem; box-shadow: var(--mls-shadow); font-size: clamp(1.05rem, 2cqw, 1.3rem); line-height: 1.5; }\n' +
      ':scope .pn-bubble p:last-child { margin: 0; }\n' +
      ':scope .pn-label { display: flex; flex-direction: column; gap: .5rem; font-weight: 700; width: 100%; }\n' +
      ':scope .pn-field { display: flex; gap: .5rem; flex-wrap: wrap; }\n' +
      ':scope .pn-in { flex: 1 1 200px; min-width: 0; font: inherit; font-size: 1.15rem; padding: .7rem 1rem; border-radius: 14px; border: 2px solid var(--mls-border, #d6d8e3); background: var(--mls-surface); color: inherit; }\n' +
      ':scope .pn-in:focus { outline: none; border-color: var(--mls-primary); }\n' +
      ':scope .pn-hint { margin: .2rem 0 0; font-size: .85rem; opacity: .75; }\n' +
      ':scope .pn-skip { align-self: flex-start; background: none; border: 0; padding: 0; color: inherit; opacity: .75; text-decoration: underline; cursor: pointer; font-size: .9rem; }\n' +
      ':scope .pn-form { display: flex; flex-direction: column; gap: .4rem; }\n' +
      '@container slide (max-width: 640px) { :scope .pn-who { width: 70px; } :scope .pn-who .mls-avatar { width: 64px; height: 64px; } }',
    js: 'var form = root.querySelector(".pn-form"), input = root.querySelector(".pn-in");\n' +
      'input.value = window.SFV.getName();\n' +
      'function go(name) {\n' +
      '  name = String(name || "").trim().replace(/\\s+/g, " ").slice(0, 40);\n' +
      '  if (name) name = name.charAt(0).toUpperCase() + name.slice(1);\n' +
      '  window.SFV.setName(name); window.SFV.applyName(name);\n' +
      '  if (name) ctx.announce(ctx.t("hello") + ", " + name + " !");\n' +
      '  ctx.next();\n' +
      '}\n' +
      'form.addEventListener("submit", function (e) { e.preventDefault(); go(input.value); });\n' +
      'root.querySelector(".pn-skip").addEventListener("click", function () { go(""); });'
  });

  /* ---------------------------------------------------------------- format-sms */
  MLS.formats.register({
    id: 'format-sms',
    name: 'Dialogue façon SMS',
    icon: 'bi-chat-dots',
    category: 'Personnages',
    description: 'Comme le dialogue, mais façon messagerie : les répliques « > » arrivent seules, avec un délai qui dépend du nombre de mots. Pause et « Tout afficher » disponibles.',
    i18n: { fr: { pause: 'Pause', resume: 'Reprendre', all: 'Tout afficher', typing: 'écrit…' } },
    template: '<div class="sms">' +
      '{{#title}}<h2 class="mls-title">{{{titleHtml}}}</h2>{{/title}}' +
      '{{#hasText}}<div class="mls-prose sms-intro">{{{text}}}</div>{{/hasText}}' +
      '<div class="sms-thread">' +
      '{{#lines}}<div class="sms-line side-{{side}} is-hidden" data-n="{{index}}" data-role="{{role}}">' +
      '{{#character}}<div class="sms-who">{{{avatar}}}</div>{{/character}}' +
      '<div class="sms-col">{{#character}}<span class="sms-name">{{{nameTag}}}</span>{{/character}}' +
      '<div class="sms-bubble" data-mls-speak="reveal" data-mls-speak-role="{{role}}">{{{html}}}</div></div></div>{{/lines}}' +
      '<div class="sms-typing is-hidden" aria-hidden="true"><div class="sms-who"></div><div class="sms-dots"><i></i><i></i><i></i></div></div>' +
      '</div>' +
      '<div class="sms-actions"><button class="mls-btn mls-btn-ghost sms-pause" type="button"><i class="bi bi-pause-fill"></i> <span>{{t.pause}}</span></button>' +
      '<button class="mls-btn mls-btn-ghost sms-all" type="button"><i class="bi bi-chevron-double-down"></i> {{t.all}}</button></div></div>',
    css: ':scope .sms { max-width: 720px; margin: 0 auto; }\n' +
      ':scope .sms-thread { display: flex; flex-direction: column; gap: .75rem; }\n' +
      ':scope .sms-line, :scope .sms-typing { display: flex; gap: .6rem; align-items: flex-end; }\n' +
      ':scope .sms-line { animation: sms-in .35s cubic-bezier(.2,.9,.3,1.2) both; }\n' +
      ':scope .side-right { flex-direction: row-reverse; }\n' +
      ':scope .is-hidden { display: none; }\n' +
      ':scope .sms-who { flex: none; width: 48px; }\n' +
      ':scope .sms-who .mls-avatar { width: 48px; height: 48px; border-width: 2px; }\n' +
      ':scope .sms-col { display: flex; flex-direction: column; gap: .2rem; min-width: 0; max-width: min(78%, 60ch); }\n' +
      ':scope .side-right .sms-col { align-items: flex-end; }\n' +
      ':scope .sms-name { font-size: .75rem; font-weight: 700; opacity: .7; padding: 0 .6rem; }\n' +
      ':scope .sms-bubble { background: var(--mls-surface); border-radius: 20px; border-bottom-left-radius: 6px; padding: .7rem 1rem; box-shadow: var(--mls-shadow); font-size: clamp(1rem, 1.8cqw, 1.12rem); line-height: 1.5; overflow-wrap: anywhere; }\n' +
      ':scope .side-right .sms-bubble { background: var(--mls-primary); color: #fff; border-radius: 20px; border-bottom-right-radius: 6px; }\n' +
      ':scope .side-right .sms-bubble a { color: #fff; }\n' +
      ':scope .sms-bubble p:last-child { margin-bottom: 0; }\n' +
      ':scope .sms-dots { background: var(--mls-surface); border-radius: 20px; padding: .85rem 1rem; box-shadow: var(--mls-shadow); display: flex; gap: .3rem; }\n' +
      ':scope .sms-dots i { width: 8px; height: 8px; border-radius: 50%; background: currentColor; opacity: .35; animation: sms-dot 1.2s infinite; }\n' +
      ':scope .sms-dots i:nth-child(2) { animation-delay: .2s; } :scope .sms-dots i:nth-child(3) { animation-delay: .4s; }\n' +
      ':scope .sms-actions { display: flex; justify-content: center; gap: .6rem; flex-wrap: wrap; margin-top: 1.2rem; }\n' +
      ':scope .sms-actions[hidden] { display: none; }\n' +
      '@keyframes sms-in { from { opacity: 0; transform: translateY(10px) scale(.98); } }\n' +
      '@keyframes sms-dot { 0%, 60%, 100% { opacity: .25; transform: none; } 30% { opacity: .8; transform: translateY(-3px); } }\n' +
      '@media (prefers-reduced-motion: reduce) { :scope .sms-line { animation: none; } :scope .sms-dots i { animation: none; opacity: .5; } }\n' +
      '@container slide (max-width: 640px) { :scope .sms-who { width: 38px; } :scope .sms-who .mls-avatar { width: 38px; height: 38px; } :scope .sms-col { max-width: 84%; } }',
    js: 'var lines = [].slice.call(root.querySelectorAll(".sms-line"));\n' +
      'var typing = root.querySelector(".sms-typing"), tWho = typing.querySelector(".sms-who");\n' +
      'var acts = root.querySelector(".sms-actions"), pauseBtn = root.querySelector(".sms-pause");\n' +
      'var st = ctx.state; st.shown = st.shown || 0;\n' +
      // côtés stables d'une slide à l'autre : le 1er rôle déclaré (le guide) à gauche, les autres à droite
      'var first = (ctx.player.course.roles[0] || {}).role;\n' +
      'lines.forEach(function (l) { var left = l.getAttribute("data-role") === first; l.classList.toggle("side-left", left); l.classList.toggle("side-right", !left); });\n' +
      'var timer = null, paused = false, active = false;\n' +
      'function words(el) { return (el.textContent || "").trim().split(/\\s+/).filter(Boolean).length; }\n' +
      // temps de lecture d'une réplique : ~230 mots/min, plus lent quand la voix lit les répliques
      'function readTime(i) {\n' +
      '  var m = ctx.player.audioMode ? ctx.player.audioMode() : "off";\n' +
      '  var slow = m === "auto" || m === "interact" ? 1.5 : 1;\n' +
      '  return Math.min(8000, Math.max(1400, 700 + words(lines[i]) * 260)) * slow;\n' +
      '}\n' +
      'function render() {\n' +
      '  lines.forEach(function (l, i) { l.classList.toggle("is-hidden", i >= st.shown); });\n' +
      '  acts.hidden = st.shown >= lines.length;\n' +
      '}\n' +
      'function hideTyping() { typing.classList.add("is-hidden"); }\n' +
      'function showTyping(i) {\n' +
      '  var l = lines[i], w = l.querySelector(".sms-who");\n' +
      '  tWho.innerHTML = w ? w.innerHTML : "";\n' +
      '  typing.classList.toggle("side-right", l.classList.contains("side-right"));\n' +
      '  l.parentNode.insertBefore(typing, l);\n' +
      '  typing.classList.remove("is-hidden");\n' +
      '  typing.scrollIntoView({ behavior: "smooth", block: "nearest" });\n' +
      '}\n' +
      'function reveal(i) {\n' +
      '  var l = lines[i];\n' +
      '  ctx.announce(l.textContent.replace(/\\s+/g, " ").trim());\n' +
      '  ctx.speak(l.querySelector(".sms-bubble"));\n' +
      '  l.scrollIntoView({ behavior: "smooth", block: "nearest" });\n' +
      '}\n' +
      'function step() {\n' +
      '  clearTimeout(timer);\n' +
      '  if (!active || paused) return;\n' +
      '  if (ctx.player.overlayOpen()) { timer = setTimeout(step, 400); return; }\n' +
      '  if (st.shown >= lines.length) { hideTyping(); render(); return; }\n' +
      '  var i = st.shown;\n' +
      '  showTyping(i);\n' +
      '  timer = setTimeout(function () {\n' +
      '    hideTyping(); st.shown = i + 1; render(); reveal(i);\n' +
      '    timer = setTimeout(step, readTime(i));\n' +
      '  }, i === 0 ? 600 : 1000);\n' +
      '}\n' +
      'function setPaused(p) {\n' +
      '  paused = p;\n' +
      '  pauseBtn.querySelector("i").className = "bi " + (p ? "bi-play-fill" : "bi-pause-fill");\n' +
      '  pauseBtn.querySelector("span").textContent = ctx.t(p ? "resume" : "pause");\n' +
      '  if (p) { clearTimeout(timer); hideTyping(); } else step();\n' +
      '}\n' +
      'pauseBtn.addEventListener("click", function () { setPaused(!paused); });\n' +
      'root.querySelector(".sms-all").addEventListener("click", function () {\n' +
      '  clearTimeout(timer); hideTyping(); st.shown = lines.length; render();\n' +
      '  lines[lines.length - 1].scrollIntoView({ behavior: "smooth", block: "nearest" });\n' +
      '});\n' +
      'ctx.onEnter(function () { active = true; render(); if (!paused) step(); });\n' +
      'ctx.onLeave(function () { active = false; clearTimeout(timer); hideTyping(); });\n' +
      'render();'
  });

  /* --------------------------------------------------------------- format-menu
     Menu à branches : chaque élément « - [Libellé](#id) :: description » mène à la slide
     <!-- branch: id -->. Un titre de lien « terrain » (#id "terrain") met l'élément en avant.
     Les citations « > » sont les répliques du guide : la 1re au premier passage, la 2e au retour,
     la 3e quand tout a été vu. <!-- parent: menu --> ajoute « Revenir au menu principal ».     */
  var SEEN_KEY = 'suivi-fonds-visite-vues';
  var seen = {};
  try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {}; } catch (e) { seen = {}; }
  function markSeen(id) { if (!id || seen[id]) return; seen[id] = 1; try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch (e) { /* rien */ } }
  window.SFV.seen = function (id) { return !!seen[id]; };
  window.SFV.resetSeen = function () { seen = {}; try { localStorage.removeItem(SEEN_KEY); } catch (e) { /* rien */ } };

  MLS.formats.register({
    id: 'format-menu',
    name: 'Menu à branches',
    icon: 'bi-signpost-split',
    category: 'Navigation',
    description: 'Boutons qui mènent chacun à une partie (« - [Libellé](#id) :: description »). Les parties vues sont cochées ; la fin de chaque partie ramène au menu.',
    i18n: { fr: { seen: 'vu', done: 'J’ai fini la visite', back: 'Revenir au menu principal', all: 'Tout est vu !' } },
    template: '<div class="mn">' +
      '{{#title}}<h2 class="mls-title">{{{titleHtml}}}</h2>{{/title}}' +
      '<div class="mn-guide">{{#character}}<div class="mn-who">{{{avatar}}}</div>{{/character}}<div class="mn-bubble" data-mls-speak="always" data-mls-speak-role="{{role}}"></div></div>' +
      '<div class="mn-grid"></div>' +
      '<div class="mn-actions"></div></div>',
    css: ':scope .mn { max-width: 860px; margin: 0 auto; }\n' +
      ':scope .mn-guide { display: flex; gap: .9rem; align-items: flex-end; margin-bottom: 1.2rem; }\n' +
      ':scope .mn-who { flex: none; } :scope .mn-who .mls-avatar { width: 84px; height: 84px; }\n' +
      ':scope .mn-bubble { background: var(--mls-surface); border-radius: 20px; border-bottom-left-radius: 6px; padding: .8rem 1.1rem; box-shadow: var(--mls-shadow); font-size: clamp(1rem, 1.9cqw, 1.18rem); line-height: 1.5; }\n' +
      ':scope .mn-bubble p { margin: 0; }\n' +
      ':scope .mn-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .7rem; }\n' +
      ':scope .mn-item { position: relative; display: flex; gap: .8rem; align-items: center; text-align: left; width: 100%; border: 2px solid transparent; background: var(--mls-surface); color: inherit;' +
      ' border-radius: 16px; padding: .85rem 1rem; box-shadow: var(--mls-shadow); cursor: pointer; font: inherit; transition: transform .15s, border-color .15s; }\n' +
      ':scope .mn-item:hover, :scope .mn-item:focus-visible { border-color: var(--mls-primary); transform: translateY(-2px); }\n' +
      ':scope .mn-ico { font-size: 1.7rem; line-height: 1; flex: none; width: 2.2rem; text-align: center; }\n' +
      ':scope .mn-txt { display: flex; flex-direction: column; gap: .15rem; min-width: 0; }\n' +
      ':scope .mn-txt strong { font-size: 1.02rem; }\n' +
      ':scope .mn-txt small { opacity: .75; font-size: .86rem; line-height: 1.35; }\n' +
      ':scope .mn-seen { position: absolute; top: .45rem; right: .6rem; font-size: .72rem; font-weight: 700; color: var(--mls-primary); display: none; }\n' +
      ':scope .mn-item.is-seen .mn-seen { display: inline-flex; gap: .2rem; align-items: center; }\n' +
      ':scope .mn-item.is-seen { opacity: .8; }\n' +
      /* mise en avant « terrain » : pleine largeur, fond doré, comme une appli */
      ':scope .mn-item.mn-terrain { grid-column: 1 / -1; background: linear-gradient(120deg, var(--mls-secondary), #f3dc6b); color: #1f2933; padding: 1.05rem 1.2rem; }\n' +
      ':scope .mn-item.mn-terrain .mn-ico { font-size: 2.1rem; }\n' +
      ':scope .mn-item.mn-terrain strong { font-size: 1.12rem; }\n' +
      ':scope .mn-item.mn-terrain .mn-seen { color: #1f2933; }\n' +
      ':scope .mn-actions { display: flex; flex-wrap: wrap; gap: .6rem; justify-content: center; margin-top: 1.3rem; }\n' +
      '@container slide (max-width: 640px) { :scope .mn-grid { grid-template-columns: 1fr; } :scope .mn-who .mls-avatar { width: 56px; height: 56px; } }',
    js: 'var grid = root.querySelector(".mn-grid"), bubble = root.querySelector(".mn-bubble"), acts = root.querySelector(".mn-actions");\n' +
      'var img = root.querySelector(".mn-who .mls-avatar");\n' +
      'var items = data.items.map(function (it) {\n' +
      '  var d = document.createElement("div"); d.innerHTML = it.term;\n' +
      '  var a = d.querySelector("a"); if (!a) return null;\n' +
      '  var label = a.textContent.trim(), m = label.match(/^(\\p{Extended_Pictographic}\\uFE0F?)\\s*(.*)$/u);\n' +
      '  return { target: (a.getAttribute("href") || "").replace(/^#/, ""), ico: m ? m[1] : "", label: m ? m[2] : label, desc: it.def, variant: a.getAttribute("title") || "" };\n' +
      '}).filter(Boolean);\n' +
      'grid.innerHTML = items.map(function (x) {\n' +
      '  return "<button type=\\"button\\" class=\\"mn-item" + (x.variant ? " mn-" + x.variant : "") + "\\" data-go=\\"" + ctx.escape(x.target) + "\\">" +\n' +
      '    (x.ico ? "<span class=\\"mn-ico\\" aria-hidden=\\"true\\">" + x.ico + "</span>" : "") +\n' +
      '    "<span class=\\"mn-txt\\"><strong>" + ctx.escape(x.label) + "</strong>" + (x.desc ? "<small>" + x.desc + "</small>" : "") + "</span>" +\n' +
      '    "<span class=\\"mn-seen\\"><i class=\\"bi bi-check-circle-fill\\"></i> " + ctx.t("seen") + "</span></button>";\n' +
      '}).join("");\n' +
      'var parent = data.meta.parent;\n' +
      'acts.innerHTML = parent ? "<button type=\\"button\\" class=\\"mls-btn mls-btn-ghost\\" data-go=\\"" + ctx.escape(parent) + "\\"><i class=\\"bi bi-arrow-left\\"></i> " + ctx.t("back") + "</button>"\n' +
      '  : "<button type=\\"button\\" class=\\"mls-btn mls-btn-ghost\\" data-finish><i class=\\"bi bi-flag\\"></i> " + ctx.t("done") + "</button>";\n' +
      'function refresh() {\n' +
      '  var n = 0;\n' +
      '  grid.querySelectorAll(".mn-item").forEach(function (b) { var s = window.SFV.seen(b.getAttribute("data-go")); b.classList.toggle("is-seen", s); if (s) n++; });\n' +
      '  var q = data.quotes, k = n === 0 ? 0 : (n >= items.length && q[2] ? 2 : 1);\n' +
      '  var line = q[Math.min(k, q.length - 1)];\n' +
      '  if (line) { bubble.innerHTML = line.html; if (img) ctx.setExpression(img, line.expression || "happy"); window.SFV.applyName(window.SFV.getName()); }\n' +
      '}\n' +
      'root.addEventListener("click", function (e) {\n' +
      '  var g = e.target.closest("[data-go]"); if (g) { window.SFV.go(g.getAttribute("data-go")); return; }\n' +
      '  if (e.target.closest("[data-finish]")) window.SFV.finish();\n' +
      '});\n' +
      'ctx.onEnter(refresh);\n' +
      'refresh();'
  });

  /* --------------------------------------------------------------- format-scan
     Simulation : un téléphone, une étiquette à scanner, la fiche qui s'ouvre, une décision
     à prendre ; le personnage réagit. Fiche : « - **Titre** :: … ». Choix : « > Libellé (expression) :: réaction ». */
  MLS.formats.register({
    id: 'format-scan',
    name: 'Simulation : scanner en rayon',
    icon: 'bi-upc-scan',
    category: 'Mises en situation',
    description: 'Un téléphone à manipuler : scanner l’étiquette, voir la fiche, prendre une photo, décider. Le personnage réagit à chaque choix.',
    i18n: { fr: { scan: 'Scanner', scanning: 'Lecture…', photo: 'Photo', photoOk: 'Photo ajoutée', decide: 'Ta décision', search: 'Code-barres, cote ou titre', again: 'Recommencer' } },
    template: '<div class="sc">' +
      '{{#title}}<h2 class="mls-title">{{{titleHtml}}}</h2>{{/title}}' +
      '<div class="sc-stage">' +
      '<div class="sc-phone" aria-label="Téléphone simulé"><div class="sc-notch"></div><div class="sc-screen">' +
      '<div class="sc-bar"><i class="bi bi-search"></i><span class="sc-q">{{t.search}}</span><i class="bi bi-upc-scan"></i></div>' +
      '<div class="sc-cam"><svg class="sc-code" viewBox="0 0 220 70" aria-hidden="true"></svg><div class="sc-laser"></div><div class="sc-num"></div></div>' +
      '<button type="button" class="mls-btn sc-go"><i class="bi bi-upc-scan"></i> {{t.scan}}</button>' +
      '<div class="sc-fiche" hidden><dl class="sc-dl">{{#items}}<div><dt>{{{term}}}</dt><dd>{{{def}}}</dd></div>{{/items}}</dl>' +
      '<p class="sc-h">{{t.decide}}</p><div class="sc-choices"></div>' +
      '<button type="button" class="sc-photo"><i class="bi bi-camera"></i> <span>{{t.photo}}</span></button></div>' +
      '</div></div>' +
      '<div class="sc-coach">{{#character}}<div class="sc-who">{{{avatar}}}</div>{{/character}}<div class="sc-bubble" data-mls-speak="always" data-mls-speak-role="{{role}}">{{{text}}}</div></div>' +
      '</div></div>',
    css: ':scope .sc { max-width: 900px; margin: 0 auto; }\n' +
      ':scope .sc-stage { display: grid; grid-template-columns: 280px 1fr; gap: 1.6rem; align-items: center; }\n' +
      ':scope .sc-phone { position: relative; background: #1f2933; border-radius: 34px; padding: 14px 10px; box-shadow: var(--mls-shadow); }\n' +
      ':scope .sc-notch { width: 70px; height: 6px; border-radius: 6px; background: #3a4752; margin: 0 auto 10px; }\n' +
      ':scope .sc-screen { background: #f3f6f7; color: #1f2933; border-radius: 22px; min-height: 430px; padding: 12px; display: flex; flex-direction: column; gap: 10px; overflow: hidden; }\n' +
      ':scope .sc-bar { display: flex; gap: 8px; align-items: center; background: #fff; border-radius: 10px; padding: 8px 10px; font-size: .8rem; color: #6b7378; }\n' +
      ':scope .sc-bar .sc-q { flex: 1; }\n' +
      ':scope .sc-cam { position: relative; background: #fff; border-radius: 12px; padding: 14px 10px 8px; border: 2px solid var(--mls-secondary); }\n' +
      ':scope .sc-code { width: 100%; height: 60px; display: block; }\n' +
      ':scope .sc-num { text-align: center; font: 600 .78rem/1.4 ui-monospace, monospace; letter-spacing: .08em; }\n' +
      ':scope .sc-laser { position: absolute; left: 6%; right: 6%; top: 50%; height: 2px; background: #e5484d; box-shadow: 0 0 8px #e5484d; opacity: 0; }\n' +
      ':scope .sc-cam.is-scanning .sc-laser { opacity: 1; animation: sc-sweep .9s ease-in-out 2; }\n' +
      '@keyframes sc-sweep { 0%, 100% { top: 18%; } 50% { top: 70%; } }\n' +
      ':scope .sc-go { align-self: center; }\n' +
      ':scope .sc-fiche { background: #fff; border-radius: 12px; padding: 10px; animation: sc-up .35s ease both; display: flex; flex-direction: column; gap: 8px; }\n' +
      '@keyframes sc-up { from { opacity: 0; transform: translateY(14px); } }\n' +
      ':scope .sc-dl { margin: 0; display: grid; gap: 4px; font-size: .8rem; }\n' +
      ':scope .sc-dl div { display: flex; gap: 6px; } :scope .sc-dl dt { font-weight: 700; flex: none; } :scope .sc-dl dd { margin: 0; }\n' +
      ':scope .sc-h { margin: 4px 0 0; font-size: .75rem; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; opacity: .7; }\n' +
      ':scope .sc-choices { display: flex; flex-wrap: wrap; gap: 6px; }\n' +
      ':scope .sc-choices button, :scope .sc-photo { border: 1px solid #d6dde1; background: #fff; border-radius: 8px; padding: 6px 10px; font: inherit; font-size: .82rem; cursor: pointer; color: #1f2933; }\n' +
      ':scope .sc-choices button.on { background: var(--mls-primary); border-color: var(--mls-primary); color: #fff; font-weight: 700; }\n' +
      ':scope .sc-photo { align-self: flex-start; }\n' +
      ':scope .sc-photo.on { background: #e5f6ec; border-color: #2e7d5b; color: #1f5f43; }\n' +
      ':scope .sc-flash { position: absolute; inset: 0; background: #fff; border-radius: 34px; animation: sc-flash .45s ease forwards; pointer-events: none; }\n' +
      '@keyframes sc-flash { from { opacity: .95; } to { opacity: 0; } }\n' +
      ':scope .sc-coach { display: flex; gap: .9rem; align-items: flex-end; }\n' +
      ':scope .sc-who { flex: none; } :scope .sc-who .mls-avatar { width: 110px; height: 110px; }\n' +
      ':scope .sc-bubble { background: var(--mls-surface); border-radius: 22px; border-bottom-left-radius: 6px; padding: 1rem 1.2rem; box-shadow: var(--mls-shadow); font-size: clamp(1rem, 1.9cqw, 1.2rem); line-height: 1.5; }\n' +
      ':scope .sc-bubble p:last-child { margin: 0; }\n' +
      ':scope .sc-bubble.pop { animation: sc-up .3s ease both; }\n' +
      '@container slide (max-width: 640px) { :scope .sc-stage { grid-template-columns: 1fr; } :scope .sc-phone { max-width: 290px; margin: 0 auto; } :scope .sc-screen { min-height: 0; }' +
      ' :scope .sc-coach { order: -1; } :scope .sc-who .mls-avatar { width: 60px; height: 60px; } }\n' +
      '@media (prefers-reduced-motion: reduce) { :scope .sc-cam.is-scanning .sc-laser, :scope .sc-fiche, :scope .sc-flash, :scope .sc-bubble.pop { animation: none; } }',
    js: 'var cam = root.querySelector(".sc-cam"), go = root.querySelector(".sc-go"), fiche = root.querySelector(".sc-fiche");\n' +
      'var bubble = root.querySelector(".sc-bubble"), img = root.querySelector(".sc-who .mls-avatar"), phone = root.querySelector(".sc-phone");\n' +
      // le code affiché : la ligne « Code » de la fiche, sinon un numéro d'exemplaire fictif
      'var codeItem = data.items.filter(function (i) { return /code/i.test(i.termText); })[0];\n' +
      'var code = codeItem ? ctx.escape((codeItem.def || "").replace(/<[^>]+>/g, "")).trim() : "31909000000000";\n' +
      'root.querySelector(".sc-num").textContent = code;\n' +
      // barres pseudo-Codabar, dessinées à partir des chiffres
      'var svg = root.querySelector(".sc-code"), x = 6, bars = "";\n' +
      '("A" + code + "B").split("").forEach(function (ch, k) { var c = ch.charCodeAt(0); for (var j = 0; j < 4; j++) { var w = ((c >> j) & 1) ? 3.2 : 1.4; bars += "<rect x=\\"" + x.toFixed(1) + "\\" y=\\"0\\" width=\\"" + w + "\\" height=\\"60\\" fill=\\"#1f2933\\"/>"; x += w + ((c >> (j + 1)) & 1 ? 2.6 : 1.4); } x += 2; });\n' +
      'svg.setAttribute("viewBox", "0 0 " + Math.ceil(x + 6) + " 60"); svg.innerHTML = bars;\n' +
      // choix : « Libellé (expression) :: réaction »
      'var choices = data.quotes.map(function (q) { var m = q.text.match(/^\\s*(.+?)\\s*(?:\\((\\w+)\\))?\\s*::\\s*([\\s\\S]+)$/); return m ? { label: m[1], expr: m[2] || "neutral", text: m[3] } : null; }).filter(Boolean);\n' +
      'var box = root.querySelector(".sc-choices");\n' +
      'box.innerHTML = choices.map(function (c, i) { return "<button type=\\"button\\" data-i=\\"" + i + "\\">" + ctx.escape(c.label) + "</button>"; }).join("");\n' +
      'function say(html, expr) { bubble.classList.remove("pop"); void bubble.offsetWidth; bubble.innerHTML = html; bubble.classList.add("pop"); if (img) ctx.setExpression(img, expr || "neutral"); ctx.announce(bubble.textContent); ctx.speak(bubble); }\n' +
      'go.addEventListener("click", function () {\n' +
      '  go.disabled = true; go.innerHTML = "<i class=\\"bi bi-hourglass-split\\"></i> " + ctx.t("scanning"); cam.classList.add("is-scanning");\n' +
      '  setTimeout(function () { cam.classList.remove("is-scanning"); if (navigator.vibrate) navigator.vibrate(60); go.hidden = true; fiche.hidden = false; root.querySelector(".sc-q").textContent = code;\n' +
      '    if (data.meta["apres-scan"]) say("<p>" + ctx.escape(data.meta["apres-scan"]) + "</p>", "happy"); }, 1300);\n' +
      '});\n' +
      'box.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; box.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });\n' +
      '  var c = choices[+b.getAttribute("data-i")]; say("<p>" + ctx.escape(c.text) + "</p>", c.expr); });\n' +
      'root.querySelector(".sc-photo").addEventListener("click", function (e) { var b = e.currentTarget; var f = document.createElement("div"); f.className = "sc-flash"; phone.appendChild(f); setTimeout(function () { f.remove(); }, 500);\n' +
      '  b.classList.add("on"); b.querySelector("span").textContent = ctx.t("photoOk"); if (data.meta["apres-photo"]) say("<p>" + ctx.escape(data.meta["apres-photo"]) + "</p>", "encouraging"); });'
  });

  /* ------------------------------------------------------- navigation par branches
     <!-- branch: id --> ouvre une partie (son <!-- parent: … --> vaut « menu » par défaut) ;
     la partie s'arrête à la slide qui ouvre une autre partie, à un menu ou à une slide <!-- id: … -->.
     Fin de partie -> retour au menu parent ; « Précédent » au début d'une partie -> menu parent.
     Sur un menu, « Suivant » mène à la première partie pas encore vue. <!-- id: fin --> = conclusion. */
  function installBranching(player) {
    var slides = player.course.slides, n = slides.length;
    var byId = {}, owner = [], cur = null;
    slides.forEach(function (s, i) {
      var id = s.meta.branch || s.meta.id;
      if (id && byId[id] == null) byId[id] = i;
      if (s.format === 'format-menu' || (s.meta.id && !s.meta.branch)) cur = null;
      if (s.meta.branch) cur = { id: s.meta.branch, parent: s.meta.parent || 'menu', start: i };
      owner[i] = cur;
      // sommaire : une entrée par partie et par menu
      if (!s.meta.chapter && (s.meta.branch || s.format === 'format-menu')) s.meta.chapter = s.title || s.meta.branch;
    });
    player.computeChapters();
    player.renderToc();

    function go(id) { if (byId[id] != null) player.goTo(byId[id]); }
    function finish() { if (byId.fin != null) player.goTo(byId.fin); else player.openEnd(); }
    window.SFV.go = go;
    window.SFV.finish = finish;

    var next0 = player.next, prev0 = player.prev;
    player.next = function () {
      var i = this.index, s = slides[i];
      if (s.meta.id === 'fin') return this.openEnd();
      if (s.format === 'format-menu') {
        var todo = [].slice.call(this.slideEls[i].querySelectorAll('.mn-item')).filter(function (b) { return !window.SFV.seen(b.getAttribute('data-go')); })[0];
        if (todo) return go(todo.getAttribute('data-go'));
        return s.meta.parent ? go(s.meta.parent) : finish();
      }
      var o = owner[i];
      if (o && (i + 1 >= n || owner[i + 1] !== o)) return go(o.parent);
      return next0.call(this);
    };
    player.prev = function () {
      var i = this.index, s = slides[i], o = owner[i];
      if (s.meta.id === 'fin') return go('menu');
      if (s.format === 'format-menu' && s.meta.parent) return go(s.meta.parent);
      if (o && o.start === i) return go(o.parent);
      return prev0.call(this);
    };
    var onSlide = player.opts.onSlide;
    player.opts.onSlide = function (i) {
      if (slides[i] && slides[i].meta.branch) markSeen(slides[i].meta.branch);
      if (onSlide) onSlide(i);
    };
  }

  /* ----------------------------------------------- sortir de la visite à tout moment
     Un bouton dans l'en-tête (toujours visible) et un lien sur l'écran de choix des guides. */
  var EXIT_URL = '../';
  function installExit(player) {
    var acts = player.root.querySelector('.mls-top-actions');
    if (acts && !acts.querySelector('.sf-exit')) {
      var a = document.createElement('a');
      a.className = 'mls-icon-btn sf-exit';
      a.href = EXIT_URL;
      a.title = 'Quitter la visite et revenir à l’outil';
      a.setAttribute('aria-label', 'Quitter la visite et revenir à l’outil');
      a.innerHTML = '<i class="bi bi-box-arrow-right"></i><span>Quitter</span>';
      acts.appendChild(a);
    }
    var openWelcome = player.openWelcome;
    player.openWelcome = function () {
      var r = openWelcome.apply(this, arguments);
      var w = this.root.querySelector('.mls-welcome-actions');
      if (w && !w.parentNode.querySelector('.sf-exit-link')) {
        w.insertAdjacentHTML('afterend', '<p class="sf-exit-link"><a href="' + EXIT_URL + '"><i class="bi bi-arrow-left"></i> Revenir à l’outil sans faire la visite</a></p>');
      }
      return r;
    };
    if (!player.root.querySelector('.mls-welcome').hidden) player.openWelcome(false); // l'accueil est déjà affiché
  }

  /* ------------------------------------------------------------------ lancement */
  function marks(md) {
    // {prenom} -> « Marie » ; {, prenom} -> « , Marie » ; sans prénom, la marque entière disparaît
    return md.replace(/\{([^{}\n]{0,6}?)prenom([^{}\n]{0,6}?)\}/g, function (m, pre, post) {
      return '<span class="sf-prenom" data-pre="' + esc(pre) + '" data-post="' + esc(post) + '"></span>';
    });
  }

  var root = document.getElementById('player');
  fetch('visite.md', { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw new Error('visite.md introuvable');
    return r.text();
  }).then(function (md) {
    md = marks(md.replace(/^﻿/, '').replace(/\r\n?/g, '\n'));
    var player = new MLS.Player(root, {
      mode: 'standalone',
      formats: MLS.formats.all().map(function (f) { return MLS.formats.serialize(f); }),
      catalog: window.MLS_CHARACTERS
    });
    window.mlsPlayer = player;
    // Une visite n'est pas un examen : pas de note à l'écran de fin, juste un mot d'au revoir
    var openEnd = player.openEnd;
    player.openEnd = function () { this.gradable = {}; this.scores = {}; return openEnd.apply(this, arguments); };
    player.load(md, { welcome: true });
    installBranching(player);
    installExit(player);
    applyName(getName());
    document.getElementById('loading').hidden = true;
  }).catch(function (e) {
    console.error(e);
    document.getElementById('loading').innerHTML = '<p>La visite n’a pas pu se charger. <a href="../">Revenir à l’outil</a></p>';
  });
})();
