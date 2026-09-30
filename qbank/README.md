# AeroMedQBank

Static question bank for Aerospace, Occupational, and Preventive Medicine boards. Runs on GitHub Pages at `/qbank/` — no backend. Progress is saved in the browser (export/import from Settings).

## Adding questions
See **docs/QUESTION-GUIDE.md** for the full workflow (including a ready-made prompt for drafting questions with an AI model, physician review, spreadsheet import/export, and images). Short version:

1. Add or edit JSON files in `data/questions/` (see `sample.json` for the format).
2. List each file in `data/manifest.json` under `files`. Subjects live in the same file.
3. Run `node tools/validate.js` — checks ids, boards, subjects, answers.

Question fields: `id` (unique), `status` (`draft` or `reviewed`), `boards` (`aem`/`om`/`pm`, one or more), `subject`, `topic`, `difficulty` (1-3), `stem`, `options[{id,text}]`, `answer` (option id), `explanation`, `optionNotes{id:text}`, `references[]`, optional `image` + `imageAlt`, `reviewedBy`. Schema: `data/question.schema.json`.

## Accounts and private questions (optional)
Off by default, so the demo works with no setup. To turn on accounts (self sign-up for free accounts or invitation-only, your choice) with a private question bank, saved progress and an admin page, follow **docs/CLOUD-SETUP.md** (about 40 minutes, uses a free Supabase project). Database and privacy rules: `supabase/schema.sql`, tested with `supabase/tests/run.sh`. Real questions and their pictures live in the git-ignored `qbank/private/` folder and are uploaded with `tools/push-questions.js`. Admins can add members (creating their login through the `member-admin` Edge Function in `supabase/functions/`), reset passwords, change plans and download the member list in the app, and admins and reviewers can add, import (paste a chat reply), edit, review, archive and back up questions from **Admin > Questions** (`js/admin.js`, shared checker in `js/qvalidate.js`, tested with `tools/test-qvalidate.js`). Legal pages: `privacy.html`, `terms.html` (set `contactEmail` in `data/config.json`).

## Question feedback
Every question has a **Feedback** button (during a test and on the review page). It opens the team's Google Form in a new tab, with a Copy button for the question's reference so people can paste it into the form. The form address is `feedbackUrl` in `data/config.json`.

## Phones and offline
The app is installable ("Add to Home Screen") and works offline after the first visit. `sw.js` keeps a cached copy; when online it always fetches fresh files. Fonts are hosted in `fonts/` (SIL OFL license) so nothing loads from outside sites. `node tools/make-icons.js` regenerates the app icons.

## Local preview
`python3 -m http.server` from the repo root, then open `/qbank/`.

## Cover picture
The dashboard cover is a built-in vector illustration. To use your own photo instead, put an image (JPEG or WebP, about 1600 px wide, one you have the right to use) in `qbank/img/` and set `"coverImage": "img/your-photo.jpg"` in `data/config.json`. Government photos from DVIDS are usually free to use, but check each photo's terms.

## Group averages and flags
After a member answers a question they see how many members got it right on their first try, and the same average appears in results, review and the subject table. The database only releases a figure once at least N members (set in Admin, never below 5) have answered, so no individual can be identified. Members can flag any question and review flagged questions from the dashboard's Flagged tile.

## Lessons
The **Lessons** tab has short teaching pages per subject with tables, charts, step flows and comparisons, plus a button to practice questions in that subject. Admins and reviewers write, preview, import and publish them under **Admin > Lessons** (`js/adminlessons.js`, renderer in `js/lessons.js`, rules in `js/lvalidate.js`). See **docs/LESSON-GUIDE.md**, including a ready-made prompt for drafting lessons. Sample lessons (unreviewed drafts) are in `data/lessons/`.

## Features
Tutor and timed modes, filters (board, subject, unused/incorrect/flagged), option cross-out, flagging, notes, question navigator, keyboard shortcuts (1-9/letters, ←/→, F, Enter), results by subject, test review, history, dark mode, progress backup.

## Not built yet
Spaced repetition, percentile vs. peers.
