/*!
 * Pont SCORM 1.2 minimal (actif seulement si le paquet a été exporté avec l'option SCORM
 * et qu'un LMS expose l'API). Sans LMS, toutes les méthodes sont silencieuses.
 */
(function (MLS) {
  'use strict';

  function findAPI(win) {
    var tries = 0;
    while (win && tries < 10) {
      try { if (win.API) return win.API; } catch (e) { return null; }
      if (win.parent === win) break;
      win = win.parent;
      tries++;
    }
    return null;
  }

  var api = null, active = false, finished = false;

  MLS.scorm = {
    init: function () {
      if (!window.MLS_COURSE || !window.MLS_COURSE.scorm) return false;
      api = findAPI(window) || (window.opener ? findAPI(window.opener) : null);
      if (!api) return false;
      active = String(api.LMSInitialize('')) === 'true';
      if (active) {
        var st = api.LMSGetValue('cmi.core.lesson_status');
        if (!st || st === 'not attempted') api.LMSSetValue('cmi.core.lesson_status', 'incomplete');
        window.addEventListener('beforeunload', function () { MLS.scorm.finish(); });
      }
      return active;
    },
    isActive: function () { return active; },
    getLocation: function () {
      if (!active) return null;
      var v = api.LMSGetValue('cmi.core.lesson_location');
      return v === '' ? null : parseInt(v, 10);
    },
    setLocation: function (i) {
      if (!active) return;
      api.LMSSetValue('cmi.core.lesson_location', String(i));
      api.LMSCommit('');
    },
    complete: function (score, max) {
      if (!active) return;
      if (max > 0) {
        api.LMSSetValue('cmi.core.score.min', '0');
        api.LMSSetValue('cmi.core.score.max', '100');
        api.LMSSetValue('cmi.core.score.raw', String(Math.round(score / max * 100)));
      }
      api.LMSSetValue('cmi.core.lesson_status', 'completed');
      api.LMSCommit('');
    },
    finish: function () {
      if (!active || finished) return;
      finished = true;
      api.LMSFinish('');
    }
  };
})(window.MLS);
