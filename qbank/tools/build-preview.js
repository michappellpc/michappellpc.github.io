#!/usr/bin/env node
// Builds one self-contained HTML body (CSS, JS and questions inlined): node qbank/tools/build-preview.js <out.html>
const fs = require('fs'), path = require('path'), r = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const man = JSON.parse(r('data/manifest.json'));
const data = { boards: man.boards, subjects: man.subjects, questions: man.files.flatMap(f => JSON.parse(r('data/' + f))) };
const safe = s => s.replace(/<\/script/gi, '<\\/script');
const html = r('index.html');
const body = html.match(/<body>([\s\S]*?)<script src/)[1];
const out = `<title>Board Prep QBank</title>\n<style>\n${r('css/style.css')}\nbody{padding-inline:0}\n</style>\n${body}
<script>window.__QBANK_DATA=${safe(JSON.stringify(data))};</script>
<script>\n${safe(r('js/store.js'))}\n</script>
<script>\n${safe(r('js/app.js'))}\n</script>\n`;
fs.writeFileSync(process.argv[2] || 'preview.html', out);
