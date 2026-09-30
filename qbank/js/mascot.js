// Mascot "Pulse", a flat vector ram, plus the dashboard cover artwork. Poses: idle, blink, happy, cheer, sad.
const Mascot = (() => {
  const INK = '#2f3a17', WOOL = '#f6f1e4', WOOLSH = '#e2dac3', FACE = '#e9d2ab', MUZ = '#f7ead2', HORN = '#c9992b', HORNDK = '#8f6b12';
  const horn = `<path d="M43 44 C21 35 7 58 19 75 C28 86 46 81 45 68 C44 60 34 59 32 65" fill="none" stroke="${INK}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M43 44 C21 35 7 58 19 75 C28 86 46 81 45 68 C44 60 34 59 32 65" fill="none" stroke="${HORN}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M40 43 C22 37 12 58 22 71" fill="none" stroke="${HORNDK}" stroke-width="2" stroke-linecap="round" opacity=".55"/>
    <path d="M37 48 C25 45 19 57 25 66" fill="none" stroke="${HORNDK}" stroke-width="1.6" stroke-linecap="round" opacity=".45"/>`;
  const wool = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${WOOL}" stroke="${INK}" stroke-width="2.4"/>`;
  function eyes(p) {
    if (p === 'blink') return `<path d="M45 63h10M65 63h10" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
    if (p === 'happy' || p === 'cheer') return `<path d="M45 65 Q50 57 55 65M65 65 Q70 57 75 65" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    const brow = p === 'sad' ? `<path d="M44 55 L55 58M76 55 L65 58" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>` : '';
    return `${brow}<circle cx="50" cy="63" r="4.6" fill="${INK}"/><circle cx="70" cy="63" r="4.6" fill="${INK}"/><circle cx="51.6" cy="61.4" r="1.5" fill="#fff"/><circle cx="71.6" cy="61.4" r="1.5" fill="#fff"/>`;
  }
  function mouth(p) {
    if (p === 'cheer') return `<path d="M50 92 Q60 104 70 92 Z" fill="#7a2f2f" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`;
    if (p === 'happy') return `<path d="M51 92 Q60 100 69 92" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
    if (p === 'sad') return `<path d="M52 96 Q60 90 68 96" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
    return `<path d="M53 93 Q60 97 67 93" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
  }
  function sprite(p = 'idle', scale = 4) {
    const px = Math.round(30 * scale * 0.9);
    const spark = p === 'cheer' ? `<g fill="${HORN}"><path d="M100 20 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z"/><path d="M14 16 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"/></g>` : '';
    return `<svg class="sprite" viewBox="0 0 120 124" width="${px}" height="${Math.round(px * 124 / 120)}" role="img" aria-label="Pulse, the AeroMedQBank ram">
      ${horn}<g transform="translate(120 0) scale(-1 1)">${horn}</g>
      <ellipse cx="33" cy="64" rx="10" ry="5.5" transform="rotate(-24 33 64)" fill="${FACE}" stroke="${INK}" stroke-width="2.4"/>
      <ellipse cx="87" cy="64" rx="10" ry="5.5" transform="rotate(24 87 64)" fill="${FACE}" stroke="${INK}" stroke-width="2.4"/>
      ${wool(44, 108, 13)}${wool(76, 108, 13)}${wool(60, 112, 13)}
      <circle cx="60" cy="110" r="8.5" fill="${INK}"/><path d="M58 104.5h4v3.5h3.5v4H62v3.5h-4V112h-3.5v-4H58z" fill="${HORN}"/>
      <path d="M41 42 Q60 35 79 42 L82 70 Q82 97 60 101 Q38 97 38 70 Z" fill="${FACE}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
      ${wool(60, 33, 11)}${wool(48, 37, 9.5)}${wool(72, 37, 9.5)}${wool(40, 45, 7.5)}${wool(80, 45, 7.5)}
      <path d="M52 34 Q60 38 68 34" fill="none" stroke="${WOOLSH}" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="60" cy="88" rx="15" ry="10.5" fill="${MUZ}" stroke="${INK}" stroke-width="2.2"/>
      <ellipse cx="60" cy="82" rx="5.4" ry="3.6" fill="#5b3a3a"/>
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
