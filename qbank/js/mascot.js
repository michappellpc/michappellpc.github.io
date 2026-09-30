// Mascot "Pulse", a flat vector ram, plus the dashboard cover artwork. Poses: idle, blink, happy, cheer, sad.
const Mascot = (() => {
  const INK = '#1f2914', WOOL = '#f5f0e2', WOOLSH = '#d9cfb3', HORNDK = '#6f500c';
  // Horn: three stroked segments that thin toward the tip. The right horn is the mirror image.
  const SEG = [['M52 64 C30 50 14 66 16 92', 17], ['M16 92 C19 116 44 122 61 108', 14], ['M61 108 C69 100 63 90 55 94', 9.5]];
  const horn = `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${SEG.map(([d, w]) => `<path d="${d}" stroke="${INK}" stroke-width="${w + 5}"/>`).join('')}
    ${SEG.map(([d, w]) => `<path d="${d}" stroke="url(#mh)" stroke-width="${w}"/>`).join('')}
    <path d="M48 58 C30 47 20 60 21 80" stroke="#f3d582" stroke-width="2.4" opacity=".65"/>
    <g stroke="${HORNDK}" stroke-width="2" opacity=".6"><path d="M41 54 L38 68"/><path d="M28 56 L28 68"/><path d="M17 70 L28 73"/><path d="M16 92 L27 90"/><path d="M22 106 L30 99"/><path d="M34 116 L37 106"/><path d="M48 118 L48 108"/></g></g>`;
  function eyes(p) {
    const brow = (a, b) => `<path d="${a}" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/><path d="${b}" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/>`;
    if (p === 'blink') return brow('M58 70 L76 74', 'M102 70 L84 74').replace(/stroke-width="4.4"/g, 'stroke-width="3.6"') + `<path d="M62 79 H75M85 79 H98" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    if (p === 'happy' || p === 'cheer') return brow('M58 67 L76 68', 'M102 67 L84 68') + `<path d="M62 80 Q68.5 73 75 80M85 80 Q91.5 73 98 80" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>`;
    const b = p === 'sad' ? brow('M58 76 L76 68', 'M102 76 L84 68') : brow('M58 68 L77 74', 'M102 68 L83 74');
    const eye = x => `<path d="M${x - 8} 80 Q${x} 72 ${x + 8} 80 Q${x} 85 ${x - 8} 80Z" fill="#fff" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><circle cx="${x}" cy="79.5" r="3.4" fill="${INK}"/><circle cx="${x + 1.2}" cy="78.3" r="1.1" fill="#fff"/><path d="M${x - 9} 79 Q${x} 71 ${x + 9} 79" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`;
    return b + eye(67.5) + eye(92.5);
  }
  function mouth(p) {
    if (p === 'cheer') return `<path d="M68 118 Q80 130 92 118 Z" fill="#6f2b2b" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M72 119 H88" stroke="#fff" stroke-width="2.4"/>`;
    if (p === 'happy') return `<path d="M68 117 Q80 126 92 117" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    if (p === 'sad') return `<path d="M69 122 Q80 114 91 122" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    return `<path d="M70 119 H90" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  }
  function sprite(p = 'idle', scale = 4) {
    const w = Math.round(30 * scale * 0.95), h = Math.round(w * 170 / 160);
    const spark = p === 'cheer' ? `<g fill="#d8a92e"><path d="M146 18 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z"/><path d="M14 16 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4z"/></g>` : '';
    return `<svg class="sprite" viewBox="0 0 160 170" width="${w}" height="${h}" role="img" aria-label="Pulse, the AeroMedQBank ram in a flight helmet">
      <defs><linearGradient id="mh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6bb45"/><stop offset=".6" stop-color="#c8962a"/><stop offset="1" stop-color="#9c7016"/></linearGradient>
        <linearGradient id="mf" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#bfa47a"/><stop offset=".3" stop-color="#e3cea6"/><stop offset=".7" stop-color="#e3cea6"/><stop offset="1" stop-color="#bfa47a"/></linearGradient>
        <linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6a7b3a"/><stop offset="1" stop-color="#48592a"/></linearGradient>
        <linearGradient id="mv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a5566"/><stop offset="1" stop-color="#16222b"/></linearGradient></defs>
      ${horn}<g transform="translate(160 0) scale(-1 1)">${horn}</g>
      <path d="M22 170 Q24 138 54 130 L80 138 L106 130 Q136 138 138 170Z" fill="url(#mg)" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/>
      <path d="M62 128 Q80 150 98 128 L92 142 Q80 156 68 142Z" fill="${WOOL}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <g fill="none" stroke="${WOOLSH}" stroke-width="2" stroke-linecap="round"><path d="M70 138 q4 -4 8 0M82 140 q4 -4 8 0"/></g>
      <path d="M56 132 L70 146 L64 170M104 132 L90 146 L96 170" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M80 150 V170" stroke="${INK}" stroke-width="2.2" stroke-dasharray="3 2.5"/>
      <g transform="translate(101 152)"><path d="M0 4 L11 0 L22 4 L18 8 L11 6 L4 8Z" fill="#d8a92e" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M9.6 6.5h2.8v2.6H15v2.8h-2.6v2.6H9.6v-2.6H7V9.1h2.6z" fill="${INK}"/></g>
      <rect x="40" y="156" width="26" height="8" rx="1.5" fill="#d9c9a0" stroke="${INK}" stroke-width="1.6"/><path d="M45 160h16" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M58 60 Q54 92 58 108 Q63 130 80 132 Q97 130 102 108 Q106 92 102 60Z" fill="url(#mf)" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <g fill="${INK}" opacity=".22"><circle cx="68" cy="112" r=".9"/><circle cx="72" cy="121" r=".9"/><circle cx="76" cy="125" r=".9"/><circle cx="84" cy="125" r=".9"/><circle cx="88" cy="121" r=".9"/><circle cx="92" cy="112" r=".9"/><circle cx="66" cy="100" r=".9"/><circle cx="94" cy="100" r=".9"/></g>
      <path d="M72 86 Q80 82 88 86 L86 100 Q80 103 74 100Z" fill="#f0e2c3" opacity=".55"/>
      <ellipse cx="80" cy="112" rx="19.5" ry="14.5" fill="#f4e7cb" stroke="${INK}" stroke-width="2.4"/>
      <path d="M71 100 Q80 95 89 100 Q88 106 80 107 Q72 106 71 100Z" fill="#5d3d3d"/><circle cx="76.5" cy="102" r="1.3" fill="#2a1a1a"/><circle cx="83.5" cy="102" r="1.3" fill="#2a1a1a"/>
      ${eyes(p)}${mouth(p)}
      <path d="M52 66 C48 34 64 16 80 16 C96 16 112 34 108 66 L102 62 Q80 52 58 62Z" fill="url(#mg)" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M80 17 V50" stroke="${INK}" stroke-width="2" opacity=".55"/><path d="M66 24 Q80 19 94 24" fill="none" stroke="#a4b56a" stroke-width="2.2" stroke-linecap="round" opacity=".6"/>
      <path d="M59 46 Q80 38 101 46 L100 58 Q80 51 60 58Z" fill="url(#mv)" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M64 49 Q76 44 86 45" fill="none" stroke="#9cc3d8" stroke-width="2" stroke-linecap="round" opacity=".7"/>
      <rect x="45" y="60" width="13" height="19" rx="6" fill="#39481f" stroke="${INK}" stroke-width="2.6"/><rect x="102" y="60" width="13" height="19" rx="6" fill="#39481f" stroke="${INK}" stroke-width="2.6"/>
      <path d="M49 79 Q54 98 62 108M111 79 Q106 98 98 108" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>
      ${spark}</svg>`;
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
