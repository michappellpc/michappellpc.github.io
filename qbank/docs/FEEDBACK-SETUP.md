# Connecting question feedback to a Google Form

Each question has a **Feedback** button. When someone sends feedback, it is added as a new row in a Google Sheet that you own. Until you finish this setup, feedback is only saved on the resident's own device.

You do this once, in about 5 minutes.

## 1. Create the form

Go to **forms.google.com**, start a blank form, and name it "Ram QBank question feedback". Add exactly these five questions, in this order:

| Title | Type | Required |
|---|---|---|
| Question ID | Short answer | no |
| Category | **Short answer** (not multiple choice) | no |
| Comment | Paragraph | yes |
| Contact (optional) | Short answer | no |
| Details | Short answer | no |

Category must be *Short answer*. The app fills it with its own wording, and a dropdown would reject anything that doesn't match exactly.

In **Settings** for the form, make sure all of these are off, or submissions from the app will fail:
- Collect email addresses
- Limit to 1 response
- Restrict to users in your organization

## 2. Get the pre-filled link

1. Click the three dots (top right of the form) and choose **Get pre-filled link**.
2. Type these words into the five boxes, one per box: `QUESTION`, `CATEGORY`, `COMMENT`, `CONTACT`, `DETAILS` (matching the five questions in order).
3. Click **Get link**, then **Copy link**.

## 3. Connect the app

From the repo, in quotes:

```bash
node qbank/tools/setup-feedback.js "PASTE-THE-LINK-HERE"
```

This writes `qbank/data/config.json`. Commit and push it (or ask Claude to). The site picks it up on the next load.

## 4. Test it

Open the site, answer a question, tap **Feedback**, and submit. A new row should appear in the form's **Responses** tab within a few seconds. Then click **Link to Sheets** on that tab to get a spreadsheet you can sort and filter.

## What each row contains

| Column | Content |
|---|---|
| Question ID | e.g. `aem-altitude-014`, so you can find it in `data/questions/` |
| Category | Wrong or debatable answer, Unclear question, Out of date, Typo, Image problem, Suggestion, Other |
| Comment | What the resident wrote (up to 1500 characters) |
| Contact | Only if they chose to add one. Otherwise blank, so feedback is anonymous |
| Details | Review status, subject, topic, the answer they chose, and the app version |

## Good to know

- **Offline is fine.** If someone submits without a connection, the feedback is kept on their device and sent automatically the next time the app is open online.
- **Public form link.** Anyone who finds the form link can submit to it, and the link is visible in the public repo. If you get junk, delete the form and repeat the steps for a new link. For the pilot with your residents this is very low risk.
- **No patient information.** The dialog reminds people not to include any. If someone does, delete that row from the sheet.
- **Some networks block Google.** On a locked-down government network the send may fail. The feedback then stays queued on the device and goes out later from another network. The Settings screen shows how many are waiting.
