# Accessibility Audit — Eurovision 2026 Watch Party

**Targets:** `index.html` (rating / vote-entry SPA) and `party-votes.html` (party results SPA) at https://toddwchapin.github.io/eurovision-2026-watch-party/
**Standard:** WCAG 2.1 Level AA
**Audit date:** 2026-04-28
**Re-audit date:** 2026-05-02
**Auditor:** Static review of HTML/CSS/JS (no tooling run; no live SR test)

---

## Report layout

This audit is split across three files so each kind of fix can be tackled independently:

| File | Scope |
|------|-------|
| [accessibility_keyboard.md](accessibility_keyboard.md) | Keyboard operability — focus, tabindex, keyboard activation, focus indicators, focus traps. |
| [accessibility_screen_reader.md](accessibility_screen_reader.md) | Screen-reader / assistive tech — labels, group semantics, sort state, live regions, dialog roles, language. |
| ACCESSIBILITY_REPORT.md *(this file)* | Cross-cutting summary, severity legend, motion / touch / visual findings (M-17, M-18, M-19, L-27), party-votes addendum, overall action plan. |

Finding IDs are preserved across the split so cross-references in commits and PRs still resolve.

---

## Re-audit summary (2026-05-02)

Re-checked every finding against the current `main` plus open PR #33 (modal rework). **No critical or high finding has been fully resolved.** Net changes:

- **C-1** — Score radio inputs no longer use `display: none`; replaced with `position: absolute; opacity: 0; width: 0; height: 0;`. Inputs are now in the a11y tree and the keyboard tab order, but the labels are still not associated with their inputs via `for=` / nesting, and there is still no `:focus-visible` style on the label. **Partially fixed.** *(Tracked in [accessibility_keyboard.md](accessibility_keyboard.md) and cross-referenced from [accessibility_screen_reader.md](accessibility_screen_reader.md).)*
- **C-7** — Regressed. PR #19 ("Shorten ballot table headers") collapsed the `lbl-full` / `lbl-short` split into a single single-letter label that renders on all viewports. Screen reader users now hear `V`, `P`, `S`, `O`, `S` at every screen size — not just `≤720px`. *(See [accessibility_screen_reader.md](accessibility_screen_reader.md).)*
- **H-10** — PR #33 (still open) replaces the modal `Cancel` button with an `×` close button (`.modal-close`, `aria-label="Close"`). Modal can now be closed via the X, but there is still no Esc handler, no backdrop click handler, and no focus trap. **Slight improvement; finding still applies.** *(See [accessibility_keyboard.md](accessibility_keyboard.md).)*
- **New finding — H-28** — `.party-code` pill on both pages now carries a hover effect (`cursor: pointer`, color/border/background transitions) and click-delegation behavior, but is still a `<div>`. The interactive affordance is misleading for keyboard users, who cannot focus or activate it. *(See [accessibility_keyboard.md](accessibility_keyboard.md).)*
- **New target — `party-votes.html`** — built after the original audit. Inherits most of the `index.html` patterns (modal-less, but still has clickable rows, sortable headers, hover-styled non-interactive header pill, etc.). See addendum below for the cross-reference table.

All other Critical and High findings (C-2 through C-6, H-8, H-9, H-11 through H-16) remain unchanged — review the entries in the split files for full text.

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

## Motion / touch / visual findings

The findings below don't fit the keyboard or screen-reader split — they apply to motion-sensitive, touch, and low-vision users. They stay in this file.

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

### L-27. Cursive slogan readability
- **Issue:** "United By Music" in Allura at 22px is decorative cursive — hard to read for some low-vision users. Not technically a contrast bug.
- **Fix:** Trade-off with branding. If important, add a hidden plain-text duplicate via `aria-label` on the parent or `sr-only` span.
- **Effort:** ~3 min.

---

## Recommended action plan

Each split file owns its slice; this section rolls them up.

### Pass 1 — Critical fixes (~75 min total)
- Keyboard: C-1, C-3, C-4, C-5, C-6, plus H-16 (focus rings) and H-28 (party-code button). See [accessibility_keyboard.md](accessibility_keyboard.md).
- Screen reader: C-2, C-7. See [accessibility_screen_reader.md](accessibility_screen_reader.md).

After this pass the app is keyboard-operable end to end and screen readers can complete the rating flow on both pages.

### Pass 2 — High-value AT improvements (~55 min)
- Keyboard: H-9 (focus trap), H-10 (Esc / backdrop), PV-1 (breakdown focus management).
- Screen reader: H-8, H-11, H-12, H-13, H-14, H-15, PV-1 SR (region + label).

Makes modal, sort, stats, edit-mode, and the new breakdown card usable for both groups.

### Pass 3 — Motion / touch / polish (~25 min)
- This file: M-17 (reduced motion), M-18, M-19 (touch targets), L-27 (cursive label backup).
- Keyboard: M-21 (skip link), PV-2 (Esc on breakdown).
- Screen reader: M-20 (done banner), M-22 (notes describedby), PV-3 (name pill cue check).

### Pass 4 — Optional niceties (~15 min)
L-23 (caption — both tables), L-24 (scope). Skip L-25 and L-26 unless you care. *(All in [accessibility_screen_reader.md](accessibility_screen_reader.md).)*

**Total estimated effort for full AA compliance:** ~3 hours of focused work (up from 2.5h after the 2026-05-02 re-audit added party-votes.html and H-28).

---

## Out-of-scope / not audited

- Live screen-reader testing (NVDA, JAWS, VoiceOver, TalkBack) — recommended after fixes land.
- Automated tooling run (axe-core, Lighthouse, WAVE) — recommended as a CI check.
- Color contrast in real low-vision simulations.
- Cognitive accessibility (form complexity, error recovery flows).
- Internationalization beyond `<html lang="en">`.

---

## Quick reference — files / lines to touch

Most findings live in `index.html`; some apply to `party-votes.html` as well (see addendum). Key sections:

- Score scales: `buildScales()` in JS, `.scale-options` in CSS, the 5 `.field` blocks in the entry panel HTML.
- Rated table: `buildTableHead()`, `renderTable()` in JS; `.table-card` block in CSS; `<table class="rated">` HTML.
- Modal: `<div class="modal-backdrop" id="nameModal">` HTML; `openNameModal()` / `saveName()` / `deleteUser()` in JS.
- Footer links: `<footer class="app-footer">` HTML; `bindEvents()` in JS.
- Voter pill: `<div class="name-pill" id="namePill">` HTML; `bindEvents()`.
- Party pill: `<div class="party-code">` HTML inside `.party-bar`; `bindEvents()` click delegation.
- Score column labels: `SCORE_COLS` in JS, `buildTableHead()` in JS.

---

## Addendum — `party-votes.html` cross-reference (added 2026-05-02)

`party-votes.html` is a sibling SPA built after the original audit (PRs #20, #23, #25–#28, #32). Findings carry over by analogy:

| Finding | Equivalent on party-votes.html | Notes |
|---------|-------------------------------|-------|
| C-3 (sortable headers) | Yes — `buildTableHead()` here builds the same `<th>` click pattern. | Identical fix needed. |
| C-4 (clickable rows) | Yes — `renderTable()` binds `tr.body-row` click → `showBreakdown(code)`. | Identical fix needed (tabindex / role / keydown). Footnote: keyboard users currently cannot open the breakdown card at all. |
| C-5 (footer links) | Yes — `<a class="nav-link">Back to ratings</a>` and similar. Confirm each. | Apply the same `<a>` → `<button>` (or `href`) treatment. |
| C-7 (single-letter headers) | Yes — main table uses `Act`/`Avg`; breakdown table uses `Name | V | P | S | O | S | T`. | The breakdown labels need long-form for SR (same fix as C-7). |
| H-12 (aria-sort) | Yes — main table sortable. | Identical fix. |
| H-13 (sort direction button) | Yes — same `#sortDir` button. | Identical fix. |
| H-14 (live regions for stats) | Yes — `#partyWinner` re-renders on Firebase updates. | Wrap `.party-winner-host` with `aria-live="polite"`. |
| H-16 (focus rings) | Yes — same shared `style.css`. | Single fix covers both. |
| H-28 (party-code div hover) | Yes — same shared markup pattern. | Single fix covers both. |
| L-23 / L-24 (table caption / scope) | Yes — both `#ratedTable` and `#breakdownTable`. | Add a caption to each: "Party member scores", "Per-act voter breakdown". |

### Party-votes-specific findings

Each PV finding is filed under whichever split file matches its primary harm:

- **PV-1** — keyboard focus management on breakdown card → [accessibility_keyboard.md](accessibility_keyboard.md). SR-side region/label fix → [accessibility_screen_reader.md](accessibility_screen_reader.md).
- **PV-2** — Esc handler on breakdown → [accessibility_keyboard.md](accessibility_keyboard.md).
- **PV-3** — static name pill cue check → [accessibility_screen_reader.md](accessibility_screen_reader.md).

### Effort

- All shared findings: see effort estimates on each parent finding in the split files. A single fix typically covers both pages because they share `style.css` and the JS patterns are duplicated.
- Party-votes-specific (PV-1 through PV-3): ~15 min total.
