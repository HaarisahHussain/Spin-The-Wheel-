# BCUSCA Welcome Week Arcade · v0.7.0

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

## Existing data and local setup

v0.7.0 imports an existing **v0.6.0 schema-7 database** into individual records on first startup. Accounts, scores, queue state and prize records are preserved; redundant completed-question history is removed. Back up the database before deploying and retain the same `MAIL_KEY`. The old aggregate tables are retired only after the new records commit. To roll back the application, restore its matching backup too. Unrecognised earlier schemas are rejected without erasing them.

Keep your existing `SQLITE_PATH` to retain local test accounts. To start fresh locally, use a new path or `npm run reset:dev` for disposable test data. Development rejects a remote `DATABASE_URL` unless `ALLOW_REMOTE_DEV_DATABASE=true` explicitly opts into a separate test database.

The ZIP excludes private environment files, database contents, dependencies and compiled assets. Run `npm ci` and rebuild after extracting.

## Screens

| Device       | Route           | Content                                                       |
| ------------ | --------------- | ------------------------------------------------------------- |
| Join monitor | `/display/join` | Stable QR, top-five Ranked standings, next Live timer         |
| Play monitor | `/display/play` | Idle wheel/text, selection, games, answer reveals and winners |
| Host laptop  | `/host`         | Live, Event, Players & Results, Updates                       |
| Player phone | `/`             | Register/sign in, Play, Scores, Updates and Account           |

Public routes never receive host identity details. Phone Scores shows personal Practice top ten, recent Live results, the full Ranked leaderboard and confirmed prize information.

## What changed in v0.7.0

- Read committed state from memory; persist changed records atomically instead of transferring the full event on every timer tick.
- Broadcast changed screen fields and fetch histories, reviews and participant pages on demand. Idle screens generate no application state broadcasts.
- Bound transaction queues, password work and traffic; prevent failed host logins on another network from locking out the operator.
- Add SMTP deadlines and two delivery workers, production configuration checks, polling fallback and non-overlapping host heartbeats.
- Expire verification queue holds and avoid reserving instant prizes for ineligible repeat winners.
- Preserve minigame content, scoring, ranked allowance, phase timings and playback.

**Prototype gate:** `ENABLE_PROTOTYPE_GAMES=false` by default. Set it to `true` and restart a test event to try Parcel Sorter and Pattern Painter in Practice/Live. Both remain excluded from Ranked. They have automated coverage but have not passed the required beginner observations; keep them disabled for launch until that gate is completed. No calibration form or extra host game switches are added.

**Ranked pool:** Debug Dash, Guess the Output and Robot Rescue. Five challenge maxima are 0.80, 1.20, 1.80, 2.30 and 2.90. Exact integer scores use correctness first, with smaller efficiency/speed contributions. The best of three started sessions counts. Equal cross-game difficulty still requires rehearsal; freeze content and `SCORING_VERSION` for the actual event.

## Production

```sh
npm ci
npm run build
npm start
```

Set `HOST_PASSWORD`, `DATABASE_URL`, a 64-character hexadecimal `MAIL_KEY`, an HTTPS `PUBLIC_ORIGIN`, and working SMTP settings with `MAIL_MODE=smtp`. `NODE_ENV=production` also enables production safeguards; preview mail is rejected in production. Run one application instance behind one trusted HTTPS reverse proxy with WebSocket support. PostgreSQL advisory ownership rejects another writer. Do not autoscale replicas. Protect both the database and encryption key in backups.

Test real BCU mailbox delivery, the monitor QR and all devices on the actual deployment before opening admissions. This ZIP is a tested pre-launch release, not proof of production readiness.

## Development and extension

```sh
npm run check
# Only after changing prepared puzzle generation:
npm run content:build
npx playwright install chromium
npm run test:e2e
```

`check` runs lint, server/HTTP/generator tests and a production build. Browser tests use synthetic isolated fixtures; never deploy the test server. See [Architecture](docs/ARCHITECTURE.md), [Operations](docs/OPERATIONS.md), [Validation](docs/VALIDATION.md) and [v0.7.0 specification](docs/SPECIFICATION-v0.7.0.md). Prepared puzzle banks are committed source data; normal installs do not regenerate them. Change the relevant game module, rebuild the bank, and rerun tests when extending puzzles. Earlier specifications remain historical references.
