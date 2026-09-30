#!/usr/bin/env node
// Connects question feedback to your Google Form.
//   node qbank/tools/setup-feedback.js "<pre-filled link>"
// See docs/FEEDBACK-SETUP.md. Writes data/config.json.
const fs = require('fs'), path = require('path');
const link = process.argv[2];
if (!link) { console.error('Usage: setup-feedback.js "<pre-filled form link>"   (steps in docs/FEEDBACK-SETUP.md)'); process.exit(2); }
let u; try { u = new URL(link); } catch { console.error('That does not look like a link. Paste the whole pre-filled link, in quotes.'); process.exit(2); }
const m = u.pathname.match(/\/forms\/d\/e\/([^/]+)\//);
if (u.hostname !== 'docs.google.com' || !m) { console.error('Expected a Google Forms link like https://docs.google.com/forms/d/e/.../viewform?...'); process.exit(2); }
const KEYS = { QUESTION: 'question', CATEGORY: 'category', COMMENT: 'comment', CONTACT: 'contact', DETAILS: 'details' };
const fields = {};
for (const [k, v] of u.searchParams) if (k.startsWith('entry.') && KEYS[v.trim().toUpperCase()]) fields[KEYS[v.trim().toUpperCase()]] = k;
const missing = Object.values(KEYS).filter(k => !fields[k]);
if (missing.length) { console.error('Missing field(s): ' + missing.join(', ') + '.\nIn the pre-filled link every question must contain its label word (QUESTION, CATEGORY, COMMENT, CONTACT, DETAILS). Fill all five and get the link again.'); process.exit(1); }
const cfgPath = path.join(__dirname, '..', 'data', 'config.json');
const cfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {};
cfg.feedback = { formUrl: `https://docs.google.com/forms/d/e/${m[1]}/formResponse`, fields };
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
console.log('Feedback connected.\n' + JSON.stringify(cfg.feedback, null, 2) + '\nCommit data/config.json to publish it.');
