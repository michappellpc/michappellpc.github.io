// Pixel-art mascot "Pulse": an Army medic ram with spiral horns, a camo helmet, a red cross and a dog tag.
// Shapes are rasterized from ellipses and curves with light/shadow bands, then outlined, so every pose shares one style.
const Mascot = (() => {
  const N = 40;
  const PAL = {
    W: '#ffffff', C: '#f7f0e0', V: '#d3c8e0',              // wool: light, base, shadow
    T: '#ecd0a8', t: '#cfa574', a: '#a57a4d',              // face: base, shadow, rim
    Z: '#f8e6cc', n: '#7a4a4a', p: '#f0a0ad',              // muzzle, nostril, pink
    H: '#e0bf78', J: '#f3d99a', h: '#9b7128',              // horn: base, light, dark
    E: '#ffffff', D: '#1b2a41', o: '#151a10',              // eye white, pupil/lines, outline
    '1': '#b9a67a', '2': '#6b7a45', '3': '#5a4a32', '4': '#3e4a2b', Q: '#262c17', // camo + helmet rim
    r: '#d83b3b', w: '#ffffff', y: '#ffd23f', b: '#7cc4ff', M: '#7a2a35', s: '#d5d9dc', S: '#8b9096',
    x: '#3a4429', G: '#9be7ff'
  };
  const blank = () => Array.from({ length: N }, () => Array(N).fill('.'));
  const put = (g, x, y, ch) => { if (x >= 0 && x < N && y >= 0 && y < N) g[y][x] = ch; };
  const ell = (g, cx, cy, rx, ry, pick) => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) g[y][x] = pick(dx, dy, x, y);
    }
  };
  const line = (g, pts, ch) => pts.forEach(([x, y]) => put(g, x, y, ch));
  const mirror = pts => pts.map(([x, y]) => [N - 1 - x, y]);
  const both = (g, pts, ch) => { line(g, pts, ch); line(g, mirror(pts), ch); };
  const woolShade = (dx, dy) => (-.6 * dx - .8 * dy > .6 ? 'W' : .55 * dx + .85 * dy > .45 ? 'V' : 'C');

  function outline(g) {
    const add = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] === '.')
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx] && g[y + dy][x + dx] !== '.')) add.push([x, y]);
    add.forEach(([x, y]) => g[y][x] = 'o');
  }
  const sparkle = (g, x, y) => line(g, [[x, y], [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]], 'y');

  // fluffy wool: a core ellipse plus a ring of bumps
  const BUMPS = Array.from({ length: 14 }, (_, i) => [20 + 13 * Math.cos(i * Math.PI / 7), 25.5 + 9.6 * Math.sin(i * Math.PI / 7)]);
  const inWool = (x, y, grow) => {
    const px = x + .5, py = y + .5;
    return ((px - 20) / (13 + grow)) ** 2 + ((py - 25.5) / (9.6 + grow)) ** 2 <= 1 || BUMPS.some(([bx, by]) => (px - bx) ** 2 + (py - by) ** 2 <= (3.7 + grow) ** 2);
  };
  function wool(g) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (inWool(x, y, 1)) g[y][x] = 'o';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (inWool(x, y, 0)) g[y][x] = woolShade((x + .5 - 20) / 16, (y + .5 - 25.5) / 13);
  }
  // big spiral horn: grows out of the side of the head below the helmet and coils to a tip, clear of the helmet
  function horn(g, flip) {
    const pts = [];
    for (let i = 0; i <= 110; i++) {
      const t = i / 110, ang = (-410 * t) * Math.PI / 180, k = 1 - .55 * t;
      const x = 8.5 + 5 * k * Math.cos(ang), y = 24.2 + 6.2 * k * Math.sin(ang);
      pts.push([flip ? N - x : x, y, 2.5 - 1.2 * t, i]);
    }
    // color each pixel by its nearest point on the horn's centerline: light fill inside, dark edge at the rim
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let best = null;
      pts.forEach(([cx, cy, w, i]) => {
        const d = Math.hypot(x + .5 - cx, y + .5 - cy) - w;
        if (d <= .9 && (!best || d < best.d)) best = { d, i };
      });
      if (best) g[y][x] = best.d > -.6 ? 'h' : Math.floor(best.i / 9) % 2 ? 'H' : 'J';
    }
  }
  // camouflage pattern for the helmet
  const camo = (x, y) => {
    const v = Math.sin(x * .9 + y * .4) + Math.sin(x * .35 - y * .85 + 1.3) + Math.sin(x * .6 + y * 1.3 + 2.1);
    return v < -1.2 ? '4' : v < -.2 ? '3' : v < .8 ? '2' : '1';
  };

  function pose(name) {
    const g = blank();
    const up = name === 'cheer' || name === 'happy';
    wool(g);
    horn(g, false); horn(g, true);
    // long ram face and muzzle
    ell(g, 20, 19.4, 8, 10, () => 'a');
    ell(g, 20, 19.4, 7.2, 9.2, (dx, dy) => (dy > .6 ? 't' : 'T'));
    ell(g, 20, 25.6, 4.9, 3.6, () => 'Z');
    ell(g, 20, 23.4, 2.7, 1.5, () => 'p');
    line(g, [[18, 23], [21, 23]], 'n');
    // red cross patch is on the helmet; dog tag hangs on the wool
    line(g, [[16, 29], [17, 30], [18, 31]], 'S'); line(g, [[23, 29], [22, 30], [21, 31]], 'S');
    for (let y = 31; y <= 36; y++) for (let x = 18; x <= 21; x++) g[y][x] = 'D';
    for (let y = 32; y <= 35; y++) for (let x = 19; x <= 20; x++) g[y][x] = 's';
    put(g, 19, 32, 'W'); put(g, 20, 35, 'S');
    // eyes
    const eyeX = [16.4, 23.6];
    if (name === 'idle' || name === 'sad') {
      const py = name === 'sad' ? 20.6 : 19.8;
      eyeX.forEach(cx => { ell(g, cx, py, 1.8, 2.5, () => 'D'); put(g, Math.round(cx - .8), Math.round(py - 1.4), 'E'); put(g, Math.round(cx - .8), Math.round(py - .4), 'E'); });
    }
    if (name === 'blink') both(g, [[14, 20], [15, 20], [16, 20], [17, 20], [18, 20]], 'D');
    if (up) both(g, [[14, 21], [15, 20], [16, 19], [17, 20], [18, 21]], 'D');
    if (name === 'sad') { both(g, [[13, 15], [14, 15], [15, 14], [16, 14], [17, 13], [18, 13]], 'D'); both(g, [[13, 23], [13, 24]], 'b'); }
    both(g, [[14, 24], [13, 24]], 'p'); // cheeks
    // mouth
    if (up) { line(g, [[18, 26], [19, 26], [20, 26], [21, 26], [18, 27], [19, 27], [20, 27], [21, 27]], 'M'); line(g, [[19, 27], [20, 27]], 'p'); }
    else if (name === 'sad') line(g, [[17, 27], [22, 27], [18, 26], [21, 26], [19, 26], [20, 26]], 'D');
    else line(g, [[17, 26], [22, 26], [18, 27], [21, 27], [19, 27], [20, 27]], 'D');
    // camo combat helmet with a medic red cross
    for (let y = 0; y <= 13; y++) for (let x = 0; x < N; x++) if (((x + .5 - 20) / 10.6) ** 2 + ((y + .5 - 9.6) / 7.6) ** 2 <= 1) g[y][x] = y >= 13 ? 'Q' : camo(x, y);
    for (let x = 11; x <= 29; x++) put(g, x, 13, 'Q');
    ell(g, 20, 8.6, 3.6, 3.6, () => 'w');
    line(g, [[19, 6], [20, 6], [19, 7], [20, 7], [19, 8], [20, 8], [19, 9], [20, 9], [19, 10], [20, 10], [17, 8], [18, 8], [21, 8], [22, 8], [17, 9], [18, 9], [21, 9], [22, 9]], 'r');
    outline(g);
    if (name === 'cheer') { sparkle(g, 4, 5); sparkle(g, 35, 4); put(g, 2, 12, 'y'); put(g, 37, 11, 'y'); }
    return g;
  }

  function toSvg(g, px, cls) {
    let rects = '';
    g.forEach((row, y) => {
      for (let x = 0; x < row.length;) {
        const ch = row[x]; if (ch === '.') { x++; continue; }
        let n = 1; while (row[x + n] === ch) n++;
        const fill = PAL[ch] || `var(--${ch})`;
        rects += `<rect x="${x}" y="${y}" width="${n}" height="1" style="fill:${fill}"/>`; x += n;
      }
    });
    return `<svg class="${cls}" width="${g[0].length * px}" height="${g.length * px}" viewBox="0 0 ${g[0].length} ${g.length}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  }
  const sprite = (name, px = 5) => toSvg(pose(name), px, 'sprite');

  // ---- scenery, generated the same way ----
  function cloudGrid(w, h, seed) {
    const g = Array.from({ length: h }, () => Array(w).fill('.'));
    const blobs = seed ? [[w * .25, h - 3.5, w * .2, 3], [w * .5, h - 5, w * .22, 4.5], [w * .75, h - 3.5, w * .2, 3]] : [[w * .3, h - 3, w * .25, 3], [w * .65, h - 4, w * .28, 4]];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (y >= h - 1) { if (blobs.some(([cx, cy, rx, ry]) => Math.abs(x + .5 - cx) <= rx)) g[y][x] = 'q'; continue; }
      if (blobs.some(([cx, cy, rx, ry]) => ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1)) g[y][x] = y >= h - 3 ? 'q' : 'c';
    }
    return g;
  }
  function disc(r, kind) {
    const s = r * 2 + 2, g = Array.from({ length: s }, () => Array(s).fill('.'));
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) if (((x + .5 - s / 2) / r) ** 2 + ((y + .5 - s / 2) / r) ** 2 <= 1) g[y][x] = 'u';
    if (kind === 'moon') { g[r][r + 1] = 'v'; g[r + 1][r - 1] = 'v'; g[r - 1][r] = 'v'; }
    return g;
  }
  function hills(cols, rows, phase, amp, ch) {
    const g = Array.from({ length: rows }, () => Array(cols).fill('.'));
    for (let x = 0; x < cols; x++) {
      const top = Math.round(rows - 3 - amp * (.5 + .5 * Math.sin(x / 9 + phase)) - amp * .3 * Math.sin(x / 3.7 + phase * 2));
      for (let y = Math.max(0, top); y < rows; y++) g[y][x] = ch;
    }
    return g;
  }
  // Black Hawk-style helicopter (side view, facing right); two rotor frames alternate
  function heliGrid(frame) {
    const g = Array.from({ length: 12 }, () => Array(30).fill('.'));
    const P = (x, y, ch) => { if (g[y]) g[y][x] = ch; };
    for (let y = 0; y < 12; y++) for (let x = 0; x < 30; x++) {
      if (((x + .5 - 13) / 8.2) ** 2 + ((y + .5 - 6) / 3.4) ** 2 <= 1) P(x, y, 'x');
    }
    for (let x = 19; x <= 28; x++) { P(x, 5, 'x'); P(x, 6, 'x'); }
    [[27, 2], [28, 2], [27, 3], [28, 3], [28, 4], [27, 4], [26, 4]].forEach(([x, y]) => P(x, y, 'x'));
    ell9(g, 8.6, 5.2, 2.6, 2, 'G');
    for (let x = 8; x <= 17; x++) P(x, 10, 'x'); P(9, 9, 'x'); P(16, 9, 'x');
    P(13, 3, 'x'); P(13, 2, 'x');
    const span = frame ? [3, 24] : [6, 21];
    for (let x = span[0]; x <= span[1]; x++) P(x, 1, 'S');
    for (let x = 22; x <= 24; x++) P(x, frame ? 3 : 4, 'S');
    return g.map(r => r.reverse());
  }
  function ell9(g, cx, cy, rx, ry, ch) { for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) if (((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1) g[y][x] = ch; }
  const heli = px => { const f = i => toSvg(heliGrid(i), px, 'px'); return `<span class="heli"><span class="hf a">${f(0)}</span><span class="hf b">${f(1)}</span></span>`; };

  function scene() {
    const cl = [[8, 24, 34, 5, 1], [34, 46, 46, 4, 0], [58, 18, 40, 5, 1], [80, 52, 52, 4, 0]].map(([l, t, d, px, s]) =>
      `<span class="cloud" style="left:${l}%;top:${t}px;animation-duration:${d}s">${toSvg(cloudGrid(s ? 16 : 12, s ? 9 : 8, s), px, 'px')}</span>`).join('');
    const stars = [[12, 14], [33, 42], [47, 10], [64, 30], [83, 16], [93, 52]].map(([l, t]) =>
      `<span class="star" style="left:${l}%;top:${t}px">${toSvg([['.', 'y', '.'], ['y', 'y', 'y'], ['.', 'y', '.']], 3, 'px')}</span>`).join('');
    return `<div class="scene">
      <span class="sun"><span class="sun-day">${toSvg(disc(9, 'sun'), 5, 'px')}</span><span class="sun-night">${toSvg(disc(8, 'moon'), 5, 'px')}</span></span>
      ${stars}${cl}${heli(4)}
      <span class="hills far">${toSvg(hills(120, 14, 1, 7, 'j'), 8, 'px')}</span>
      <span class="hills near">${toSvg(hills(120, 10, 4, 4, 'g'), 8, 'px')}</span>
      <div class="scene-label">RAM QBANK <span>Aerospace &middot; Occupational &middot; Preventive</span></div>
      <div class="scene-slot" id="scene-slot"></div></div>`;
  }

  // Rank insignia (simplified, generic pixel versions) shown on the dashboard
  const RANKS = [
    { at: 0, abbr: '2LT', name: 'Second Lieutenant' }, { at: 25, abbr: '1LT', name: 'First Lieutenant' },
    { at: 75, abbr: 'CPT', name: 'Captain' }, { at: 200, abbr: 'MAJ', name: 'Major' },
    { at: 500, abbr: 'LTC', name: 'Lieutenant Colonel' }, { at: 1000, abbr: 'COL', name: 'Colonel' }
  ];
  const rankFor = n => { let i = 0; RANKS.forEach((r, k) => { if (n >= r.at) i = k; }); return { ...RANKS[i], next: RANKS[i + 1] || null }; };
  // Insignia follow AR 670-1: bars are 3/8" x 1" (tall, worn lengthwise), oak leaves are 1 1/8" high x 1" wide with the stem
  // pointing down/outward, and the colonel's spread eagle has its head turned to the wearer's right (viewer's left).
  const G = { fill: 'y', lit: 'J', dark: 'h' }, SV = { fill: 's', lit: 'W', dark: 'S' };
  function barGrid(c) { // 3 wide x 8 tall: light edge, body, shaded edge
    return Array.from({ length: 8 }, () => [c.lit, c.fill, c.dark]);
  }
  function leafGrid(c) { // upright oak leaf, 11 wide x 13 tall: three lobes a side, midrib, stem curving outward at the bottom
    const half = [1, 2, 3, 2, 4, 3, 5, 3, 4, 2, 1]; // half-width per row: lobes (wide) alternate with notches
    const g = Array.from({ length: 13 }, () => Array(11).fill('.'));
    half.forEach((w, y) => { for (let x = 5 - w; x <= 5 + w; x++) g[y][x] = (x < 5 - 1 && y < 6) ? c.lit : x > 5 + 1 && y > 4 ? c.dark : c.fill; });
    for (let y = 2; y <= 9; y++) g[y][5] = c.dark;   // midrib
    g[11][5] = c.fill; g[12][6] = c.dark;            // stem
    return g;
  }
  function eagleGrid(c) { // spread eagle, 23 wide x 13 tall, head turned to the viewer's left (the wearer's right)
    const W = 23, H = 13, cx = 11, g = Array.from({ length: H }, () => Array(W).fill('.'));
    const P = (x, y, ch) => { if (y >= 0 && y < H && x >= 0 && x < W) g[y][x] = ch; };
    for (const side of [-1, 1]) for (let d = 2; d <= 11; d++) { // wings: upswept tips, scalloped feather edge
      const x = cx + side * d, top = Math.round(5 - (d - 2) * .48), bot = Math.round(7.5 + Math.min(d, 5) * .2 - (d - 5) * (d > 5 ? .62 : 0)) + (d % 2 ? 0 : 1);
      for (let y = top; y <= Math.max(top, bot); y++) P(x, y, y === top ? c.lit : d % 2 ? c.fill : c.dark);
    }
    for (let y = 4; y <= 9; y++) for (let x = cx - 2; x <= cx + 2; x++) P(x, y, x <= cx - 1 ? c.lit : x >= cx + 1 ? c.dark : c.fill); // body
    for (let y = 10; y <= 12; y++) for (let x = cx - 3; x <= cx + 3; x++) P(x, y, (x + y) % 2 ? c.fill : c.dark); // tail
    for (const [x, y] of [[cx - 3, 1], [cx - 2, 1], [cx - 1, 1], [cx - 3, 2], [cx - 2, 2], [cx - 1, 2], [cx - 2, 3], [cx - 1, 3], [cx, 3]]) P(x, y, c.lit); // head
    P(cx - 3, 2, c.dark); // eye
    P(cx - 4, 2, c.fill); P(cx - 5, 3, c.dark); P(cx - 4, 3, c.dark); // hooked beak, pointing left
    return g;
  }
  function insignia(abbr, px = 5) {
    const bars = (n, c) => { const rows = barGrid(c); if (n === 1) return rows; return rows.map(r => [...r, '.', '.', '.', ...r]); };
    const g = { '2LT': () => bars(1, G), '1LT': () => bars(1, SV), CPT: () => bars(2, SV), MAJ: () => leafGrid(G), LTC: () => leafGrid(SV), COL: () => eagleGrid(SV) }[abbr]();
    const w = g[0].length, pad = g.map(r => ['.', ...r, '.']); pad.unshift(Array(w + 2).fill('.')); pad.push(Array(w + 2).fill('.'));
    return toSvg(border(pad), px, 'insignia');
  }
  function border(g) {
    const h = g.length, w = g[0].length, out = g.map(r => r.slice());
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx] && g[y + dy][x + dx] !== '.' && g[y + dy][x + dx] !== 'o')) out[y][x] = 'o';
    return out;
  }

  // ---- behavior ----
  const timers = [];
  const stop = () => { while (timers.length) clearInterval(timers.pop()); };
  const hash = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
  const pick = (arr, seed) => arr[hash(seed) % arr.length];

  function mount(el, { pose: p = 'idle', msg = '', scale = 5 } = {}) {
    el.innerHTML = `<div class="mascot bob">${sprite(p, scale)}${msg ? `<div class="bubble">${msg}</div>` : ''}</div>`;
    if (p === 'idle') {
      const svg = () => el.querySelector('.sprite');
      timers.push(setInterval(() => {
        const s = svg(); if (!s) return;
        s.outerHTML = sprite('blink', scale);
        setTimeout(() => { const t = svg(); if (t) t.outerHTML = sprite('idle', scale); }, 170);
      }, 3600));
    }
  }

  const lines = {
    correct: ['Hooah!', 'On target.', 'Mission accomplished, Doc.', 'Roger that, correct!', 'Ram strong!', 'Squared away.'],
    wrong: ['Negative. Read the explanation, then regroup.', 'Regroup and re-engage. The next one is yours.', 'Every miss is intel for the next one.', 'Better to learn it here than on boards day.'],
    tips: ['Eliminate what you can rule out.', 'Trust your first read.', 'Stay on target.', 'Read the last line of the stem twice.', 'Slow is smooth, smooth is fast.']
  };
  return { sprite, scene, mount, stop, pick, lines, rankFor, insignia };
})();
