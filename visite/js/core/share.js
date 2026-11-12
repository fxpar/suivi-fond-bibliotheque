/*!
 * Liens de partage : le Markdown d'un cours est compressé (deflate) puis encodé
 * en base64url, pour tenir dans l'ancre d'une URL (view.html#z=…).
 * L'ancre n'est jamais envoyée au serveur.
 */
(function (MLS) {
  'use strict';

  function supported() { return typeof CompressionStream === 'function' && typeof DecompressionStream === 'function'; }

  function toB64url(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromB64url(str) {
    var b = String(str).replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
    while (b.length % 4) b += '=';
    var bin = atob(b), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function pipe(bytes, stream) {
    var piped = new Blob([bytes]).stream().pipeThrough(stream);
    return new Response(piped).arrayBuffer().then(function (buf) { return new Uint8Array(buf); });
  }

  MLS.share = {
    supported: supported,

    /** Markdown → chaîne compacte (Promise). */
    encode: function (md) {
      if (!supported()) return Promise.reject(new Error('compression unsupported'));
      return pipe(new TextEncoder().encode(md), new CompressionStream('deflate-raw')).then(toB64url);
    },

    /** Chaîne compacte → Markdown (Promise). */
    decode: function (str) {
      if (!supported()) return Promise.reject(new Error('compression unsupported'));
      return pipe(fromB64url(str), new DecompressionStream('deflate-raw')).then(function (b) { return new TextDecoder().decode(b); });
    },

    /** Adresse absolue de view.html, à côté de la page courante. */
    viewUrl: function () { return new URL('view.html', location.href).href; }
  };
})(window.MLS);
