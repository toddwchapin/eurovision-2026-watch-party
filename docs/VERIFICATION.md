# Local verification — party integrity

This checkout remains uncommitted on `feat/party-integrity`. No push, PR, deployment, issue closure, production database write, or Firebase provider/enforcement change was performed.

## Executed gates

- `npm test`: **9 unit/helper tests, 10 rules/emulator tests, 6 Chromium Playwright tests passed**, all exit 0. Auth/RTDB emulators use explicit `demo-eurovision` and localhost ports 9099/9000. Unit tests cover complete integers/zero/sums, local namespacing and stage filtering. Rules tests additionally exercise every roster act in every stage, denial of unauthenticated/nonmember/foreign access, invalid scores, expired/missing invites, immutable hosts, rejected legacy-party claims, reset preservation and stale epochs.
- Browser tests cover explicit host default/invite join, two independent guest identities, same-identity tabs preserving distinct acts and last-server-write conflicts, partial blocking/zero acceptance, draft refresh/stage isolation, truthful skip recovery, keyboard scoring/dialogs, offline queue and reconnect acknowledgment, resetting one stage while preserving another, stale offline tab after reset/leave, missing-party recovery and actual permission-denied writes never labeled Shared. Browser HTTP/WebSocket destinations are guarded; SDK scripts are locally served package files and external fonts are blocked. Offline coverage disconnects Firebase and toggles Playwright browser network offline/online.
- `npm run test:regressions`: current blank-score and current-stage-reset probes passed. The actual baseline (`a5ad48022b9bb38947beca1413d28d4a7ccc01d0`) functions failed both probes as expected; deliberate unchecked-zero and all-stage-reset sabotage failed as expected. The real emulator rules suite failed baseline rules because unauthorized/invalid requests succeeded, not because infrastructure failed. No production system was used.
- `git diff --check`: exit 0.
- `npm audit --omit=dev`: **0 vulnerabilities**. Full development dependency audit still reports **16** transitive/tooling findings (4 moderate, 12 high) after upgrading Firebase tooling and applying safe audit fixes; do not represent this as a clean full audit or run force downgrades blindly.
- Firebase 13.0.0 app-compat CDN endpoint returned HTTP 200; the application uses the matching installed SDK major for emulator/browser testing.
- Desktop (1440px) and mobile (390px) Chromium screenshots inspected: scoring is readable, no horizontal overflow in the mobile check, background/status link defect fixed without changing palette. Artifacts are ignored under `test-results/` and `playwright-report/`.

## Review-blocker verification

- Deterministic tests execute the complete shipped session helper: denied reset/leave preserve pending votes, cached votes and drafts through optimistic events/rollback; acknowledged destruction cancels them; other-tab edits survive failure; other-tab acknowledged or successfully reset work is not revived. Essential subscription failure survives a successful in-flight write and empty flush, disables save/readiness, and clears only on the affected listener's recovery.
- Two emulator tests execute the same shipped helper through a thin real modular-SDK adapter. An injected forbidden payload field forces an actual server `PERMISSION_DENIED`; assertions require the SDK's optimistic epoch increment and rollback, intact pending/drafts/local votes, and unchanged remote membership/name/epochs. An independent same-identity SDK connection is verified not to receive the rejected operation's optimistic epoch. The deterministic adapter covers exact interleavings; it does not substitute for these real SDK/emulator denials.
- Emulator tests deny deletion of each stage epoch, the epochs subtree, the whole user, replacement omitting tombstones and party-root user deletion. They verify an overlapping same-identity new-epoch save cannot land during atomic leave, failed leave changes nothing and permits subsequent member saves, rejoin retains tombstones and rejects stale epoch-zero writes, and vote-plus-epoch updates use the post-update epoch.
- The browser denial gate now expects Save disabled after membership/subscription revocation and additionally performs a direct real SDK write to assert `PERMISSION_DENIED`; it never counts disabled UI alone as proof of enforcement.
- Regression probing now executes the entire current session helper (including its closure dependencies), not an extracted reset function with obsolete VM globals. Baseline and deliberate sabotage still fail for their intended contract violations.
- Destructive SDK updates intentionally remain pending if connectivity is lost after dispatch: only definitive acknowledgement/rejection resolves the operation. No crash/restart fault-injection or physical-device certification is claimed.

## Evidence locations

Latest review-fix logs are outside git at `~/.hermes/cache/scratch/party-review-npm-test.log`, `party-review-regressions.log` and `party-review-npm-ci.log`. Earlier implementation logs remain at `eurovision-integrity-gates.log` and `eurovision-integrity-regressions.log`. The regression command prints its per-run scratch path for full baseline-rules failure output. Playwright reports/traces/screenshots and Firebase debug logs are generated locally and ignored.

## Remaining operator/release checks

- Anonymous Auth must be enabled in the intended Firebase project before releasing this client; it was **not enabled here**.
- App Check is optional/off by default; provision its site key and inspect metrics before enforcement. Production provider/enforcement setup is not emulator-testable and was not performed.
- A coordinated secure client/rules rollout and private legacy backup are required; see [ROLLOUT.md](ROLLOUT.md). Existing legacy parties cannot be silently claimed.
- Remote GitHub Actions status is **not verified**: the parent must publish and read actual CI checks. Node **24.12.0** is now pinned in CI and declared in package engines because Firebase 13/rules testing 6 require >=24.12.0. The complete review-fix gates and `npm ci` ran successfully under the exact Node 24.12.0 macOS arm64 binary with Homebrew Java 21; the clean install produced no engine warning. Earlier implementation runs used Node 26.10.0.
- Physical iOS Safari/VoiceOver and Firefox/WebKit are not certified by these Chromium tests. An uncached static page does not load offline without a service worker; a new guest needs connectivity to authenticate/join. Local drafts/queues and prior snapshots remain preserved.
