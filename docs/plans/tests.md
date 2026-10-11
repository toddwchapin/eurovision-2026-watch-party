## Problem
No canonical test runner currently protects onboarding, syncing, permissions and destructive behavior.

## Agreed scope
Plain HTML/CSS/JS + Firebase; preserve current visual identity. First-run defaults to hosting. All five scores required; drafts local and incomplete votes excluded. Do not implement unrelated open issues #60/#88.

## Implementation plan
1. Add npm development-only tooling, Playwright and Firebase Emulator; app retains no build requirement.
2. Use demo project and localhost emulator config; forbid production requests in tests.
3. Cover hosting/invite, validation, drafts, skips, keyboard, two guests, offline/reconnect, reset and denied writes.
4. Add GitHub Actions test job with deterministic setup, failure artifacts and documented local commands.
5. Run all gates in Chromium/Firefox/WebKit with axe scans of named onboarding, rating, results/breakdowns and trivia/explanation.
6. Seed real authenticated multi-guest emulator data and assert rendered averages/totals, ranking/ties and trivia correctness.
7. Interrupt real SDK/emulator transport before commit and after commit/before acknowledgement; test pending reload, Chromium renderer crash and reset/leave recovery. Use abrupt document disposal on Firefox/WebKit and document the distinction.
8. Provide an isolated read-only-source Linux Docker fallback for macOS 27’s upstream Firefox startup failure; never skip a failing engine to create a green native result.

## Acceptance and verification
- [ ] One documented command runs unit/rules/browser gates.
- [ ] Tests execute against emulator and block accidental production use.
- [ ] Selected regressions fail on baseline and pass after fixes.
- [ ] CI status read from actual checks, limitations recorded.

## Dependencies and sequencing
Shared contracts first; auth/rules and scoring can proceed independently; sync integrates both; regression suite gates delivery. One coordinated PR may close these issues.

## Risk / rollout / rollback
Auth changes require Anonymous Auth enabled and coordinated rules/client deployment. Emulator verification precedes release. Existing local votes require deliberate migration, never automatic ownership claims over legacy remote identities. Preserve legacy records read-only or export before controlled retirement. Production deployment is outside this implementation; revert the coordinated client/rules release together if rollout fails.
