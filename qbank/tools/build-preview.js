#!/usr/bin/env node
// Builds one self-contained HTML body (CSS, JS and questions inlined): node qbank/tools/build-preview.js <out.html>
const fs = require('fs'), path = require('path'), r = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const man = JSON.parse(r('data/manifest.json'));
const data = { config: JSON.parse(r('data/config.json')), boards: man.boards, subjects: man.subjects, questions: man.files.flatMap(f => JSON.parse(r('data/' + f))) };
const css = r('css/style.css').replace(/url\(\.\.\/fonts\/([^)]+)\)/g, (m, f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(__dirname, '..', 'fonts', f)).toString('base64')})`);
const safe = s => s.replace(/<\/script/gi, '<\\/script');
const html = r('index.html');
const body = html.match(/<body>([\s\S]*?)<script src/)[1];
const out = `<title>Ram QBank</title>\n<style>\n${css}\nbody{padding-inline:0}\n</style>\n${body}
<script>window.__QBANK_DATA=${safe(JSON.stringify(data))};</script>
<script>\n${safe(r('js/store.js'))}\n</script>
<script>\n${safe(r('js/cloud.js'))}\n</script>
<script>\n${safe(r('js/mascot.js'))}\n</script>\n<script>\n${safe(r('js/app.js'))}\n</script>\n`;
fs.writeFileSync(process.argv[2] || 'preview.html', out);
