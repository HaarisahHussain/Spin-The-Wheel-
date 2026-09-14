# BCUSCA Welcome Week Arcade · v1.0.0

Five programming and puzzle games for students’ phones, two monitors and one host laptop. React and Tailwind v4 share one origin with Express, Socket.IO and the database-backed event engine.

## Development

Requires Node.js 24+. Python 3 is needed for content tests, not to run the app.

```sh
npm ci
cp .env.example .env
npm run dev
```

Before starting, set `HOST_PASSWORD` to a unique 15–256 character passphrase. Set `PUBLIC_ORIGIN` to the exact browser origin, without a trailing slash. For phones, use the laptop’s LAN address (for example `http://192.168.1.13:3001`) and the same network. Restart after changing `.env`.

Leave `DATABASE_URL` empty for local SQLite. `MAIL_MODE=preview` shows development email links. Keep the existing `SQLITE_PATH` to retain accounts; `npm run reset:dev` deletes confirmed disposable test data. A remote development database requires `ALLOW_REMOTE_DEV_DATABASE=true` and should be separate from production.

## Screens

| Device | Route | Purpose |
| --- | --- | --- |
| Phone | `/` | Register/sign in, queue, controller, scores, updates |
| Join monitor | `/display/join` | QR, queue and Ranked leaderboard |
| Gameplay monitor | `/display/play` | Wheel, games and results |
| Host laptop | `/host` | Event controls, players, results and prizes |
| Public information | `/about`, `/legal`, `/versions` | Association/SWE, rules/privacy/accessibility, release history |

Sign in as **host** with `HOST_PASSWORD`. Only one host controller is active; taking over requires confirmation. In Event settings, save opening windows, cutoff, closing time and prize instructions. Enable Ranked when ready. No configured admission window means no admission.

## Games and results

Debug Dash, Guess the Output, Robot Rescue, Parcel Sorter and Pattern Painter are all available in Practice, Ranked and Live. There is no prototype switch. Each solo session contains five 30-second challenges; introductions, execution and feedback have separate clocks.

Practice is unlimited. Ranked allows three starts and keeps the best score, on a 0–9 scale. Ranked starts cannot be voided or refunded. The host resolves interrupted sessions with earned points retained. Live scores are separate. Top Ranked positions are provisional until winners are finalised; only confirmed awards can be collected.

## Production

```sh
npm ci
npm run build
npm start
```

Configure PostgreSQL `DATABASE_URL`, HTTPS `PUBLIC_ORIGIN`, `HOST_PASSWORD`, the existing 64-character hexadecimal `MAIL_KEY`, and working SMTP with `MAIL_MODE=smtp`. Preview mail is development-only. Use one application instance behind one trusted HTTPS proxy supporting WebSockets. PostgreSQL needs a direct/session-pooler connection that supports the ownership lock; do not use transaction pooling or multiple replicas.

Upgrade from v0.7.0 without resetting the database. Schema-7 v0.6.0 data is also imported automatically. Back up first and preserve `MAIL_KEY`; earlier unknown schemas are rejected without deletion. Scoring values are unchanged, but the Ranked game pool now has five games. Freeze the pool and content before starting the real event.

## Checks and maintenance

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

`check` runs lint, backend/content/HTTP tests and the production build. Only run `npm run content:build` after changing prepared puzzle generation. The ZIP excludes environment secrets, databases, dependencies and built files.

- [Operations](docs/OPERATIONS.md): host workflow, setup, recovery and data cleanup.
- [Architecture](docs/ARCHITECTURE.md): boundaries, scoring, persistence and game extension.
- [Validation](docs/VALIDATION.md): automated evidence and remaining real-device/deployment checks.
- [Changelog](CHANGELOG.md): detailed version history.
