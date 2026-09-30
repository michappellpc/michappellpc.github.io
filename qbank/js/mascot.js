// Pixel-art mascot "Pulse": a chubby aviator bird with goggles and a red cross on his belly.
// Shapes are rasterized from ellipses with light/shadow bands, then outlined, so every pose shares one clean style.
const Mascot = (() => {
  const N = 32;
  const PAL = {
    P: '#5b98e8', B: '#3c70bd', L: '#8dbdf7',            // feathers: base, shadow, light
    F: '#fff6e6', f: '#ecd6b4',                          // belly: base, shadow
    K: '#ffb02e', k: '#e08512',                          // beak and feet
    W: '#ffffff', D: '#1b2a41', o: '#1b2a41',            // eye white, pupil/lines, outline
    G: '#a6ecff', Y: '#e8b23a', S: '#7a4a2a',            // goggle glass, frame, strap
    R: '#ff8f9c', r: '#e04b4b', M: '#8a2d3a', y: '#ffd23f', b: '#7cc4ff'
  };
  const blank = () => Array.from({ length: N }, () => Array(N).fill('.'));
  const put = (g, x, y, ch) => { if (x >= 0 && x < N && y >= 0 && y < N) g[y][x] = ch; };
  const ell = (g, cx, cy, rx, ry, pick) => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) g[y][x] = pick(dx, dy);
    }
  };
  const feather = (dx, dy) => (-.6 * dx - .8 * dy > .62 ? 'L' : .55 * dx + .85 * dy > .5 ? 'B' : 'P');
  const line = (g, pts, ch) => pts.forEach(([x, y]) => put(g, x, y, ch));
  const mirror = pts => pts.map(([x, y]) => [N - 1 - x, y]);
  const both = (g, pts, ch) => { line(g, pts, ch); line(g, mirror(pts), ch); };

  function outline(g) {
    const add = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] === '.')
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx] && g[y + dy][x + dx] !== '.')) add.push([x, y]);
    add.forEach(([x, y]) => g[y][x] = 'o');
  }
  const sparkle = (g, x, y) => line(g, [[x, y], [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]], 'y');

  function pose(name) {
    const g = blank();
    const up = name === 'cheer' || name === 'happy';
    // wings sit behind the body; raised for cheering
    const wy = name === 'cheer' ? 12 : name === 'happy' ? 15.5 : name === 'sad' ? 22 : 20;
    const wr = name === 'cheer' || name === 'happy' ? 4.6 : 5.8;
    ell(g, 3.6, wy, 2.9, wr, feather); ell(g, N - 3.6, wy, 2.9, wr, feather);
    outline(g);
    // feet
    line(g, [[11, 28], [12, 28], [13, 28], [11, 29], [12, 29], [13, 29]], 'k'); both(g, [[11, 28], [12, 28], [13, 28], [11, 29], [12, 29], [13, 29]], 'k');
    // body and belly
    ell(g, 16, 17, 13, 12, () => 'o');
    ell(g, 16, 17, 12, 11, feather);
    ell(g, 16, 23.5, 7.6, 5.4, (dx, dy) => dy > .35 ? 'f' : 'F');
    // red cross
    line(g, [[15, 23], [16, 23], [15, 24], [16, 24], [15, 25], [16, 25], [15, 26], [16, 26], [15, 27], [16, 27], [13, 25], [14, 25], [17, 25], [18, 25], [13, 26], [14, 26], [17, 26], [18, 26]], 'r');
    // eyes
    const eyeX = [10.5, 21.5];
    if (name === 'idle' || name === 'sad' || name === 'cheer-open') {
      eyeX.forEach(cx => { ell(g, cx, 16.5, 3.7, 4.5, () => 'W'); });
      const py = name === 'sad' ? 18 : 17;
      eyeX.forEach((cx, i) => { ell(g, cx + (i ? -.6 : .6), py, 1.7, 2.3, () => 'D'); put(g, Math.round(cx + (i ? -1.6 : -.4)), py - 2, 'W'); });
    }
    if (name === 'blink') { both(g, [[8, 17], [9, 18], [10, 18], [11, 18], [12, 17]], 'D'); }
    if (up) { both(g, [[8, 18], [9, 17], [10, 16], [11, 16], [12, 17], [13, 18]], 'D'); both(g, [[8, 17], [13, 17]], 'D'); }
    if (name === 'sad') { both(g, [[7, 13], [8, 13], [9, 12], [10, 12], [11, 11], [12, 11]], 'D'); both(g, [[6, 20], [6, 21], [6, 22]], 'b'); }
    // cheeks
    both(g, [[6, 22], [7, 22], [6, 23], [7, 23]], 'R');
    // beak
    if (up) {
      line(g, [[14, 19], [15, 19], [16, 19], [17, 19], [14, 20], [15, 20], [16, 20], [17, 20]], 'M');
      line(g, [[15, 20], [16, 20]], 'M');
      line(g, [[13, 18], [14, 18], [15, 18], [16, 18], [17, 18], [18, 18]], 'K');
      line(g, [[14, 21], [15, 21], [16, 21], [17, 21]], 'k');
    } else if (name === 'sad') {
      line(g, [[14, 19], [15, 19], [16, 19], [17, 19], [15, 20], [16, 20]], 'K'); line(g, [[15, 21], [16, 21]], 'k');
    } else {
      line(g, [[14, 19], [15, 19], [16, 19], [17, 19], [14, 20], [15, 20], [16, 20], [17, 20]], 'K'); line(g, [[15, 21], [16, 21]], 'k');
    }
    // goggles pushed up on the forehead
    line(g, [[8, 9], [9, 9], [10, 9], [11, 9], [12, 9], [13, 9], [14, 9], [15, 9], [16, 9], [17, 9], [18, 9], [19, 9], [20, 9], [21, 9], [22, 9], [23, 9]], 'S');
    [[10.5, 7.6], [21.5, 7.6]].forEach(([cx, cy]) => { ell(g, cx, cy, 3.6, 3, () => 'Y'); ell(g, cx, cy, 2.5, 2, () => 'G'); });
    both(g, [[9, 7], [10, 6]], 'W');
    outline(g);
    if (name === 'cheer') { sparkle(g, 3, 4); sparkle(g, 28, 3); put(g, 1, 9, 'y'); put(g, 30, 10, 'y'); }
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
  const birds = ['o...o', '.o.o.', '..o..'].map(r => r.split(''));

  function scene() {
    const cl = [[8, 24, 34, 5, 1], [34, 46, 46, 4, 0], [58, 18, 40, 5, 1], [80, 52, 52, 4, 0]].map(([l, t, d, px, s]) =>
      `<span class="cloud" style="left:${l}%;top:${t}px;animation-duration:${d}s">${toSvg(cloudGrid(s ? 16 : 12, s ? 9 : 8, s), px, 'px')}</span>`).join('');
    const stars = [[12, 14], [33, 42], [47, 10], [64, 30], [83, 16], [93, 52]].map(([l, t]) =>
      `<span class="star" style="left:${l}%;top:${t}px">${toSvg([['.', 'y', '.'], ['y', 'y', 'y'], ['.', 'y', '.']], 3, 'px')}</span>`).join('');
    const bird = (l, t, d, dl) => `<span class="bird" style="top:${t}px;animation-duration:${d}s;animation-delay:${dl}s">${toSvg(birds, 4, 'px')}</span>`;
    return `<div class="scene">
      <span class="sun"><span class="sun-day">${toSvg(disc(9, 'sun'), 5, 'px')}</span><span class="sun-night">${toSvg(disc(8, 'moon'), 5, 'px')}</span></span>
      ${stars}${cl}${bird(0, 34, 22, 0)}${bird(0, 58, 28, 6)}
      <span class="hills far">${toSvg(hills(120, 14, 1, 7, 'j'), 8, 'px')}</span>
      <span class="hills near">${toSvg(hills(120, 10, 4, 4, 'g'), 8, 'px')}</span>
      <div class="scene-slot" id="scene-slot"></div></div>`;
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
    correct: ['Nailed it!', 'Cleared for takeoff!', 'Smooth landing!', 'Textbook answer, Doc.', 'Right on the glide path.'],
    wrong: ['Turbulence. Read the explanation and we\'ll nail the next one.', 'Every miss is a study note.', 'Shake it off. The next one is yours.', 'Better to learn it here than on boards day.'],
    tips: ['Cross out what you can rule out.', 'Trust your first read.', 'Breathe. You\'ve got this.', 'Read the last line of the stem twice.', 'Eliminate, then decide.']
  };
  return { sprite, scene, mount, stop, pick, lines };
})();
