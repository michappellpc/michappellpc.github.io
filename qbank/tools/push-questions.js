#!/usr/bin/env node
// Uploads your questions to the private database. Run this on YOUR computer, never in the repo or CI.
//   export SUPABASE_URL="https://xxxx.supabase.co"
//   export SUPABASE_SERVICE_KEY="...the secret service_role key..."
//   node qbank/tools/push-questions.js [dataDir] [--dry] [--tier free|pro] [--prune --yes] [--init]
// dataDir defaults to qbank/private (git-ignored, so real questions never enter the public repo).
// It validates first and refuses to upload anything with errors. Re-running updates existing questions by id.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const args = process.argv.slice(2), flag = f => args.includes(f), val = f => (args.includes(f) ? args[args.indexOf(f) + 1] : null);
const qbank = path.join(__dirname, '..');
const dataDir = path.resolve(args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--tier') || path.join(qbank, 'private'));
const die = m => { console.error(m); process.exit(1); };

if (flag('--init')) { // create the private folder from the public taxonomy
  fs.mkdirSync(path.join(dataDir, 'questions'), { recursive: true });
  const m = JSON.parse(fs.readFileSync(path.join(qbank, 'data', 'manifest.json'), 'utf8')); m.files = [];
  fs.writeFileSync(path.join(dataDir, 'manifest.json'), JSON.stringify(m, null, 2) + '\n');
  console.log(`Created ${dataDir}\nPut question files in ${path.join(dataDir, 'questions')} and list them in manifest.json (import-csv.js --data does both).`); process.exit(0);
}
if (!fs.existsSync(path.join(dataDir, 'manifest.json'))) die(`No manifest.json in ${dataDir}.\nRun:  node qbank/tools/push-questions.js --init   to create qbank/private, or pass a folder.`);

const check = spawnSync(process.execPath, [path.join(__dirname, 'validate.js'), '--data', dataDir], { encoding: 'utf8' });
process.stdout.write(check.stdout.split('\n').filter(l => !l.startsWith('warn')).join('\n')); process.stderr.write(check.stderr);
if (check.status !== 0) die('\nFix the errors above first. Nothing was uploaded.');

const man = JSON.parse(fs.readFileSync(path.join(dataDir, 'manifest.json'), 'utf8'));
const tierOverride = val('--tier'); if (tierOverride && !['free', 'pro'].includes(tierOverride)) die('--tier must be free or pro');
const rows = man.files.flatMap(f => JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'))).map(q => ({
  id: q.id, status: q.status, reviewed_by: q.reviewedBy || null, boards: q.boards, subject: q.subject, topic: q.topic || null,
  difficulty: q.difficulty || null, stem: q.stem, image: q.image || null, image_alt: q.imageAlt || null, options: q.options, answer: q.answer,
  explanation: q.explanation, option_notes: q.optionNotes || null, refs: q.references || [], tier: tierOverride || q.tier || 'pro', updated_at: new Date().toISOString()
}));
if (flag('--print')) { console.log(JSON.stringify(rows)); process.exit(0); }
if (flag('--dry')) { console.log(`\nDry run: ${rows.length} question(s) would be uploaded. Nothing was sent.`); process.exit(0); }

const URL_ = (process.env.SUPABASE_URL || '').replace(/\/+$/, ''), KEY = process.env.SUPABASE_SERVICE_KEY || '';
if (!URL_ || !KEY) die('\nSet SUPABASE_URL and SUPABASE_SERVICE_KEY first (see docs/CLOUD-SETUP.md, step 8).');
if (/^https?:\/\/[^/]*\.?supabase\.co$/.test(URL_) === false && !/^http:\/\/localhost/.test(URL_)) console.warn('Note: SUPABASE_URL does not look like https://<project>.supabase.co');
const H = { apikey: KEY, 'Content-Type': 'application/json' };
if (KEY.split('.').length === 3) H.Authorization = 'Bearer ' + KEY;   // newer sb_secret_ keys go in apikey only
(async () => {
  for (let i = 0; i < rows.length; i += 100) {
    const r = await fetch(`${URL_}/rest/v1/questions?on_conflict=id`, { method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows.slice(i, i + 100)) });
    if (!r.ok) die(`Upload failed at question ${i + 1} (${r.status}): ${(await r.text()).slice(0, 300)}`);
    console.log(`Uploaded ${Math.min(i + 100, rows.length)} / ${rows.length}`);
  }
  if (flag('--prune')) {
    const have = await (await fetch(`${URL_}/rest/v1/questions?select=id`, { headers: H })).json();
    const keep = new Set(rows.map(r => r.id)), gone = have.map(r => r.id).filter(id => !keep.has(id));
    if (!gone.length) console.log('Prune: nothing to remove.');
    else if (!flag('--yes')) console.log(`Prune: ${gone.length} question(s) in the database are not in your folder:\n  ${gone.join('\n  ')}\nDeleting them also deletes everyone's answer history for them. Re-run with --prune --yes to confirm.`);
    else {
      const r = await fetch(`${URL_}/rest/v1/questions?id=in.(${gone.map(encodeURIComponent).join(',')})`, { method: 'DELETE', headers: H });
      if (!r.ok) die(`Prune failed (${r.status})`); console.log(`Removed ${gone.length} question(s).`);
    }
  }
  console.log('Done.');
})().catch(e => die('Could not reach the database: ' + e.message));
