# Spin The Wheel — SCA Arcade

A local multiplayer arcade with a host dashboard, public monitor, and phone controllers. React renders the screens; Express and Socket.IO run the session and validate gameplay. All data lives in server memory.

## Run locally

Requires Node.js 22.12+ (validated with Node 24.19) and npm.

```bash
npm ci
npm run dev
```

Open `http://localhost:5173` on the laptop. Keep the host page open, choose **Open Monitor Display**, and ask players to scan the host QR code. Phones and laptop must share a reachable network; guest Wi-Fi isolation can prevent this.

If automatic LAN detection chooses a VPN or the wrong adapter, copy `.env.example` to `.env` and set `PUBLIC_ORIGIN` to the laptop's reachable address, including its port. `PORT` defaults to `5173`. The scripts load `.env` automatically.

## Run the built app

```bash
npm ci
npm run build
npm start
```

`npm start` serves `dist/`, the API, and Socket.IO from the same process. Run the build first. `npm run dev` uses Vite middleware; production startup does not load Vite. This local event app still needs authentication and abuse controls before public internet deployment.

## Commands

| Command         | Purpose                                                      |
| --------------- | ------------------------------------------------------------ |
| `npm run dev`   | Start the server with Vite development middleware            |
| `npm run build` | Build the React app into `dist/`                             |
| `npm start`     | Serve the built app and real-time server                     |
| `npm run lint`  | Check source; fail on errors or warnings                     |
| `npm test`      | Run domain regression tests and real-socket integration test |
| `npm run check` | Run lint, tests, and production build                        |

`GET /api/health` returns `{ "ok": true }`.

## Gameplay

1. Players enter their name and study field, optionally choose interests, and spin.
2. The server chooses from Debug Dash, Robot Rescue, and Guess The Output.
3. Single-player entries start automatically when the screen is free. Multiplayer groups need at least two players and a host start; at most four enter a round.
4. Players receive independent challenges. The round ends when the first player completes all four levels, time expires, or the host ends multiplayer. Scores for all remaining participants appear in the results.
5. Players can spin again or return to the form. New arrivals can queue while a round is running.

Debug Dash and Guess The Output use a **25-second round deadline**, across all four levels. Robot Rescue uses **35 seconds**, with at most 100 blocks per submitted program. Wrong answers deduct 50 points without taking the score below zero. Correct Debug/Guess levels award `level × 100`; Robot levels award `level × 125`.

Multiplayer Guess The Output uses each player's own question and buzzer. It is not a shared-question, first-to-buzz contest.

## Where to work

| Area                                           | Location                     |
| ---------------------------------------------- | ---------------------------- |
| Host dashboard and connection                  | `src/features/host/`         |
| Phone flow and connection                      | `src/features/player/`       |
| Monitor phases and connection                  | `src/features/monitor/`      |
| Mini-game player/monitor components            | `src/games/<game>/`          |
| Reusable UI, timer, music, wheel               | `src/components/`            |
| Styles, grouped by responsibility              | `src/styles/`                |
| HTTP setup and process entry                   | `server/app.js`, `server.js` |
| Join, host, and player protocol handlers       | `server/socket/`             |
| Queue, round lifecycle, timer ownership, wheel | `server/sessions/`           |
| Challenge generators and game rules            | `server/games/<game>/`       |
| Shared game catalogue and command labels       | `shared/games.js`            |

Read [the engineering review](docs/ENGINEERING_REVIEW.md) for findings and remaining risks, and [the maintenance guide](docs/MAINTAINING.md) before adding a game.

## Session limits

Restarting the server loses sessions and scores. A host reconnect creates a new session and QR; players must rescan. A phone reconnect rejoins as a new player and returns to the form. There is no persistent leaderboard, database, account system, or resumable identity. Unoccupied sessions expire after 30 minutes of inactivity, checked once a minute.

Music is opt-in and depends on browser audio permissions. The completion tone may remain blocked without a user gesture.
