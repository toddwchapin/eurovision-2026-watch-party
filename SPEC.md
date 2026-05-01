# Eurovision 2026 Watch Party — Application Specification

## Overview

A single-page web app for rating Eurovision acts in real time during a watch party. Each person rates acts as they perform, scores are shared live with the rest of the party, and a live leaderboard updates throughout the show.

---

## Screens

The app has four main views and two modal dialogs. Only one main view is visible at a time.

### Start Screen
The landing page. Shows a "Start Rating" button. Visible on first load, after resetting votes, and after returning from the Done screen.

### Entry Panel (Rating Form)
Shows the act currently being rated and collects the user's scores. Appears after clicking "Start Rating" or clicking a row in the results table to edit.

The act header shows:
- Flag emoji
- Country name
- Performer name
- Song title (in quotes)

Below the act header are five score fields, a notes field, and three buttons (Clear, Skip, Save).

A small status note below the fields reads:
- "✎ Editing saved vote" — when the user is editing a vote they already saved
- "↻ Updating prior vote" — when the user returns to rate an act they skipped back to
- (blank) — when rating a fresh act

### Done Screen
Shows after the user has rated (or skipped) every act in the queue. Displays "All acts rated 🏆" and instructs the user to sort the table or click a row to revise a vote. Has a "Back to start" button.

### Results Table
Always visible below the rating form. Shows all acts that have been rated by at least one party member. Updates in real time as votes come in. See the **Results Table** section for full details.

### Name Modal
Appears on first load if no name has been saved. The user must enter a name before the app proceeds. Can be reopened later by clicking the name pill in the top-right corner of the header, or the "Rename voter" link in the footer.

Fields: name text input (maximum 40 characters).
Buttons: Save (always shown), Cancel (only shown when editing, not on first load).

### Party Modal
Appears on first load (when Firebase is configured) if the user has no party code saved and the URL does not contain one. The user must either create a party or join an existing one before the app proceeds.

Fields: code text input (automatically uppercased, maximum 8 characters).
Buttons: "Create new" (generates a new code), "Join" (joins using the entered code).

---

## Rating Flow

1. User enters their name (Name Modal, first load only).
2. User creates or joins a party (Party Modal, first load only — if Firebase is configured).
3. User clicks "Start Rating."
4. The Entry Panel appears showing the first unrated act.
5. User selects a score (0–5) for each of the five fields and optionally enters a note.
6. User clicks Save, Skip, or Clear:
   - **Save** — records the vote, moves to the next act.
   - **Skip** — does not record a vote, moves to the next act.
   - **Clear** — wipes the form, stays on the same act.
7. Steps 4–6 repeat for each act in the queue.
8. After the last act, the Done Screen appears.
9. The user can click any row in the results table to edit that act's vote. The Entry Panel reappears pre-filled with the saved scores. Clicking Save returns to the Done Screen.

### Queue Order

Acts are presented in the order they perform (their "running order" slot). If the running order has not been announced yet, acts are shown alphabetically by country. Acts marked as not in the final are excluded from the queue entirely.

On reload, the app resumes at the first act that has not yet been rated (already-rated acts are skipped automatically).

---

## Score Fields

Each act is rated on five fields. Each field has a scale from 0 to 5.

| Field | Label |
|---|---|
| Vocal quality | How strong, controlled, and impressive the vocals are |
| Performance flair | Energy, charisma, and stage presence |
| Song quality | How good the song itself is |
| Originality | How fresh and distinctive the entry feels |
| Stagecraft | Costumes, visuals, choreography, and production |

The scale is displayed as six clickable buttons labelled 0 through 5, with "0 · Terrible" on the left and "5 · Amazing" on the right. Clicking a button highlights it in gold. Only one button per field can be selected at a time. Clicking a different button deselects the previous one.

The total score (0–25) is calculated automatically as the sum of all five fields. It is not displayed in the entry form but appears in the results table after saving.

### Notes Field
An optional free-text field (maximum 200 characters). Useful for reminders ("reminds me of ABBA"), observations, or anything else. Saved alongside the scores. If filled in, the note appears in the results table next to the song title.

---

## Buttons

### Clear
Wipes all five score fields and the notes field. The form stays on the current act. Nothing is saved.

### Skip
Clears the form and advances to the next act. No vote is recorded for the skipped act. The act remains in the queue and can be revisited by clicking its row in the results table.

### Save
Records the current scores and note for this act. The vote is saved to the device and synced to Firebase (if in a party). The results table updates immediately. The form then advances to the next act (or returns to the Done Screen if the user was editing).

---

## Results Table

Shows every act that has been rated by at least one person in the party.

### Columns

**# (Performance slot)**
The act's running order number. "—" if the running order is unknown.

**Act**
Flag, country, performer name, song title, and note (if any). Clicking a row opens the Entry Panel to edit that vote.

**One column per party member**
Displays that person's total score (0–25) for each act, or "—" if they have not rated it. The local user's column is bold with gold text and marked with a ★ in the header.

**Avg**
The average total score across all party members who have rated the act, shown to one decimal place. Bold gold text.

### Sorting

Click any column header to sort by that column. Click it again to reverse the direction. A sort control also appears above the table with a dropdown and direction toggle.

- **Performance #** — numeric, ascending by default (slot 1 first). Acts with unknown slots appear last.
- **Country / Performer / Song** — alphabetical.
- **User columns** — numeric by that person's score; unrated acts sort last.
- **Avg** — numeric by average score; unrated acts sort last.

Default sort is Avg descending (highest-scoring acts at the top).

### Empty State

If no one has rated anything yet, the table shows: "No ratings yet — hit Start above and rate your first act!"

---

## Party Mode

### Creating a Party
Click "Create new" in the Party Modal. A unique 6-character code is generated (uppercase letters and digits, excluding I, O, 1, and L to avoid visual confusion). This code identifies the shared session in Firebase.

### Joining a Party
Enter the code in the text field and click "Join" (or press Enter). The code is case-insensitive — the app uppercases it automatically.

### Joining via Link
If the URL contains `?party=XXXXXX`, the app joins that party automatically. No modal appears. This is how invite links work.

### Sharing a Link
The party bar (visible in the header when in a party) shows the party code and a "Copy link" button. Clicking it copies the full URL (with `?party=` appended) to the clipboard. The button briefly shows "Copied!" to confirm.

### What Is Shared
Each party member's display name and all their saved votes are written to Firebase in real time. Every other member's app receives those votes instantly and shows them in the results table. Votes are only synced after clicking Save — in-progress selections are not shared until saved.

### Real-Time Updates
The results table, statistics, and column headers update automatically whenever any party member saves a vote or changes their name. No page refresh is needed.

---

## Statistics Bar

Three summary stats are shown in the header, updated after every vote save and every Firebase update.

| Stat | What it shows |
|---|---|
| Progress | How many acts the local user has rated, out of the total eligible (e.g. "3 / 26"). |
| Your Average | The local user's average total score across all their rated acts. "—" if none rated. |
| Top Pick | The act with the highest average score across all party members, shown as flag + performer + song + average. "—" if no ratings yet. |

---

## Data Storage

### On the Device (localStorage)

| What | Key | Format |
|---|---|---|
| Display name | `ev_2026_guest_name` | Plain string |
| All votes | `ev_2026_votes_v1` | JSON object keyed by act code |
| Party code | `ev_2026_party` | Plain string |
| User ID | `ev_2026_user_id` | 12-character random string |

The user ID is generated once on first load and never changes. It identifies this device's votes in Firebase.

### Vote Object Structure (per act)

```
{
  vocals:      0–5,
  performance: 0–5,
  song:        0–5,
  original:    0–5,
  stage:       0–5,
  total:       0–25,
  remind:      "optional note text"
}
```

### In Firebase

Path: `2026/parties/{partyCode}/users/{userId}`

Data written:
```
{
  name: "Display Name",
  votes: {
    "AL": { vocals: 3, performance: 4, ... },
    "AU": { ... },
    ...
  }
}
```

Votes with any missing numeric field are not synced (to avoid writing corrupt data). If a user has no valid votes, the votes field is written as null.

---

## Acts Data

Each act has:

| Field | Example | Meaning |
|---|---|---|
| `code` | `"AL"` | Two-letter country code. Used as the key throughout the app. |
| `country` | `"Albania"` | Country name shown in the table and entry panel. |
| `flag` | `"🇦🇱"` | Unicode flag emoji. |
| `performer` | `"Alis Makolli"` | Artist or ensemble name. |
| `song` | `"Zjerm"` | Song title. |
| `order` | `"3"` or `""` or `"X"` | Running order slot, unknown, or not in final. |

The `order` field controls the queue:
- `"X"` — act is excluded from the rating queue entirely.
- `""` (empty) — running order unknown; act is sorted alphabetically.
- `"3"` (a number as a string) — act performs in slot 3; sorted by slot number.

---

## Resetting Votes

The "Reset all my votes" link in the footer erases all saved votes. A confirmation dialog appears first ("Erase ALL your saved votes on this device? This cannot be undone."). On confirmation:

- All local votes are deleted.
- localStorage is cleared of votes.
- The user's votes are removed from Firebase.
- The results table clears.
- Statistics reset to zero.
- The app returns to the Start Screen.

This only affects the local user's votes. Other party members' votes are not affected.

---

## Known Issues (as of 2026-05-01)

The score selection buttons (0–5) are not working correctly on iOS Safari and some mobile browsers. Tapping a label does not reliably update the underlying radio button state, so votes are recorded as all-zero. Several attempted fixes have not resolved the issue. The root cause is that the CSS and JavaScript mechanism used to hide the native radio inputs while keeping them selectable is behaving unexpectedly on WebKit.

Desktop browsers (Chrome, Firefox, Edge) are not affected.
