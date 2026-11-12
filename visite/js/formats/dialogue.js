MLS.formats.register({
  id: 'format-dialogue',
  name: 'Dialogue avatar',
  icon: 'bi-chat-quote',
  category: 'Personnages',
  description: 'Bulles de dialogue entre personnages. Chaque citation « > » est une réplique ; changez d’interlocuteur avec <!-- character-role: … --> ou « > @peer: … ». Les répliques s’affichent une à une.',
  sample: `<!-- character-role: mentor -->
### Une situation du quotidien
> Bonjour ! Tu as déjà essayé de naviguer sur un site uniquement au clavier ?

<!-- character-role: peer -->
<!-- character-expression: surprised -->
> Euh… non, jamais. C’est vraiment utile ?

> @mentor(happy): Indispensable ! Beaucoup de personnes ne peuvent pas utiliser de souris.`,
  i18n: {
    "fr": {
      "more": "Suite"
    },
    "en": {
      "more": "Continue",
      "$name": "Character dialogue",
      "$category": "Characters",
      "$description": "Speech bubbles between characters. Each \"> \" quote is a line; switch speaker with <!-- character-role: … --> or \"> @peer: …\". Lines appear one by one.",
      "$sample": "<!-- character-role: mentor -->\n### An everyday situation\n> Hi! Have you ever tried browsing a website with the keyboard only?\n\n<!-- character-role: peer -->\n<!-- character-expression: surprised -->\n> Hmm… no, never. Is it really useful?\n\n> @mentor(happy): Essential! Many people cannot use a mouse."
    }
  },
  template: `<div class="dlg">
  {{#title}}<h2 class="mls-title">{{{titleHtml}}}</h2>{{/title}}
  {{#hasText}}<div class="mls-prose dlg-intro">{{{text}}}</div>{{/hasText}}
  <div class="dlg-lines">
    {{#lines}}<div class="dlg-line side-{{side}}" data-n="{{index}}">
      {{#character}}<div class="dlg-who">{{{avatar}}}<span class="dlg-name">{{{nameTag}}}</span></div>{{/character}}
      <div class="dlg-bubble" data-mls-speak="always" data-mls-speak-role="{{role}}">{{#character}}<span class="dlg-role" data-mls-nospeak>{{label}}</span>{{/character}}{{{html}}}</div>
    </div>{{/lines}}
  </div>
  {{#lines.1}}<div class="dlg-actions"><button class="mls-btn dlg-more" type="button"><i class="bi bi-chat-dots"></i> {{t.more}}</button></div>{{/lines.1}}
</div>`,
  css: `:scope .dlg-lines { display: flex; flex-direction: column; gap: 1.1rem; }
:scope .dlg-line { display: flex; gap: 1rem; align-items: flex-end; animation: dlg-in .45s cubic-bezier(.2,.9,.3,1.2) both; }
:scope .dlg-line.side-right { flex-direction: row-reverse; }
:scope .dlg-line.is-hidden { display: none; }
:scope .dlg-who { display: flex; flex-direction: column; align-items: center; gap: .3rem; flex: none; width: 110px; }
:scope .dlg-who .mls-avatar { width: 100px; height: 100px; }
:scope .dlg-name { font-weight: 700; font-size: .85rem; text-align: center; }
:scope .dlg-bubble { position: relative; min-width: 0; overflow-wrap: anywhere; background: var(--mls-surface); border-radius: 22px; padding: 1rem 1.25rem; box-shadow: var(--mls-shadow);
  font-size: clamp(1.02rem, 1.9cqw, 1.22rem); line-height: 1.55; max-width: 70ch; }
:scope .dlg-bubble p:last-child { margin-bottom: 0; }
:scope .side-right .mls-speak-btn { background: transparent; color: #fff; border-color: rgba(255,255,255,.5); }
:scope .side-left .dlg-bubble { border-bottom-left-radius: 6px; }
:scope .side-right .dlg-bubble { border-bottom-right-radius: 6px; background: var(--mls-primary); color: #fff; }
:scope .dlg-role { display: block; font-size: .72rem; text-transform: uppercase; letter-spacing: .07em; font-weight: 800; opacity: .7; margin-bottom: .2rem; }
:scope .dlg-actions { display: flex; justify-content: center; margin-top: 1.4rem; }
:scope .dlg-lines:only-child .dlg-bubble, :scope .dlg-line:only-child .dlg-bubble { font-size: clamp(1.15rem, 2.4cqw, 1.5rem); }
:scope .dlg-line:only-child .dlg-who .mls-avatar { width: 150px; height: 150px; }
:scope .dlg-line:only-child .dlg-who { width: 160px; }
@keyframes dlg-in { from { opacity: 0; transform: translateY(16px) scale(.97); } }
@container slide (max-width: 640px) {
  :scope .dlg-who { width: 64px; }
  :scope .dlg-who .mls-avatar, :scope .dlg-line:only-child .dlg-who .mls-avatar { width: 58px; height: 58px; border-width: 3px; }
  :scope .dlg-line:only-child .dlg-who { width: 64px; }
  :scope .dlg-name { font-size: .7rem; }
  :scope .dlg-line { gap: .6rem; }
}`,
  js: `var lines = [].slice.call(root.querySelectorAll('.dlg-line'));
var more = root.querySelector('.dlg-more');
if (!more || lines.length < 2) return;
var shown = ctx.state.shown || 1;
function update() {
  lines.forEach(function (l, i) { l.classList.toggle('is-hidden', i >= shown); });
  more.parentNode.hidden = shown >= lines.length;
}
more.addEventListener('click', function () {
  shown = Math.min(lines.length, shown + 1);
  ctx.state.shown = shown;
  update();
  var l = lines[shown - 1];
  ctx.announce(l.textContent.replace(/\\s+/g, ' ').trim());
  ctx.speak(l.querySelector('.dlg-bubble'));
  l.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (shown >= lines.length) lines[shown - 1].setAttribute('tabindex', '-1'), lines[shown - 1].focus({ preventScroll: true });
});
update();`
});
