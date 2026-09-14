# Architecture · v1.1.0

## Boundaries

| Module | Responsibility |
| --- | --- |
| shared/catalog.js, scoring.js, timing.js | Game metadata, score units, weights and phase durations |
| server/games/ | Server-only generators, validators, evaluators and prepared content |
| server/commands/auth.js | Guest issuance and host authentication/control |
| server/commands/player.js | Profile, queue, ownership and game submissions |
| server/commands/host.js | Settings, queue, interruptions, Updates, exports and cleanup |
| server/engine.js, runtime.js | Dispatch, idempotency, phases, deadlines and scheduling |
| server/state.js, projection.js, details.js | Unified standings, safe screen views and paginated records |
| server/storage.js, working-state.js | Single-writer cache, isolated drafts and changed-record persistence |
| server/receipts.js | Authenticated encryption of cached credential responses |
| server/upgrade.js | One-time guest-flow conversion of existing event records |
| src/state.jsx, useDetails.js | Same-origin requests, reconnect, host lease and on-demand history |
| src/screens/, src/games/ | Device screens and shared controllers/renderers |

## Identity and authority

A public username is a label, never a credential. `guest` creates a generated unique username and a random session token in an HttpOnly cookie. An existing valid guest session is reused. Renaming is validated case-insensitively inside the single serialized writer; optional names are excluded from public projections. No email or player password is collected. Guest sessions last seven days; multiple accounts are allowed.

The host retains environment-password sign-in, explicit takeover, session/tab/connection ownership, epochs and a renewable lease. Host and guest cookies are separate. Commands validate identity, connection ownership, phase and deadlines before mutation. Idempotent replies are stored after persistence; credential replies are encrypted. Source and command limits bound resource use without claiming to identify unique people.

Clients submit answers/programs with a challenge ID and command ID. The server alone evaluates and scores. Receipt time determines answer timing; commit time starts playback so a queued request cannot shorten the animation. Private seeds, solutions and locked Live submissions are excluded until reveal. A socket requests its screen audience; display views never expose optional names or private host data.

## Scoring and session lifecycle

Solo sessions retain five challenges and the existing 30-second thinking allowances, feedback and execution phases. Puzzle runs share the thinking clock; successful retries receive 100%/90%/80% multipliers. Execution does not spend thinking time. Codes and puzzle mechanics are unchanged.

One displayed point equals 1,000,000 integer units. Solo maxima are 0.80, 1.20, 1.80, 2.30 and 2.90, totalling 9.00. Correct coding answers receive 80% correctness and up to 20% speed. Puzzles receive 80% completion, up to 15% efficiency and 5% speed, followed by the retry multiplier. Exact-deadline answers score zero.

Live coding uses the same five difficulty weights. Live puzzles use tiers 0, 2 and 4; those tier weights are proportionally expanded to an exact 9,000,000-unit total. Live remains one locked submission per round, with shared reveal. This normalises the scale and round weighting; it does not prove identical human difficulty across formats.

`sessionResults` combines completed/timed-out/abandoned solo sessions with finished Live sessions. Each account’s highest exact score determines its leaderboard position. Exact ties share rank; end time and account ID give stable ordering within a tie without changing rank. Display rounding does not decide ties. Scores do not accumulate with play volume. Interrupted solo sessions enter standings only after a host records resolution, preserving points and end time.

## Persistence and recovery

SQLite WAL supports development. PostgreSQL stores individual `arcade_records` with one dedicated advisory-lock connection. A committed memory cache loads once on startup. Serialized drafts persist only changed records atomically, then publish lean state patches. Immutable completed reviews are shared safely between drafts; on-demand review and paginated results avoid repeated history broadcasts.

The scheduler checks deadlines every 250 ms, with periodic maintenance. Slow clients receive coalesced updates. Transaction queues and password work are bounded; host passwords use asynchronous scrypt. Rates and control leases are transient. An ambiguous PostgreSQL failure stops writes until restart reloads committed state. Preserve the stable receipt key for cached responses across restarts.

v1.1 upgrades schema-7 records once after active games have finished. It retains account/session ownership and solo scores, converts old Live totals proportionally from their 1,000-point scale, and removes obsolete email/password/prize data. Historical per-round Live weights cannot be reconstructed. Unknown schemas are never silently erased.

## Extend a game

1. Add server generation, input validation, evaluation and public projection to a game adapter under `server/games/`.
2. Register metadata and implement phone/display rendering under `src/games/`; both solo and Live use the shared adapter contract.
3. Keep evaluation bounded. Build expensive puzzle banks offline with `npm run content:build` and commit the verified bank.
4. Add independent reference checks for solvability, malformed input, secret-field exclusion, score boundaries and playback.
5. Rehearse controls and difficulty with unfamiliar players before changing the event pool. Update the scoring version when changing the solo formula/content compatibility.

Public information pages run outside the live provider so they work without Socket.IO. `shared/releases.js` contains short version summaries; CHANGELOG.md holds detailed history.
