## Problem
Rules permit fractional scores and inconsistent totals; reset removes all remote contests.

## Agreed scope
Plain HTML/CSS/JS + Firebase; preserve current visual identity. First-run defaults to hosting. All five scores required; drafts local and incomplete votes excluded. Do not implement unrelated open issues #60/#88.

## Implementation plan
1. Validate complete integer 0–5 ratings and correct sum server-side; allowlist fields/contest/act IDs.
2. Use the same score contract client-side; preserve missing as null in drafts.
3. Scope reset to selected contest in both local/remote storage; correctly describe shared deletion.
4. Surface deletion failures and protect queued-sync/drafts from restoring deleted records.

## Acceptance and verification
- [ ] Emulator rejects fractional/out-of-range/missing/mismatched-total/unknown-field records.
- [ ] Reset selected contest preserves all other contest records.
- [ ] Regression test fails against old reset/blank-score behavior.

## Dependencies and sequencing
Shared contracts first; auth/rules and scoring can proceed independently; sync integrates both; regression suite gates delivery. One coordinated PR may close these issues.

## Risk / rollout / rollback
Auth changes require Anonymous Auth enabled and coordinated rules/client deployment. Emulator verification precedes release. Existing local votes require deliberate migration, never automatic ownership claims over legacy remote identities. Preserve legacy records read-only or export before controlled retirement. Production deployment is outside this implementation; revert the coordinated client/rules release together if rollout fails.
