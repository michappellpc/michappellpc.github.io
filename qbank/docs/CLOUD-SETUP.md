# Turning on private accounts

This switches Ram QBank from "anyone with the link can use it" to **invitation-only, with a private question bank**:

- Only people whose email you approve can sign in.
- The questions live in a private database. They are not in this public repository and are only sent to approved, signed-in people.
- Each person's progress is saved to their account, so it follows them between phones and computers. It still works offline.
- You get an **Admin** page showing how the group is doing.

Plan on **about 40 minutes**. Nothing here costs money on Supabase's free plan for a small group (check their current limits before you rely on it).

You need: a computer, an email address for your Supabase account, and (for step 8 only) [Node.js](https://nodejs.org) installed. Choose the "LTS" download.

---

## 1. Create the database project

1. Go to **supabase.com** and sign up (free).
2. Click **New project**. Name it `ram-qbank`. Choose the region closest to your residents.
3. Make up a **database password** and save it in a password manager. You will rarely need it.
4. Wait a couple of minutes while it sets up.

## 2. Create the tables and privacy rules

1. In the left menu click **SQL Editor**, then **New query**.
2. On GitHub, open the file `qbank/supabase/schema.sql`, click **Copy raw file**, and paste everything into the editor.
3. Click **Run**. You should see "Success. No rows returned".

This is safe to run again later. It creates the tables, and the rules that make each person's data private.

## 3. Approve people, starting with yourself

1. Left menu: **Table Editor** > table **allowed_emails** > **Insert row**.
2. **Add yourself first.** Email in lower case, `role` = `admin`, `plan` = `pro`. Save.
3. Add each resident: their email in lower case, `role` = `member`, `plan` = `pro`.

Nobody can see anything until their email is on this list. Removing an email from the list locks that person out immediately.

## 4. Create the accounts

For a pilot the simplest way is to create accounts yourself and share passwords privately, because it does not depend on email delivery.

1. Left menu: **Authentication** > **Users** > **Add user** > **Create new user**.
2. Enter the email and a password. **Tick "Auto Confirm User".** Click **Create user**.
3. Give each person their password privately and tell them to keep it. They can reset it later with **Forgot password** once step 6 is done.

(Instead of creating accounts, you can use **Invite user**, which emails a link that opens a "choose a password" screen in the app. Supabase's built-in email is limited to a few messages an hour, so for more than a handful of people set up your own email service under **Authentication > Emails > SMTP settings** first.)

## 5. Lock down sign-up

1. **Authentication** > **Sign In / Providers** (or **Providers**) > **Email**.
2. Turn **off** "Allow new users to sign up" (in some versions "Enable sign ups").
3. Set the minimum password length to 8 or more.

The approved-list rules already keep strangers out even if this is left on. This is a second lock.

## 6. Tell Supabase your website address

1. **Authentication** > **URL Configuration**.
2. **Site URL:** `https://michappellpc.github.io/qbank/`
3. Under **Redirect URLs** add the same address.

This is what makes the links in password-reset and invite emails open your app.

## 7. Connect the app

1. Left menu: **Project Settings** > **API** (or **API Keys**).
2. Copy the **Project URL**.
3. Copy the key labelled **anon / public** (or **Publishable key**).
4. In the repo, open `qbank/data/config.json` and fill in:

```json
"supabase": {
  "url": "https://YOUR-PROJECT.supabase.co",
  "anonKey": "the anon / publishable key"
}
```

> **Only ever put the anon / publishable key in this file.** It is designed to be public: the privacy rules from step 2 are what protect the data, not the key.
> **Never** put the **service_role / secret** key in the repo, in an email, or anywhere public. It bypasses every rule. It is only used on your own computer in step 8.

Commit that change. Once it is live, the app asks everyone to sign in.

## 8. Upload your questions (from your own computer)

Real questions must never be saved in the public repo. Keep them in the git-ignored folder `qbank/private/`.

1. Get the repo onto your computer (on GitHub: **Code** > **Download ZIP**, then unzip).
2. Open a terminal in that folder and create the private folder:
   ```bash
   node qbank/tools/push-questions.js --init
   ```
3. Put questions in it. Either save your JSON files in `qbank/private/questions/` and list them in `qbank/private/manifest.json`, or import a spreadsheet straight there:
   ```bash
   node qbank/tools/import-csv.js my-questions.csv --data qbank/private --prefix aem-altitude --add
   ```
4. Check them without sending anything:
   ```bash
   node qbank/tools/push-questions.js --dry
   ```
5. Get the secret key: **Project Settings > API** > **service_role / secret** key. In your terminal (not in any file):
   ```bash
   export SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
   export SUPABASE_SERVICE_KEY="paste the secret key here"
   node qbank/tools/push-questions.js
   ```
   (On Windows PowerShell use `$env:SUPABASE_URL="..."` and `$env:SUPABASE_SERVICE_KEY="..."`.)

**Pictures** (audiograms, spirometry, charts) are private too. Put the image files in `qbank/private/images/` (lower-case names ending in `.png`, `.jpg`, `.webp` or `.gif`, each under 2 MB) and refer to them in a question as `"image": "private:audiogram-01.png"` with an `imageAlt` description. The upload tool sends the pictures first. A member can only see a picture if they can see a question that uses it.

Run it again any time to add or fix questions. Existing ones are updated by their `id`. `--tier free` makes a batch visible to free-plan accounts too (see "Free and paid" below).

## 9. Contact address and legal pages

The app has a privacy policy (`privacy.html`) and terms of use (`terms.html`), linked at the bottom of every page and on the sign-in screen. They describe what the app really collects, and they name the person who runs it as the contact.

1. In `qbank/data/config.json` set `"contactEmail"` to the address residents should write to (for example for locked-out accounts or deleting their data). Until you do, the pages say "the person who invited you".
2. Read both pages once. I wrote them from how the app actually works, but I am not a lawyer, so have someone qualified review them before you rely on them, especially if you ever charge.
3. Your site's main page (`michappellpc.github.io`) is the separate Pocket Flight Surgeon privacy policy and is not touched by any of this.

## 10. First-time check (please do this before inviting everyone)

I built and tested all of this against a stand-in for Supabase and on a real test database, but I could not reach the real Supabase from where I work. So the first real run is yours:

- [ ] Open the site while signed out. You should see only the sign-in screen.
- [ ] Sign in as yourself. You should reach the dashboard and see your questions.
- [ ] Answer a few. In Supabase **Table Editor > attempts**, rows should appear.
- [ ] Sign in on a second device or browser. Your progress should be there.
- [ ] Turn on airplane mode, reload, and answer one. Turn it back on. The row should appear in `attempts` shortly after.
- [ ] Open **Admin** in the menu. You should see the member list and question stats.
- [ ] Sign in as a resident (or a test account) and confirm there is **no** Admin menu.
- [ ] In **Admin**, approve a test email, change its plan, and remove it again.
- [ ] In **Settings**, change your password, then sign out and back in with the new one.
- [ ] If you have uploaded a question with a picture, confirm the picture shows, then confirm it still shows in airplane mode.
- [ ] Try **Forgot password** and confirm the email arrives (only works if email is set up, step 4).
- [ ] Sign out, then check the device: reloading should show the sign-in screen.

If something fails, tell me exactly what you saw (a screenshot helps) and I will fix it.

---

## Everyday tasks

**Approve, change or remove a person:** use **Admin > Approved emails** in the app (or Table Editor > `allowed_emails`). Removing an email blocks them at once. Creating the account itself is still done under Authentication > Users (step 4), because creating logins needs Supabase's own tools. To delete an account entirely, also delete it there.

**A resident forgot their password:** they use **Forgot password** on the sign-in screen (needs email set up), or you set a new one for them under Authentication > Users. Everyone can change their own password in **Settings**.

**See how the group is doing:** **Admin** shows members, how many questions each has answered, and the hardest questions. **Download CSV** exports the member list.

**Make a question or person "free" vs "pro":** every question has a `tier` and every person a `plan`. A `pro` plan sees everything, a `free` plan only sees `free` questions. Right now everyone you add is `pro`, so tiers do nothing until you decide to charge.

**See who is active:** the Admin page, or the `profiles` table.

**Back up:** keep your question files (the folder `qbank/private/`) somewhere safe, since they are the master copy. Progress can be exported as CSV from the Table Editor.

## What is and is not protected

- Protected: the question text, answers and explanations are only sent to approved, signed-in people, and each person only ever sees their own progress.
- Not protected: an approved person can still copy what they can see (screenshots, copying text). That cannot be prevented by any website.
- **Pictures** use the private image store (see step 8), not the public `images/` folder. Anything you put in the public `images/` folder is visible to anyone, so do not use it for real question images.
- The public repo still contains the app itself and 4 placeholder demo questions. That is fine. With accounts turned on the demo questions are not used.

## If you plan to charge later

The pieces for it are already in place: a `plan` for each person and a `tier` for each question, and access rules enforced in the database. What would still be needed is a payment service (such as Stripe) that sets a person's plan when they pay, plus terms of service and a privacy policy. Check with an ethics counselor before charging if you are a service member, and with a lawyer about question ownership.

## Troubleshooting

| You see | Likely cause |
|---|---|
| "Email or password is incorrect" | Wrong password, or the account wasn't created (step 4) or wasn't confirmed ("Auto Confirm User") |
| "Account not active yet" | Their email isn't in `allowed_emails`, or was typed with capital letters. Emails must be lower case |
| A picture says "Image unavailable" | The picture was not uploaded (run the upload tool again), the name in the question does not match the file, or the device is offline and had not saved it yet |
| Signed in but 0 questions | No questions uploaded yet (step 8), or the person is on the `free` plan and the questions are `pro` |
| "Could not load your questions" while online | The schema wasn't run (step 2) or the URL/key in `config.json` is wrong |
| Reset or invite email never arrives | Supabase's built-in email is rate-limited. Set up SMTP (step 4) |
| Reset link opens a blank or error page | The Site URL in step 6 doesn't match your real address |
