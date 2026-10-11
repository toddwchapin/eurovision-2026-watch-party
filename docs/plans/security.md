## Problem
Anonymous users can currently modify other guests and read party records without authentication.

## Agreed scope
Plain HTML/CSS/JS + Firebase; preserve current visual identity. First-run defaults to hosting. All five scores required; drafts local and incomplete votes excluded. Do not implement unrelated open issues #60/#88.

## Implementation plan
1. Add anonymous auth and a shared party-session helper; use authenticated UID as record owner.
2. Model host-created parties and guest membership; admission requires a valid existing invite code. Prevent membership/host impersonation and non-owner writes.
3. Update all Firebase consumers, including trivia/funniest persistence; App Check support must be optional until configured.
4. Document enabling Anonymous Auth, legacy-party migration, coordinated client/rules rollout and rollback. Never deploy production rules automatically.

## Acceptance and verification
- [ ] Emulator denies unauthenticated/nonmember reads and foreign writes/deletes.
- [ ] Host and invited guests can join, read party votes, and write only their own records.
- [ ] Missing/expired party and auth failures show recovery, no infinite wait.
- [ ] Legacy access/migration policy documented and no silent destructive conversion.

## Dependencies and sequencing
Shared contracts first; auth/rules and scoring can proceed independently; sync integrates both; regression suite gates delivery. One coordinated PR may close these issues.

## Risk / rollout / rollback
Auth changes require Anonymous Auth enabled and coordinated rules/client deployment. Emulator verification precedes release. Existing local votes require deliberate migration, never automatic ownership claims over legacy remote identities. Preserve legacy records read-only or export before controlled retirement. Production deployment is outside this implementation; revert the coordinated client/rules release together if rollout fails.
