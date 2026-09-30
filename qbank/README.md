# Board Prep QBank

Static question bank for Aerospace, Occupational, and Preventive Medicine boards. Runs on GitHub Pages at `/qbank/` — no backend. Progress is saved in the browser (export/import from Settings).

## Adding questions
See **docs/QUESTION-GUIDE.md** for the full workflow (including a ready-made prompt for drafting questions with an AI model, physician review, spreadsheet import/export, and images). Short version:

1. Add or edit JSON files in `data/questions/` (see `sample.json` for the format).
2. List each file in `data/manifest.json` under `files`. Subjects live in the same file.
3. Run `node tools/validate.js` — checks ids, boards, subjects, answers.

Question fields: `id` (unique), `status` (`draft` or `reviewed`), `boards` (`aem`/`om`/`pm`, one or more), `subject`, `topic`, `difficulty` (1-3), `stem`, `options[{id,text}]`, `answer` (option id), `explanation`, `optionNotes{id:text}`, `references[]`, optional `image` + `imageAlt`, `reviewedBy`. Schema: `data/question.schema.json`.

## Accounts and private questions (optional)
Off by default, so the demo works with no setup. To make the app invitation-only with a private question bank, saved progress and an admin page, follow **docs/CLOUD-SETUP.md** (about 40 minutes, uses a free Supabase project). Database and privacy rules: `supabase/schema.sql`, tested with `supabase/tests/run.sh`. Real questions and their pictures live in the git-ignored `qbank/private/` folder and are uploaded with `tools/push-questions.js`. Admins can approve members, change plans and download the member list in the app. Legal pages: `privacy.html`, `terms.html` (set `contactEmail` in `data/config.json`).

## Question feedback
Every question has a **Feedback** button (during a test and on the review page). It opens the team's Google Form in a new tab, with a Copy button for the question's reference so people can paste it into the form. The form address is `feedbackUrl` in `data/config.json`.

## Phones and offline
The app is installable ("Add to Home Screen") and works offline after the first visit. `sw.js` keeps a cached copy; when online it always fetches fresh files. Fonts are hosted in `fonts/` (SIL OFL license) so nothing loads from outside sites. `node tools/make-icons.js` regenerates the app icons.

## Local preview
`python3 -m http.server` from the repo root, then open `/qbank/`.

## Features
Tutor and timed modes, filters (board, subject, unused/incorrect/flagged), option cross-out, flagging, notes, question navigator, keyboard shortcuts (1-9/letters, ←/→, F, Enter), results by subject, test review, history, dark mode, progress backup.

## Not built yet
Accounts/cross-device sync (needs a backend), question images upload, spaced repetition, percentile vs. peers.
