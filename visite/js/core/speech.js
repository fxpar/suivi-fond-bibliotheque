/*!
 * Lecture à voix haute (Web Speech API, synthèse vocale du navigateur).
 * Outil de confort pour écouter les textes longs : il ne remplace pas
 * les lecteurs d'écran et n'interfère pas avec eux.
 */
(function (MLS) {
  'use strict';

  var synth = window.speechSynthesis;
  var supported = !!(synth && window.SpeechSynthesisUtterance);
  var listeners = [];
  var token = 0;
  var current = null;

  var MODES = [
    { id: 'off', label: 'Désactivée', icon: 'bi-volume-mute' },
    { id: 'click', label: 'Sur l’icône seulement', icon: 'bi-volume-up' },
    { id: 'interact', label: 'Quand j’ouvre un élément', icon: 'bi-hand-index' },
    { id: 'auto', label: 'Automatique', icon: 'bi-play-circle' }
  ];

  function voices() {
    if (!supported) return [];
    return synth.getVoices().slice().sort(function (a, b) {
      return a.lang === b.lang ? a.name.localeCompare(b.name) : a.lang.localeCompare(b.lang);
    });
  }

  function fire() { var v = voices(); listeners.forEach(function (fn) { try { fn(v); } catch (e) { console.error(e); } }); }
  if (supported) {
    if (synth.addEventListener) synth.addEventListener('voiceschanged', fire);
    else synth.onvoiceschanged = fire;
  }

  function findVoice(uri) {
    if (!uri) return null;
    var list = voices();
    for (var i = 0; i < list.length; i++) if (list[i].voiceURI === uri) return list[i];
    return null;
  }

  /** Voix correspondant à une langue (ex. "fr"), voix par défaut en premier. */
  function voicesFor(lang) {
    lang = String(lang || 'fr').toLowerCase().split(/[-_]/)[0];
    return voices().filter(function (v) { return v.lang.toLowerCase().replace('_', '-').split('-')[0] === lang; })
      .sort(function (a, b) { return (b.default ? 1 : 0) - (a.default ? 1 : 0) || (b.localService ? 1 : 0) - (a.localService ? 1 : 0); });
  }

  /** Découpe en morceaux courts (Chrome interrompt les énoncés trop longs). */
  function chunks(text) {
    var sentences = String(text || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?…;:])\s+/);
    var out = [], buf = '';
    sentences.forEach(function (s) {
      if ((buf + ' ' + s).length > 220 && buf) { out.push(buf); buf = s; }
      else buf = buf ? buf + ' ' + s : s;
    });
    if (buf) out.push(buf);
    return out.filter(function (c) { return /\w/.test(c); });
  }

  function cancel() {
    token++;
    var c = current;
    current = null;
    if (supported) synth.cancel();
    if (c && c.onEnd) c.onEnd();
  }

  /**
   * Lit une suite d'éléments.
   * @param {Array<{text:string, voice?:string, ref?:any}>} items
   * @param {{rate?:number, lang?:string, onItem?:function, onEnd?:function}} o
   */
  function speak(items, o) {
    if (!supported) return;
    o = o || {};
    cancel();
    var my = token;
    current = o;
    var queue = [];
    items.forEach(function (it) {
      chunks(it.text).forEach(function (c, i) { queue.push({ text: c, voice: it.voice, item: it, first: i === 0 }); });
    });
    var i = 0;
    function next() {
      if (my !== token) return;
      if (i >= queue.length) { current = null; if (o.onEnd) o.onEnd(); return; }
      var q = queue[i++];
      var u = new SpeechSynthesisUtterance(q.text);
      var v = findVoice(q.voice) || voicesFor(o.lang)[0];
      if (v) { u.voice = v; u.lang = v.lang; } else if (o.lang) u.lang = o.lang;
      u.rate = o.rate || 1;
      if (q.first && o.onItem) o.onItem(q.item);
      u.onend = next;
      u.onerror = function (e) { if (my === token && e.error !== 'interrupted' && e.error !== 'canceled') next(); };
      synth.speak(u);
    }
    // petit délai : Chrome ignore parfois un speak() immédiatement après cancel()
    setTimeout(next, 80);
  }

  MLS.speech = {
    supported: supported,
    MODES: MODES,
    voices: voices,
    voicesFor: voicesFor,
    findVoice: findVoice,
    onVoices: function (fn) { listeners.push(fn); },
    speak: speak,
    cancel: cancel,
    isSpeaking: function () { return !!current; },
    settings: function () {
      var s = MLS.store.get('tts', null) || {};
      return { mode: s.mode || 'click', rate: s.rate || 1 };
    },
    saveSettings: function (s) { MLS.store.set('tts', s); }
  };
})(window.MLS);
