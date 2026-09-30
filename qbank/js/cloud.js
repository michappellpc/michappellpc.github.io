'use strict';
// Cloud accounts (Supabase). Completely off unless data/config.json has supabase.url and supabase.anonKey,
// in which case the app requires sign-in and keeps questions and progress in the private database.
// Progress is offline-first: the device is the working copy, changes are queued and sent when online.
const Cloud = (() => {
  let cfg = null, session = null, refreshing = null, syncing = null, timer = null, lastSync = 0, onAuthLost = () => {};
  const S_KEY = 'qbank.session';
  const now = () => Math.floor(Date.now() / 1000);
  const jget = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const jdel = k => { try { localStorage.removeItem(k); } catch {} };
  const claims = t => { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { return {}; } };
  const uid = () => session && session.uid;
  const qKey = () => `qbank.queue.${uid()}`;
  const pKey = () => `qbank.profile.${uid()}`;

  // ---- tiny IndexedDB key/value store for the question cache (too big for localStorage) ----
  const idb = () => new Promise((res, rej) => { const r = indexedDB.open('qbank', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const kv = async (mode, fn) => { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction('kv', mode), out = fn(tx.objectStore('kv')); tx.oncomplete = () => res(out && out.result); tx.onerror = () => rej(tx.error); }); };
  const cacheGet = k => kv('readonly', s => s.get(k)).catch(() => null);
  const cacheSet = (k, v) => kv('readwrite', s => s.put(v, k)).catch(() => {});
  const cacheClear = () => kv('readwrite', s => s.clear()).catch(() => {});

  const authError = m => Object.assign(new Error(m || 'Please sign in again.'), { auth: true });
  const offlineError = () => Object.assign(new Error('No connection.'), { offline: true });

  async function raw(path, { method = 'GET', body, headers = {}, bearer } = {}) {
    // Newer Supabase keys (sb_publishable_...) are not JWTs and must only be sent in the apikey header.
    const h = { apikey: cfg.key, ...headers }, auth = bearer || (cfg.key.split('.').length === 3 ? cfg.key : '');
    if (auth) h.Authorization = 'Bearer ' + auth;
    if (body !== undefined) h['Content-Type'] = 'application/json';
    let res;
    try { res = await fetch(cfg.url + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }); }
    catch { throw offlineError(); }
    if (res.ok) { const t = await res.text(); try { return t ? JSON.parse(t) : null; } catch { return t; } }
    let msg = ''; try { const j = await res.json(); msg = j.msg || j.message || j.error_description || j.error || ''; } catch {}
    throw Object.assign(new Error(msg || `Request failed (${res.status})`), { status: res.status });
  }

  async function blobApi(path, retried = false) {
    let res;
    try { res = await fetch(cfg.url + path, { headers: { apikey: cfg.key, Authorization: 'Bearer ' + await token() } }); }
    catch (e) { throw e.auth ? e : offlineError(); }
    if (res.status === 401 && !retried && session) { session.expires_at = 0; await refresh(); return blobApi(path, true); }
    if (!res.ok) throw Object.assign(new Error('Image unavailable'), { status: res.status });
    return res.blob();
  }
  const imageUrls = new Map();   // path -> object URL, so a picture is only fetched once per visit

  function setSession(r) {
    const c = claims(r.access_token);
    session = { access_token: r.access_token, refresh_token: r.refresh_token, expires_at: r.expires_at || now() + (r.expires_in || 3600), uid: (r.user && r.user.id) || c.sub, email: (r.user && r.user.email) || c.email,
      must: r.user ? !!(r.user.user_metadata && r.user.user_metadata.must_change_password) : !!(session && session.must) };
    jset(S_KEY, session);
  }
  function clearSession() { session = null; jdel(S_KEY); }

  async function refresh() {
    if (!session) throw authError();
    if (refreshing) return refreshing;
    refreshing = (async () => {
      try { setSession(await raw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token } })); }
      catch (e) {
        if (e.offline) { if (session.expires_at > now()) return; throw e; }
        if (e.status === 400 || e.status === 401 || e.status === 403) { clearSession(); onAuthLost(); throw authError(); }
        throw e;
      } finally { refreshing = null; }
    })();
    return refreshing;
  }
  async function token() {
    if (!session) throw authError();
    if (session.expires_at - now() < 60) await refresh();
    return session.access_token;
  }
  async function api(path, opts = {}, retried = false) {
    try { return await raw(path, { ...opts, bearer: await token() }); }
    catch (e) {
      if (e.status === 401 && !retried && session) { session.expires_at = 0; await refresh(); return api(path, opts, true); }
      throw e;
    }
  }

  // ---- queue of changes not yet on the server ----
  const blankQueue = () => ({ attempts: [], marks: {}, tests: {}, settings: null, reset: false });
  const queue = () => Object.assign(blankQueue(), jget(qKey()) || {});
  const saveQueue = q => jset(qKey(), q);
  const pending = () => { const q = queue(); return q.attempts.length + Object.keys(q.marks).length + Object.keys(q.tests).length + (q.settings ? 1 : 0) + (q.reset ? 1 : 0); };
  const cid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

  function change(fn) { if (!cfg || !session) return; const q = queue(); fn(q); saveQueue(q); schedule(); }
  function schedule(ms = 2500) { if (!cfg || !session) return; clearTimeout(timer); timer = setTimeout(() => sync().catch(() => {}), ms); }

  async function flush() {
    let q = queue();
    if (q.reset) { await api('/rest/v1/rpc/reset_my_progress', { method: 'POST', body: {} }); q = queue(); q.reset = false; saveQueue(q); }
    while ((q = queue()).attempts.length) {
      const batch = q.attempts.slice(0, 200);
      await api('/rest/v1/attempts?on_conflict=user_id,client_id', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: batch });
      q = queue(); q.attempts = q.attempts.slice(batch.length); saveQueue(q);
    }
    q = queue();
    const marks = Object.entries(q.marks).map(([question_id, m]) => ({ question_id, ...m }));
    if (marks.length) { await api('/rest/v1/question_marks?on_conflict=user_id,question_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: marks }); q = queue(); marks.forEach(m => { if (q.marks[m.question_id] && q.marks[m.question_id].updated_at === m.updated_at) delete q.marks[m.question_id]; }); saveQueue(q); }
    q = queue();
    const tests = Object.values(q.tests);
    if (tests.length) {
      await api('/rest/v1/tests?on_conflict=user_id,id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: tests.map(t => ({ id: t.id, taken_at: new Date(t.date).toISOString(), mode: t.mode, qids: t.qids, answers: t.answers, correct: t.correct, total: t.total, seconds: t.seconds })) });
      q = queue(); tests.forEach(t => delete q.tests[t.id]); saveQueue(q);
    }
    q = queue();
    if (q.settings) {
      const s = q.settings;
      await api('/rest/v1/user_settings?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: [{ data: s.data, updated_at: s.updated_at }] });
      q = queue(); if (q.settings && q.settings.updated_at === s.updated_at) q.settings = null; saveQueue(q);
    }
  }

  const blankStat = () => ({ seen: 0, correct: 0, wrong: 0, flagged: false, note: '', last: null });
  async function pull() {
    const [prog, marks, tests, settings] = await Promise.all([
      api('/rest/v1/rpc/my_progress', { method: 'POST', body: {} }),
      api('/rest/v1/question_marks?select=question_id,flagged,note'),
      api('/rest/v1/tests?select=*&order=taken_at.desc&limit=500'),
      api('/rest/v1/user_settings?select=data&limit=1')
    ]);
    const Q = queue(), q = {};
    (prog || []).forEach(r => { q[r.question_id] = { ...blankStat(), seen: r.seen, correct: r.correct, wrong: r.wrong, last: r.last_ok ? 'c' : 'w' }; });
    Q.attempts.forEach(a => { const s = q[a.question_id] ||= blankStat(); s.seen++; a.ok ? s.correct++ : s.wrong++; s.last = a.ok ? 'c' : 'w'; });
    (marks || []).forEach(m => { const s = q[m.question_id] ||= blankStat(); s.flagged = m.flagged; s.note = m.note; });
    Object.entries(Q.marks).forEach(([id, m]) => { const s = q[id] ||= blankStat(); s.flagged = m.flagged; s.note = m.note; });
    const byId = new Map();
    (tests || []).forEach(t => byId.set(t.id, { id: t.id, date: Date.parse(t.taken_at), mode: t.mode, qids: t.qids, answers: t.answers, correct: t.correct, total: t.total, seconds: t.seconds }));
    Object.values(Q.tests).forEach(t => byId.set(t.id, t));
    const d = Store.data;
    d.q = q; d.tests = [...byId.values()].sort((a, b) => b.date - a.date);
    if (!Q.settings && settings && settings[0]) d.settings = { ...d.settings, ...settings[0].data };
    Store.save();
  }

  async function sync() {
    if (!cfg || !session) return;
    if (syncing) return syncing;
    syncing = (async () => {
      try { await flush(); await pull(); lastSync = Date.now(); api('/rest/v1/rpc/touch_seen', { method: 'POST', body: {} }).catch(() => {}); }
      finally { syncing = null; }
    })();
    return syncing;
  }

  const toQuestion = r => ({
    id: r.id, status: r.status, reviewedBy: r.reviewed_by || undefined, boards: r.boards, subject: r.subject, topic: r.topic || '',
    difficulty: r.difficulty || 2, stem: r.stem, image: r.image || undefined, imageAlt: r.image_alt || undefined,
    options: r.options, answer: r.answer, explanation: r.explanation, optionNotes: r.option_notes || undefined, references: r.refs || [], tier: r.tier
  });

  const toEditorQuestion = r => ({ ...toQuestion(r), archived: !!r.archived, updatedAt: r.updated_at, updatedBy: r.updated_by || '' });
  // app question -> database row. reviewed_by is deliberately not sent: the database records who reviewed.
  const toRow = q => {
    const row = { id: q.id, status: q.status, boards: q.boards, subject: q.subject, topic: q.topic || null, difficulty: q.difficulty || null, stem: q.stem,
      image: q.image || null, image_alt: q.imageAlt || null, options: q.options, answer: q.answer, explanation: q.explanation, option_notes: q.optionNotes || null,
      refs: q.references || [], tier: q.tier || 'pro' };
    if (typeof q.archived === 'boolean') row.archived = q.archived;
    return row;
  };
  const inList = ids => '(' + ids.map(i => '"' + String(i).replace(/"/g, '') + '"').join(',') + ')';
  const missingColumn = e => e && e.status === 400 && /archived|updated_by/i.test(e.message);
  async function allQuestions(filter) {                        // pages of 1000, oldest id first
    const rows = []; let offset = 0;
    for (;;) {
      const page = await api(`/rest/v1/questions?select=*${filter}&order=id.asc&limit=1000&offset=${offset}`);
      rows.push(...page); if (page.length < 1000) return rows; offset += 1000;
    }
  }
  async function blobPost(path, file, retried = false) {
    let res;
    try { res = await fetch(cfg.url + path, { method: 'POST', body: file, headers: { apikey: cfg.key, Authorization: 'Bearer ' + await token(), 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' } }); }
    catch (e) { throw e.auth ? e : offlineError(); }
    if (res.status === 401 && !retried && session) { session.expires_at = 0; await refresh(); return blobPost(path, file, true); }
    if (!res.ok) { let m = ''; try { m = (await res.json()).message || ''; } catch {} throw Object.assign(new Error(m || `Upload failed (${res.status})`), { status: res.status }); }
    return true;
  }

  return {
    get enabled() { return !!cfg; },
    get session() { return session; },
    init(c) {
      cfg = c && c.url && c.anonKey ? { url: String(c.url).replace(/\/+$/, ''), key: c.anonKey } : null;
      session = cfg ? jget(S_KEY) : null;
      window.addEventListener('online', () => schedule(500));
    },
    onAuthLost(fn) { onAuthLost = fn; },

    async signIn(email, password) {
      try { setSession(await raw('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } })); }
      catch (e) {
        if (e.offline) throw new Error('No connection. You need internet to sign in.');
        if (e.status === 400) throw new Error('Email or password is incorrect.');
        if (e.status === 429) throw new Error('Too many attempts. Wait a minute and try again.');
        throw new Error('Could not sign in. Please try again.');
      }
    },
    async recover(email) {
      try { await raw('/auth/v1/recover', { method: 'POST', body: { email } }); }
      catch (e) { if (e.offline) throw new Error('No connection.'); if (e.status === 429) throw new Error('Please wait a minute before asking again.'); }
    },
    // A new account made by an admin starts with a temporary password; this is the first-sign-in screen's way out.
    get mustChangePassword() { return !!(session && session.must); },
    async choosePassword(password) {
      try { await api('/auth/v1/user', { method: 'PUT', body: { password, data: { must_change_password: false } } }); }
      catch (e) { throw new Error(e.offline ? 'No connection.' : (e.message || 'Could not set the password.')); }
      session.must = false; jset(S_KEY, session);
    },
    // Admin-only account tools, run by the member-admin function on Supabase's servers (see supabase/functions/member-admin).
    async manageMember(action, fields) {
      let res;
      try { res = await fetch(cfg.url + '/functions/v1/member-admin', { method: 'POST', headers: { apikey: cfg.key, Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...fields }) }); }
      catch (e) { throw e.auth ? e : offlineError(); }
      let out = null; try { out = await res.json(); } catch {}
      if (res.status === 404 && !(out && out.error)) throw Object.assign(new Error('Account tools are not set up yet.'), { notDeployed: true });
      if (!res.ok) throw Object.assign(new Error((out && out.error) || `Request failed (${res.status})`), { status: res.status });
      return out;
    },
    async setPassword(password) {
      try { await api('/auth/v1/user', { method: 'PUT', body: { password } }); }
      catch (e) { throw new Error(e.offline ? 'No connection.' : (e.message || 'Could not set the password.')); }
    },
    // Verifies the current password first, so a borrowed, unlocked device can't be used to take over the account.
    async changePassword(current, next) {
      try { setSession(await raw('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: session.email, password: current } })); }
      catch (e) { throw new Error(e.offline ? 'No connection.' : e.status === 400 ? 'Your current password is not correct.' : 'Could not check your password. Try again.'); }
      try { await api('/auth/v1/user', { method: 'PUT', body: { password: next } }); }
      catch (e) { throw new Error(e.offline ? 'No connection.' : (e.message || 'Could not change the password.')); }
    },
    // Admin-only tables and functions (the database rules refuse everyone else)
    rest: (path, opts) => api('/rest/v1/' + path, opts),
    // Links from invite / password-reset emails arrive as #access_token=...&type=recovery
    consumeLink() {
      if (!cfg) return null;
      const h = location.hash;
      if (!/^#(.*&)?(access_token|error)=/.test(h)) return null;
      const p = new URLSearchParams(h.slice(1));
      history.replaceState(null, '', location.pathname + location.search + '#/');
      if (p.get('error')) return { error: p.get('error_description') || p.get('error') };
      const at = p.get('access_token');
      setSession({ access_token: at, refresh_token: p.get('refresh_token'), expires_in: +p.get('expires_in') || 3600 });
      return { type: p.get('type') || 'signin' };
    },
    async signOut() {
      const u = uid();
      try { if (session) await raw('/auth/v1/logout', { method: 'POST', bearer: session.access_token }); } catch {}
      if (u) { jdel(`qbank.queue.${u}`); jdel(`qbank.profile.${u}`); jdel(`qbank.v1.${u}`); }
      clearSession(); imageUrls.forEach(u => URL.revokeObjectURL(u)); imageUrls.clear(); await cacheClear();
    },

    async profile() {
      try {
        const r = await api(`/rest/v1/profiles?select=email,display_name,role,plan,active&id=eq.${uid()}&limit=1`);
        const p = r && r[0] ? r[0] : null;
        if (p) jset(pKey(), p);
        return p;
      } catch (e) { if (e.offline) return jget(pKey()); throw e; }
    },
    async questions() {
      try {
        let rows;
        try { rows = await allQuestions('&archived=eq.false'); }
        catch (e) { if (!missingColumn(e)) throw e; rows = await allQuestions(''); }     // database not upgraded yet
        const list = rows.map(toQuestion);
        await cacheSet('questions', { uid: uid(), at: Date.now(), list });
        return list;
      } catch (e) {
        if (!e.offline) throw e;
        const c = await cacheGet('questions');
        if (c && c.uid === uid()) return c.list;
        throw e;
      }
    },
    // ---- for admins and reviewers (the database refuses everyone else) ----
    async editorReady() { try { await api('/rest/v1/questions?select=archived,updated_by&limit=1'); return true; } catch (e) { if (missingColumn(e)) return false; throw e; } },
    async editorQuestions() { return (await allQuestions('')).map(toEditorQuestion); },
    async saveQuestions(list) {
      for (let i = 0; i < list.length; i += 100)
        await api('/rest/v1/questions?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: list.slice(i, i + 100).map(toRow) });
    },
    patchQuestions: (ids, patch) => api('/rest/v1/questions?id=in.' + encodeURIComponent(inList(ids)), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: patch }),
    deleteQuestions: ids => api('/rest/v1/questions?id=in.' + encodeURIComponent(inList(ids)), { method: 'DELETE', headers: { Prefer: 'return=minimal' } }),
    async questionUpdatedAt(id) { const r = await api('/rest/v1/questions?select=updated_at&id=eq.' + encodeURIComponent(id)); return r && r[0] ? r[0].updated_at : null; },
    async uploadImage(name, file) { await blobPost('/storage/v1/object/question-images/' + encodeURIComponent(name), file); this.forgetImage(name); },
    forgetImage(name) { if (imageUrls.has(name)) { URL.revokeObjectURL(imageUrls.get(name)); imageUrls.delete(name); } kv('readwrite', s => s.delete('img:' + name)).catch(() => {}); },
    // Private pictures live in a private bucket; the database only releases one to someone who may see a question that uses it.
    async image(path) {
      if (imageUrls.has(path)) return imageUrls.get(path);
      const key = 'img:' + path, hit = await cacheGet(key);
      let blob = hit && hit.uid === uid() ? hit.blob : null;
      if (!blob) {
        blob = await blobApi('/storage/v1/object/authenticated/question-images/' + encodeURIComponent(path));
        if (!/^image\/(png|jpeg|webp|gif)$/.test(blob.type)) throw new Error('Unsupported image');
        await cacheSet(key, { uid: uid(), blob });
      }
      const url = URL.createObjectURL(blob); imageUrls.set(path, url); return url;
    },
    async prefetchImages(paths) { for (const p of [...new Set(paths)]) { try { await this.image(p); } catch { /* fetched later, or unavailable */ } } },
    rpc: (name, args = {}) => api(`/rest/v1/rpc/${name}`, { method: 'POST', body: args }),

    // hooks called by the Store
    queueAttempt(question_id, ok) { change(q => q.attempts.push({ question_id, ok, client_id: cid(), at: new Date().toISOString() })); },
    queueMark(question_id) { change(q => { const s = Store.qstat(question_id) || {}; q.marks[question_id] = { flagged: !!s.flagged, note: s.note || '', updated_at: new Date().toISOString() }; }); },
    queueTest(rec) { change(q => { q.tests[rec.id] = rec; }); },
    queueSettings() { change(q => { const s = Store.data.settings; q.settings = { data: { theme: s.theme, showDrafts: s.showDrafts !== false }, updated_at: new Date().toISOString() }; }); },
    queueReset() { change(q => { Object.assign(q, blankQueue(), { reset: true }); }); },
    sync, pending, get lastSync() { return lastSync; },
    userKey: () => `qbank.v1.${uid()}`
  };
})();
