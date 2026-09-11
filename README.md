# BCUSCA Welcome Week Arcade · v0.3

A React application for two public monitors, students’ phones and a private host laptop. Express serves the client, API and Socket.IO from one origin. This source release implements the v0.3 event flow and includes a pilot game bank. Ranked is closed by default until cross-game calibration is recorded.

## Run locally

Install Node.js 24 or newer, then run these commands from this directory:

```sh
npm ci
cp .env.example .env
npm run staff
npm run dev
```

The staff command creates a named account and prints an authenticator setup URI. Add it to your authenticator. Use the username, password and current six-digit authenticator code at `/host`. There is no default host password. `STAFF_ROLE` may be `host`, `adjudicator` or `admin`; the default for this setup command is `admin`. Prefer supplying `STAFF_PASSWORD` securely through your environment because the interactive password prompt is visible.

Open **http://localhost:3001**. Do not open Vite on a separate port. `PUBLIC_ORIGIN` must exactly match the browser origin, including scheme and port, with no trailing slash. Development uses local SQLite and a private email preview on the requesting browser; no real email is sent in preview mode.

In Host → Event, add the actual opening dates, admission cutoffs and closing times. No event dates are invented automatically. Leave Ranked closed while testing the games. Practice works once an opening window is active and the account satisfies the verification policy.

## Screens

| Device           | Route           | Purpose                                                                    |
| ---------------- | --------------- | -------------------------------------------------------------------------- |
| Monitor 1        | `/display/join` | Stable QR code, top-five Ranked standings, next-player/live status         |
| Monitor 2        | `/display/play` | Ready, wheel, instructions, countdown, solo/live gameplay and results      |
| Host laptop      | `/host`         | Live operations, event settings, results/prizes, Updates                   |
| Student phone    | `/`             | Registration, verification, queue, controller, leaderboard and Updates     |
| Spare controller | `/controller`   | One-use pairing code issued by the host for an eligible participant’s turn |

Use the browser’s full-screen mode for the monitors. Both public display routes request public projections even when opened in a browser that also has a host session.

## Event rules implemented

- Exact `@mail.bcu.ac.uk` and `@bcu.ac.uk` domains only. Verification is ON by default for Practice, Ranked and Live. The host can turn it OFF without changing domain restrictions or resetting attempts.
- One solo queue entry per account. Staff confirm presence by calling the next participant; the phone has 20 seconds to respond. Every completed turn requires re-enqueueing at the back.
- Practice is unlimited. Ranked permits three started, non-void attempts across the entire event. A start is recorded atomically when gameplay begins. Closing the browser does not refund it.
- The server selects the game. Cancelling before a Ranked start retains its selected game. Best Ranked score counts; shared scores retain shared ranks.
- Scores use integer hundredths internally, displayed as `0.00–9.00`. Grade bands are `(0,1] F`, `(1,2] E`, `(2,3] D`, `(3,4] C`, `(4,5] B`, `(5,6] A`, `(6,7] S`, `(7,8] SS`, `(8,9] SSS`; zero is “No score”.
- Debug Dash and Guess the Output support solo and 2–50-player Live. Robot Rescue is solo-only. Live has its own scores and instant-prize records.
- A due live lobby waits for a selected solo turn. After Live, the queue resumes; if players are waiting, serve a solo turn before another live event.
- Account recovery preserves the identity and allowance. Spare controllers cannot read private account data or manage queues and expire with their assigned turn.
- Technical interruptions require an audited staff decision. Only technical voids refund Ranked attempts. Award collection is recorded once; unclaimed awards can be explicitly closed with a reason.

## Deploy

```sh
npm ci
npm run build
npm start
```

Production requires `DATABASE_URL`, a 64-character hexadecimal `MAIL_KEY`, and an HTTPS `PUBLIC_ORIGIN`. Configure SMTP using `.env.example`; set `MAIL_MODE=smtp`. Place the application behind a trusted HTTPS reverse proxy that forwards the original Host header and supports WebSocket upgrades. Run **one application instance**; do not use a cluster or autoscaling replicas with this event scheduler.

The QR encodes `PUBLIC_ORIGIN`, not a room ID or placeholder endpoint. `localhost` points to each student’s own phone, so it cannot be the event QR address. Use an HTTPS address reachable on both venue Wi-Fi and mobile data. Check `/api/health`, then scan the actual monitor QR from an unrelated phone before admitting players.

Keep PostgreSQL credentials, `MAIL_KEY`, staff passwords and authenticator secrets out of Git. Back up the database and encryption key separately. Existing data is not automatically migrated from the earlier room-based prototype; this version starts a new event database. See [Operations](docs/OPERATIONS.md) before running a prize-bearing event.

## Development

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

`check` runs lint, backend/integration tests and a production client build. Browser tests serve isolated synthetic fixtures from `tests/browser-server.js`; never run that server at the event. Browser tests require a built `dist` directory. `npm ci` uses the supplied lockfile.

Styling uses Tailwind CSS v4 utilities, local Poppins fonts, charcoal text and off-white surfaces. The only application stylesheet imports Tailwind. Prism supplies code tokens styled with utilities; React Icons supplies the few functional icons. SVG geometry describes the wheel and does not require custom CSS.

Read [Architecture and game extension](docs/ARCHITECTURE.md), [Validation and release limits](docs/VALIDATION.md), and the complete [v0.3 specification](docs/SPECIFICATION-v0.3.md).
