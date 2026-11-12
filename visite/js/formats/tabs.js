MLS.formats.register({
  id: 'format-tabs',
  name: 'Onglets / accordéon',
  icon: 'bi-segmented-nav',
  category: 'Structure',
  description: 'Contenu découpé en sections par des sous-titres « #### ». Onglets sur grand écran, accordéon sur mobile.',
  sample: `### Les 4 principes POUR
Les WCAG reposent sur quatre grands principes.

#### Perceptible
L’information doit être présentée de façon à pouvoir être perçue : alternatives textuelles, sous-titres, contrastes.

#### Utilisable
Les composants doivent être utilisables : navigation au clavier, temps suffisant, pas de contenus provoquant des crises.

#### Compréhensible
Le contenu et le fonctionnement doivent être compréhensibles : langage clair, comportement prévisible, aide à la saisie.

#### Robuste
Le contenu doit être compatible avec les technologies d’assistance, actuelles et futures.`,
  i18n: {
    "fr": {
      "empty": "Ajoutez des sous-titres « #### Titre » pour créer des onglets."
    },
    "en": {
      "empty": "Add \"#### Title\" subheadings to create tabs.",
      "$name": "Tabs / accordion",
      "$category": "Structure",
      "$description": "Content split into sections by \"####\" subheadings. Tabs on large screens, accordion on mobile.",
      "$sample": "### The 4 POUR principles\nWCAG rests on four main principles.\n\n#### Perceivable\nInformation must be perceivable: text alternatives, captions, sufficient contrast.\n\n#### Operable\nComponents must be operable: keyboard navigation, enough time, no harmful animations.\n\n#### Understandable\nContent must be understandable: plain language, predictable behaviour, input help.\n\n#### Robust\nContent must work with current and future assistive technologies."
    }
  },
  template: `<div class="tabs-f mls-card mls-rise">
  {{#title}}<h2 class="mls-title">{{{titleHtml}}}</h2>{{/title}}
  {{#hasText}}<div class="mls-prose tabs-intro">{{{text}}}</div>{{/hasText}}
  <div class="tabs-grid" style="--n:{{sections.length}}">
    {{#sections}}<button type="button" class="tabs-btn" aria-expanded="false" id="{{id}}-tab{{index}}" aria-controls="{{id}}-pan{{index}}">
      <span class="tabs-n">{{number}}</span><span>{{{titleHtml}}}</span><i class="bi bi-chevron-down tabs-chev" aria-hidden="true"></i>
    </button>
    <div class="tabs-panel mls-prose" data-mls-speak id="{{id}}-pan{{index}}" role="region" aria-labelledby="{{id}}-tab{{index}}">{{{html}}}</div>{{/sections}}
  </div>
  {{^sections}}<p class="mls-muted">{{t.empty}}</p>{{/sections}}
</div>`,
  css: `:scope .tabs-grid { display: grid; grid-template-columns: repeat(var(--n), auto) 1fr; column-gap: .5rem; margin-top: 1rem; }
:scope .tabs-btn { grid-row: 1; display: flex; align-items: center; gap: .55rem; border: 0; background: var(--mls-soft); color: var(--mls-ink);
  padding: .65rem 1rem; border-radius: 14px 14px 0 0; font-weight: 700; cursor: pointer; }
:scope .tabs-btn[aria-expanded="true"] { background: var(--mls-primary); color: #fff; }
:scope .tabs-n { width: 1.6rem; height: 1.6rem; border-radius: 50%; display: inline-grid; place-items: center; font-size: .8rem;
  background: var(--mls-surface); color: var(--mls-primary); }
:scope .tabs-chev { display: none; margin-left: auto; transition: transform .25s; }
:scope .tabs-panel { grid-row: 2; grid-column: 1 / -1; display: none; padding: 1.2rem 1.3rem; border-radius: 0 16px 16px 16px;
  border: 3px solid var(--mls-primary); }
:scope .tabs-panel.is-open { display: block; animation: mls-rise .35s both; }
@container slide (max-width: 640px) {
  :scope .tabs-grid { display: block; }
  :scope .tabs-btn { width: 100%; border-radius: 14px; margin-top: .5rem; }
  :scope .tabs-chev { display: inline; }
  :scope .tabs-btn[aria-expanded="true"] { border-radius: 14px 14px 0 0; }
  :scope .tabs-btn[aria-expanded="true"] .tabs-chev { transform: rotate(180deg); }
  :scope .tabs-panel { border-radius: 0 0 14px 14px; }
}`,
  js: `var btns = [].slice.call(root.querySelectorAll('.tabs-btn'));
var panels = [].slice.call(root.querySelectorAll('.tabs-panel'));
function open(i, user) {
  ctx.state.cur = i;
  btns.forEach(function (b, k) {
    var on = k === i;
    b.setAttribute('aria-expanded', on);
    panels[k].classList.toggle('is-open', on);
  });
  if (user && panels[i]) ctx.speak(panels[i]);
}
btns.forEach(function (b, i) {
  b.addEventListener('click', function () {
    var isOpen = b.getAttribute('aria-expanded') === 'true';
    var narrow = root.getBoundingClientRect().width < 600;
    open(isOpen && narrow ? -1 : i, true);
  });
});
if (btns.length) open(ctx.state.cur != null ? ctx.state.cur : 0);`
});
