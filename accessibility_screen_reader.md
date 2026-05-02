# Accessibility — Screen Reader Issues

**Targets:** `index.html` and `party-votes.html` at https://toddwchapin.github.io/eurovision-2026-watch-party/
**Standard:** WCAG 2.1 Level AA — screen-reader / assistive-tech findings only
**Audit date:** 2026-04-28
**Re-audit date:** 2026-05-02

This file lists every finding whose primary harm is to **screen-reader users** — missing labels, group semantics, sort state, live regions, dialog roles, and language hints. Cross-cutting keyboard findings live in [accessibility_keyboard.md](accessibility_keyboard.md). Motion / touch / visual findings, plus the overall summary and action plan, stay in [ACCESSIBILITY_REPORT.md](ACCESSIBILITY_REPORT.md).

Finding IDs are preserved from the original audit so cross-references in commits and PRs still resolve.

---

## Severity legend

- **C** — Critical: blocks the screen-reader user from completing the core flow.
- **H** — High: degrades the experience significantly but doesn't fully block.
- **M** — Medium: noticeable issue.
- **L** — Low: polish / nice-to-have.

---

## Findings

### C-1 (SR sub-issue). Score radio labels not bound to inputs
- **Issue:** `buildScales()` creates the `<label>` without a `for=` attribute and does not nest the input inside the label. Without label/input association the screen reader announces "radio button, not pressed" with no value or context.
- **Cross-reference:** Tracked end-to-end as C-1 in [accessibility_keyboard.md](accessibility_keyboard.md). The recommended fix (`lbl.htmlFor = id;`) resolves both the keyboard and SR sub-issues in one change.
- **Effort:** Folded into the C-1 keyboard fix.

### C-2. Score scales lack `<fieldset>` / `<legend>`
- **Issue:** Each rating prompt ("Vocal quality", "Performance flair", etc.) is a `<label class="q-label">` div sibling, not associated with the radio group. SR announces six unrelated radio buttons with no group label.
- **Fix:** Replace each `.field` block for scales with:
  ```html
  <fieldset class="field scale-field">
    <legend class="q-label">Vocal quality</legend>
    <div class="scale" data-scale="vocals"></div>
  </fieldset>
  ```
  Strip default fieldset border via CSS reset.
- **Effort:** ~10 min.

### C-7. Single-letter score column headers (regressed since 2026-04-28)
- **Issue:** Score columns in the rated table now render single letters (`V`, `P`, `S`, `O`, `S`) on **all viewports**, not just ≤720px. PR #19 ("Shorten ballot table headers", merged 2026-04-30) replaced the previous `lbl-full` / `lbl-short` split with a single short label. Screen reader users hear only the letters with no context, and the duplicate `S` (Song / Stage) is ambiguous even for sighted users.
- **Current code:** `SCORE_COLS` in `index.html` and `buildTableHead()` set `th.textContent = col.label` directly with single-letter labels. No long-form alternative is rendered.
- **Fix:** Restore a long-form label for assistive tech, render short visually:
  ```js
  // in buildTableHead()
  const full = document.createElement('span');
  full.className = 'lbl-full';
  full.textContent = col.fullLabel;       // 'Vocals', 'Performance', ...
  const short = document.createElement('span');
  short.className = 'lbl-short';
  short.setAttribute('aria-hidden', 'true');
  short.textContent = col.label;           // 'V', 'P', ...
  th.replaceChildren(full, short, arrow);
  ```
  ```css
  /* visually hide the long label, show the short one to sighted users */
  th .lbl-full {
    position: absolute; width: 1px; height: 1px;
    clip: rect(0 0 0 0); clip-path: inset(50%);
    overflow: hidden;
  }
  th .lbl-short { display: inline; }
  ```
  Add a `fullLabel` field to each `SCORE_COLS` entry.
- **Affects:** `index.html` and `party-votes.html` (the breakdown table on `party-votes.html` likewise uses single-letter labels — `Name | V | P | S | O | S | T`).
- **Effort:** ~10 min.

---

### H-8. Name modal lacks dialog semantics
- **Issue:** Modal has no `role="dialog"`, `aria-modal="true"`, or `aria-labelledby`/`aria-describedby`. Screen reader doesn't announce it as a modal; user doesn't know they're in one.
- **Fix:**
  ```html
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="nameModalTitle">
    <h3 id="nameModalTitle">Welcome to the watch party!</h3>
    ...
  </div>
  ```
- **Effort:** ~3 min.

### H-11. Name input lacks `<label>`
- **Issue:** `<input type="text" id="nameInput" placeholder="Your name">` has no associated label. Placeholder is not a substitute (disappears on focus, low contrast).
- **Fix:** Add `<label for="nameInput">Your name</label>` (visually hidden if you want to keep current visual).
- **Effort:** ~2 min.

### H-12. Sortable headers don't expose sort state to SR
- **Issue:** Visible arrows ▲/▼ communicate sort to sighted users. SR users have no signal.
- **Fix:** On the active `<th>` set `aria-sort="ascending"` or `"descending"`; on inactive headers set `aria-sort="none"`. Update in `renderTable()` after the existing arrow logic.
- **Pair with:** C-3 in accessibility_keyboard.md — applies the same fix wave.
- **Affects:** `index.html` and `party-votes.html`.
- **Effort:** ~5 min.

### H-13. Sort direction button lacks state
- **Issue:** `<button id="sortDir">↑/↓</button>` only has `aria-label="Toggle sort direction"`. SR can't tell which direction is currently active.
- **Fix:** Update `aria-label` dynamically: `"Sort ascending, click to switch to descending"` (or similar). Or use `aria-pressed` if treating as a toggle.
- **Effort:** ~3 min.

### H-14. Stats updates not announced
- **Issue:** Progress, Your Average, and Top Pick re-render after every Save. SR users only hear the changes if they re-navigate to the stats area.
- **Fix:** Wrap the `.stats` container with `aria-live="polite"`. Each `.stat-value` will then be re-announced when it changes. Test for noisiness — may want polite + atomic on individual stat divs instead of the whole grid.
- **Affects:** `index.html` and `party-votes.html` (`#partyWinner` re-renders on Firebase updates).
- **Effort:** ~5 min, plus tuning.

### H-15. Editing-state hint not announced
- **Issue:** When user clicks a saved row to edit, the entry panel updates and `editingNote` text changes to "✎ Editing saved vote". No SR announcement.
- **Fix:** Add `aria-live="polite"` and `role="status"` to `#editingNote`.
- **Effort:** ~2 min.

---

### M-20. Done banner not announced
- **Issue:** When the user finishes the last act, `.done-banner` becomes visible (display block). No SR announcement.
- **Fix:** Add `role="status"` and `aria-live="polite"` to the banner; or move focus to the banner's heading on appearance.
- **Effort:** ~5 min.

### M-22. Notes input lacks describedby
- **Issue:** Placeholder hint "(optional) reminds you of someone, other thoughts…" disappears on focus. SR may not announce it consistently.
- **Fix:** Add a small helper text with id and `aria-describedby` on the input.
- **Effort:** ~3 min.

---

### L-23. `<table>` lacks `<caption>`
- **Issue:** Table has no caption. SR users only get the surrounding heading context.
- **Fix:** Add `<caption class="sr-only">Your saved ratings</caption>`.
- **Affects:** `index.html` (`#ratedTable`) and `party-votes.html` (`#ratedTable` and `#breakdownTable`). Suggested captions: "Party member scores", "Per-act voter breakdown".
- **Effort:** ~2 min.

### L-24. `<th>` scope not explicit
- **Issue:** Browsers default `<th>` inside `<thead>` to `scope="col"`, which is correct, but explicit is safer for SR engines.
- **Fix:** Add `scope="col"` in `buildTableHead()`.
- **Effort:** ~1 min.

### L-25. Song titles in non-English languages
- **Issue:** "Per Sempre Sì", "Før Vi Går Hjem", "Ēnā" etc. have no `lang` attribute. SR engines may mispronounce.
- **Fix:** Add `lang="it"`, `lang="da"`, `lang="lv"`, etc. on each act's song span. Requires per-act language data in the JSON.
- **Effort:** ~30 min (adding language codes to all 35 acts).
- **Pragmatic:** Probably skip — niche benefit for a private watch party.

### L-26. Stats not paired as `<dl>` / `<dt>` / `<dd>`
- **Issue:** Label/value pairing is implicit via visual layout. Could be more semantic.
- **Fix:** Replace `.stat` divs with `<dl>` structure.
- **Effort:** ~10 min (CSS rework).
- **Pragmatic:** Low payoff vs. effort.

---

## Party-votes-specific findings

- **PV-1 (H, SR side).** Breakdown card is shown/hidden via `display: none`. When it appears, there is no `aria-live` or accessible name. SR users who tap a row never learn the breakdown opened.
  - **Fix:** Wrap `#breakdownCard` with `role="region"` and `aria-labelledby="breakdownTitle"`. Pair with the keyboard-side focus fix (PV-1 in accessibility_keyboard.md).
- **PV-3 (L).** The `.name-pill name-pill-static` block in the header reads "Party Votes" and is now non-interactive (cursor: default per `.name-pill-static`). The `.name-pill` base styles still imply interactivity (border, gold color). Confirm SR users don't get a misleading "button" cue — the element is a `<div>`, so they shouldn't, but a quick check with VoiceOver would confirm.

---

## Action plan slice

- **Critical (~25 min):** C-2 (fieldset/legend), C-7 (long-form column labels). C-1's SR sub-issue is folded into the keyboard fix.
- **High (~25 min):** H-8 (dialog semantics), H-11 (name label), H-12 (aria-sort), H-13 (sort dir state), H-14 (stats live region), H-15 (editing hint), PV-1 SR (region + label).
- **Medium (~10 min):** M-20 (done banner), M-22 (notes describedby).
- **Low (~5 min):** L-23 (caption), L-24 (scope), PV-3 (name pill cue check). Skip L-25 and L-26 unless you care.

After the Critical and High passes the rating flow, sort behavior, modal entry, and stats updates are all narratable end-to-end by NVDA/JAWS/VoiceOver.
