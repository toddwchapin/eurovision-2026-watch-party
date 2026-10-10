## Problem
Whole-contest set() can overwrite newer records from another tab; failures are console-only.

## Agreed scope
Plain HTML/CSS/JS + Firebase; preserve current visual identity. First-run defaults to hosting. All five scores required; drafts local and incomplete votes excluded. Do not implement unrelated open issues #60/#88.

## Implementation plan
1. Replace whole-stage writes with per-act writes; server timestamp and explicit last-server-write-wins policy.
2. Persist pending changes keyed by party/user/contest/act; retry on reconnect; do not erase unrelated remote votes.
3. Show local/pending/shared/offline/error states using accessible live status; actionable retry.
4. Handle listener errors and missing party contexts on all pages.

## Acceptance and verification
- [ ] Two clients preserve distinct act votes.
- [ ] Offline save remains locally available and syncs on reconnect.
- [ ] Failed remote writes never display Shared.
- [ ] Reset/leave cannot resurrect votes through stale queued writes.

## Dependencies and sequencing
Shared contracts first; auth/rules and scoring can proceed independently; sync integrates both; regression suite gates delivery. One coordinated PR may close these issues.

## Risk / rollout / rollback
Auth changes require Anonymous Auth enabled and coordinated rules/client deployment. Emulator verification precedes release. Existing local votes require deliberate migration, never automatic ownership claims over legacy remote identities. Preserve legacy records read-only or export before controlled retirement. Production deployment is outside this implementation; revert the coordinated client/rules release together if rollout fails.
