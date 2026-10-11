## Problem
Config and party/scoring conventions are duplicated across HTML pages.

## Agreed scope
Plain HTML/CSS/JS + Firebase; preserve current visual identity. First-run defaults to hosting. All five scores required; drafts local and incomplete votes excluded. Do not implement unrelated open issues #60/#88.

## Implementation plan
1. Introduce small browser-compatible shared modules without framework or build step.
2. Centralize Firebase config, stage/score constants, storage namespacing and party/auth/sync helpers.
3. Keep page-specific rendering in each page and use same validated contracts everywhere.
4. Document module boundaries, test hooks and hosting/deployment prerequisites.

## Acceptance and verification
- [ ] All pages load on static server and share one configuration source.
- [ ] No frontend framework/build dependency introduced.
- [ ] Unit tests cover helpers and browser smoke tests cover each page.

## Dependencies and sequencing
Shared contracts first; auth/rules and scoring can proceed independently; sync integrates both; regression suite gates delivery. One coordinated PR may close these issues.

## Risk / rollout / rollback
Auth changes require Anonymous Auth enabled and coordinated rules/client deployment. Emulator verification precedes release. Existing local votes require deliberate migration, never automatic ownership claims over legacy remote identities. Preserve legacy records read-only or export before controlled retirement. Production deployment is outside this implementation; revert the coordinated client/rules release together if rollout fails.
