# Architecture and extension guide

## Boundaries

| Module                      | Responsibility                                                                   |
| --------------------------- | -------------------------------------------------------------------------------- |
| `shared/catalog.js`         | Public game metadata, eligibility syntax, score presentation and scoring version |
| `server/commands/auth.js`   | Registration, verification, recovery, host MFA and controller pairing            |
| `server/commands/player.js` | Queue and gameplay commands, admission and ownership checks                      |
| `server/commands/host.js`   | Operations, settings, incidents, awards and retention actions                    |
| `server/engine.js`          | Idempotent command envelope and dispatch; rollback of rejected mutations         |
| `server/runtime.js`         | Server deadlines, session transitions, live scheduling and cleanup               |
| `server/games/`             | Server-only quiz/Robot generation, answer validation and score reducers          |
| `server/projection.js`      | Explicit public, participant and staff views                                     |
| `server/storage.js`         | Atomic persistence and serialized mutation access                                |
| `server/mail.js`            | Encrypted outbox payloads and verification/prize email delivery                  |
| `src/state.jsx`             | Same-origin commands, Socket.IO snapshots, clock offset and reconnection         |
| `src/screens/host/`         | Separate host tabs and shared reason dialog                                      |
| `src/games/Game.jsx`        | Shared questions, feedback and game composition                                           |
| `src/components/`           | Shared controls, syntax highlighting, scoreboard and wheel                       |

## Authority and consistency

The phone sends intentions, never scores or a “game completed” event. The server checks the session, participant, phase, attempt ID, challenge ID and deadline before accepting input. All mutations pass through `storage.transact`. A response is returned only after persistence commits. Domain errors restore prior business state while retaining abuse/verification counters.

Each command has a caller-generated ID and payload fingerprint. Retries return the original result. Credential-bearing results are encrypted before entering the idempotency cache. Socket snapshots are projections of committed state; the client rejects older revisions that arrive after newer ones.

SQLite WAL is the development adapter. PostgreSQL stores one JSONB event aggregate in a locked row. This makes cross-entity rules atomic and reviewable, but rewrites the aggregate and broadcasts snapshots frequently. It is a deliberate **single-event, single-process** design, not a general high-volume service. A row lock serializes transactions; it is not a distributed scheduler lease. Do not run two active schedulers. Before increasing scale, measure state size and tick latency, then migrate accounts, attempts, queue entries, commands and outbox jobs to normalized tables with unique constraints and an explicit scheduler lease.

Sessions and event state survive a restart; volatile connection presence does not. A restarted in-progress solo game becomes an interrupted attempt and pauses admissions for staff review. Ranked allowance is preserved until an authorised void. A live game interrupted by a restart is cancelled and rescheduled. Automatic replay would let participants alter an already-seen challenge, so recovery requires an explicit disposition.

## Add a game

1. Add stable metadata to `shared/catalog.js`: ID, name, duration, description and `live` capability. The wheel geometry and live selection use this catalogue. Keep enough room for readable wheel labels; inspect the monitor after adding a segment.
2. Create a server-only adapter in `server/games/` and register it in `registry.js`. `create(level)` builds a challenge. `answer(game, answer, challengeId, now)` validates and reduces quiz input. A simulation may implement `program(game, payload, now)` and `tick(game, now)` instead. These functions mutate only the supplied game and must not perform I/O. Set `game.complete` when finished.
3. For Live support implement `live.question(level)` and `live.validAnswer(question, value)`. The existing Live shell supports shared question/answer rounds. A fundamentally different multiplayer mechanic needs a new live lifecycle and renderer; setting `live: true` alone is insufficient.
4. Add the phone/display renderer in `src/games/`. Existing answer-choice and selectable-line layouts can be reused. Keep private answer keys and random generation on the server. Add a renderer selection in `Game.jsx`; new custom action types also need an explicit controller permission and player-command handler.
5. Extend `publicQuestion`/`publicGame` to strip any new private fields, or add an adapter-specific projection. Never assume a new field is safe simply because it is not named `answer`.
6. Add behavioural tests for reachable challenges, legal answers, server scoring, stale inputs, deadlines and private-state exclusion. Inspect both phone and monitor views.
7. Change `SCORING_VERSION` whenever scoring/content difficulty changes. Balance changes through development playtests before reopening Ranked. Do not update the scoring bank during a live Ranked event.

Keep authentication, queueing and prize logic outside game modules. The current quiz module contains the two existing banks, while Robot generation/programming is independent. Do not evaluate client-supplied code on the server; quiz outputs are computed by the trusted generator.

## Scores

The pilot quizzes contain nine challenges worth up to 100 hundredths each, with a bounded response-time bonus. Robot has three core boards worth up to 200 each and three further boards worth up to 100 each, with a route-efficiency component. The core ceiling is 6.00 and the total ceiling is 9.00.

**Equal ceilings do not prove equal difficulty.** These are pilot reducers, not a calibrated psychometric scale. The existing bank can be learned, and experienced programmers may reach its ceiling. Representative playtests must determine question/board difficulty and timing before prizes use Ranked. Two decimal places improve display precision but cannot eliminate genuine ties. Preserve shared ranks and use the published prize-boundary procedure.


## v0.4.0 timing and presentation boundaries

- `shared/timing.js` owns fixed solo/reveal timing and the six-round Live profile. `shared/wheel.js` arranges ten labels without selecting a game. `server/selection.js` draws a game uniformly, then chooses its sector, and persists that selection with timestamps.
- `server/games/quiz.js` owns question/feedback transitions, remaining answering milliseconds and one-time scoring. Feedback retains the completed question; the next question is generated only when activated. `publicGame` exposes answers only during feedback; Live projections expose them only once submissions close.
- `server/runtime.js` freezes lobby settings, closes membership before drawing, manages pending Live/solo fairness and estimates admission capacity with bounded live overhead. Disconnects do not shrink the frozen roster; all-submitted can reveal after two seconds, otherwise a fixed deadline closes the round.
- `server/migration.js` applies v0.4.0 defaults once, preserves account/history records and blocks mixed-version ranking. `server/recovery.js` interrupts active play after a service-update stall exceeding three seconds. Startup keeps the existing interruption procedure. Neither path refunds ranked attempts automatically.
- `src/components/AnswerFeedback.jsx`, `Wheel.jsx`, `Code.jsx` and `LiveStatus.jsx` are shared phone/display primitives. Server timestamps own progression. Reduced motion changes rendering only. The Code component preserves source on copy and gives each logical line one selection target after wrapping.
- `src/games/Robot.jsx` owns board/controller presentation with controls before a fixed-height sequence. `server/games/robot-maze.js` and `robot.js` retain maze authority. Movement increments its scheduled next step instead of accumulating timer jitter; long service stalls follow the recovery path.

New game adapters must advertise the correct modes. The wheel currently accepts 1–10 eligible games; more than ten requires an explicit visual design change. Editing a competitive game bank, score rule or timing profile requires a new scoring version and fresh calibrated event. The host API does not expose arbitrary ranked timing edits.


Wheel motion uses requestAnimationFrame to update functional SVG transforms against server time; no animation completion event controls game state. Visibility recovery refreshes state. The selection label is neutral until the authoritative countdown phase. Idle motion runs continuously unless disabled or reduced motion is requested.

Ranked availability is a version-checked, revision-protected Event setting. Switching it leaves attempts, scores and already admitted turns intact. Historical scoring versions remain excluded from current standings; no automatic event reset is performed.
