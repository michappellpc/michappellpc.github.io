// Pixel-art mascot "Pulse", a flight surgeon in a helmet. Sprites are text grids rendered as inline SVG.
const Mascot = (() => {
  const PAL = { o: '#1b2a41', h: '#3d7fd1', H: '#8ec1f5', v: '#9ad7ff', s: '#f2c29b', w: '#ffffff', a: '#ffffff', r: '#e04b4b', e: '#1b2a41', m: '#7a2a2a', M: '#7a2a2a', y: '#ffd23f', b: '#7cc4ff', c: 'currentColor' };
  const BASE = [
    '................',
    '....oooooooo....',
    '...ohhhhhhhho...',
    '..ohHHhhhhhhho..',
    '.ohHhhhhhhhhhho.',
    '.ohhhhhhhhhhhho.',
    '.oooooooooooooo.',
    '.ovssssssssssvo.',
    '.ovssessssessvo.',
    '.ovssessssessvo.',
    '.ovssmssssmssvo.',
    '.ovsssmmmmsssvo.',
    '.oooooooooooooo.',
    '..owwwwrrwwwwo..',
    '..owwwrrrrwwwo..',
    '..oooooooooooo..'
  ];
  const W = 20, OFF = 2;
  const grid = () => { const g = BASE.map(r => ('.'.repeat(OFF) + r + '.'.repeat(OFF)).split('')); return g; };
  const set = (g, r, c, ch) => { if (g[r] && c >= 0 && c < W) g[r][c + 0] = ch; };
  const put = (g, r, bc, ch) => set(g, r, bc + OFF, ch);       // base-column coordinates
  const ARM_DOWN = [[13, 3], [14, 3]];
  const ARM_UP = [[13, 3], [12, 2], [11, 2], [10, 1], [9, 1], [8, 1]];
  function arms(g, cells) {
    const px = [];
    cells.forEach(([r, c]) => { px.push([r, c], [r, W - 1 - c]); });
    px.forEach(([r, c]) => set(g, r, c, 'a'));
    px.forEach(([r, c]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
      const rr = r + dr, cc = c + dc; if (g[rr] && g[rr][cc] === '.') g[rr][cc] = 'o';
    }));
  }
  function sparkle(g, r, c) { [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => set(g, r + dr, c + dc, 'y')); }
  const eyes = (g, kind) => {
    if (kind === 'blink') { put(g, 8, 5, 's'); put(g, 8, 10, 's'); }
    if (kind === 'happy') {
      [5, 10].forEach(c => { put(g, 9, c, 's'); put(g, 9, c - 1, 'e'); put(g, 9, c + 1, 'e'); });
    }
  };
  const clearMouth = g => [10, 11].forEach(r => { for (let c = 3; c <= 12; c++) put(g, r, c, 's'); });
  function pose(name) {
    const g = grid();
    if (name === 'blink') eyes(g, 'blink');
    if (name === 'happy' || name === 'cheer') {
      eyes(g, 'happy'); clearMouth(g);
      for (let c = 5; c <= 10; c++) put(g, 10, c, 'M'); put(g, 11, 7, 'M'); put(g, 11, 8, 'M');
    }
    if (name === 'sad') {
      clearMouth(g); for (let c = 6; c <= 9; c++) put(g, 10, c, 'm'); put(g, 11, 5, 'm'); put(g, 11, 10, 'm'); put(g, 10, 4, 'b'); put(g, 11, 4, 'b');
    }
    arms(g, name === 'cheer' ? ARM_UP : ARM_DOWN);
    if (name === 'cheer') { sparkle(g, 3, 1); sparkle(g, 5, 18); put(g, 1, 13, 'y'); }
    return g;
  }
  function toSvg(g, px, cls) {
    let rects = '';
    g.forEach((row, y) => {
      for (let x = 0; x < row.length;) {
        const ch = row[x]; if (ch === '.') { x++; continue; }
        let n = 1; while (row[x + n] === ch) n++;
        rects += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${PAL[ch]}"/>`; x += n;
      }
    });
    return `<svg class="${cls}" width="${g[0].length * px}" height="${g.length * px}" viewBox="0 0 ${g[0].length} ${g.length}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  }
  const sprite = (name, px = 5) => toSvg(pose(name), px, 'sprite');
  const art = (rows, px, cls) => toSvg(rows.map(r => r.split('')), px, cls);

  const JET = ['..oo........', '..owo.......', '..owwo......', 'oowwwwwwwvoo', '..owwo......', '..owo.......', '..oo........'];
  const CLOUD = ['..cccc..', '.cccccc.', 'cccccccc'];
  const STAR = ['.y.', 'yyy', '.y.'];

  const timers = [];
  const stop = () => { while (timers.length) clearInterval(timers.pop()); };
  const hash = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
  const pick = (arr, seed) => arr[hash(seed) % arr.length];

  // Renders the mascot plus a speech bubble into `el`. Idle poses blink now and then.
  function mount(el, { pose: p = 'idle', msg = '', scale = 5 } = {}) {
    el.innerHTML = `<div class="mascot">${sprite(p, scale)}${msg ? `<div class="bubble">${msg}</div>` : ''}</div>`;
    if (p === 'idle') {
      const svg = () => el.querySelector('.sprite');
      timers.push(setInterval(() => {
        const s = svg(); if (!s) return;
        s.outerHTML = sprite('blink', scale);
        setTimeout(() => { const t = svg(); if (t) t.outerHTML = sprite('idle', scale); }, 160);
      }, 3600));
    }
  }

  // Pixel sky scene for the dashboard hero.
  function scene() {
    const clouds = [[8, 10, 26, 6], [28, 32, 38, 7], [55, 14, 30, 5], [78, 40, 44, 6]].map(([l, t, d, px]) =>
      `<span class="cloud" style="left:${l}%;top:${t}px;animation-duration:${d}s">${art(CLOUD, px, 'px')}</span>`).join('');
    const stars = [[12, 14], [33, 42], [47, 10], [64, 30], [83, 16], [93, 52]].map(([l, t]) =>
      `<span class="star" style="left:${l}%;top:${t}px">${art(STAR, 3, 'px')}</span>`).join('');
    return `<div class="scene">${stars}${clouds}<span class="jet">${art(JET, 4, 'px')}</span><div class="ground"></div><div class="scene-slot" id="scene-slot"></div></div>`;
  }

  const lines = {
    correct: ['Nailed it!', 'Cleared for takeoff!', 'Smooth landing!', 'Textbook answer, Doc.', 'Right on the glide path.'],
    wrong: ['Turbulence. Read the explanation and we\'ll nail the next one.', 'Every miss is a study note.', 'Shake it off. The next one is yours.', 'Better to learn it here than on boards day.'],
    tips: ['Cross out what you can rule out.', 'Trust your first read.', 'Breathe. You\'ve got this.', 'Read the last line of the stem twice.', 'Eliminate, then decide.']
  };
  return { sprite, scene, mount, stop, pick, lines };
})();
