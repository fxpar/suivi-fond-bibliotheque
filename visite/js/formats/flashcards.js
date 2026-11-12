MLS.formats.register({
  id: 'format-flashcards',
  name: 'Cartes à retourner',
  icon: 'bi-front',
  category: 'Découverte',
  description: 'Grille de cartes recto/verso. Syntaxe : « - **Terme** :: Définition ». Un compteur indique les cartes découvertes.',
  sample: `### Lexique clé
Retournez chaque carte pour découvrir sa définition.

- **RGAA** :: Référentiel Général d’Amélioration de l’Accessibilité.
- **WCAG 2.1** :: Directives internationales d’accessibilité du W3C.
- **ARIA** :: Attributs qui enrichissent la sémantique pour les technologies d’assistance.
- **Lecteur d’écran** :: Logiciel qui vocalise ou affiche en braille le contenu de l’écran.`,
  i18n: {
    "fr": {
      "hint": "Touchez une carte pour la retourner",
      "found": "découvertes",
      "allFound": "Toutes les cartes ont été découvertes."
    },
    "en": {
      "hint": "Tap a card to flip it",
      "found": "discovered",
      "allFound": "All cards have been discovered.",
      "$name": "Flip cards",
      "$category": "Discovery",
      "$description": "Grid of two-sided cards. Syntax: \"- **Term** :: Definition\". A counter shows the cards discovered.",
      "$sample": "### Key vocabulary\nFlip each card to discover its definition.\n\n- **WCAG 2.1** :: International web accessibility guidelines from the W3C.\n- **ARIA** :: Attributes that add semantics for assistive technologies.\n- **Screen reader** :: Software that speaks the screen content aloud or shows it in braille."
    }
  },
  template: `<div class="fc">
  <div class="fc-head mls-rise">
    {{#title}}<h2 class="mls-title">{{{titleHtml}}}</h2>{{/title}}
    {{#hasText}}<div class="mls-prose">{{{text}}}</div>{{/hasText}}
    <p class="fc-hint"><i class="bi bi-hand-index-thumb"></i> {{t.hint}} · <strong><span class="fc-count">0</span> / {{items.length}}</strong> {{t.found}}</p>
  </div>
  <div class="fc-grid">
    {{#items}}<button type="button" class="fc-card mls-rise" style="animation-delay:calc({{index}} * .06s + .1s)" aria-pressed="false">
      <span class="fc-inner">
        <span class="fc-face fc-front"><span class="fc-num">{{number}}</span><span class="fc-term">{{{term}}}</span><i class="bi bi-arrow-repeat fc-turn" aria-hidden="true"></i></span>
        <span class="fc-face fc-back" aria-hidden="true" data-mls-speak="reveal"><span class="fc-term-sm">{{termText}}</span><span class="fc-def">{{{def}}}</span></span>
      </span>
    </button>{{/items}}
  </div>
</div>`,
  css: `:scope .fc-hint { color: var(--mls-muted); margin: 0 0 1rem; }
:scope .fc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(230px, 100%), 1fr)); gap: 1rem; }
:scope .fc-card { border: 0; padding: 0; background: none; perspective: 1000px; cursor: pointer; text-align: center; color: inherit; border-radius: 22px; }
:scope .fc-inner { display: grid; transition: transform .6s cubic-bezier(.3,1.4,.5,1); transform-style: preserve-3d; min-height: 190px; }
:scope .fc-card[aria-pressed="true"] .fc-inner { transform: rotateY(180deg); }
:scope .fc-face { grid-area: 1 / 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: .5rem;
  padding: 1.2rem; border-radius: 22px; backface-visibility: hidden; -webkit-backface-visibility: hidden; position: relative; }
:scope .fc-front { color: #fff; background: linear-gradient(140deg, var(--mls-primary), color-mix(in srgb, var(--mls-primary) 55%, var(--mls-secondary)));
  box-shadow: 0 16px 30px -16px var(--mls-primary); }
:scope .fc-card:nth-child(4n+2) .fc-front { background: linear-gradient(140deg, var(--mls-secondary), color-mix(in srgb, var(--mls-secondary) 60%, var(--mls-primary))); }
:scope .fc-card:nth-child(4n+3) .fc-front { background: linear-gradient(140deg, var(--mls-accent), color-mix(in srgb, var(--mls-accent) 50%, var(--mls-primary))); }
:scope .fc-card:nth-child(4n+4) .fc-front { background: linear-gradient(140deg, color-mix(in srgb, var(--mls-primary) 70%, #000), var(--mls-primary)); }
:scope .fc-back { transform: rotateY(180deg); background: var(--mls-surface); box-shadow: var(--mls-shadow); border: 2px solid var(--mls-soft); }
:scope .fc-num { position: absolute; top: .8rem; left: 1rem; font-weight: 800; opacity: .6; }
:scope .fc-turn { position: absolute; bottom: .8rem; right: 1rem; opacity: .75; font-size: 1.2rem; }
:scope .fc-term { font-size: clamp(1.2rem, 2.6cqw, 1.6rem); font-weight: 800; }
:scope .fc-term-sm { font-size: .78rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--mls-primary); }
:scope .fc-def { font-size: 1.02rem; line-height: 1.5; }
:scope .fc-card:hover .fc-inner { transform: translateY(-3px); }
:scope .fc-card[aria-pressed="true"]:hover .fc-inner { transform: rotateY(180deg) translateY(-3px); }
:scope .fc-card.is-seen .fc-front::after { content: "\\F26A"; font-family: bootstrap-icons; position: absolute; top: .7rem; right: .9rem; }
@container slide (max-width: 640px) {
  :scope .fc-inner { min-height: 140px; }
}`,
  js: `var cards = [].slice.call(root.querySelectorAll('.fc-card'));
var count = root.querySelector('.fc-count');
var seen = ctx.state.seen || (ctx.state.seen = {});
function refresh() { count.textContent = Object.keys(seen).length; }
cards.forEach(function (card, i) {
  var front = card.querySelector('.fc-front'), back = card.querySelector('.fc-back');
  card.addEventListener('click', function () {
    var on = card.getAttribute('aria-pressed') !== 'true';
    card.setAttribute('aria-pressed', on);
    front.setAttribute('aria-hidden', on);
    back.setAttribute('aria-hidden', !on);
    if (on) { seen[i] = true; card.classList.add('is-seen'); ctx.announce(back.textContent.trim()); ctx.speak(back); }
    refresh();
    if (Object.keys(seen).length === cards.length) ctx.announce(ctx.t('allFound'));
  });
});
refresh();`
});
