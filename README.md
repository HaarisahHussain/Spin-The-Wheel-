# BCUSCA Welcome Week Arcade · v1.1.0

Scan, play, repeat. Five programming/puzzle games, instant browser accounts and one shared solo/Live leaderboard. React and Tailwind v4 share one origin with Express, Socket.IO and persistent event storage.

## Start locally

Use Node.js 24+. Python 3 is needed for content tests, not to run the app.

```sh
npm ci
cp .env.example .env
npm run dev
```

Before starting, set `HOST_PASSWORD` to a unique 15–256 character passphrase. Set `PUBLIC_ORIGIN` to the exact browser origin with no trailing slash. For phone testing, use the laptop’s LAN IP and the same network, for example `http://192.168.1.13:3001`. Restart after changing `.env`.

Leave `DATABASE_URL` empty for SQLite. Keep `SQLITE_PATH` to preserve accounts, or use a separate file for a disposable test event. `npm run reset:dev` asks before deleting local test data. A separate remote development database requires `ALLOW_REMOTE_DEV_DATABASE=true`.

## Screens and rules

| Device | Route | Purpose |
| --- | --- | --- |
| Phone | `/` | Instant guest, queue, controller, scores, account and Updates |
| Join monitor | `/display/join` | QR, queue and leaderboard |
| Gameplay monitor | `/display/play` | Wheel, games and results |
| Host laptop | `/host` | Queue, event settings, players, results and cleanup |
| Public information | `/about`, `/legal`, `/versions` | BCUSCA/SWE, privacy/accessibility, release history |

A guest gets a generated username automatically and can edit it under Account. Their real name is optional and host-only. There are no player emails, passwords, verification, Ranked modes, attempt limits or physical prizes. Multiple accounts are allowed. A secret cookie retains the account for up to seven days; usernames never grant access or recover an account.

One queue place gives one solo session. Rejoin at the back for another. Live lobbies support 2–50 players. Debug Dash, Guess the Output, Robot Rescue, Parcel Sorter and Pattern Painter are available in both formats. Each account’s best finished solo or Live session counts on a 0–9 leaderboard; equal scores share a rank. Personal top-ten scores combine both formats.

Sign in at `/host` as **host** using `HOST_PASSWORD`. One host controller is active at a time; taking over requires confirmation. Save opening windows, cutoff, closing time and cleanup date under Event. No admission window means admissions are closed.

## Production

```sh
npm ci
npm run build
npm start
```

Set PostgreSQL `DATABASE_URL`, HTTPS `PUBLIC_ORIGIN`, `HOST_PASSWORD` and a stable 64-character hexadecimal `RECEIPT_KEY`. A key is generated in `data/receipt.key` if omitted; preserve that file across restarts. The key encrypts cached credential responses, not emails. SMTP and MAIL_KEY settings are no longer used.

Use one application instance behind one trusted HTTPS reverse proxy supporting WebSockets. PostgreSQL must support a dedicated ownership lock: use a direct or session-pooler connection, not transaction pooling. Do not autoscale replicas.

## Upgrade from v1.0.0

Back up first and finish active games before stopping the old server. Existing schema-7 accounts, browser sessions and solo scores are retained. Legacy Live totals are converted proportionally from 0–1,000 to 0–9 once. Existing Solo/Live history joins the new leaderboard. Earlier Live scores cannot be reconstructed with the new difficulty weights because per-round history was not retained.

The upgrade deliberately removes email addresses, player password hashes, course/year fields, verification challenges, email jobs, prize records and obsolete audit/notification records. Optional names and usernames remain. Backups and previously exported files require separate deletion. The schema stays compatible with record storage, but rolling back the application requires its matching database backup.

## Checks and guides

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

Rebuild prepared puzzle banks with `npm run content:build` only after changing their generators. The ZIP excludes secrets, databases, dependencies and compiled assets.

- [Operations](docs/OPERATIONS.md): host workflow, recovery and cleanup.
- [Architecture](docs/ARCHITECTURE.md): authority, scoring, persistence and extension.
- [Validation](docs/VALIDATION.md): automated evidence and limits.
- [Changelog](CHANGELOG.md): detailed release history.
