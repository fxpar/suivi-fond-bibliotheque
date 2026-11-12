/*!
 * Internationalisation (FR / EN pour commencer).
 *  - Player : langue donnée par le front-matter du cours (`lang: en`).
 *  - Studio / Lab : langue de l'interface choisie par l'utilisateur.
 * Ajouter une langue = ajouter un dictionnaire via MLS.i18n.add('es', {...}).
 */
(function (MLS) {
  'use strict';

  var dict = { fr: {}, en: {} };
  var NAMES = { fr: 'Français', en: 'English' };
  var FALLBACK = 'en';

  function pick(lang) {
    var l = String(lang || 'fr').toLowerCase().split(/[-_]/)[0];
    return dict[l] ? l : (l === 'fr' ? 'fr' : FALLBACK);
  }

  function fmt(s, vars) {
    if (!vars) return s;
    return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
  }

  function t(lang, key, vars) {
    var l = pick(lang);
    var s = dict[l][key];
    if (s == null) s = dict.fr[key];
    if (s == null) s = key;
    return fmt(s, vars);
  }

  MLS.i18n = {
    names: NAMES,
    langs: function () { return Object.keys(dict); },
    add: function (lang, obj, name) {
      dict[lang] = dict[lang] || {};
      Object.keys(obj).forEach(function (k) { dict[lang][k] = obj[k]; });
      if (name) NAMES[lang] = name;
    },
    pick: pick,
    t: t,
    format: fmt,
    translator: function (lang) { return function (key, vars) { return t(lang, key, vars); }; },
    /** Dictionnaire complet (clés -> textes) pour une langue, avec repli sur le français. */
    table: function (lang) {
      var l = pick(lang), out = {};
      Object.keys(dict.fr).forEach(function (k) { out[k] = dict.fr[k]; });
      Object.keys(dict[l]).forEach(function (k) { out[k] = dict[l][k]; });
      return out;
    },
    /** Valeur localisée d'un champ pouvant être une chaîne ou un objet {fr, en}. */
    local: function (v, lang) {
      if (v && typeof v === 'object') return v[pick(lang)] || v.fr || v.en || '';
      return v || '';
    },

    /* ---------- Interface du Studio / Lab ---------- */
    uiLang: function () {
      var saved = MLS.store.get('ui.lang', null);
      if (saved && dict[saved]) return saved;
      return /^fr/i.test(navigator.language || '') ? 'fr' : 'en';
    },
    setUiLang: function (l) { MLS.store.set('ui.lang', pick(l)); },
    /**
     * Traduit le DOM : data-i18n (texte), data-i18n-html, data-i18n-title,
     * data-i18n-aria (aria-label), data-i18n-placeholder.
     */
    apply: function (root, lang) {
      root = root || document;
      lang = lang || this.uiLang();
      document.documentElement.lang = lang;
      root.querySelectorAll('[data-i18n]').forEach(function (e) { e.textContent = t(lang, e.getAttribute('data-i18n')); });
      root.querySelectorAll('[data-i18n-html]').forEach(function (e) { e.innerHTML = t(lang, e.getAttribute('data-i18n-html')); });
      root.querySelectorAll('[data-i18n-title]').forEach(function (e) { e.title = t(lang, e.getAttribute('data-i18n-title')); });
      root.querySelectorAll('[data-i18n-aria]').forEach(function (e) { e.setAttribute('aria-label', t(lang, e.getAttribute('data-i18n-aria'))); });
      root.querySelectorAll('[data-i18n-placeholder]').forEach(function (e) { e.placeholder = t(lang, e.getAttribute('data-i18n-placeholder')); });
    }
  };

  /* ================================================================
     Textes du player (slideshow) — utilisés aussi dans les exports
     ================================================================ */
  MLS.i18n.add('fr', {
    'p.toc': 'Sommaire',
    'p.closeToc': 'Fermer le sommaire',
    'p.castAudio': 'Personnages et lecture audio',
    'p.fullscreen': 'Plein écran',
    'p.stopAudio': 'Arrêter la lecture audio',
    'p.progress': 'Progression',
    'p.navigation': 'Navigation des slides',
    'p.prev': 'Précédent',
    'p.next': 'Suivant',
    'p.finish': 'Terminer',
    'p.slide': 'Slide {n}',
    'p.slideOf': 'Slide {n} sur {total}',
    'p.slideError': 'Cette slide n’a pas pu être affichée.',
    'p.devError': 'Erreur de {kind} ({format}, slide {n}) : {msg}',
    'p.kind.template': 'gabarit',
    'p.kind.script': 'script',
    'p.moduleEyebrow': 'Module de formation',
    'p.slidesCount': '{n} slides',
    'p.chooseCast': 'Choisissez vos personnages',
    'p.chooseCastHint': 'Ils vous accompagneront tout au long du module. Vous pourrez les changer à tout moment avec le bouton <i class="bi bi-people"></i>.',
    'p.filterAria': 'Filtrer les personnages',
    'p.castFor': 'Personnage pour : {label}',
    'p.castAnnounce': '{name} sera : {label}',
    'p.filter.all': 'Tous',
    'p.filter.femme': 'Femmes',
    'p.filter.homme': 'Hommes',
    'p.filter.non-binaire': 'Non-binaire',
    'p.filter.senior': 'Seniors',
    'p.filter.jeune': 'Jeunes',
    'p.filter.handicap': 'Situation de handicap',
    'p.restart': 'Recommencer',
    'p.resume': 'Reprendre (slide {n})',
    'p.validate': 'Valider',
    'p.start': 'Commencer',
    'p.close': 'Fermer',
    'p.endTitle': 'Module terminé !',
    'p.endPerfect': 'Parfait, toutes vos réponses sont justes.',
    'p.endGood': 'Bien joué ! Vous pouvez revoir les points manqués.',
    'p.endLow': 'Revoyez le module pour consolider vos acquis.',
    'p.endThanks': 'Merci d’avoir suivi ce module.',
    'p.review': 'Revoir le module',
    'dg.hint': 'Cliquez sur chaque partie pour la découvrir.',
    'dg.hintPuzzle': 'Reconstituez le puzzle : cliquez sur chaque pièce pour la mettre en place.',
    'dg.explored': '{n} / {total} découvertes',
    'dg.prev': 'Partie précédente',
    'dg.next': 'Partie suivante',
    'dg.play': 'Lecture',
    'dg.pause': 'Pause',
    'dg.synthesis': 'Synthèse',
    'dg.complete': 'Bravo, le puzzle est complet !',
    'dg.empty': 'Ajoutez des éléments de liste « - **Partie** :: explication ».',
    'p.moduleOf': 'Module {n} / {total}',
    'p.chapterOf': 'Chapitre {n}/{total}',
    'p.chaptersCount': '{n} chapitres',
    'p.intro': 'Introduction',
    'p.moduleDone': 'Module {n} / {total} terminé !',
    'p.courseDone': 'Parcours terminé, bravo !',
    'p.courseProgress': 'Progression du parcours',
    'p.path.done': 'Module {n} : terminé',
    'p.path.current': 'Module {n} : en cours',
    'p.path.todo': 'Module {n} : à faire',
    'p.upNext': 'À suivre',
    'p.goNext': 'Module suivant',
    'p.backToLms': 'Retournez à votre plateforme de formation pour ouvrir le module suivant.',
    'p.nextNoLink': 'Ouvrez-le depuis votre espace de formation.',
    // audio
    'a.title': 'Lecture à voix haute',
    'a.hint': 'Pour écouter les textes un peu longs plutôt que de les lire. Cet outil de confort ne remplace pas votre lecteur d’écran et n’interfère pas avec lui.',
    'a.modeAria': 'Mode de lecture audio',
    'a.mode.off': 'Désactivée',
    'a.mode.click': 'Sur l’icône seulement',
    'a.mode.interact': 'Quand j’ouvre un élément',
    'a.mode.auto': 'Automatique',
    'a.hint.off': 'Aucune lecture audio, les icônes sont masquées.',
    'a.hint.click': 'Une icône <i class="bi bi-volume-up-fill"></i> apparaît à côté des textes longs : touchez-la pour les écouter.',
    'a.hint.interact': 'Icônes, et lecture quand vous ouvrez un élément : point d’une image, carte, étape, onglet, réplique, correction de quiz…',
    'a.hint.auto': 'Les textes longs et les dialogues sont lus dès l’affichage de chaque slide, ainsi que les éléments que vous ouvrez.',
    'a.voice': 'Voix',
    'a.narrator': 'Voix du narrateur',
    'a.speed': 'Vitesse',
    'a.test': 'Tester',
    'a.noVoice': 'Aucune voix de synthèse n’est disponible dans ce navigateur.',
    'a.noVoiceShort': 'Aucune voix',
    'a.groupMine': 'Langue du module',
    'a.defaultVoice': 'Voix par défaut du navigateur (aucune voix installée pour cette langue)',
    'a.groupOther': 'Autres langues',
    'a.online': 'en ligne',
    'a.listen': 'Écouter ce texte',
    'a.stop': 'Arrêter la lecture',
    'a.testNarrator': 'Bonjour ! Voici la voix qui lira les textes de ce module.',
    'a.testRole': 'Bonjour, je suis {name}, {label}.'
  });

  MLS.i18n.add('en', {
    'p.toc': 'Contents',
    'p.closeToc': 'Close contents',
    'p.castAudio': 'Characters and read-aloud',
    'p.fullscreen': 'Full screen',
    'p.stopAudio': 'Stop reading aloud',
    'p.progress': 'Progress',
    'p.navigation': 'Slide navigation',
    'p.prev': 'Previous',
    'p.next': 'Next',
    'p.finish': 'Finish',
    'p.slide': 'Slide {n}',
    'p.slideOf': 'Slide {n} of {total}',
    'p.slideError': 'This slide could not be displayed.',
    'p.devError': '{kind} error ({format}, slide {n}): {msg}',
    'p.kind.template': 'Template',
    'p.kind.script': 'Script',
    'p.moduleEyebrow': 'Learning module',
    'p.slidesCount': '{n} slides',
    'p.chooseCast': 'Choose your characters',
    'p.chooseCastHint': 'They will guide you throughout the module. You can change them at any time with the <i class="bi bi-people"></i> button.',
    'p.filterAria': 'Filter characters',
    'p.castFor': 'Character for: {label}',
    'p.castAnnounce': '{name} will be: {label}',
    'p.filter.all': 'All',
    'p.filter.femme': 'Women',
    'p.filter.homme': 'Men',
    'p.filter.non-binaire': 'Non-binary',
    'p.filter.senior': 'Seniors',
    'p.filter.jeune': 'Young',
    'p.filter.handicap': 'Disability',
    'p.restart': 'Start over',
    'p.resume': 'Resume (slide {n})',
    'p.validate': 'Done',
    'p.start': 'Start',
    'p.close': 'Close',
    'p.endTitle': 'Module complete!',
    'p.endPerfect': 'Perfect, all your answers are correct.',
    'p.endGood': 'Well done! You can review the points you missed.',
    'p.endLow': 'Review the module to strengthen what you learned.',
    'p.endThanks': 'Thank you for following this module.',
    'p.review': 'Review the module',
    'dg.hint': 'Click each part to discover it.',
    'dg.hintPuzzle': 'Rebuild the puzzle: click each piece to put it in place.',
    'dg.explored': '{n} / {total} discovered',
    'dg.prev': 'Previous part',
    'dg.next': 'Next part',
    'dg.play': 'Play',
    'dg.pause': 'Pause',
    'dg.synthesis': 'Takeaway',
    'dg.complete': 'Well done, the puzzle is complete!',
    'dg.empty': 'Add list items "- **Part** :: explanation".',
    'p.moduleOf': 'Module {n} / {total}',
    'p.chapterOf': 'Chapter {n}/{total}',
    'p.chaptersCount': '{n} chapters',
    'p.intro': 'Introduction',
    'p.moduleDone': 'Module {n} of {total} complete!',
    'p.courseDone': 'Course complete, well done!',
    'p.courseProgress': 'Course progress',
    'p.path.done': 'Module {n}: completed',
    'p.path.current': 'Module {n}: in progress',
    'p.path.todo': 'Module {n}: to do',
    'p.upNext': 'Up next',
    'p.goNext': 'Next module',
    'p.backToLms': 'Go back to your learning platform to open the next module.',
    'p.nextNoLink': 'Open it from your learning space.',
    'a.title': 'Read aloud',
    'a.hint': 'Listen to longer texts instead of reading them. This convenience tool does not replace your screen reader and does not interfere with it.',
    'a.modeAria': 'Read-aloud mode',
    'a.mode.off': 'Off',
    'a.mode.click': 'Icon only',
    'a.mode.interact': 'When I open an item',
    'a.mode.auto': 'Automatic',
    'a.hint.off': 'No read-aloud, icons are hidden.',
    'a.hint.click': 'An <i class="bi bi-volume-up-fill"></i> icon appears next to longer texts: tap it to listen.',
    'a.hint.interact': 'Icons, plus reading when you open an item: image hotspot, card, step, tab, dialogue line, quiz feedback…',
    'a.hint.auto': 'Longer texts and dialogues are read as soon as each slide appears, as well as the items you open.',
    'a.voice': 'Voice',
    'a.narrator': 'Narrator voice',
    'a.speed': 'Speed',
    'a.test': 'Test',
    'a.noVoice': 'No speech synthesis voice is available in this browser.',
    'a.noVoiceShort': 'No voice',
    'a.groupMine': 'Module language',
    'a.defaultVoice': 'Browser default voice (no voice installed for this language)',
    'a.groupOther': 'Other languages',
    'a.online': 'online',
    'a.listen': 'Listen to this text',
    'a.stop': 'Stop reading',
    'a.testNarrator': 'Hello! This is the voice that will read the texts of this module.',
    'a.testRole': 'Hello, I am {name}, {label}.'
  });
})(window.MLS);
