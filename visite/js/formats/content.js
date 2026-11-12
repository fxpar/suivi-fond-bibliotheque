MLS.formats.register({
  id: 'format-content',
  name: 'Contenu',
  icon: 'bi-file-earmark-text',
  category: 'Structure',
  description: 'Slide de contenu classique : texte riche, listes, tableaux. Si une image est présente, elle s’affiche à côté du texte (dessous sur mobile).',
  sample: `### Pourquoi l’accessibilité ?
L’accessibilité numérique permet à **toutes et tous** d’utiliser un service, quelles que soient leurs capacités.

- 1 personne sur 5 vit avec un handicap
- Le handicap peut être permanent, temporaire ou situationnel

![Illustration](assets/images/accessibilite.svg)`,
  i18n: {
    "en": {
      "$name": "Content",
      "$category": "Structure",
      "$description": "Classic content slide: rich text, lists, tables. An image on its own line is shown next to the text (below on mobile).",
      "$sample": "### Why accessibility?\nDigital accessibility lets **everyone** use a service, whatever their abilities.\n\n- 1 person in 5 lives with a disability\n- Disability can be permanent, temporary or situational\n\n![Illustration](assets/images/accessibilite.svg)"
    }
  },
  template: `<div class="content mls-card mls-rise{{#hasImage}} has-image{{/hasImage}}">
  <div class="content-main">
    {{#title}}<h2 class="mls-title">{{{titleHtml}}}</h2>{{/title}}
    <div class="mls-prose" data-mls-speak>{{{content}}}</div>
  </div>
  {{#image}}<figure class="content-fig"><img src="{{src}}" alt="{{alt}}"></figure>{{/image}}
</div>`,
  css: `:scope .content.has-image { display: grid; grid-template-columns: 1.2fr 1fr; gap: clamp(18px, 4cqw, 48px); align-items: center; }
:scope .content-fig { margin: 0; }
:scope .content-fig img { width: 100%; border-radius: 18px; display: block; }
:scope .mls-prose ul { padding-left: 0; list-style: none; }
:scope .mls-prose ul li { position: relative; padding-left: 1.8rem; margin: .45rem 0; }
:scope .mls-prose ul li::before { content: "\\F26A"; font-family: bootstrap-icons; position: absolute; left: 0; top: .05em; color: var(--mls-accent); }
:scope blockquote { border-left: 5px solid var(--mls-secondary); background: var(--mls-soft); margin: 1rem 0; padding: .8rem 1rem; border-radius: 0 14px 14px 0; }
@container slide (max-width: 640px) {
  :scope .content.has-image { grid-template-columns: 1fr; }
}`,
  js: ''
});
