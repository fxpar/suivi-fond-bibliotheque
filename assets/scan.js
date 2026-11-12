/* Lecture d'un code-barres avec la caméra du téléphone.
   Deux lecteurs travaillent sur la même image :
   - BarcodeDetector natif (Chrome / Android), rapide ;
   - ZXing, réglé pour les étiquettes de bibliothèque (Codabar 14 chiffres, ITF, Code 39/128),
     sur une bande centrale de l'image en pleine résolution, mode « TRY_HARDER ».
   L'image reste dans le téléphone : rien n'est envoyé. */
'use strict';
(function (SF) {
  const ZXING = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
  const $ = s => document.querySelector(s);
  const dlg = $('#scanner'), video = $('#scanVideo'), msg = $('#scanMsg'), btn = $('#btnScan'), torchBtn = $('#scanTorch');

  const canScan = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && window.isSecureContext;
  btn.hidden = !(canScan && window.matchMedia('(pointer: coarse)').matches);

  let stream = null, timer = null, done = false, det = null, zx = null, torch = false;
  let last = { code: '', n: 0, t: 0 };
  const canvas = document.createElement('canvas');
  const ctx2d = canvas.getContext('2d', { willReadFrequently: true });

  async function loadZX() {
    if (zx) return zx;
    await SF.loadScript(ZXING);
    const Z = window.ZXing;
    const hints = new Map();
    hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.CODABAR, Z.BarcodeFormat.ITF, Z.BarcodeFormat.CODE_39, Z.BarcodeFormat.CODE_128, Z.BarcodeFormat.CODE_93, Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8]);
    hints.set(Z.DecodeHintType.TRY_HARDER, true);
    const reader = new Z.MultiFormatReader();
    reader.setHints(hints);
    zx = { Z, reader };
    return zx;
  }

  // Bande centrale (là où est le cadre doré), en pleine résolution ; une image sur deux, l'image entière
  let flip = false;
  function zxTry() {
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!zx || !vw) return null;
    flip = !flip;
    const sx = flip ? Math.round(vw * 0.03) : 0, sw = flip ? Math.round(vw * 0.94) : vw;
    const sy = flip ? Math.round(vh * 0.28) : 0, sh = flip ? Math.round(vh * 0.44) : vh;
    canvas.width = sw; canvas.height = sh;
    ctx2d.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    try {
      const { Z, reader } = zx;
      const bmp = new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(canvas)));
      return reader.decodeWithState(bmp).getText(); // decodeWithState garde nos réglages
    } catch (_) { return null; }
  }

  const digits = s => String(s).replace(/\D/g, '');
  const known = code => { const d = digits(code); return d.length >= 6 && SF.state.items.some(it => it.cb === d); };

  /** Un code connu de l'extraction est accepté tout de suite ; sinon on attend deux lectures identiques */
  function candidate(code) {
    if (!code) return false;
    if (known(code)) { found(code); return true; }
    const now = Date.now();
    if (code === last.code && now - last.t < 2500) last.n++; else last = { code, n: 1, t: now };
    last.t = now;
    if (last.n >= 2) { found(code); return true; }
    return false;
  }

  function stop() {
    clearTimeout(timer); timer = null;
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    video.srcObject = null;
    torch = false; torchBtn.hidden = true;
  }

  function found(code) {
    if (done) return;
    done = true;
    navigator.vibrate?.(80);
    stop();
    dlg.close();
    SF.findCode(code);
  }

  async function tick() {
    if (done || !stream) return;
    if (det) {
      try {
        const codes = await det.detect(video);
        if (codes.length) {
          const best = codes.find(c => known(c.rawValue)) || codes[0];
          if (candidate(best.rawValue)) return;
        }
      } catch (_) { /* image pas encore prête */ }
    }
    if (candidate(zxTry())) return;
    timer = setTimeout(tick, 80);
  }

  async function start() {
    done = false; last = { code: '', n: 0, t: 0 };
    msg.textContent = 'Visez le code-barres de l\'exemplaire';
    dlg.showModal();
    try {
      const zxReady = loadZX().catch(e => { console.warn('ZXing indisponible', e); });
      if ('BarcodeDetector' in window) {
        try {
          const fmts = await window.BarcodeDetector.getSupportedFormats();
          det = new window.BarcodeDetector({ formats: fmts.filter(f => !['qr_code', 'aztec', 'data_matrix', 'pdf417'].includes(f)) });
        } catch (_) { det = null; }
      }
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      video.srcObject = stream;
      await video.play();
      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities ? track.getCapabilities() : {};
      const adv = {};
      if (caps.focusMode && caps.focusMode.includes('continuous')) adv.focusMode = 'continuous';
      if (caps.zoom && caps.zoom.max >= 1.5) adv.zoom = Math.min(caps.zoom.max, 1.5); // un peu de zoom aide pour les codes fins
      if (Object.keys(adv).length) track.applyConstraints({ advanced: [adv] }).catch(() => {});
      torchBtn.hidden = !caps.torch;
      if (!det) { msg.textContent = 'Préparation du lecteur…'; await zxReady; msg.textContent = 'Visez le code-barres de l\'exemplaire'; }
      tick();
    } catch (e) {
      console.error(e);
      stop();
      msg.textContent = e && e.name === 'NotAllowedError'
        ? 'Accès à la caméra refusé. Autorisez-le dans les réglages du navigateur, ou tapez le code-barres.'
        : 'Caméra indisponible. Tapez le code-barres dans la recherche.';
    }
  }

  torchBtn.addEventListener('click', () => {
    if (!stream) return;
    torch = !torch;
    stream.getVideoTracks()[0].applyConstraints({ advanced: [{ torch }] }).catch(() => {});
    torchBtn.textContent = torch ? 'Éteindre la lampe' : 'Lampe';
  });
  btn.addEventListener('click', start);
  $('#scanClose').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', stop);
})(window.SF);
