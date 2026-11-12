/* Lecture d'un code-barres avec la caméra du téléphone.
   1) BarcodeDetector natif (Chrome / Android) ; 2) sinon ZXing chargé à la demande (iPhone…).
   L'image reste dans le téléphone : rien n'est envoyé. */
'use strict';
(function (SF) {
  const ZXING = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
  const $ = s => document.querySelector(s);
  const dlg = $('#scanner'), video = $('#scanVideo'), msg = $('#scanMsg'), btn = $('#btnScan');

  const canScan = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && window.isSecureContext;
  // bouton visible sur les appareils tactiles (téléphone, tablette)
  btn.hidden = !(canScan && window.matchMedia('(pointer: coarse)').matches);

  let stream = null, reader = null, timer = null, done = false;

  function stop() {
    clearTimeout(timer); timer = null;
    if (reader) { try { reader.reset(); } catch (_) { /* rien */ } reader = null; }
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    video.srcObject = null;
  }

  function found(code) {
    if (done) return;
    done = true;
    navigator.vibrate?.(80);
    stop();
    dlg.close();
    SF.findCode(code);
  }

  async function start() {
    done = false;
    msg.textContent = 'Visez le code-barres de l\'exemplaire';
    dlg.showModal();
    try {
      if ('BarcodeDetector' in window) {
        const fmts = await window.BarcodeDetector.getSupportedFormats();
        const det = new window.BarcodeDetector({ formats: fmts.filter(f => f !== 'qr_code') });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
        video.srcObject = stream;
        await video.play();
        const tick = async () => {
          if (done || !stream) return;
          try {
            const codes = await det.detect(video);
            if (codes.length) return found(codes[0].rawValue);
          } catch (_) { /* image pas encore prête */ }
          timer = setTimeout(tick, 150);
        };
        tick();
      } else {
        msg.textContent = 'Préparation du lecteur…';
        await SF.loadScript(ZXING);
        reader = new window.ZXing.BrowserMultiFormatReader();
        msg.textContent = 'Visez le code-barres de l\'exemplaire';
        await reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } }, audio: false }, video, res => { if (res) found(res.getText()); });
        stream = video.srcObject;
      }
    } catch (e) {
      console.error(e);
      stop();
      msg.textContent = e && e.name === 'NotAllowedError'
        ? 'Accès à la caméra refusé. Autorisez-le dans les réglages du navigateur, ou tapez le code-barres.'
        : 'Caméra indisponible. Tapez le code-barres dans la recherche.';
    }
  }

  btn.addEventListener('click', start);
  $('#scanClose').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', stop);
})(window.SF);
