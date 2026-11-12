MLS.formats.register({
  id: 'format-title',
  name: 'Couverture',
  icon: 'bi-easel2',
  category: 'Structure',
  description: 'Slide d’ouverture ou de chapitre : grand titre, accroche, visuel (image ou personnage) et bouton pour démarrer.',
  sample: `<!-- character-role: mentor -->
<!-- character-expression: happy -->
<!-- eyebrow: Chapitre 1 -->
### Bienvenue dans le module
Une introduction rapide, ludique et interactive.`,
  i18n: {
    "fr": {
      "go": "C’est parti"
    },
    "en": {
      "go": "Let’s go",
      "$name": "Cover",
      "$category": "Structure",
      "$description": "Opening or chapter slide: large title, hook, visual (image or character) and a button to start.",
      "$sample": "<!-- character-role: mentor -->\n<!-- character-expression: happy -->\n<!-- eyebrow: Chapter 1 -->\n### Welcome to the module\nA quick, playful and interactive introduction."
    }
  },
  template: `<div class="cover">
  <div class="cover-text mls-rise">
    <span class="mls-eyebrow"><i class="bi bi-stars"></i> {{#meta.eyebrow}}{{meta.eyebrow}}{{/meta.eyebrow}}{{^meta.eyebrow}}{{course.title}}{{/meta.eyebrow}}</span>
    <h2 class="cover-title">{{{titleHtml}}}</h2>
    {{#hasText}}<div class="cover-sub mls-prose">{{{text}}}</div>{{/hasText}}
    <button class="mls-btn cover-go" type="button"><i class="bi bi-play-fill"></i> {{#meta.button}}{{meta.button}}{{/meta.button}}{{^meta.button}}{{t.go}}{{/meta.button}}</button>
  </div>
  <div class="cover-visual mls-rise" style="animation-delay:.15s">
    <span class="cover-ring r1"></span><span class="cover-ring r2"></span>
    {{#image}}<img class="cover-img" src="{{src}}" alt="{{alt}}">{{/image}}
    {{^image}}{{#character}}{{{avatar}}}{{/character}}{{^character}}<div class="cover-shape"><i class="bi bi-lightning-charge-fill"></i></div>{{/character}}{{/image}}
  </div>
</div>`,
  css: `:scope .cover { display: grid; grid-template-columns: 1.15fr .85fr; gap: clamp(20px, 5cqw, 64px); align-items: center; }
:scope .cover-title { font-size: clamp(2rem, 6.5cqw, 4rem); font-weight: 900; line-height: 1.02; letter-spacing: -.02em; margin: .8rem 0;
  background: linear-gradient(120deg, var(--mls-ink) 30%, var(--mls-primary)); -webkit-background-clip: text; background-clip: text; color: transparent; }
:scope .cover-sub { color: var(--mls-muted); font-size: clamp(1.05rem, 2cqw, 1.3rem); max-width: 46ch; margin-bottom: 1.4rem; }
:scope .cover-visual { position: relative; aspect-ratio: 1; display: grid; place-items: center; }
:scope .cover-ring { position: absolute; border-radius: 50%; inset: 6%; background: linear-gradient(135deg, var(--mls-primary), var(--mls-secondary)); opacity: .9; }
:scope .cover-ring.r2 { inset: -2%; background: none; border: 3px dashed color-mix(in srgb, var(--mls-primary) 40%, transparent); opacity: 1;
  animation: cover-spin 40s linear infinite; }
:scope .cover-visual .mls-avatar { position: relative; width: 78%; height: 78%; border-width: 8px; background: var(--mls-surface); }
:scope .cover-img { position: relative; width: 78%; height: 78%; object-fit: cover; border-radius: 50%; border: 8px solid var(--mls-surface); }
:scope .cover-shape { position: relative; font-size: clamp(4rem, 14cqw, 9rem); color: #fff; }
@keyframes cover-spin { to { transform: rotate(360deg); } }
@container slide (max-width: 640px) {
  :scope .cover { grid-template-columns: 1fr; text-align: center; }
  :scope .cover-visual { order: -1; width: min(240px, 70%); margin: 0 auto; }
  :scope .cover-sub { margin-inline: auto; }
}`,
  js: `var go = root.querySelector('.cover-go');
if (go) go.addEventListener('click', function () { ctx.next(); });`
});
