MLS.formats.register({
  id: 'format-hotspots',
  name: 'Image interactive',
  icon: 'bi-bullseye',
  category: 'Découverte',
  description: 'Zones cliquables sur une image avec infobulles. Syntaxe : « - X,Y :: **Titre** :: Texte » où X et Y sont des pourcentages (0-100) depuis le coin haut-gauche.',
  sample: `### Anatomie d’une page accessible
Cliquez sur les points pour découvrir les bonnes pratiques.

![Maquette d’une page web avec en-tête, menu, contenu et formulaire](assets/images/page-web.svg)

- 14,10 :: **Logo** :: Une alternative textuelle qui reprend le nom du site.
- 62,10 :: **Menu** :: Une balise nav et des liens explicites, utilisables au clavier.
- 30,45 :: **Titre** :: Une hiérarchie de titres logique (h1, h2…).
- 75,62 :: **Formulaire** :: Chaque champ a une étiquette (label) visible.
- 50,90 :: **Contrastes** :: Un ratio d’au moins 4,5:1 entre le texte et le fond.`,
  i18n: {
    "fr": {
      "explored": "Points explorés :",
      "closePop": "Fermer l’infobulle",
      "point": "Point {n}"
    },
    "en": {
      "explored": "Points explored:",
      "closePop": "Close tooltip",
      "point": "Point {n}",
      "$name": "Interactive image",
      "$category": "Discovery",
      "$description": "Clickable hotspots on an image with tooltips. Syntax: \"- X,Y :: **Title** :: Text\" where X and Y are percentages (0-100) from the top-left corner.",
      "$sample": "### Anatomy of an accessible page\nClick the points to discover good practices.\n\n![Mock-up of a web page with header, menu, content and form](assets/images/page-web.svg)\n\n- 9,9 :: **Logo** :: A text alternative giving the site name.\n- 72,9 :: **Menu** :: A nav element with explicit, keyboard-friendly links.\n- 30,33 :: **Heading** :: A logical heading hierarchy (h1, h2…).\n- 80,52 :: **Form** :: Every field has a visible label."
    }
  },
  template: `<div class="hs">
  <div class="hs-head mls-rise">
    {{#title}}<h2 class="mls-title">{{{titleHtml}}}</h2>{{/title}}
    {{#hasText}}<div class="mls-prose">{{{text}}}</div>{{/hasText}}
    <p class="hs-hint"><i class="bi bi-cursor-fill"></i> {{t.explored}} <strong><span class="hs-count">0</span> / {{items.length}}</strong></p>
  </div>
  <div class="hs-stage mls-rise" style="animation-delay:.1s">
    <div class="hs-canvas">
    {{#image}}<img class="hs-img" src="{{src}}" alt="{{alt}}">{{/image}}{{^image}}<div class="hs-img hs-placeholder"></div>{{/image}}
    {{#items}}<button type="button" class="hs-spot" data-i="{{index}}" data-pos="{{termText}}" aria-expanded="false"><span>{{number}}</span></button>{{/items}}
    </div>
    <div class="hs-pop mls-card" hidden role="dialog" aria-modal="false">
      <button type="button" class="hs-close" aria-label="{{t.closePop}}"><i class="bi bi-x-lg"></i></button>
      <div class="hs-pop-body" data-mls-speak></div>
    </div>
  </div>
  <template class="hs-data">{{#items}}<div data-i="{{index}}"><h3>{{{def}}}</h3>{{{extra}}}{{{sub}}}</div>{{/items}}</template>
</div>`,
  css: `:scope .hs-hint { color: var(--mls-muted); }
:scope .hs-canvas { position: relative; }
:scope .hs-stage { position: relative; border-radius: 22px; box-shadow: var(--mls-shadow); background: var(--mls-surface); }
:scope .hs-img { display: block; width: 100%; border-radius: 22px; }
:scope .hs-placeholder { aspect-ratio: 16 / 9; background: repeating-linear-gradient(45deg, var(--mls-soft) 0 20px, var(--mls-surface) 20px 40px); }
:scope .hs-spot { position: absolute; transform: translate(-50%, -50%); width: 40px; height: 40px; border-radius: 50%; border: 3px solid #fff;
  background: var(--mls-secondary); color: #fff; font-weight: 800; cursor: pointer; box-shadow: 0 6px 16px -4px rgba(0,0,0,.4); z-index: 2; padding: 0; }
:scope .hs-spot::before { content: ""; position: absolute; inset: -9px; border-radius: 50%; border: 3px solid var(--mls-secondary); animation: hs-pulse 1.8s infinite; }
:scope .hs-spot.is-seen { background: var(--mls-accent); }
:scope .hs-spot.is-seen::before { border-color: var(--mls-accent); animation: none; opacity: 0; }
:scope .hs-spot[aria-expanded="true"] { background: var(--mls-primary); transform: translate(-50%, -50%) scale(1.15); z-index: 3; }
:scope .hs-pop { position: absolute; z-index: 4; width: min(320px, 80%); padding: 1rem 1.1rem; animation: mls-rise .3s both; }
:scope .hs-pop h3 { font-size: 1.1rem; font-weight: 800; margin: 0 2rem .4rem 0; color: var(--mls-primary); }
:scope .hs-pop-body .mls-speak-btn { margin-right: 2.2rem; }
:scope .hs-close { position: absolute; top: .5rem; right: .5rem; border: 0; background: var(--mls-soft); border-radius: 50%; width: 32px; height: 32px; }
@keyframes hs-pulse { 0% { transform: scale(.8); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
@container slide (max-width: 640px) {
  :scope .hs-spot { width: 32px; height: 32px; font-size: .85rem; }
  /* sur mobile, la bulle passe sous l'image : elle ne masque plus aucun point */
  :scope .hs-pop { position: relative; left: auto !important; right: auto !important; top: auto !important; width: auto; margin: .6rem; box-shadow: none; border: 2px solid var(--mls-soft); }
}`,
  js: `var stage = root.querySelector('.hs-stage');
var spots = [].slice.call(root.querySelectorAll('.hs-spot'));
var pop = root.querySelector('.hs-pop');
var body = root.querySelector('.hs-pop-body');
var count = root.querySelector('.hs-count');
var tpl = root.querySelector('.hs-data');
var contents = tpl.content ? tpl.content.children : tpl.children;
var seen = ctx.state.seen || (ctx.state.seen = {});
var current = -1;

spots.forEach(function (s, i) {
  var p = (s.getAttribute('data-pos') || '').split(/[,;\\s]+/).map(parseFloat);
  s.style.left = (isNaN(p[0]) ? 10 + i * 15 : p[0]) + '%';
  s.style.top = (isNaN(p[1]) ? 50 : p[1]) + '%';
  var h = contents[i] && contents[i].querySelector('h3');
  s.setAttribute('aria-label', ctx.t('point', { n: i + 1 }) + (h ? ' : ' + h.textContent : ''));
  if (seen[i]) s.classList.add('is-seen');
  s.addEventListener('click', function () { if (current === i) close(); else open(i); });
});

function open(i) {
  current = i;
  var s = spots[i];
  spots.forEach(function (x) { x.setAttribute('aria-expanded', x === s); });
  body.innerHTML = contents[i] ? contents[i].innerHTML : '';
  pop.hidden = false;
  var x = parseFloat(s.style.left), y = parseFloat(s.style.top);
  pop.style.left = (x > 55 ? 'auto' : 'calc(' + x + '% + 28px)');
  pop.style.right = (x > 55 ? 'calc(' + (100 - x) + '% + 28px)' : 'auto');
  pop.style.top = 'calc(' + Math.min(y, 70) + '% - 20px)';
  seen[i] = true;
  s.classList.add('is-seen');
  count.textContent = Object.keys(seen).length;
  if (getComputedStyle(pop).position !== 'absolute') pop.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  ctx.speakable(body);
  ctx.announce(body.textContent.trim());
  ctx.speak(body);
}
function close() {
  current = -1;
  pop.hidden = true;
  spots.forEach(function (x) { x.setAttribute('aria-expanded', 'false'); });
}
root.querySelector('.hs-close').addEventListener('click', function () { var s = spots[current]; close(); if (s) s.focus(); });
pop.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var s = spots[current]; close(); if (s) s.focus(); } });
count.textContent = Object.keys(seen).length;`
});
