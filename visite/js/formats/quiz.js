MLS.formats.register({
  id: 'format-quiz',
  name: 'Quiz interactif',
  icon: 'bi-patch-question',
  category: 'Évaluation',
  description: 'QCM : « - [x] » = bonne réponse, « - [ ] » = mauvaise. Plusieurs [x] => choix multiple avec bouton Valider. Ajoutez « :: explication » à une réponse, et une citation « > » pour le feedback général. Le personnage réagit à la réponse.',
  sample: `<!-- character-role: mentor -->
<!-- character-expression: thinking -->
### Quel attribut décrit une image pour les lecteurs d’écran ?
- [ ] title :: Le title n’est pas lu de façon fiable.
- [x] alt :: Exact : l’alternative textuelle est lue à la place de l’image.
- [ ] src
- [ ] aria-hidden :: Au contraire, il masque l’élément !

> Une image décorative doit avoir un alt vide : alt="".`,
  i18n: {
    "fr": {
      "quiz": "Quiz",
      "multiple": "plusieurs réponses possibles",
      "choices": "Propositions de réponse",
      "validate": "Valider",
      "retry": "Réessayer",
      "correct": "Bonne réponse !",
      "wrong": "Pas tout à fait…",
      "noCorrect": "Aucune bonne réponse : cochez-en au moins une avec « - [x] »."
    },
    "en": {
      "quiz": "Quiz",
      "multiple": "several answers possible",
      "choices": "Answer options",
      "validate": "Check",
      "retry": "Try again",
      "correct": "Correct!",
      "wrong": "Not quite…",
      "noCorrect": "No correct answer: tick at least one with \"- [x]\".",
      "$name": "Interactive quiz",
      "$category": "Assessment",
      "$description": "Multiple choice: \"- [x]\" = correct, \"- [ ]\" = wrong. Several [x] => multiple answers with a Check button. Add \":: explanation\" to an answer, and a \"> \" quote for general feedback. The character reacts to the answer.",
      "$sample": "<!-- character-role: mentor -->\n<!-- character-expression: thinking -->\n### Which attribute describes an image for screen readers?\n- [ ] title :: The title is not read reliably.\n- [x] alt :: Exactly: the text alternative is read instead of the image.\n- [ ] src\n- [ ] aria-hidden :: On the contrary, it hides the element!\n\n> A decorative image must have an empty alt: alt=\"\"."
    }
  },
  template: `<div class="quiz{{#multiple}} is-multiple{{/multiple}}">
  <div class="quiz-head mls-rise">
    {{#character}}<div class="quiz-who">{{{avatar}}}</div>{{/character}}
    <div class="quiz-q mls-card">
      <span class="quiz-badge"><i class="bi bi-patch-question-fill"></i> {{t.quiz}}{{#multiple}} · {{t.multiple}}{{/multiple}}</span>
      <h2 class="mls-title">{{{titleHtml}}}</h2>
      {{#hasText}}<div class="mls-prose" data-mls-speak data-mls-speak-role="{{role}}">{{{text}}}</div>{{/hasText}}
    </div>
  </div>
  <div class="quiz-choices" role="group" aria-label="{{t.choices}}">
    {{#items}}<button type="button" class="quiz-choice mls-rise" style="animation-delay:calc({{index}} * .07s + .15s)" data-i="{{index}}" aria-pressed="false">
      <span class="quiz-letter" aria-hidden="true"></span><span class="quiz-label">{{{term}}}</span><i class="bi quiz-mark" aria-hidden="true"></i>
    </button>{{/items}}
  </div>
  <div class="quiz-actions">
    {{#multiple}}<button class="mls-btn quiz-validate" type="button" disabled><i class="bi bi-check2-square"></i> {{t.validate}}</button>{{/multiple}}
    <button class="mls-btn mls-btn-ghost quiz-retry" type="button" hidden><i class="bi bi-arrow-repeat"></i> {{t.retry}}</button>
  </div>
  <div class="quiz-feedback mls-card" hidden data-mls-speak data-mls-speak-role="{{role}}">
    <div class="quiz-verdict"></div>
    <ul class="quiz-explain"></ul>
    {{#quotes}}<div class="quiz-general mls-prose">{{{html}}}</div>{{/quotes}}
  </div>
</div>`,
  css: `:scope .quiz-head { display: flex; gap: 1.2rem; align-items: center; margin-bottom: 1.2rem; }
:scope .quiz-who .mls-avatar { width: clamp(90px, 16cqw, 140px); height: clamp(90px, 16cqw, 140px); }
:scope .quiz-q { flex: 1; }
:scope .quiz-q .mls-title { font-size: clamp(1.25rem, 3cqw, 1.9rem); }
:scope .quiz-badge { display: inline-flex; gap: .4rem; align-items: center; color: var(--mls-primary); font-weight: 800; font-size: .8rem;
  text-transform: uppercase; letter-spacing: .06em; margin-bottom: .4rem; }
:scope .quiz-choices { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; counter-reset: q; }
:scope .quiz-choice { counter-increment: q; display: flex; align-items: center; gap: .8rem; text-align: left; border: 2px solid transparent;
  background: var(--mls-surface); color: var(--mls-ink); border-radius: 18px; padding: .9rem 1rem; font-size: 1.05rem; cursor: pointer;
  box-shadow: 0 8px 22px -14px rgba(30,20,90,.4); transition: transform .15s, border-color .15s, background .2s; min-height: 60px; }
:scope .quiz-choice:not(:disabled):hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--mls-primary) 40%, transparent); }
:scope .quiz-letter::before { content: counter(q, upper-alpha); }
:scope .quiz-letter { flex: none; width: 2.2rem; height: 2.2rem; border-radius: 12px; display: grid; place-items: center; font-weight: 800;
  background: var(--mls-soft); color: var(--mls-primary); }
:scope .quiz-label { flex: 1; }
:scope .quiz-choice[aria-pressed="true"] { border-color: var(--mls-primary); }
:scope .quiz-choice[aria-pressed="true"] .quiz-letter { background: var(--mls-primary); color: #fff; }
:scope .quiz-choice:disabled { cursor: default; }
:scope .quiz-choice.is-correct { border-color: var(--mls-accent); background: color-mix(in srgb, var(--mls-accent) 14%, var(--mls-surface)); }
:scope .quiz-choice.is-correct .quiz-letter { background: var(--mls-accent); color: #fff; }
:scope .quiz-choice.is-correct .quiz-mark::before { content: "\\F26A"; color: var(--mls-accent); font-size: 1.4rem; }
:scope .quiz-choice.is-wrong { border-color: var(--mls-danger); background: color-mix(in srgb, var(--mls-danger) 10%, var(--mls-surface)); animation: quiz-shake .4s; }
:scope .quiz-choice.is-wrong .quiz-letter { background: var(--mls-danger); color: #fff; }
:scope .quiz-choice.is-wrong .quiz-mark::before { content: "\\F622"; color: var(--mls-danger); font-size: 1.4rem; }
:scope .quiz-choice.is-dim { opacity: .55; }
:scope .quiz-actions { display: flex; gap: .6rem; justify-content: center; margin-top: 1rem; }
:scope .quiz-actions:empty { display: none; }
:scope .quiz-feedback { margin-top: 1rem; border-left: 6px solid var(--mls-accent); animation: mls-rise .4s both; }
:scope .quiz-feedback.ko { border-left-color: var(--mls-danger); }
:scope .quiz-verdict { font-weight: 800; font-size: 1.2rem; display: flex; gap: .5rem; align-items: center; }
:scope .quiz-feedback.ok .quiz-verdict { color: var(--mls-accent); }
:scope .quiz-feedback.ko .quiz-verdict { color: var(--mls-danger); }
:scope .quiz-explain { margin: .5rem 0 0; padding-left: 1.1rem; }
:scope .quiz-explain:empty { display: none; }
:scope .quiz-general { margin-top: .6rem; color: var(--mls-muted); }
@keyframes quiz-shake { 25% { transform: translateX(-6px); } 50% { transform: translateX(6px); } 75% { transform: translateX(-3px); } }
@container slide (max-width: 640px) {
  :scope .quiz-choices { grid-template-columns: 1fr; }
  :scope .quiz-head { flex-direction: column; text-align: center; }
  :scope .quiz-q .mls-title::after { margin-inline: auto; }
}`,
  js: `var choices = [].slice.call(root.querySelectorAll('.quiz-choice'));
var fb = root.querySelector('.quiz-feedback');
var verdict = root.querySelector('.quiz-verdict');
var explain = root.querySelector('.quiz-explain');
var validate = root.querySelector('.quiz-validate');
var retry = root.querySelector('.quiz-retry');
var avatar = root.querySelector('.quiz-who .mls-avatar');
var startExpr = avatar ? avatar.getAttribute('data-mls-expr') : null;
var locked = false;
ctx.gradable();

if (!data.correctCount && ctx.mode !== 'standalone') {
  root.insertAdjacentHTML('afterbegin', '<div class="mls-error">' + ctx.t('noCorrect') + '</div>');
}

function selected() {
  return choices.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; })
    .map(function (c) { return +c.getAttribute('data-i'); });
}

function check() {
  locked = true;
  var sel = selected();
  var ok = data.items.every(function (it) { return it.checked === (sel.indexOf(it.index) !== -1); });
  var notes = '';
  choices.forEach(function (c) {
    var it = data.items[+c.getAttribute('data-i')];
    var picked = sel.indexOf(it.index) !== -1;
    c.disabled = true;
    c.classList.add(it.checked ? 'is-correct' : (picked ? 'is-wrong' : 'is-dim'));
    if (it.hasDef && (picked || it.checked)) notes += '<li><strong>' + it.term + '</strong> — ' + it.def + '</li>';
  });
  verdict.innerHTML = ok ? '<i class="bi bi-emoji-smile-fill"></i> ' + ctx.t('correct') : '<i class="bi bi-emoji-frown-fill"></i> ' + ctx.t('wrong');
  explain.innerHTML = notes;
  fb.classList.toggle('ok', ok);
  fb.classList.toggle('ko', !ok);
  fb.hidden = false;
  if (ctx.state.first === undefined) { ctx.state.first = ok; ctx.score(ok); }
  if (avatar) ctx.setExpression(avatar, ok ? 'happy' : 'concerned');
  retry.hidden = ok;
  if (validate) validate.hidden = true;
  ctx.announce(verdict.textContent + ' ' + explain.textContent);
  ctx.speakable(fb);
  ctx.speak(fb);
  fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function reset() {
  locked = false;
  choices.forEach(function (c) {
    c.disabled = false;
    c.setAttribute('aria-pressed', 'false');
    c.classList.remove('is-correct', 'is-wrong', 'is-dim');
  });
  fb.hidden = true;
  retry.hidden = true;
  if (validate) { validate.hidden = false; validate.disabled = true; }
  if (avatar && startExpr) ctx.setExpression(avatar, startExpr);
  if (choices[0]) choices[0].focus();
}

choices.forEach(function (c) {
  c.addEventListener('click', function () {
    if (locked) return;
    if (!data.multiple) {
      choices.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      c.setAttribute('aria-pressed', 'true');
      check();
    } else {
      c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      validate.disabled = selected().length === 0;
    }
  });
});
if (validate) validate.addEventListener('click', check);
retry.addEventListener('click', reset);`
});
