# Accessibility Audit — Eurovision 2026 Watch Party

**Target:** `index.html` (single-page app) at https://toddwchapin.github.io/eurovision-2026-watch-party/
**Standard:** WCAG 2.1 Level AA
**Audit date:** 2026-04-28
**Auditor:** Static review of HTML/CSS/JS (no tooling run; no live SR test)

---

## Summary

The page fails WCAG 2.1 AA on roughly a dozen blocking issues, most of which are mechanical fixes (swapping `<a>` for `<button>`, adding ARIA, replacing `display:none` on form inputs with a visually-hidden pattern, wrapping radio groups in `<fieldset>`/`<legend>`). Color contrast is largely fine. Visual structure and heading hierarchy are sound. The biggest risks are around **keyboard operability** (rating, sorting, and editing votes are all unreachable without a mouse) and **screen-reader operability** (radio groups, modal, sortable headers, and live updates are all silent or unlabeled).

Recommended path: tackle the seven Critical items first — that lifts the page from "unusable for keyboard / SR users" to "usable but rough", and only requires touching a handful of elements.

---

## Severity legend

- **C** — Critical: blocks keyboard or screen-reader users from completing the core flow.
- **H** — High: degrades the experience significantly for assistive-tech users but doesn't fully block.
- **M** — Medium: noticeable issue; affects some users (low vision, motion sensitivity, touch).
- **L** — Low: polish / nice-to-have.

---

## Findings

### C-1. Score radio inputs hidden with `display: none`
- **Issue:** Each scale (Vocals, Performance, Song quality, Originality, Stagecraft) renders 0–5 as `<input type="radio">` styled with `display: none`, with a sibling `<label>` carrying the visual.
- **Why it matters:** `display: none` removes the input from the accessibility tree and from the keyboard tab order. Keyboard-only users cannot select a score. Screen readers skip the radios entirely.
- **Current code:** CSS rule `.scale-options input { display: none; }`.
- **Fix:** Use a "visually hidden" pattern that keeps the input in the a11y tree:
  ```css
  .scale-options input {
    position: absolute;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
  ```
  Add `:focus-visible` style on the *label* via `.scale-options input:focus-visible + label { outline: 2px solid var(--gold-pale); }` so keyboard users see focus.
- **Effort:** ~5 min.

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

### C-3. Sortable column headers not keyboard accessible
- **Issue:** `<th>` elements get a click handler in `buildTableHead()`. They have no `tabindex`, `role="button"`, or keydown handler. Keyboard users can only sort via the dropdown.
- **Why it matters:** Visible affordance (cursor: pointer, hover color) suggests interactivity that keyboard users cannot reach.
- **Fix options:**
  - **A (recommended):** Render the header text as a `<button>` inside the `<th>`. Buttons are focusable and trigger on Enter/Space natively.
  - **B:** Add `tabindex="0"`, `role="button"`, and a `keydown` listener to handle Enter/Space.
- **Also add** `aria-sort="ascending"|"descending"|"none"` on the active `<th>` so SR announces sort state.
- **Effort:** ~15 min.

### C-4. Clickable rating-table rows not keyboard accessible
- **Issue:** `<tr class="body-row">` has a click handler that loads the row into the entry panel for editing. No keyboard equivalent.
- **Fix options:**
  - **A:** Add `tabindex="0"` + `role="button"` + Enter/Space keydown to the `<tr>`. Add visible `:focus-visible` outline.
  - **B (more semantic):** Make the first cell content a `<button>` with row-edit responsibility; remove row-level onclick.
  - Option A is simpler and matches existing UX (whole row hot).
- **Effort:** ~10 min.

### C-5. Footer `<a>` elements without `href`
- **Issue:** `Rename voter` and `Reset all my votes` use `<a class="nav-link">` with no `href` and a JS click handler. Anchors without `href` are unfocusable and have no implicit role. Same applies to other JS-driven `.nav-link` instances.
- **Fix:** Convert to `<button>` with appropriate styling, or add `href="#"` + `preventDefault` (not recommended — buttons are correct semantics).
- **Effort:** ~5 min.

### C-6. Voter name pill not keyboard accessible
- **Issue:** `<div class="name-pill">` with `onclick` to open the rename modal. No tabindex, no role, no keyboard handler.
- **Fix:** Make it a `<button>`. Style accordingly (remove default button chrome).
- **Effort:** ~5 min.

### C-7. Mobile short headers hide full label from screen readers
- **Issue:** On viewports ≤720px, `lbl-full` spans (Vocals, Performance, etc.) are `display: none` and only single letters (V, P, Q, O, S, T) show. Screen reader users hear only the letters with no context.
- **Fix:** Keep the full label rendered for SR but visually hidden using the same clip-path pattern from C-1. Show the short label visually.
  ```css
  @media (max-width: 720px) {
    th .lbl-full {
      position: absolute; width: 1px; height: 1px;
      clip: rect(0 0 0 0); clip-path: inset(50%);
      overflow: hidden;
    }
    th .lbl-short { display: inline; }
  }
  ```
- **Effort:** ~5 min.

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

### H-9. Modal has no focus trap
- **Issue:** Once focused into the modal, Tab cycles through input → Save → Cancel → out into background page elements. Focus leaks behind the backdrop.
- **Fix:** On modal open, query the focusable elements within `.modal` and intercept Tab/Shift+Tab to wrap focus inside. Restore focus to the trigger element on close.
- **Effort:** ~20 min (small focus-trap helper).

### H-10. Modal does not close on Esc or backdrop click
- **Issue:** Standard expected behavior for modals.
- **Fix:** Listen for `keydown` Esc on document while modal is open; add click handler on `.modal-backdrop` that closes when target is the backdrop itself (not the inner `.modal`).
- **Caveat:** First-time name prompt should NOT be Esc-dismissable if a name is required to proceed. Use a `data-required` flag.
- **Effort:** ~10 min.

### H-11. Name input lacks `<label>`
- **Issue:** `<input type="text" id="nameInput" placeholder="Your name">` has no associated label. Placeholder is not a substitute (disappears on focus, low contrast).
- **Fix:** Add `<label for="nameInput">Your name</label>` (visually hidden if you want to keep current visual).
- **Effort:** ~2 min.

### H-12. Sortable headers don't expose sort state to SR
- **Issue:** Visible arrows ▲/▼ communicate sort to sighted users. SR users have no signal.
- **Fix:** On the active `<th>` set `aria-sort="ascending"` or `"descending"`; on inactive headers set `aria-sort="none"`. Update in `renderTable()` after the existing arrow logic.
- **Effort:** ~5 min.

### H-13. Sort direction button lacks state
- **Issue:** `<button id="sortDir">↑/↓</button>` only has `aria-label="Toggle sort direction"`. SR can't tell which direction is currently active.
- **Fix:** Update `aria-label` dynamically: `"Sort ascending, click to switch to descending"` (or similar). Or use `aria-pressed` if treating as a toggle.
- **Effort:** ~3 min.

### H-14. Stats updates not announced
- **Issue:** Progress, Your Average, and Top Pick re-render after every Save. SR users only hear the changes if they re-navigate to the stats area.
- **Fix:** Wrap the `.stats` container with `aria-live="polite"`. Each `.stat-value` will then be re-announced when it changes. Test for noisiness — may want polite + atomic on individual stat divs instead of the whole grid.
- **Effort:** ~5 min, plus tuning.

### H-15. Editing-state hint not announced
- **Issue:** When user clicks a saved row to edit, the entry panel updates and `editingNote` text changes to "✎ Editing saved vote". No SR announcement.
- **Fix:** Add `aria-live="polite"` and `role="status"` to `#editingNote`.
- **Effort:** ~2 min.

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

---

### M-17. Animation has no reduced-motion opt-out
- **Issue:** `@keyframes shimmer` runs infinitely on `.btn-start`. Users with vestibular disorders can be affected.
- **Fix:**
  ```css
  @media (prefers-reduced-motion: reduce) {
    .btn-start { animation: none; }
    * { transition-duration: 0.001s !important; }
  }
  ```
- **Effort:** ~3 min.

### M-18. Sort direction button below 44×44 touch target
- **Issue:** `.btn-dir` is 30×30px. WCAG 2.5.5 (Level AAA, but recommended at AA) targets 44×44 for primary touch.
- **Fix:** Increase to 36×36 or 40×40 with extra padding; or expand the clickable area via padding while keeping visual size.
- **Effort:** ~3 min.

### M-19. Score-radio touch targets borderline
- **Issue:** 40×40 labels are usable but below the 44×44 recommendation. Tightly spaced.
- **Fix:** Bump to 44×44 if vertical space allows; or add `padding` to expand hit area without growing visual.
- **Effort:** ~5 min.

### M-20. Done banner not announced
- **Issue:** When the user finishes the last act, `.done-banner` becomes visible (display block). No SR announcement.
- **Fix:** Add `role="status"` and `aria-live="polite"` to the banner; or move focus to the banner's heading on appearance.
- **Effort:** ~5 min.

### M-21. No skip-to-content link
- **Issue:** With many controls (header pill, logo, title, stats, start button), keyboard users tab through everything before reaching the rating form.
- **Fix:** Add a visually hidden link at the top of `<body>`:
  ```html
  <a class="skip-link" href="#entryPanel">Skip to rating form</a>
  ```
  Show on `:focus` only.
- **Effort:** ~5 min.

### M-22. Notes input lacks describedby
- **Issue:** Placeholder hint "(optional) reminds you of someone, other thoughts…" disappears on focus. SR may not announce it consistently.
- **Fix:** Add a small helper text with id and `aria-describedby` on the input.
- **Effort:** ~3 min.

---

### L-23. `<table>` lacks `<caption>`
- **Issue:** Table has no caption. SR users only get the surrounding heading context.
- **Fix:** Add `<caption class="sr-only">Your saved ratings</caption>`.
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

### L-27. Cursive slogan readability
- **Issue:** "United By Music" in Allura at 22px is decorative cursive — hard to read for some low-vision users. Not technically a contrast bug.
- **Fix:** Trade-off with branding. If important, add a hidden plain-text duplicate via `aria-label` on the parent or `sr-only` span.
- **Effort:** ~3 min.

---

## Recommended action plan

### Pass 1 — Critical fixes (~60 min total)
Tackle C-1 through C-7 plus H-16 (focus rings). After this pass the app is keyboard-operable end to end and screen readers can complete the rating flow.

### Pass 2 — High-value SR improvements (~45 min)
H-8 through H-15. Makes modal, sort, stats, and edit-mode usable for screen reader users.

### Pass 3 — Motion / touch / polish (~25 min)
M-17 through M-22. Reduced-motion opt-out, larger tap targets, skip link, banners.

### Pass 4 — Optional niceties (~15 min)
L-23 (caption), L-24 (scope), L-27 (cursive label backup). Skip L-25 and L-26 unless you care.

**Total estimated effort for full AA compliance:** ~2.5 hours of focused work.

---

## Out-of-scope / not audited

- Live screen-reader testing (NVDA, JAWS, VoiceOver, TalkBack) — recommended after fixes land.
- Automated tooling run (axe-core, Lighthouse, WAVE) — recommended as a CI check.
- Color contrast in real low-vision simulations.
- Cognitive accessibility (form complexity, error recovery flows).
- Internationalization beyond `<html lang="en">`.

---

## Quick reference — files / lines to touch

All findings live in the single `index.html`. Key sections:

- Score scales: `buildScales()` in JS, `.scale-options` in CSS, the 5 `.field` blocks in the entry panel HTML.
- Rated table: `buildTableHead()`, `renderTable()` in JS; `.table-card` block in CSS; `<table class="rated">` HTML.
- Modal: `<div class="modal-backdrop" id="nameModal">` HTML; `openNameModal()` / `saveName()` in JS.
- Footer links: `<footer class="app-footer">` HTML; `bindEvents()` in JS.
- Voter pill: `<div class="name-pill" id="namePill">` HTML; `bindEvents()`.
- Mobile labels: `@media (max-width: 720px)` rules in the table CSS section.
