MLS.formats.register({
  id: 'format-timeline',
  name: 'Frise chronologique',
  icon: 'bi-clock-history',
  category: 'Découverte',
  description: 'Frise interactive : horizontale sur grand écran, verticale sur mobile. Syntaxe : « - **Date** :: Description ». Flèches du clavier pour naviguer.',
  sample: `### Une brève histoire de l’accessibilité web
- **1999** :: Publication des **WCAG 1.0** par le W3C.
- **2005** :: En France, la loi handicap impose l’accessibilité des services publics en ligne.
- **2008** :: Les **WCAG 2.0** deviennent la référence internationale.
- **2018** :: **WCAG 2.1** : prise en compte du mobile et des déficiences cognitives.
- **2025** :: L’**European Accessibility Act** s’applique aux services privés.`,
  i18n: {
    "fr": {
      "prevStep": "Étape précédente",
      "nextStep": "Étape suivante"
    },
    "en": {
      "prevStep": "Previous step",
      "nextStep": "Next step",
      "$name": "Timeline",
      "$category": "Discovery",
      "$description": "Interactive timeline: horizontal on large screens, vertical on mobile. Syntax: \"- **Date** :: Description\". Arrow keys navigate.",
      "$sample": "### A short history of web accessibility\n- **1999** :: **WCAG 1.0** published by the W3C.\n- **2008** :: **WCAG 2.0** becomes the international reference.\n- **2018** :: **WCAG 2.1** covers mobile and cognitive disabilities.\n- **2025** :: The **European Accessibility Act** applies to private services."
    }
  },
  template: `<div class="tl">
  <div class="mls-rise">
    {{#title}}<h2 class="mls-title">{{{titleHtml}}}</h2>{{/title}}
    {{#hasText}}<div class="mls-prose tl-intro">{{{text}}}</div>{{/hasText}}
  </div>
  <ol class="tl-track" style="--n:{{items.length}}">
    {{#items}}<li class="tl-step">
      <button type="button" class="tl-dot" aria-expanded="false" aria-controls="{{id}}-p{{index}}" id="{{id}}-t{{index}}" style="animation-delay:calc({{index}} * .08s)">
        <span class="tl-bullet" aria-hidden="true">{{number}}</span><span class="tl-date">{{{term}}}</span>
      </button>
      <div class="tl-panel mls-card" id="{{id}}-p{{index}}" role="region" aria-labelledby="{{id}}-t{{index}}">
        <div class="tl-panel-date">{{{term}}}</div>
        <div class="mls-prose" data-mls-speak>{{{def}}}{{{sub}}}</div>
      </div>
    </li>{{/items}}
  </ol>
  <div class="tl-nav"><button type="button" class="mls-btn mls-btn-ghost tl-prev" aria-label="{{t.prevStep}}"><i class="bi bi-chevron-left"></i></button>
  <button type="button" class="mls-btn tl-next" aria-label="{{t.nextStep}}"><i class="bi bi-chevron-right"></i></button></div>
</div>`,
  css: `:scope .tl-track { list-style: none; padding: 0; margin: 1rem 0 0; display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); row-gap: 1.2rem; }
:scope .tl-step { display: contents; }
:scope .tl-dot { grid-row: 1; position: relative; border: 0; background: none; color: var(--mls-ink); display: flex; flex-direction: column;
  align-items: center; gap: .5rem; padding: 0 .3rem; cursor: pointer; animation: mls-rise .5s both; }
:scope .tl-dot::before { content: ""; position: absolute; top: 22px; left: 0; right: 0; height: 4px; background: color-mix(in srgb, var(--mls-primary) 22%, transparent); z-index: 0; }
:scope .tl-step:first-child .tl-dot::before { left: 50%; }
:scope .tl-step:last-child .tl-dot::before { right: 50%; }
:scope .tl-bullet { position: relative; z-index: 1; width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; font-weight: 800;
  background: var(--mls-surface); color: var(--mls-primary); border: 4px solid color-mix(in srgb, var(--mls-primary) 35%, transparent); transition: all .25s; }
:scope .tl-date { font-weight: 800; font-size: clamp(.9rem, 1.8cqw, 1.1rem); text-align: center; }
:scope .tl-dot.is-visited .tl-bullet { border-color: var(--mls-primary); }
:scope .tl-dot[aria-expanded="true"] .tl-bullet { background: var(--mls-primary); color: #fff; border-color: var(--mls-primary); transform: scale(1.15);
  box-shadow: 0 0 0 8px color-mix(in srgb, var(--mls-primary) 18%, transparent); }
:scope .tl-panel { grid-row: 2; grid-column: 1 / -1; display: none; border-top: 6px solid var(--mls-primary); }
:scope .tl-panel.is-open { display: block; animation: mls-rise .4s both; }
:scope .tl-panel-date { font-size: clamp(1.6rem, 4cqw, 2.4rem); font-weight: 900; color: var(--mls-primary); line-height: 1; margin-bottom: .5rem; }
:scope .tl-nav { display: flex; justify-content: flex-end; gap: .5rem; margin-top: 1rem; }
@container slide (max-width: 640px) {
  :scope .tl-track { display: block; border-left: 4px solid color-mix(in srgb, var(--mls-primary) 22%, transparent); margin-left: 22px; }
  :scope .tl-step { display: block; margin-bottom: .8rem; }
  :scope .tl-dot { flex-direction: row; margin-left: -26px; padding: 0; gap: .8rem; }
  :scope .tl-dot::before { display: none; }
  :scope .tl-panel { margin: .6rem 0 0 1.4rem; }
  :scope .tl-panel-date { display: none; }
  :scope .tl-nav { display: none; }
}`,
  js: `var dots = [].slice.call(root.querySelectorAll('.tl-dot'));
var panels = [].slice.call(root.querySelectorAll('.tl-panel'));
var cur = ctx.state.cur != null ? ctx.state.cur : 0;
function open(i, focus, user) {
  cur = Math.max(0, Math.min(i, dots.length - 1));
  ctx.state.cur = cur;
  dots.forEach(function (d, k) {
    var on = k === cur;
    d.setAttribute('aria-expanded', on);
    if (on) d.classList.add('is-visited');
    panels[k].classList.toggle('is-open', on);
  });
  if (focus) dots[cur].focus();
  if (user) ctx.speak(panels[cur].querySelector('.mls-prose'));
  var prev = root.querySelector('.tl-prev'), next = root.querySelector('.tl-next');
  if (prev) prev.disabled = cur === 0;
  if (next) next.disabled = cur === dots.length - 1;
}
dots.forEach(function (d, i) {
  d.addEventListener('click', function () { open(i, false, true); });
  d.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); open(i + 1, true, true); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); open(i - 1, true, true); }
  });
});
root.querySelector('.tl-prev').addEventListener('click', function () { open(cur - 1, false, true); });
root.querySelector('.tl-next').addEventListener('click', function () { open(cur + 1, false, true); });
if (dots.length) open(cur);`
});
