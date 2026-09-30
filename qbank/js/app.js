'use strict';
const $app = document.getElementById('app'), $timer = document.getElementById('timer');
let bank = { boards: [], subjects: {}, questions: [], byId: {}, config: {} };
const APP_VERSION = '1.3';
let tick = null;

// ---------- helpers ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
const fmt = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s % 60).padStart(2, '0'); };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const boardName = id => (bank.boards.find(b => b.id === id) || {}).name || id;
const isDraft = q => q.status !== 'reviewed';
const showDrafts = () => Store.data.settings.showDrafts !== false;
const notesText = q => q.optionNotes ? '\n\nAnswer choices:\n' + q.options.filter(o => q.optionNotes[o.id]).map(o => esc(`${o.id}. ${q.optionNotes[o.id]}`)).join('\n') : '';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function applyTheme() {
  const t = Store.data.settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
}

async function load() {
  if (window.__QBANK_DATA) { const m = window.__QBANK_DATA; bank.config = m.config || {}; bank.boards = m.boards; bank.subjects = m.subjects; bank.questions = m.questions; bank.byId = Object.fromEntries(bank.questions.map(q => [q.id, q])); return; }
  const base = 'data/';
  const m = await (await fetch(base + 'manifest.json')).json();
  const lists = await Promise.all(m.files.map(f => fetch(base + f).then(r => r.json())));
  bank.config = await fetch(base + 'config.json').then(r => r.json()).catch(() => ({}));
  bank.boards = m.boards; bank.subjects = m.subjects;
  bank.questions = lists.flat();
  bank.byId = Object.fromEntries(bank.questions.map(q => [q.id, q]));
}

function zoomImage(src, alt) {
  const d = document.createElement('div'); d.className = 'modal zoom';
  d.innerHTML = `<div class="card"><img src="${esc(src)}" alt="${esc(alt)}"><div class="row spread"><span class="muted">${esc(alt)}</span><button class="primary">Close</button></div></div>`;
  d.onclick = e => { if (e.target === d || e.target.tagName === 'BUTTON') d.remove(); };
  document.body.appendChild(d);
}
const bindZoom = () => $app.querySelectorAll('[data-zoom]').forEach(im => im.onclick = () => zoomImage(im.src, im.alt));

// in-page dialog (native confirm/alert are blocked in some embedded viewers)
function ask(msg, yes = 'OK', no = 'Cancel') {
  return new Promise(res => {
    const d = document.createElement('div'); d.className = 'modal';
    d.innerHTML = `<div class="card" role="dialog" aria-modal="true"><p>${esc(msg)}</p><div class="row"><button class="primary" data-y>${esc(yes)}</button>${no ? `<button data-n>${esc(no)}</button>` : ''}</div></div>`;
    const done = v => { d.remove(); res(v); };
    d.querySelector('[data-y]').onclick = () => done(true);
    const n = d.querySelector('[data-n]'); if (n) n.onclick = () => done(false);
    document.body.appendChild(d); d.querySelector('[data-y]').focus();
  });
}

// ---------- question feedback ----------
// The Feedback button opens the team's Google Form (data/config.json -> feedbackUrl) in a new tab.
const formUrl = () => { const u = String(bank.config.feedbackUrl || ''); return /^https:\/\/(docs\.google\.com\/forms\/|forms\.gle\/)/.test(u) ? u : ''; };
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
}
function feedbackDialog(q) {
  const url = formUrl(), ref = `${q.id} (${q.subject}${q.topic ? ' / ' + q.topic : ''})`;
  const d = document.createElement('div'); d.className = 'modal';
  d.innerHTML = `<div class="card fb" role="dialog" aria-label="Question feedback">
    <h3>Question feedback</h3>
    ${url ? `<p>Found a mistake or have a suggestion? Tell the team using a short form. It opens in a new tab.</p>
    <p class="muted">1. Copy this question's reference and paste it into the form:</p>
    <div class="row" style="flex-wrap:nowrap"><input id="fb-ref" type="text" readonly value="${esc(ref)}" aria-label="Question reference"><button id="fb-copy" type="button">Copy</button></div>
    <p class="muted">2. Open the form:</p>
    <div class="row"><a class="btn primary" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open feedback form &#8599;</a><button type="button" data-cancel>Close</button></div>
    <p class="muted">Do not include patient information.</p>`
    : `<p class="muted">The feedback form has not been set up yet.</p><button type="button" data-cancel>Close</button>`}</div>`;
  const close = () => { d.remove(); document.removeEventListener('keydown', onKey, true); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey, true);
  d.onclick = e => { if (e.target === d || e.target.hasAttribute('data-cancel')) close(); };
  const copy = d.querySelector('#fb-copy');
  if (copy) copy.onclick = async () => {
    const i = d.querySelector('#fb-ref');
    try { await navigator.clipboard.writeText(i.value); toast('Copied.'); } catch { i.focus(); i.select(); toast('Select the text and copy it.'); }
  };
  document.body.appendChild(d); (d.querySelector('a.btn') || d.querySelector('button')).focus();
}

// ---------- router ----------
function route() {
  clearInterval(tick); $timer.hidden = true; Mascot.stop();
  const [p, arg] = location.hash.replace(/^#\/?/, '').split('/');
  document.querySelectorAll('nav a').forEach(l => l.classList.toggle('on', l.getAttribute('href') === '#/' + (p === 'test' ? 'create' : p === 'results' || p === 'review' ? 'history' : p)));
  const t = Store.data.active;
  if (p === 'test' && t) return renderTest();
  ({ '': dashboard, create, history, settings, results: () => results(arg), review: () => review(arg) }[p] || dashboard)();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

// ---------- dashboard ----------
function dashboard() {
  const st = Store.data.q, all = Object.values(st);
  const used = all.filter(s => s.seen).length, c = all.reduce((a, s) => a + s.correct, 0), w = all.reduce((a, s) => a + s.wrong, 0);
  const rows = [];
  for (const b of bank.boards) for (const subj of bank.subjects[b.id] || []) {
    const qs = bank.questions.filter(q => q.boards.includes(b.id) && q.subject === subj);
    if (!qs.length) continue;
    let cc = 0, ww = 0, seen = 0;
    qs.forEach(q => { const s = st[q.id]; if (s) { cc += s.correct; ww += s.wrong; if (s.seen) seen++; } });
    rows.push(`<tr><td>${esc(b.name)}</td><td>${esc(subj)}</td><td>${seen}/${qs.length}</td><td>${cc + ww ? pct(cc, cc + ww) + '%' : '—'}</td>
      <td style="width:22%"><div class="bar"><i style="width:${pct(cc, cc + ww)}%"></i></div></td></tr>`);
  }
  const active = Store.data.active;
  const rk = Mascot.rankFor(c);
  const acc = c + w ? pct(c, c + w) : null, missed = all.filter(s => s.last === 'w').length;
  const hello = acc === null ? 'Reporting for duty, Doc! Ready for your first set of reps?'
    : (acc >= 80 ? 'Hooah! You\'re holding a strong average. Keep the pressure on.' : acc >= 60 ? 'Solid progress. Let\'s tighten up the weak spots.' : 'Tough terrain, but every question is a rep that counts.')
    + (missed ? ` You have ${missed} missed question${missed > 1 ? 's' : ''} to revisit.` : '');
  $app.innerHTML = `
  ${Mascot.scene()}
  ${active ? `<div class="card row spread"><div><b>Test in progress</b> <span class="muted">(${Object.keys(active.answers).length}/${active.qids.length} answered)</span></div><a class="btn primary" href="#/test">Resume</a></div>` : ''}
  <div class="card rank">
    <div class="row" style="gap:14px;flex-wrap:nowrap">${Mascot.insignia(rk.abbr, 5)}
      <div style="flex:1;min-width:0"><div class="rank-title">${rk.name}</div>
        <div class="muted">${rk.next ? `${c} correct &middot; ${rk.next.at - c} more to make ${rk.next.name}` : `${c} correct &middot; Top rank. Keep training.`}</div>
        ${rk.next ? `<div class="bar" style="margin-top:6px"><i style="width:${pct(c - rk.at, rk.next.at - rk.at)}%"></i></div>` : ''}</div></div></div>
  <div class="grid">
    <div class="card stat"><b>${bank.questions.length}</b><span class="muted">Questions in bank</span></div>
    <div class="card stat"><b>${used}</b><span class="muted">Used (${pct(used, bank.questions.length)}%)</span></div>
    <div class="card stat"><b>${c + w ? pct(c, c + w) + '%' : '—'}</b><span class="muted">Overall correct</span></div>
    <div class="card stat"><b>${all.filter(s => s.flagged).length}</b><span class="muted">Flagged</span></div>
  </div>
  <div class="card"><h2>Performance by subject</h2>
    ${rows.length ? `<table><thead><tr><th>Board</th><th>Subject</th><th>Used</th><th>Correct</th><th></th></tr></thead><tbody>${rows.join('')}</tbody></table>` : '<p class="muted">No questions loaded.</p>'}
  </div>
  <a class="btn primary" href="#/create">Create a new test</a>`;
  Mascot.mount(document.getElementById('scene-slot'), { pose: acc !== null && acc >= 80 ? 'cheer' : 'idle', msg: esc(hello), scale: 4 });
}

// ---------- create test ----------
function create() {
  const boardBoxes = bank.boards.map(b => `<label class="chk"><input type="checkbox" name="board" value="${b.id}" checked> ${esc(b.name)}</label>`).join('');
  const subjects = [...new Set(Object.values(bank.subjects).flat())];
  const subjBoxes = subjects.map(s => `<label class="chk"><input type="checkbox" name="subj" value="${esc(s)}" checked> ${esc(s)}</label>`).join('');
  $app.innerHTML = `<div class="card"><h2>New test</h2><form id="f">
    <fieldset><legend>Mode</legend>
      <label class="chk"><input type="radio" name="mode" value="tutor" checked> Tutor (feedback after each question)</label>
      <label class="chk"><input type="radio" name="mode" value="timed"> Timed (feedback at the end, ~90 s/question)</label></fieldset>
    <fieldset><legend>Board</legend>${boardBoxes}</fieldset>
    <fieldset><legend>Subjects</legend><div class="row"><button type="button" id="all">All</button><button type="button" id="none">None</button></div>${subjBoxes}</fieldset>
    <fieldset><legend>Question status</legend>
      ${[['unused', 'Unused'], ['incorrect', 'Previously incorrect'], ['flagged', 'Flagged'], ['all', 'All']].map(([v, l], i) => `<label class="chk"><input type="checkbox" name="status" value="${v}" ${i == 0 ? 'checked' : ''}> ${l}</label>`).join('')}</fieldset>
    <p>Number of questions: <input type="number" id="n" min="1" value="20"> <span class="muted" id="avail"></span></p>
    <button class="primary" id="go">Start test</button></form></div>`;
  const f = document.getElementById('f');
  const vals = n => [...f.querySelectorAll(`[name=${n}]:checked`)].map(e => e.value);
  const pool = () => {
    const bs = vals('board'), ss = vals('subj'), stt = vals('status');
    return bank.questions.filter(q => {
      if (isDraft(q) && !showDrafts()) return false;
      if (!q.boards.some(b => bs.includes(b)) || !ss.includes(q.subject)) return false;
      if (stt.includes('all')) return true;
      const s = Store.qstat(q.id);
      return (stt.includes('unused') && (!s || !s.seen)) || (stt.includes('incorrect') && s && s.last === 'w') || (stt.includes('flagged') && s && s.flagged);
    });
  };
  const upd = () => { const p = pool().length; document.getElementById('avail').textContent = `(${p} available)`; document.getElementById('go').disabled = !p; };
  f.addEventListener('change', upd); upd();
  document.getElementById('all').onclick = () => { f.querySelectorAll('[name=subj]').forEach(e => e.checked = true); upd(); };
  document.getElementById('none').onclick = () => { f.querySelectorAll('[name=subj]').forEach(e => e.checked = false); upd(); };
  f.onsubmit = e => {
    e.preventDefault();
    const p = pool(); const n = Math.min(p.length, Math.max(1, +document.getElementById('n').value || 1));
    const qids = shuffle(p).slice(0, n).map(q => q.id), mode = f.mode.value;
    Store.data.active = { id: uid(), mode, qids, answers: {}, struck: {}, revealed: {}, idx: 0, started: Date.now(), elapsed: 0, limit: mode === 'timed' ? n * 90 : 0 };
    Store.save(); location.hash = '#/test';
  };
}

// ---------- test taking ----------
function renderTest() {
  const t = Store.data.active;
  if (!t) return (location.hash = '#/');
  const q = bank.byId[t.qids[t.idx]], id = q.id;
  const tutor = t.mode === 'tutor', shown = tutor && t.revealed[id], sel = t.answers[id], st = Store.qstat(id);
  const struck = t.struck[id] || [];
  if (t.limit) startTimer(t);
  else { $timer.hidden = false; tick = setInterval(() => $timer.textContent = fmt(elapsed(t)), 500); $timer.textContent = fmt(elapsed(t)); }
  const nav = t.qids.map((qid, i) => {
    let c = i === t.idx ? 'cur ' : '';
    if (t.answers[qid]) c += 'ans ';
    if (tutor && t.revealed[qid]) c += t.answers[qid] === bank.byId[qid].answer ? 'ok ' : 'no ';
    const s = Store.qstat(qid); if (s && s.flagged) c += 'flag ';
    return `<button class="${c}" data-go="${i}">${i + 1}</button>`;
  }).join('');
  $app.innerHTML = `
  <div class="card">
    <div class="row spread"><div>${q.boards.map(b => `<span class="tag">${esc(boardName(b))}</span>`).join('')}${isDraft(q) ? '<span class="tag draft" title="Not yet reviewed by a physician">Draft</span>' : ''}<span class="muted">${esc(q.subject)}${q.topic && shown ? ' · ' + esc(q.topic) : ''}</span></div>
      <div class="muted">Question ${t.idx + 1} of ${t.qids.length}</div></div>
    <p class="stem">${esc(q.stem)}</p>
    ${q.image ? `<img class="qimg" data-zoom src="${esc(q.image)}" alt="${esc(q.imageAlt || '')}" title="Tap to enlarge">` : ''}
    <div id="opts">${q.options.map((o, i) => {
      let c = 'opt'; if (sel === o.id) c += ' sel'; if (struck.includes(o.id)) c += ' struck';
      if (shown) { if (o.id === q.answer) c += ' correct'; else if (sel === o.id) c += ' wrong'; }
      return `<div class="${c}" data-opt="${esc(o.id)}" role="button" tabindex="0"><span class="k">${esc(o.id)}.</span><span class="txt">${esc(o.text)}</span>
        ${shown ? '' : `<button class="x" data-strike="${esc(o.id)}" title="Cross out">✕</button>`}</div>`;
    }).join('')}</div>
    ${shown ? `<div class="expl"><b>${sel === q.answer ? 'Correct' : 'Incorrect'}.</b> Correct answer: ${esc(q.answer)}.\n\n${esc(q.explanation)}${notesText(q)}${q.references && q.references.length ? `\n\n<span class="muted">References: ${q.references.map(esc).join('; ')}</span>` : ''}</div>` : ''}
    <div class="row" style="margin-top:14px">
      ${tutor && !shown ? `<button class="primary" id="submit" ${sel ? '' : 'disabled'}>Submit</button>` : ''}
      <button id="prev" ${t.idx ? '' : 'disabled'}>← Prev</button>
      <button id="next" ${t.idx < t.qids.length - 1 ? '' : 'disabled'}>Next →</button>
      <button class="flagbtn ${st && st.flagged ? 'on' : ''}" id="flag">⚑ Flag</button>
      <button id="fbk" title="Report a problem or suggest a change to this question">✎ Feedback</button>
      <span style="flex:1"></span><button class="danger" id="end">End test</button>
    </div>
    <details style="margin-top:12px"><summary>Notes</summary><textarea id="note" rows="3" placeholder="Your notes on this question">${esc(st ? st.note : '')}</textarea></details>
  </div>
  <div class="card"><div class="nav">${nav}</div></div>
  <div style="height:110px"></div><div id="coach" class="coach"></div>`;
  let streak = 0;
  if (shown && sel === q.answer) for (let i = t.idx; i >= 0 && t.revealed[t.qids[i]] && t.answers[t.qids[i]] === bank.byId[t.qids[i]].answer; i--) streak++;
  const L = Mascot.lines;
  const coach = shown
    ? (sel === q.answer
      ? { pose: streak >= 3 ? 'cheer' : 'happy', msg: streak >= 3 ? `${streak} in a row! Squared away.` : Mascot.pick(L.correct, id) }
      : { pose: 'sad', msg: Mascot.pick(L.wrong, id) })
    : { pose: 'idle', msg: tutor || t.idx === 0 ? Mascot.pick(L.tips, id + t.idx) : '' };
  Mascot.mount(document.getElementById('coach'), { ...coach, msg: coach.msg && esc(coach.msg).replace(/&#39;/g, "'"), scale: 3 });
  bindTest(t, q);
}

function elapsed(t) { return t.elapsed + (Date.now() - t.started) / 1000; }
function startTimer(t) {
  $timer.hidden = false;
  const u = () => { const left = t.limit - elapsed(t); $timer.textContent = '⏱ ' + fmt(left); if (left <= 0) { clearInterval(tick); finish(); } };
  u(); tick = setInterval(u, 500);
}
function persist(t) { t.elapsed = elapsed(t); t.started = Date.now(); Store.save(); }

function bindTest(t, q) {
  const id = q.id, tutor = t.mode === 'tutor', locked = tutor && t.revealed[id];
  const go = i => { t.idx = Math.min(t.qids.length - 1, Math.max(0, i)); persist(t); renderTest(); };
  $app.querySelectorAll('[data-opt]').forEach(el => {
    const pick = () => { if (locked) return; t.answers[id] = el.dataset.opt; persist(t); renderTest(); };
    el.onclick = pick; el.onkeydown = e => { if (e.key === ' ') { e.preventDefault(); pick(); } };
  });
  $app.querySelectorAll('[data-strike]').forEach(b => b.onclick = e => {
    e.stopPropagation(); const a = t.struck[id] ||= [], k = b.dataset.strike, i = a.indexOf(k); i < 0 ? a.push(k) : a.splice(i, 1); persist(t); renderTest();
  });
  bindZoom();
  $app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(+b.dataset.go));
  const on = (i, fn) => { const e = document.getElementById(i); if (e) e.onclick = fn; };
  on('prev', () => go(t.idx - 1)); on('next', () => go(t.idx + 1));
  on('submit', submit); on('flag', () => { Store.toggleFlag(id); renderTest(); });
  on('fbk', () => feedbackDialog(q));
  on('end', async () => { if (await ask('End this test now? Unanswered questions count as incorrect.', 'End test')) finish(); });
  document.getElementById('note').onchange = e => Store.setNote(id, e.target.value);
  function submit() {
    if (!t.answers[id] || t.revealed[id]) return;
    t.revealed[id] = true; Store.record(id, t.answers[id] === q.answer); persist(t); renderTest();
  }
  document.onkeydown = e => {
    if (location.hash !== '#/test' || /TEXTAREA|INPUT|SELECT/.test(e.target.tagName) || document.querySelector('.modal')) return;
    const k = e.key.toUpperCase();
    if (k === 'ARROWRIGHT') go(t.idx + 1); else if (k === 'ARROWLEFT') go(t.idx - 1);
    else if (k === 'F') { Store.toggleFlag(id); renderTest(); }
    else if (k === 'ENTER') { if (tutor && !t.revealed[id]) submit(); else go(t.idx + 1); }
    else if (!locked) {
      const idx = /^[1-9]$/.test(k) ? +k - 1 : q.options.findIndex(o => o.id.toUpperCase() === k);
      if (q.options[idx]) { t.answers[id] = q.options[idx].id; persist(t); renderTest(); }
    }
  };
}

function finish() {
  const t = Store.data.active; if (!t) return;
  clearInterval(tick); document.onkeydown = null;
  let c = 0;
  t.qids.forEach(qid => {
    const q = bank.byId[qid], ok = t.answers[qid] === q.answer;
    if (ok) c++;
    if (!(t.mode === 'tutor' && t.revealed[qid]) && t.answers[qid]) Store.record(qid, ok); // not yet recorded
  });
  const rec = { id: t.id, date: Date.now(), mode: t.mode, qids: t.qids, answers: t.answers, correct: c, total: t.qids.length, seconds: Math.round(elapsed(t)) };
  Store.data.tests.unshift(rec); Store.data.active = null; Store.save();
  location.hash = '#/results/' + rec.id;
}

// ---------- results / review / history ----------
function results(id) {
  const r = Store.data.tests.find(x => x.id === id); if (!r) return (location.hash = '#/history');
  const by = {};
  r.qids.forEach(qid => { const q = bank.byId[qid]; if (!q) return; const o = by[q.subject] ||= { c: 0, n: 0 }; o.n++; if (r.answers[qid] === q.answer) o.c++; });
  const p = pct(r.correct, r.total);
  $app.innerHTML = `<div class="card"><div id="res-mascot"></div><h2>Results</h2>
    <div class="grid"><div class="stat"><b>${pct(r.correct, r.total)}%</b><span class="muted">${r.correct}/${r.total} correct</span></div>
    <div class="stat"><b>${fmt(r.seconds)}</b><span class="muted">Time</span></div>
    <div class="stat"><b>${r.mode}</b><span class="muted">Mode</span></div></div></div>
    <div class="card"><h3>By subject</h3><table><tbody>${Object.entries(by).map(([s, o]) => `<tr><td>${esc(s)}</td><td>${o.c}/${o.n}</td><td>${pct(o.c, o.n)}%</td></tr>`).join('')}</tbody></table></div>
    <a class="btn primary" href="#/review/${r.id}">Review questions</a> <a class="btn" href="#/create">New test</a>`;
  Mascot.mount(document.getElementById('res-mascot'), p >= 80 ? { pose: 'cheer', msg: 'Outstanding! That is board-ready work. Hooah!' } : p >= 60 ? { pose: 'happy', msg: 'Solid mission. Review the misses and go again.' } : { pose: 'sad', msg: 'Rough exercise. Review makes it stick, and I\'m with you for the next rep.' });
}

function review(id) {
  const r = Store.data.tests.find(x => x.id === id); if (!r) return (location.hash = '#/history');
  $app.innerHTML = `<p><a href="#/results/${r.id}">← Results</a></p>` + r.qids.map((qid, i) => {
    const q = bank.byId[qid]; if (!q) return '';
    const mine = r.answers[qid], ok = mine === q.answer;
    return `<div class="card"><div class="muted">${i + 1}. ${esc(q.subject)} · ${esc(q.topic || '')} — <b style="color:var(--${ok ? 'good' : 'bad'})">${ok ? 'Correct' : mine ? 'Incorrect' : 'Unanswered'}</b></div>
      <p class="stem">${esc(q.stem)}</p>
      ${q.options.map(o => `<div class="opt ${o.id === q.answer ? 'correct' : o.id === mine ? 'wrong' : ''}"><span class="k">${esc(o.id)}.</span><span class="txt">${esc(o.text)}</span></div>`).join('')}
      ${q.image ? `<img class="qimg" data-zoom src="${esc(q.image)}" alt="${esc(q.imageAlt || '')}" title="Tap to enlarge">` : ''}
      <div class="expl">${esc(q.explanation)}${notesText(q)}</div>
      <div class="row" style="margin-top:10px"><button data-fb="${esc(qid)}" title="Report a problem or suggest a change to this question">✎ Feedback</button></div></div>`;
  }).join('');
  bindZoom();
  $app.querySelectorAll('[data-fb]').forEach(b => b.onclick = () => feedbackDialog(bank.byId[b.dataset.fb]));
}

function history() {
  const T = Store.data.tests;
  $app.innerHTML = `<div class="card"><h2>Test history</h2>${T.length ? `<table><thead><tr><th>Date</th><th>Mode</th><th>Score</th><th>Time</th><th></th></tr></thead><tbody>${T.map(r =>
    `<tr><td>${new Date(r.date).toLocaleString()}</td><td>${r.mode}</td><td>${r.correct}/${r.total} (${pct(r.correct, r.total)}%)</td><td>${fmt(r.seconds)}</td><td><a href="#/results/${r.id}">View</a></td></tr>`).join('')}</tbody></table>` : '<p class="muted">No completed tests yet.</p>'}</div>`;
}

// ---------- settings ----------
function settings() {
  const th = Store.data.settings.theme;
  $app.innerHTML = `<div class="card"><h2>Settings</h2>
    <p>Theme <select id="theme" style="width:auto">${['auto', 'light', 'dark'].map(v => `<option ${v === th ? 'selected' : ''}>${v}</option>`).join('')}</select></p>
    <label class="chk"><input type="checkbox" id="drafts" ${showDrafts() ? 'checked' : ''}> Include draft questions that a physician has not yet reviewed</label></div>
    <div class="card"><h3>Your data</h3><p class="muted">Progress is stored only in this browser. Export a backup to move devices or avoid losing it if you clear site data.</p>
    <div class="row"><button id="exp">Export progress</button><button id="imp">Import progress</button><input type="file" id="file" accept="application/json" hidden><button class="danger" id="reset">Reset all progress</button></div></div>`;
  document.getElementById('drafts').onchange = e => { Store.data.settings.showDrafts = e.target.checked; Store.save(); };
  document.getElementById('theme').onchange = e => { Store.data.settings.theme = e.target.value; Store.save(); applyTheme(); };
  document.getElementById('exp').onclick = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([Store.exportJSON()], { type: 'application/json' }));
    a.download = 'qbank-progress-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
  };
  document.getElementById('imp').onclick = () => document.getElementById('file').click();
  document.getElementById('file').onchange = async e => {
    try { Store.importJSON(await e.target.files[0].text()); applyTheme(); await ask('Progress imported.', 'OK', null); location.hash = '#/'; } catch (err) { ask('Import failed: ' + err.message, 'OK', null); }
  };
  document.getElementById('reset').onclick = async () => { if (await ask('Delete ALL progress? This cannot be undone.', 'Delete everything')) { Store.reset(); location.hash = '#/'; route(); } };
}

// ---------- boot ----------
applyTheme();
load().then(route).catch(e => { $app.innerHTML = `<div class="card"><b>Could not load question data.</b><p class="muted">${esc(e.message)}. If you opened this file directly, serve it over http (e.g. <code>python3 -m http.server</code>) or use GitHub Pages.</p></div>`; });
if ('serviceWorker' in navigator && !window.__QBANK_DATA && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
