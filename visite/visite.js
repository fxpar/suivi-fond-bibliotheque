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
    player.load(md, { welcome: true });
    applyName(getName());
    document.getElementById('loading').hidden = true;
  }).catch(function (e) {
    console.error(e);
    document.getElementById('loading').innerHTML = '<p>La visite n’a pas pu se charger. <a href="../">Revenir à l’outil</a></p>';
  });
})();
