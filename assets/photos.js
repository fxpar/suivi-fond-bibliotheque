/* Photos d'exemplaires : stockées dans le navigateur (IndexedDB), réduites avant stockage,
   exportées dans un ZIP avec le classeur (liens cliquables), réimportables depuis ce ZIP. */
'use strict';
window.SF = window.SF || {};

(function (SF) {
  const DBNAME = 'suivi-fonds', STORE = 'photos';
  const MAX = 1600, QUALITY = 0.82;
  let dbp = null;
  let memory = []; // repli si IndexedDB est indisponible (navigation privée…)

  function db() {
    if (!dbp) dbp = new Promise((ok, ko) => {
      if (!window.indexedDB) return ko(new Error('IndexedDB indisponible'));
      const rq = indexedDB.open(DBNAME, 1);
      rq.onupgradeneeded = () => {
        const os = rq.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        os.createIndex('k', 'k');
      };
      rq.onsuccess = () => ok(rq.result);
      rq.onerror = () => ko(rq.error);
    });
    return dbp;
  }
  const tx = async (mode, fn) => {
    const d = await db();
    return new Promise((ok, ko) => {
      const t = d.transaction(STORE, mode);
      const r = fn(t.objectStore(STORE));
      t.oncomplete = () => ok(r && 'result' in r ? r.result : undefined);
      t.onerror = () => ko(t.error);
    });
  };
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /** Réduit une photo (max 1600 px, JPEG) : ~200-400 Ko au lieu de plusieurs Mo */
  async function shrink(file) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (_) { bmp = await createImageBitmap(file); }
    const r = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * r); c.height = Math.round(bmp.height * r);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close?.();
    return new Promise(ok => c.toBlob(ok, 'image/jpeg', QUALITY));
  }

  SF.photos = {
    persistent: true,
    /** k : clé d'exemplaire (même clé que les notes de rayon) */
    async add(k, file, meta = {}) {
      const blob = meta.raw ? file : await shrink(file);
      const rec = { k, blob, date: meta.date || today(), uid: meta.uid || uid() };
      try { await tx('readwrite', s => s.add(rec)); }
      catch (_) { this.persistent = false; rec.id = memory.length + 1; memory.push(rec); }
      return rec;
    },
    async list(k) {
      try { return (await tx('readonly', s => s.index('k').getAll(k))) || []; }
      catch (_) { return memory.filter(r => r.k === k); }
    },
    async all() {
      try { return (await tx('readonly', s => s.getAll())) || []; }
      catch (_) { return memory.slice(); }
    },
    async remove(id) {
      try { await tx('readwrite', s => s.delete(id)); }
      catch (_) { memory = memory.filter(r => r.id !== id); }
    },
    async count() { return (await this.all()).length; },
    async clear() {
      try { await tx('readwrite', s => s.clear()); } catch (_) { /* rien */ }
      memory = [];
    },
    async hasUid(u) { return (await this.all()).some(r => r.uid === u); }
  };

  // ---------- noms de fichiers lisibles sur ordinateur ----------
  const safe = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[\\/:*?"<>|#%&{}$!'@`=+^~\[\];,]/g, ' ').replace(/\s+/g, ' ').trim();
  /** « B.D. ALA - Belladone - 31909016992146 - 2026-11-12 - 1.jpg » */
  SF.photoName = (it, date, n) => {
    const titre = safe(it.titre).slice(0, 50).trim();
    return `${safe(it.cote) || 'sans cote'} - ${titre || 'sans titre'}${it.cb ? ' - ' + it.cb : ''} - ${date} - ${n}.jpg`;
  };
})(window.SF);
