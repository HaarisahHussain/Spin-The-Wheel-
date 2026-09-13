# BCUSCA Welcome Week Arcade · v0.6.0

Three programming games and two optional puzzle prototypes for students’ phones, two public monitors and one host laptop. React, Tailwind v4, Express and Socket.IO share one origin.

## Start locally

Use Node.js 24 or newer. Python 3 is needed for generated-snippet tests, not for running the website.

```sh
npm ci
cp .env.example .env
```

Set `HOST_PASSWORD` to a unique passphrase of 15–256 characters. Set `PUBLIC_ORIGIN` to the exact URL you open, without a trailing slash. Use the laptop’s LAN IP for phone testing, and connect devices to the same network. Then:

```sh
npm run dev
```

Open `/host`, username **host**, with your environment password. There is no MFA, staff creation command or admin account. A second browser must explicitly take over; additional tabs stay read-only until control is transferred. Separate host/player cookies allow testing both in one browser.

Under Host → Event, save actual opening times, admission cutoff and closing time. No dates are invented. Verification defaults ON. Development previews email on the requesting device; production requires SMTP. Ranked defaults OFF; turn it on only after playtesting.

## Clean pre-launch setup

**v0.6.0 requires a clean database.** There is no upgrade migration from earlier versions. Preserve any old data separately and point this release at an empty database or new SQLite file. Startup refuses an older schema and never deletes data. For a deliberate local test reset, stop the server and run `npm run reset:dev`; it asks for an exact confirmation and refuses PostgreSQL/production. Do not reset a real event.

The ZIP excludes private environment files, database contents, dependencies and compiled assets. Run `npm ci` and rebuild after extracting.

## Screens

| Device | Route | Content |
| --- | --- | --- |
| Join monitor | `/display/join` | Stable QR, top-five Ranked standings, next Live timer |
| Play monitor | `/display/play` | Idle wheel/text, selection, games, answer reveals and winners |
| Host laptop | `/host` | Live, Event, Players & Results, Updates |
| Player phone | `/` | Register/sign in, Play, Scores, Updates and Account |

Public routes never receive host identity details. Phone Scores shows personal Practice top ten, recent Live results, the full Ranked leaderboard and confirmed prize information.

## What changed in v0.6.0

- Rebuilt the minigames around state tracking, dependencies, rule priority and repetition, with small Python inputs and five reasoning tiers.
- Robot Rescue adds required items, numbered keys/gates and tighter route budgets, with authoritative movement and collection playback.
- Parcel Sorter now uses first-match rule ordering. Pattern Painter has an editable Repeat block, separate tile/action budgets and independently checked optimum scores.
- Solo puzzle retries earn 100%, 90% or 80% of the calculated challenge score. Invalid/duplicate submissions do not consume runs; Live still allows one locked program.
- Added offline verified puzzle banks, 150 annotated fixtures, independent Python/solver checks, expanded phone/monitor tests and Live repeat avoidance.
- Preserved registration, login, queue policies, host controls, prizes and deployment. Removed superseded puzzle generators.

**Prototype gate:** `ENABLE_PROTOTYPE_GAMES=false` by default. Set it to `true` and restart a test event to try Parcel Sorter and Pattern Painter in Practice/Live. Both remain excluded from Ranked. They have automated coverage but have not passed the required beginner observations; keep them disabled for launch until that gate is completed. No calibration form or extra host game switches are added.

**Ranked pool:** Debug Dash, Guess the Output and Robot Rescue. Five challenge maxima are 0.80, 1.20, 1.80, 2.30 and 2.90. Exact integer scores use correctness first, with smaller efficiency/speed contributions. The best of three started sessions counts. Equal cross-game difficulty still requires rehearsal; freeze content and `SCORING_VERSION` for the actual event.

## Production

```sh
npm ci
npm run build
npm start
```

Set `HOST_PASSWORD`, `DATABASE_URL`, a 64-character hexadecimal `MAIL_KEY`, an HTTPS `PUBLIC_ORIGIN`, and working SMTP settings. Run one application instance behind one trusted HTTPS reverse proxy with WebSocket support. PostgreSQL advisory ownership rejects another writer. Do not autoscale replicas. Protect both the database and encryption key in backups.

Test real BCU mailbox delivery, the monitor QR and all devices on the actual deployment before opening admissions. This ZIP is a tested pre-launch release, not proof of production readiness.

## Development and extension

```sh
npm run check
# Only after changing prepared puzzle generation:
npm run content:build
npx playwright install chromium
npm run test:e2e
```

`check` runs lint, server/HTTP/generator tests and a production build. Browser tests use synthetic isolated fixtures; never deploy the test server. See [Architecture](docs/ARCHITECTURE.md), [Operations](docs/OPERATIONS.md), [Validation](docs/VALIDATION.md) and [v0.6.0 specification](docs/SPECIFICATION-v0.6.0.md). Prepared puzzle banks are committed source data; normal installs do not regenerate them. Change the relevant game module, rebuild the bank, and rerun tests when extending puzzles. Earlier specifications remain historical references.
