# Eurovision 2026 Watch Party

Live: **https://toddwchapin.github.io/eurovision-2026-watch-party/**

A lightweight, single-page web app for rating Eurovision acts in real time during a watch party. Each guest rates acts as they perform, scores sync live across the party via Firebase Realtime Database, and a shared leaderboard updates throughout the show.

## Features

- Five 0–5 rating scales per act: Vocals, Performance, Song, Originality, Stagecraft
- Optional "Replay-worthy?" yes/no question and freeform Notes
- Real-time vote sync across all party members
- Party Votes page with per-act aggregation (Repeat %, Avg Total) and per-user breakdown
- Top Pick / Party Winner highlight
- Works on phones, tablets, and desktops

## Running locally

The app is plain HTML/CSS/JS — no build step. Serve the directory with any static file server:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080/` in a browser.

Firebase config is read from the inline `party-config` JSON block in `index.html` / `party-votes.html`. To use a different Firebase project, replace the config values there.

## Hosting

Deployed via GitHub Pages from the `main` branch (root). Firebase Realtime Database rules are in `database.rules.json` and deployed with `firebase deploy --only database`.

## Files

- `index.html` — rating form, results table, party join/name modals
- `party-votes.html` — per-party aggregated votes and per-user breakdown
- `style.css` — shared styles
- `database.rules.json` — Firebase RTDB security rules
- `firebase.json` — Firebase project config
- `SPEC.md` — full application specification
- `ACCESSIBILITY_REPORT.md` — accessibility audit notes

## Integrity development gates and rollout

The app is still static HTML/CSS/JS; npm is development-only. Install Node 24.12.0 (the CI pin; Firebase 13/rules testing 6 require >=24.12.0), Java 21 and Python 3, then:

```sh
npm ci
npx playwright install --with-deps chromium firefox webkit
npm test
npm run test:regressions
```

Playwright runs Chromium, Firefox and WebKit, including axe scans, rendered aggregates and real emulator transport/crash recovery tests. If Firefox cannot start on macOS 27, `bash scripts/test-linux.sh` runs the identical gates in a disposable Linux Docker container; native failures are not skipped. See [docs/VERIFICATION.md](docs/VERIFICATION.md) for platform limitations and evidence.

These commands use only the **demo-eurovision** Firebase Auth/Realtime Database emulators; they do not deploy or use the production project in `.firebaserc`. See [docs/ROLLOUT.md](docs/ROLLOUT.md) for architecture, test isolation, Anonymous Auth/App Check prerequisites, legacy preservation, cross-tab conflict semantics, coordinated rollout and security-conscious rollback. Production auth/rules/client changes must be performed by an operator, not these tests.
