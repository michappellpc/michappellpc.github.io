# Board Prep QBank

Static question bank for Aerospace, Occupational, and Preventive Medicine boards. Runs on GitHub Pages at `/qbank/` — no backend. Progress is saved in the browser (export/import from Settings).

## Adding questions
See **docs/QUESTION-GUIDE.md** for the full workflow (including a ready-made prompt for drafting questions with an AI model, physician review, spreadsheet import/export, and images). Short version:

1. Add or edit JSON files in `data/questions/` (see `sample.json` for the format).
2. List each file in `data/manifest.json` under `files`. Subjects live in the same file.
3. Run `node tools/validate.js` — checks ids, boards, subjects, answers.

Question fields: `id` (unique), `status` (`draft` or `reviewed`), `boards` (`aem`/`om`/`pm`, one or more), `subject`, `topic`, `difficulty` (1-3), `stem`, `options[{id,text}]`, `answer` (option id), `explanation`, `optionNotes{id:text}`, `references[]`, optional `image` + `imageAlt`, `reviewedBy`. Schema: `data/question.schema.json`.

## Question feedback
Every question has a **Feedback** button (during a test and on the review page). Feedback goes to a Google Form you own, so it lands in a Google Sheet. Until `data/config.json` is filled in, it is only saved on the resident's device. Setup takes about 5 minutes: **docs/FEEDBACK-SETUP.md**. Feedback submitted offline is queued and sent automatically.

## Phones and offline
The app is installable ("Add to Home Screen") and works offline after the first visit. `sw.js` keeps a cached copy; when online it always fetches fresh files. Fonts are hosted in `fonts/` (SIL OFL license) so nothing loads from outside sites. `node tools/make-icons.js` regenerates the app icons.

## Local preview
`python3 -m http.server` from the repo root, then open `/qbank/`.

## Features
Tutor and timed modes, filters (board, subject, unused/incorrect/flagged), option cross-out, flagging, notes, question navigator, keyboard shortcuts (1-9/letters, ←/→, F, Enter), results by subject, test review, history, dark mode, progress backup.

## Not built yet
Accounts/cross-device sync (needs a backend), question images upload, spaced repetition, percentile vs. peers.
