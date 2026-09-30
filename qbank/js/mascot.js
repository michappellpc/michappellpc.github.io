// Mascot "Pulse", a flat vector ram, plus the dashboard cover artwork. Poses: idle, blink, happy, cheer, sad.
const Mascot = (() => {
  const INK = '#26301a', WOOL = '#f7f3e8', WOOLSH = '#dcd3ba', HORNDK = '#7d5c10';
  // One curled horn built from three stroked segments that get thinner toward the tip; the right horn is its mirror image.
  const SEG = [['M54 46 C30 32 8 48 10 76', 15], ['M10 76 C12 102 38 110 54 97', 12], ['M54 97 C63 89 57 79 48 82', 8.5]];
  const horn = `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${SEG.map(([d, w]) => `<path d="${d}" stroke="${INK}" stroke-width="${w + 5}"/>`).join('')}
    ${SEG.map(([d, w]) => `<path d="${d}" stroke="url(#mh)" stroke-width="${w}"/>`).join('')}
    <path d="M52 41 C31 30 14 44 15 68" stroke="#f0cf78" stroke-width="2.2" opacity=".7"/>
    <g stroke="${HORNDK}" stroke-width="1.8" opacity=".55"><path d="M40 38 L38 53"/><path d="M26 40 L27 54"/><path d="M15 55 L27 60"/><path d="M12 82 L24 79"/><path d="M27 100 L31 90"/><path d="M42 104 L43 93"/></g></g>`;
  function eyes(p) {
    const lid = (x, m) => `<path d="M${x - 8 * m} 68 Q${x} 61 ${x + 8 * m} 67" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
    if (p === 'blink') return `<path d="M43 68 Q51 71 59 68M81 68 Q89 71 97 68" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`;
    if (p === 'happy' || p === 'cheer') return `<path d="M43 69 Q51 61 59 69M81 69 Q89 61 97 69" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    const brow = p === 'sad' ? `<path d="M42 58 L60 63M98 58 L80 63" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>` : `<path d="M42 60 Q52 55 60 59M98 60 Q88 55 80 59" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>`;
    const eye = x => `<ellipse cx="${x}" cy="69" rx="7.5" ry="5.2" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="${x}" cy="69.5" r="3.6" fill="${INK}"/><circle cx="${x + 1.3}" cy="68.2" r="1.2" fill="#fff"/><path d="M${x - 8} 67 Q${x} 61 ${x + 8} 67" fill="${p === 'sad' ? 'none' : '#d3bd96'}" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;
    return brow + eye(51) + eye(89);
  }
  function mouth(p) {
    if (p === 'cheer') return `<path d="M60 108 Q70 119 80 108 Z" fill="#7a2f2f" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`;
    if (p === 'happy') return `<path d="M60 107 Q70 115 80 107" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
    if (p === 'sad') return `<path d="M61 113 Q70 106 79 113" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
    return `<path d="M61 108 Q70 112 79 108" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
  }
  function sprite(p = 'idle', scale = 4) {
    const w = Math.round(30 * scale * 0.95), h = Math.round(w * 150 / 140);
    const spark = p === 'cheer' ? `<g fill="#d8a92e"><path d="M124 18 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z"/><path d="M14 14 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4z"/></g>` : '';
    return `<svg class="sprite" viewBox="0 0 140 150" width="${w}" height="${h}" role="img" aria-label="Pulse, the AeroMedQBank ram">
      <defs><linearGradient id="mh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2b640"/><stop offset=".6" stop-color="#c8962a"/><stop offset="1" stop-color="#a87a1c"/></linearGradient>
        <linearGradient id="mf" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cdb48c"/><stop offset=".35" stop-color="#e6d3ae"/><stop offset=".65" stop-color="#e6d3ae"/><stop offset="1" stop-color="#cdb48c"/></linearGradient></defs>
      ${horn}<g transform="translate(140 0) scale(-1 1)">${horn}</g>
      <ellipse cx="38" cy="84" rx="11" ry="6" transform="rotate(-28 38 84)" fill="#d6bf98" stroke="${INK}" stroke-width="2.4"/>
      <ellipse cx="102" cy="84" rx="11" ry="6" transform="rotate(28 102 84)" fill="#d6bf98" stroke="${INK}" stroke-width="2.4"/>
      <path d="M30 128 Q34 112 52 116 L88 116 Q106 112 110 128 L112 150 H28Z" fill="${WOOL}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
      <g fill="none" stroke="${WOOLSH}" stroke-width="2.2" stroke-linecap="round"><path d="M40 134 q5 -5 10 0 q5 5 10 0"/><path d="M82 137 q5 -5 10 0 q5 5 10 0"/></g>
      <path d="M56 116 C54 132 62 140 70 142 C78 140 86 132 84 116" fill="none" stroke="#3b4a24" stroke-width="3.4" stroke-linecap="round"/><circle cx="70" cy="143" r="6.5" fill="#cfd6cc" stroke="${INK}" stroke-width="2.2"/><circle cx="70" cy="143" r="2.6" fill="#8f9a90"/>
      <path d="M46 42 Q70 34 94 42 L98 72 Q100 96 92 108 Q84 120 70 121 Q56 120 48 108 Q40 96 42 72 Z" fill="url(#mf)" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/>
      <path d="M62 56 Q70 52 78 56 L76 86 Q70 90 64 86Z" fill="#f0e3c6" opacity=".55"/>
      <g fill="${WOOL}" stroke="${INK}" stroke-width="2.4"><circle cx="70" cy="37" r="11"/><circle cx="57" cy="41" r="9.5"/><circle cx="83" cy="41" r="9.5"/><circle cx="48" cy="48" r="7"/><circle cx="92" cy="48" r="7"/></g>
      <path d="M63 36 Q70 40 77 36" fill="none" stroke="${WOOLSH}" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="70" cy="103" rx="15.5" ry="13.5" fill="#f6ead0" stroke="${INK}" stroke-width="2.3"/>
      <ellipse cx="70" cy="95" rx="6.5" ry="4" fill="#6a4646"/>
      ${eyes(p)}${mouth(p)}${spark}</svg>`;
  }

  // Dashboard cover: dawn sky, layered ridgelines, a jet and its contrail. Everything is vector, so it stays sharp at any size.
  function scene(coverImage) {
    const art = coverImage
      ? `<img class="cover-photo" src="${coverImage}" alt="">`
      : `<svg class="cover-art" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs><linearGradient id="cv-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2a3a"/><stop offset=".55" stop-color="#3d5566"/><stop offset="1" stop-color="#d9b877"/></linearGradient>
        <linearGradient id="cv-trail" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
        <radialGradient id="cv-sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe9b0" stop-opacity=".95"/><stop offset="1" stop-color="#ffe9b0" stop-opacity="0"/></radialGradient></defs>
      <rect width="1200" height="240" fill="url(#cv-sky)"/><circle cx="930" cy="190" r="150" fill="url(#cv-sun)"/>
      <g stroke="#fff" stroke-opacity=".08"><path d="M0 60H1200M0 110H1200M0 160H1200"/></g>
      <path d="M560 82 L880 60" stroke="url(#cv-trail)" stroke-width="3" stroke-linecap="round"/><path d="M560 88 L880 66" stroke="url(#cv-trail)" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>
      <g transform="translate(880 44) rotate(-4)" fill="#f4f6f4"><path d="M0 14 L64 8 Q86 9 100 15 Q86 21 64 22 L10 22Z"/><path d="M10 14 L-2 -4 L10 -4 L28 12Z"/><path d="M46 16 L72 38 L82 38 L68 16Z" opacity=".92"/></g>
      <path d="M0 190 C120 150 230 176 350 156 C470 136 560 170 690 150 C820 130 930 168 1050 146 C1120 134 1170 142 1200 148 V240 H0Z" fill="#5d6f3b"/>
      <path d="M0 214 C140 186 260 206 400 190 C540 174 640 206 780 188 C900 174 1040 202 1200 182 V240 H0Z" fill="#3f4f25"/>
      <path d="M0 232 C180 214 360 230 560 220 C760 210 980 232 1200 218 V240 H0Z" fill="#2b3719"/></svg>`;
    return `<div class="cover">${art}<div class="cover-shade"></div><div class="cover-body"><div class="cover-text" id="cover-text"></div><div class="scene-slot" id="scene-slot"></div></div></div>`;
  }

  const RANKS = [
    { at: 0, abbr: '2LT', name: 'Second Lieutenant' }, { at: 25, abbr: '1LT', name: 'First Lieutenant' },
    { at: 75, abbr: 'CPT', name: 'Captain' }, { at: 200, abbr: 'MAJ', name: 'Major' },
    { at: 500, abbr: 'LTC', name: 'Lieutenant Colonel' }, { at: 1000, abbr: 'COL', name: 'Colonel' }
  ];
  const rankFor = n => { let i = 0; RANKS.forEach((r, k) => { if (n >= r.at) i = k; }); return { ...RANKS[i], next: RANKS[i + 1] || null }; };

  const timers = [];
  const stop = () => { while (timers.length) clearInterval(timers.pop()); };
  const hash = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
  const pick = (arr, seed) => arr[hash(seed) % arr.length];

  function mount(el, { pose: p = 'idle', msg = '', scale = 4 } = {}) {
    el.innerHTML = `<div class="mascot">${sprite(p, scale)}${msg ? `<div class="bubble">${msg}</div>` : ''}</div>`;
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
    correct: ['Correct. Well reasoned.', 'On target.', 'Nice work, Doc.', 'That is the one.', 'Solid.', 'Cleared for the next one.'],
    wrong: ['Not quite. Read the explanation, then regroup.', 'Review it and move on. The next one is yours.', 'Every miss is useful before the boards.', 'Better to learn it here than on exam day.'],
    tips: ['Rule out what you can first.', 'Trust your first read.', 'Read the last line of the stem twice.', 'Slow is smooth, smooth is fast.']
  };
  return { sprite, scene, mount, stop, pick, lines, rankFor };
})();
