## Problem
Unchecked scores become zero; Skip can claim all rated. Hosting is the agreed default.

## Agreed scope
Plain HTML/CSS/JS + Firebase; preserve current visual identity. First-run defaults to hosting. All five scores required; drafts local and incomplete votes excluded. Do not implement unrelated open issues #60/#88.

## Implementation plan
1. Require all five integer scores; explicit zero stays valid.
2. Autosave local drafts keyed by party/guest/contest/act; restore after refresh and interruption.
3. Keep hosting first-run default; label Start Party and explain blank invite means hosting; invite links select joining.
4. Add skipped-act recovery and truthful saved-count completion; accessible fieldsets/labels/focus and modal controls.
5. Preserve existing visual style; update help to match actual controls.

## Acceptance and verification
- [ ] Blank/partial submission cannot create a vote; five scores including zero can.
- [ ] Draft score and notes survive reload and remain isolated across party/contest/act.
- [ ] Skip remains available and skipped acts can be rated later.
- [ ] Hosting default explicit; keyboard can complete scoring/settings/dialog flows.

## Dependencies and sequencing
Shared contracts first; auth/rules and scoring can proceed independently; sync integrates both; regression suite gates delivery. One coordinated PR may close these issues.

## Risk / rollout / rollback
Auth changes require Anonymous Auth enabled and coordinated rules/client deployment. Emulator verification precedes release. Existing local votes require deliberate migration, never automatic ownership claims over legacy remote identities. Preserve legacy records read-only or export before controlled retirement. Production deployment is outside this implementation; revert the coordinated client/rules release together if rollout fails.
