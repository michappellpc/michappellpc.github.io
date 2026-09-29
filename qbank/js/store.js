// Persistence layer (localStorage). Swap this file for a backend later without touching app.js.
const Store = (() => {
  const KEY = 'qbank.v1';
  const blank = () => ({ q: {}, tests: [], active: null, settings: { theme: 'auto' } });
  let d;
  try { d = JSON.parse(localStorage.getItem(KEY)) || blank(); } catch { d = blank(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} };
  // q[id] = { seen, correct, wrong, flagged, note, last: 'c'|'w' }
  const qs = id => (d.q[id] ||= { seen: 0, correct: 0, wrong: 0, flagged: false, note: '', last: null });
  return {
    get data() { return d; }, save,
    qstat: id => d.q[id] || null,
    record(id, ok) { const s = qs(id); s.seen++; ok ? s.correct++ : s.wrong++; s.last = ok ? 'c' : 'w'; save(); },
    toggleFlag(id) { const s = qs(id); s.flagged = !s.flagged; save(); return s.flagged; },
    setNote(id, t) { qs(id).note = t; save(); },
    exportJSON: () => JSON.stringify(d, null, 2),
    importJSON(t) { const o = JSON.parse(t); if (!o || typeof o !== 'object' || !o.q || !Array.isArray(o.tests)) throw new Error('Not a QBank export'); d = { ...blank(), ...o }; save(); },
    reset() { d = blank(); save(); }
  };
})();
