# Board Prep QBank

Static question bank for Aerospace, Occupational, and Preventive Medicine boards. Runs on GitHub Pages at `/qbank/` — no backend. Progress is saved in the browser (export/import from Settings).

## Adding questions
1. Add or edit JSON files in `data/questions/` (see `sample.json` for the format).
2. List each file in `data/manifest.json` under `files`. Subjects live in the same file.
3. Run `node tools/validate.js` — checks ids, boards, subjects, answers.

Question fields: `id` (unique), `boards` (`aem`/`om`/`pm`, one or more), `subject`, `topic`, `difficulty` (1-3), `stem`, `options[{id,text}]`, `answer` (option id), `explanation`, `references[]`, optional `image`.

## Local preview
`python3 -m http.server` from the repo root, then open `/qbank/`.

## Features
Tutor and timed modes, filters (board, subject, unused/incorrect/flagged), option cross-out, flagging, notes, question navigator, keyboard shortcuts (1-9/letters, ←/→, F, Enter), results by subject, test review, history, dark mode, progress backup.

## Not built yet
Accounts/cross-device sync (needs a backend), question images upload, spaced repetition, percentile vs. peers.
