# Accessibility — Keyboard Issues

**Targets:** `index.html` and `party-votes.html` at https://toddwchapin.github.io/eurovision-2026-watch-party/
**Standard:** WCAG 2.1 Level AA — keyboard operability findings only
**Audit date:** 2026-04-28
**Re-audit date:** 2026-05-02

This file lists every finding whose primary harm is to **keyboard-only users** — controls that are unreachable, unfocusable, lack keyboard activation, or have no visible focus indicator. Cross-cutting screen-reader findings live in [accessibility_screen_reader.md](accessibility_screen_reader.md). Motion / touch / visual findings, plus the overall summary and action plan, stay in [ACCESSIBILITY_REPORT.md](ACCESSIBILITY_REPORT.md).

Finding IDs are preserved from the original audit so cross-references in commits and PRs still resolve.

---

## Severity legend

- **C** — Critical: blocks the keyboard user from completing the core flow.
- **H** — High: degrades the experience significantly but doesn't fully block.
- **M** — Medium: noticeable issue.

---

## Findings

### C-1. Score radio inputs hidden / labels not associated *(partially fixed)*
- **Issue:** Each scale (Vocals, Performance, Song quality, Originality, Stagecraft) renders 0–5 as `<input type="radio">` with a sibling `<label>` carrying the visual.
- **Status (2026-05-02):** The hide style has changed from `display: none` to `position: absolute; opacity: 0; width: 0; height: 0;`. Inputs are now in the a11y tree and tab order. **Two related sub-issues remain:**
  1. **Label not bound.** `buildScales()` creates the `<label>` without a `for=` attribute and does not nest the input inside the label. The label has a manual click handler that toggles the input — visual only. Clicking the visual digit via keyboard does not propagate via the implicit label-input pairing. *(This sub-issue is also tracked from the SR side — see C-1 in accessibility_screen_reader.md.)*
  2. **No keyboard focus indicator on the label.** Without `:focus-visible` on `.scale-options input:focus-visible + label`, keyboard users tabbing through the radios see no visual focus (the input is invisible).
- **Fix:**
  - In `buildScales()` set `lbl.htmlFor = id;` so each label is associated with its input. Remove the manual click handler (label click natively toggles the input via `for=`).
  - Add `.scale-options input:focus-visible + label { outline: 2px solid var(--gold-pale); outline-offset: 2px; }` for visible keyboard focus.
  - Optionally swap the existing `opacity:0; width:0; height:0` for the canonical clip-path "visually hidden" pattern — functionally equivalent, more conventional.
- **Effort:** ~10 min.

### C-3. Sortable column headers not keyboard accessible
- **Issue:** `<th>` elements get a click handler in `buildTableHead()`. They have no `tabindex`, `role="button"`, or keydown handler. Keyboard users can only sort via the dropdown.
- **Why it matters:** Visible affordance (cursor: pointer, hover color) suggests interactivity that keyboard users cannot reach.
- **Fix options:**
  - **A (recommended):** Render the header text as a `<button>` inside the `<th>`. Buttons are focusable and trigger on Enter/Space natively.
  - **B:** Add `tabindex="0"`, `role="button"`, and a `keydown` listener to handle Enter/Space.
- **Pair with:** H-12 in accessibility_screen_reader.md — adds `aria-sort` so SR announces sort state.
- **Affects:** `index.html` and `party-votes.html`.
- **Effort:** ~15 min.

### C-4. Clickable rating-table rows not keyboard accessible
- **Issue:** `<tr class="body-row">` has a click handler that loads the row into the entry panel for editing. No keyboard equivalent.
- **Fix options:**
  - **A:** Add `tabindex="0"` + `role="button"` + Enter/Space keydown to the `<tr>`. Add visible `:focus-visible` outline.
  - **B (more semantic):** Make the first cell content a `<button>` with row-edit responsibility; remove row-level onclick.
  - Option A is simpler and matches existing UX (whole row hot).
- **Affects:** `index.html` (edit) and `party-votes.html` (open breakdown card — keyboard users currently cannot open it at all).
- **Effort:** ~10 min.

### C-5. Footer `<a>` elements without `href`
- **Issue:** `Rename voter` and `Reset all my votes` use `<a class="nav-link">` with no `href` and a JS click handler. Anchors without `href` are unfocusable and have no implicit role. Same applies to other JS-driven `.nav-link` instances.
- **Fix:** Convert to `<button>` with appropriate styling, or add `href="#"` + `preventDefault` (not recommended — buttons are correct semantics).
- **Affects:** `index.html` (footerRename, footerReset) and `party-votes.html` (back-link, etc.).
- **Effort:** ~5 min.

### C-6. Voter name pill not keyboard accessible
- **Issue:** `<div class="name-pill">` with `onclick` to open the rename modal. No tabindex, no role, no keyboard handler.
- **Fix:** Make it a `<button>`. Style accordingly (remove default button chrome).
- **Effort:** ~5 min.

---

### H-9. Modal has no focus trap
- **Issue:** Once focused into the modal, Tab cycles through input → Save → Cancel → out into background page elements. Focus leaks behind the backdrop.
- **Fix:** On modal open, query the focusable elements within `.modal` and intercept Tab/Shift+Tab to wrap focus inside. Restore focus to the trigger element on close.
- **Effort:** ~20 min (small focus-trap helper).

### H-10. Modal does not close on Esc or backdrop click *(partial improvement in PR #33)*
- **Issue:** Standard expected behavior for modals.
- **Status (2026-05-02):** PR #33 (open) replaces the bottom `Cancel` button with an `×` close button (`.modal-close`, `aria-label="Close"`) in the top-right of `.modal`. Modal can now be closed via that button. Esc and backdrop-click are still not wired.
- **Fix:** Listen for `keydown` Esc on document while modal is open; add click handler on `.modal-backdrop` that closes when target is the backdrop itself (not the inner `.modal`).
- **Caveat:** First-time name prompt should NOT be Esc-dismissable if a name is required to proceed. The current `openNameModal(firstTime)` already hides the X close button on first-time entry — same gating should apply to Esc.
- **Effort:** ~10 min.

### H-16. No visible focus indicators
- **Issue:** No custom `:focus-visible` rules. Default browser focus rings vary; on the dark midnight background, Chromium's black ring is nearly invisible.
- **Fix:** Add a global rule:
  ```css
  *:focus-visible {
    outline: 2px solid var(--gold-pale);
    outline-offset: 2px;
    border-radius: 4px;
  }
  ```
  Tune per-component as needed.
- **Effort:** ~10 min including spot-checks.

### H-28. Party-code pill is a hover-styled `<div>` *(new since 2026-04-28)*
- **Issue:** PR #33 added `cursor: pointer` and a border / background / color hover transition to `.party-code` so the pill matches the See Votes button visually. The element is still a `<div>` — its click behavior is delegated through `.party-bar` (`bindEvents()`) and there is no `tabindex`, `role="button"`, or `keydown` handler. Keyboard users cannot focus it; the new hover affordance falsely advertises interactivity.
- **Why it matters:** Same as C-6 (name pill). The hover styling makes the regression more visible to sighted-mouse users without making it usable for keyboard / SR users.
- **Fix:** Convert the `.party-code` pill into a `<button class="party-code" type="button">`, attach `copyPartyLink` directly, and remove the click delegation special-casing in the `.party-bar` listener. Keep the existing CSS — `.party-code` styles already work for buttons after the standard reset (background/border/font reset).
- **Affects:** Both `index.html` and `party-votes.html`.
- **Effort:** ~10 min.

---

### M-21. No skip-to-content link
- **Issue:** With many controls (header pill, logo, title, stats, start button), keyboard users tab through everything before reaching the rating form.
- **Fix:** Add a visually hidden link at the top of `<body>`:
  ```html
  <a class="skip-link" href="#entryPanel">Skip to rating form</a>
  ```
  Show on `:focus` only.
- **Effort:** ~5 min.

---

## Party-votes-specific findings

- **PV-1 (H).** Breakdown card is shown/hidden via `display: none`. When it appears, focus is not moved into it, and there is no focus management. Keyboard users who manage to open the breakdown (after C-4 is fixed) have no signal that anything happened, and Tab takes them to whatever was next on the page rather than into the card.
  - **Fix:** Add `tabindex="-1"` to `#breakdownCard`, focus it on `showBreakdown`. Pair with the SR-side `role="region"` / `aria-labelledby` fix (PV-1 in accessibility_screen_reader.md).
- **PV-2 (M).** The `#breakdownClose` button is fine, but no Esc handler — same idiom as the modal Esc miss (H-10). After opening the breakdown, the only way to close it is to mouse to the Close button or open another row.
  - **Fix:** Same `keydown` Esc listener as H-10, scoped to the breakdown card.

---

## Action plan slice

- **Critical (~50 min):** C-1, C-3, C-4, C-5, C-6, plus H-16 (focus rings) and H-28 (party-code button).
- **High (~30 min):** H-9 (focus trap), H-10 (Esc / backdrop), PV-1 (breakdown focus management).
- **Medium (~10 min):** M-21 (skip link), PV-2 (Esc on breakdown).

After the Critical pass the app is keyboard-operable end-to-end on both pages. The High pass closes the modal-trap UX gap. The Medium pass is polish.
