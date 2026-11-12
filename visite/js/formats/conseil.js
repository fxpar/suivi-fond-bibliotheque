MLS.formats.register({
  id: 'format-conseil',
  name: 'Conseil du personnage',
  icon: 'bi-lightbulb',
  category: 'Personnages',
  description: 'Encadré « astuce » porté par un personnage. Le badge est personnalisable avec <!-- badge: … -->.',
  sample: `<!-- character-role: mentor -->
<!-- character-expression: encouraging -->
<!-- badge: Astuce de pro -->
### Testez au clavier
Débranchez votre souris et parcourez votre page avec **Tab**, **Maj+Tab** et **Entrée**.

> Si vous ne voyez pas où se trouve le focus, c’est un problème !`,
  i18n: {
    "fr": {
      "badge": "Conseil"
    },
    "en": {
      "badge": "Tip",
      "$name": "Character tip",
      "$category": "Characters",
      "$description": "A \"tip\" box presented by a character. Customise the badge with <!-- badge: … -->.",
      "$sample": "<!-- character-role: mentor -->\n<!-- character-expression: encouraging -->\n<!-- badge: Pro tip -->\n### Test with the keyboard\nUnplug your mouse and browse your page with **Tab**, **Shift+Tab** and **Enter**.\n\n> If you cannot see where the focus is, that is a problem!"
    }
  },
  template: `<div class="tip">
  {{#character}}<div class="tip-who mls-rise">{{{avatar}}}<div class="tip-name">{{{nameTag}}}<small>{{label}}</small></div></div>{{/character}}
  <div class="tip-card mls-card mls-rise" style="animation-delay:.1s">
    <span class="tip-badge"><i class="bi bi-lightbulb-fill"></i> {{#meta.badge}}{{meta.badge}}{{/meta.badge}}{{^meta.badge}}{{t.badge}}{{/meta.badge}}</span>
    {{#title}}<h2 class="mls-title">{{{titleHtml}}}</h2>{{/title}}
    <div class="mls-prose" data-mls-speak data-mls-speak-role="{{role}}">{{{body}}}</div>
  </div>
</div>`,
  css: `:scope .tip { display: grid; grid-template-columns: auto 1fr; gap: clamp(16px, 4cqw, 40px); align-items: center; }
:scope .tip-who { display: flex; flex-direction: column; align-items: center; gap: .5rem; text-align: center; }
:scope .tip-who .mls-avatar { width: clamp(120px, 22cqw, 190px); height: clamp(120px, 22cqw, 190px); border-width: 6px;
  box-shadow: 0 0 0 8px color-mix(in srgb, var(--mls-warn) 35%, transparent), var(--mls-shadow); }
:scope .tip-name { font-weight: 800; display: flex; flex-direction: column; }
:scope .tip-name small { font-weight: 600; color: var(--mls-muted); }
:scope .tip-card { position: relative; border-top: 6px solid var(--mls-warn); }
:scope .tip-badge { display: inline-flex; gap: .4rem; align-items: center; background: color-mix(in srgb, var(--mls-warn) 22%, var(--mls-surface));
  color: color-mix(in srgb, var(--mls-warn) 45%, #000); font-weight: 800; font-size: .8rem; text-transform: uppercase; letter-spacing: .06em;
  padding: .3rem .75rem; border-radius: 999px; margin-bottom: .7rem; }
:scope blockquote { margin: 1rem 0 0; padding: .9rem 1.1rem; border-radius: 16px; background: var(--mls-soft); font-weight: 600; border-left: 5px solid var(--mls-primary); }
:scope blockquote p:last-child { margin: 0; }
@container slide (max-width: 640px) {
  :scope .tip { grid-template-columns: 1fr; }
  :scope .tip-who { flex-direction: row; text-align: left; }
  :scope .tip-who .mls-avatar { width: 80px; height: 80px; border-width: 4px; }
}`,
  js: ''
});
