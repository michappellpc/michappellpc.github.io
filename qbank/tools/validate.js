#!/usr/bin/env node
// Validates qbank/data: node qbank/tools/validate.js
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'data');
const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const boardIds = new Set(man.boards.map(b => b.id));
const allSubjects = new Set(Object.values(man.subjects).flat());
const ids = new Set(); let errors = 0, n = 0;
const err = (id, m) => { errors++; console.error(`[${id}] ${m}`); };
for (const f of man.files) {
  let qs; try { qs = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { err(f, e.message); continue; }
  for (const q of qs) {
    n++; const id = q.id || `${f}#${n}`;
    if (!q.id) err(id, 'missing id'); else if (ids.has(q.id)) err(id, 'duplicate id'); else ids.add(q.id);
    if (!Array.isArray(q.boards) || !q.boards.length || q.boards.some(b => !boardIds.has(b))) err(id, 'invalid boards');
    if (!allSubjects.has(q.subject)) err(id, `unknown subject "${q.subject}"`);
    if (!q.stem) err(id, 'missing stem');
    if (!Array.isArray(q.options) || q.options.length < 2) err(id, 'need >=2 options');
    else if (!q.options.some(o => o.id === q.answer)) err(id, 'answer does not match an option id');
    if (!q.explanation) err(id, 'missing explanation');
  }
}
console.log(`${n} questions checked, ${errors} error(s).`);
process.exit(errors ? 1 : 0);
