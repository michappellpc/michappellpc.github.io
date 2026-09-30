#!/usr/bin/env node
// Validates qbank/data.  Usage: node qbank/tools/validate.js [--strict] [--summary]
//   --data <dir> validates another folder with the same layout (e.g. qbank/private).
//   errors fail the run; warnings only print (with --strict they fail too).
const fs = require('fs'), path = require('path');
const argv = process.argv.slice(2), di = argv.indexOf('--data');
const dir = di >= 0 ? path.resolve(argv[di + 1]) : path.join(__dirname, '..', 'data'), root = path.resolve(dir, '..');
const strict = process.argv.includes('--strict'), summary = process.argv.includes('--summary');
const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const boardIds = new Set(man.boards.map(b => b.id));
const STATUS = new Set(['draft', 'reviewed']);
let errors = 0, warns = 0, n = 0;
const err = (id, m) => { errors++; console.error(`ERROR [${id}] ${m}`); };
const warn = (id, m) => { warns++; console.warn(`warn  [${id}] ${m}`); };
const ids = new Set(), stems = new Map(), tally = { status: {}, board: {}, subject: {}, answers: {} };
const bump = (o, k) => o[k] = (o[k] || 0) + 1;
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// data files on disk that the manifest does not list would silently never load
const qdir = path.join(dir, 'questions');
if (fs.existsSync(qdir)) for (const f of fs.readdirSync(qdir)) if (f.endsWith('.json') && !man.files.includes('questions/' + f)) warn(f, 'file is not listed in data/manifest.json, so it will not load');

for (const f of man.files) {
  const fp = path.join(dir, f);
  if (!fs.existsSync(fp)) { err(f, 'listed in manifest but the file does not exist'); continue; }
  let qs; try { qs = JSON.parse(fs.readFileSync(fp, 'utf8')); } catch (e) { err(f, 'invalid JSON: ' + e.message); continue; }
  if (!Array.isArray(qs)) { err(f, 'top level must be an array of questions'); continue; }
  for (const q of qs) {
    n++; const id = q.id || `${f}#${n}`;
    if (!q.id) err(id, 'missing id'); else if (!/^[a-z0-9][a-z0-9-]*$/.test(q.id)) err(id, 'id must be lowercase letters, digits and hyphens'); else if (ids.has(q.id)) err(id, 'duplicate id'); else ids.add(q.id);
    if (!STATUS.has(q.status)) err(id, 'status must be "draft" or "reviewed"');
    if (q.status === 'reviewed' && !q.reviewedBy) warn(id, 'reviewed but no reviewedBy');
    if (!Array.isArray(q.boards) || !q.boards.length || q.boards.some(b => !boardIds.has(b))) err(id, 'invalid boards (use aem, om, pm)');
    else if (!q.boards.some(b => (man.subjects[b] || []).includes(q.subject))) err(id, `subject "${q.subject}" is not listed for board(s) ${q.boards.join(', ')} in the manifest`);
    if (q.difficulty != null && ![1, 2, 3].includes(q.difficulty)) err(id, 'difficulty must be 1, 2 or 3');
    if (!q.stem || !String(q.stem).trim()) err(id, 'missing stem'); else {
      const k = norm(q.stem); if (stems.has(k)) err(id, `stem duplicates ${stems.get(k)}`); else stems.set(k, id);
    }
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) err(id, 'need between 2 and 6 options');
    else {
      const oi = q.options.map(o => o.id);
      if (new Set(oi).size !== oi.length) err(id, 'option ids must be unique');
      if (oi.some(x => !/^[A-F]$/.test(x))) err(id, 'option ids must be letters A-F');
      if (q.options.some(o => !o.text || !String(o.text).trim())) err(id, 'every option needs text');
      if (new Set(q.options.map(o => norm(o.text))).size !== q.options.length) err(id, 'two options have identical text');
      if (!oi.includes(q.answer)) err(id, 'answer does not match an option id');
      else bump(tally.answers, q.answer);
      if (q.options.some(o => /all of the above|none of the above/i.test(o.text))) warn(id, 'uses "all/none of the above"; consider rewriting');
      if (q.optionNotes) {
        for (const k of Object.keys(q.optionNotes)) if (!oi.includes(k)) err(id, `optionNotes has key "${k}" that is not an option id`);
        const missing = oi.filter(x => x !== q.answer && !q.optionNotes[x]);
        if (missing.length) warn(id, `optionNotes missing for wrong answer(s) ${missing.join(', ')}`);
      } else warn(id, 'no optionNotes (why each wrong answer is wrong)');
    }
    if (!q.explanation || !String(q.explanation).trim()) err(id, 'missing explanation');
    if (!Array.isArray(q.references) || !q.references.length) warn(id, 'no references');
    if (q.image) {
      if (!fs.existsSync(path.join(root, q.image))) err(id, `image file not found: ${q.image}`);
      if (!q.imageAlt) err(id, 'image needs imageAlt (a text description)');
    }
    bump(tally.status, q.status || '?'); (q.boards || []).forEach(b => bump(tally.board, b)); bump(tally.subject, q.subject);
  }
}
const tot = Object.values(tally.answers).reduce((a, b) => a + b, 0);
if (tot >= 20) for (const [k, v] of Object.entries(tally.answers)) if (v / tot > .4) warn('bank', `answer "${k}" is correct for ${Math.round(100 * v / tot)}% of questions; shuffle the key`);
if (summary) console.log('\n' + JSON.stringify(tally, null, 2));
console.log(`${n} questions checked: ${errors} error(s), ${warns} warning(s).`);
process.exit(errors || (strict && warns) ? 1 : 0);
