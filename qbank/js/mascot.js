// Pixel-art mascot "Pulse": a fluffy aviator ram with curled horns, goggles, and a red cross badge.
// Shapes are rasterized from ellipses with light/shadow bands, then outlined, so every pose shares one clean style.
const Mascot = (() => {
  const N = 32;
  const PAL = {
    W: '#ffffff', C: '#fbf3e4', V: '#d6cce6',              // wool: light, base, shadow
    T: '#e6b88a', t: '#c99566', a: '#a9784c',              // face: base, chin shadow, rim
    Z: '#f7e0c2', n: '#e8808f', p: '#f3a9b4',              // muzzle, nose, inner ear / cheeks
    H: '#efc65c', h: '#b98620', X: '#4a382a',              // horn, horn shadow, hoof
    E: '#ffffff', D: '#1b2a41', o: '#1b2a41',              // eye white, pupil/lines, outline
    G: '#a6ecff', Y: '#e8b23a', S: '#7a4a2a',              // goggle glass, frame, strap
    r: '#e04b4b', M: '#8a2d3a', y: '#ffd23f', b: '#7cc4ff'
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

  // fluffy wool silhouette: a core ellipse plus a ring of bumps
  const BUMPS = Array.from({ length: 12 }, (_, i) => [16 + 10.2 * Math.cos(i * Math.PI / 6), 17.5 + 9.2 * Math.sin(i * Math.PI / 6)]);
  const inWool = (x, y, grow) => {
    const px = x + .5, py = y + .5;
    return ((px - 16) / (10 + grow)) ** 2 + ((py - 17.5) / (9.2 + grow)) ** 2 <= 1 || BUMPS.some(([bx, by]) => (px - bx) ** 2 + (py - by) ** 2 <= (3.3 + grow) ** 2);
  };
  function wool(g) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (inWool(x, y, 1)) g[y][x] = 'o';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (inWool(x, y, 0)) g[y][x] = woolShade((x + .5 - 16) / 13, (y + .5 - 17.5) / 12);
  }
  // curled horn: a ring with a notch, so it reads as a spiral
  function horn(g, flip) {
    const cx = flip ? N - 6.6 : 6.6, cy = 14.2;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = x + .5 - cx, dy = y + .5 - cy, d = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, flip ? -dx : dx) * 180 / Math.PI;
      const notch = ang > -85 && ang < -20;
      if (d <= 5.8 && d >= 1.2 && !(notch && d > 2.6)) g[y][x] = 'h';
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = x + .5 - cx, dy = y + .5 - cy, d = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, flip ? -dx : dx) * 180 / Math.PI;
      const notch = ang > -85 && ang < -20;
      if (d <= 5 && d >= 2.6 && !notch) g[y][x] = d >= 3.5 && d <= 4.2 ? 'h' : 'H';
      if (d <= 1.4) g[y][x] = 'H';
    }
  }

  function pose(name) {
    const g = blank();
    const up = name === 'cheer' || name === 'happy';
    wool(g);
    horn(g, false); horn(g, true);
    // ears
    [[6.8, 20.2], [N - 6.8, 20.2]].forEach(([ex, ey]) => { ell(g, ex, ey, 3.7, 2.2, () => 'a'); ell(g, ex, ey, 3.2, 1.7, () => 'T'); });
    put(g, 5, 20, 'p'); put(g, 6, 20, 'p'); put(g, N - 6, 20, 'p'); put(g, N - 7, 20, 'p');
    // face and muzzle
    ell(g, 16, 20, 8.8, 8.2, () => 'a');
    ell(g, 16, 20, 8, 7.4, (dx, dy) => (dy > .55 ? 't' : 'T'));
    ell(g, 16, 25, 5, 3.4, () => 'Z');
    line(g, [[14, 22], [15, 22], [16, 22], [17, 22], [15, 23], [16, 23]], 'n');
    // eyes
    const eyeX = [12, 20];
    if (name === 'idle' || name === 'sad' || name === 'cheer-open') {
      eyeX.forEach(cx => { ell(g, cx, 18.6, 3.1, 3.5, () => 'D'); ell(g, cx, 18.6, 2.5, 2.9, () => 'E'); });
      const py = name === 'sad' ? 19.6 : 18.8;
      eyeX.forEach(cx => { ell(g, cx, py, 1.6, 2.1, () => 'D'); put(g, Math.round(cx - .9), Math.round(py - 1.3), 'E'); });
    }
    if (name === 'blink') both(g, [[10, 19], [11, 19], [12, 19], [13, 19]], 'D');
    if (up) both(g, [[10, 19], [11, 18], [12, 17], [13, 18], [13, 19]], 'D');
    if (name === 'sad') { both(g, [[9, 15], [10, 15], [11, 14], [12, 14], [13, 13], [14, 13]], 'D'); both(g, [[9, 21], [9, 22]], 'b'); }
    // cheeks
    both(g, [[8, 23], [9, 23]], 'p');
    // mouth
    if (up) { line(g, [[14, 25], [15, 25], [16, 25], [17, 25], [14, 26], [15, 26], [16, 26], [17, 26]], 'M'); line(g, [[15, 26], [16, 26]], 'p'); }
    else if (name === 'sad') line(g, [[14, 26], [15, 25], [16, 25], [17, 26]], 'D');
    else line(g, [[14, 25], [15, 26], [16, 26], [17, 25]], 'D');
    // red cross badge on the wool
    line(g, [[8, 26], [7, 27], [8, 27], [9, 27], [8, 28]], 'r');
    // aviator goggles on the forehead
    line(g, [[11, 12], [12, 12], [13, 12], [14, 12], [15, 12], [16, 12], [17, 12], [18, 12], [19, 12], [20, 12]], 'S');
    [[13, 11], [19, 11]].forEach(([cx, cy]) => { ell(g, cx, cy, 3, 2.5, () => 'Y'); ell(g, cx, cy, 2.1, 1.7, () => 'G'); });
    put(g, 12, 10, 'E'); put(g, 18, 10, 'E');
    outline(g);
    if (name === 'cheer') { sparkle(g, 2, 3); sparkle(g, 29, 2); put(g, 1, 8, 'y'); put(g, 30, 9, 'y'); }
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
    correct: ['Nailed it!', 'Cleared for takeoff!', 'Smooth landing!', 'Textbook answer, Doc.', 'Right on the glide path.', 'Ram-tastic!'],
    wrong: ['Turbulence. Read the explanation and we\'ll nail the next one.', 'Every miss is a study note.', 'Shake it off. The next one is yours.', 'Better to learn it here than on boards day.'],
    tips: ['Cross out what you can rule out.', 'Don\'t be sheepish. Trust your first read.', 'Breathe. You\'ve got this.', 'Read the last line of the stem twice.', 'Eliminate, then decide.']
  };
  return { sprite, scene, mount, stop, pick, lines };
})();
