# BCUSCA Welcome Week Arcade · v1.3.0

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

## Upgrade from v1.1.0 or later

Keep the same `DATABASE_URL` (production), or the same `SQLITE_PATH` and database files (development). Keep `RECEIPT_KEY` unchanged. Do not run reset commands or replace the database. Finish active games and stop the old server before deploying; run one server against the database.

Accounts, usernames, optional names, browser sessions, solo/Live scores, history, queue and event settings are retained. No score conversion or account renaming takes place. The internal guest-data format remains `1.1.0`; the interface version becomes `1.3.0`.

On the first upgrade of an existing record database, the server writes a one-time snapshot into `arcade_backups` before application migration. It is not loaded or sent during normal gameplay. It contains private event data and is deleted by the host’s explicit Delete event data action. Existing external/provider backups still need their normal retention policy. A same-database snapshot protects against migration mistakes, not loss of the database itself: take a provider backup first.

Older formats are rejected without deleting event records. v1.0.0 and earlier are outside the supported upgrade path. If a deployment fails, keep the database and investigate the error; never fix it by resetting production data. See Operations for snapshot recovery.

## Starting a game

Solo: call a player, let them tap Ready to spin, then give them as long as they need to read. Either the player or host presses **Start game**, followed by a three-second countdown. Every turn shows instructions, including repeat plays.

Live: after the timed lobby and wheel, each participant presses **I’m ready to play**. Everyone starts together when all participants are ready, or when the host presses **Start for everyone**. The host can cancel if someone has left. There is no instruction timeout. In-game question timers are unchanged. Queue and closing-time estimates remain approximate because reading time is unlimited.

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

## Display sound

On `/display/play`, click **Enable sound** once after opening or refreshing the page. Use **Mute sound** to silence it immediately. Sound plays only on the gameplay display: wheel clicks, selection, countdown, level feedback and final results. Idle animation stays silent. Hidden or disconnected displays suppress cues; old cues are not replayed on reconnect. Visual feedback remains available without sound. Set the physical speaker volume before opening the stall.


