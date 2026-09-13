# Architecture and game extension · v0.5.1

## Boundaries

| Module | Responsibility |
| --- | --- |
| shared/catalog.js | Public metadata, fixed release eligibility, BCU syntax and score presentation |
| shared/scoring.js, timing.js | Integer score formula, level weights and phase durations |
| server/passwords.js | Bounded asynchronous scrypt work outside database transactions |
| server/commands/auth.js | Registration, verification, password reset and host authentication |
| server/host-control.js | Exclusive session/tab/connection lease, epochs and takeover challenges |
| server/commands/player.js | Account actions, controller ownership, queue and submissions |
| server/commands/host.js | Settings, incidents, finalisation, exports and cleanup |
| server/engine.js, runtime.js | Idempotent dispatch, server phases, deadlines and scheduling |
| server/games/ | Server-only seeded generators, validators and evaluators |
| server/projection.js | Explicit public, participant and host views |
| server/storage.js | Serialized atomic aggregate persistence and unique email index |
| server/mail.js | Encrypted outbox and email transport |
| src/state.jsx | Same-origin commands, separate audiences, reconnect and heartbeat |
| src/games/ | Shared quiz/puzzle rendering and phone editors |

## Authority

Clients submit an intention with a command ID, challenge ID and connection identity, never scores or trusted timestamps. Mutations run through a serialized transaction. Host commands are fenced by session, connection, epoch and lease before even returning a cached result. Acknowledgements follow persistence. Rejected domain commands restore business state while keeping abuse counters. Password comparisons prepared asynchronously are checked against the exact current hash in the transaction.

Public questions use allowlists. Seeds, reference Python, solutions and locked Live programs stay server-side until the appropriate reveal. Participant and host cookies are separate. Public monitor routes request a public projection even in an authenticated browser. Player input belongs to one connected device; transfers require explicit confirmation while another owner is present.

## Persistence and recovery

SQLite WAL is local only; PostgreSQL stores one locked JSONB event aggregate and a transactionally maintained unique email table. One dedicated PostgreSQL advisory lock or SQLite process lock prevents competing application writers. This is a bounded, single-event architecture; aggregate rewrites and full snapshots are a scalability constraint. Broadcasts are coalesced at 100 ms. Profile before increasing participant volume or retaining many events.

Restart revokes host sessions and control ownership. Interrupted solo sessions preserve earned points for review and do not refund Ranked allowance automatically. Unfinished Live sessions are cancelled; saved results and prize records remain. Scheduler stalls pause admissions and require intervention. An interrupted challenge is never silently replayed for free. No migration or deletion runs on ordinary startup.

## Add or change a game

1. Add metadata to `shared/catalog.js`; initially keep `ranked: false`. Public clients must never import server generators.
2. Register an adapter with `kind`, `create(level, seed)`, `valid(question, answer)` and `evaluate(question, answer)` in `server/games/registry.js`. Evaluation is pure and bounded; it returns correctness and meaningful efficiency, not a client-provided score.
3. Provide public fields through `publicQuestion`; preserve answer/solution secrecy before reveal. Add editor and monitor representations to the shared game components, not a new queue or session engine.
4. Generate a valid reference answer/solution for every seed and bounded retry/fallback behavior. Extend 10,000-seed tests, independent correctness checks and real browser controls. Include Live closure/execution/reveal behavior.
5. Benchmark difficulty with intended students before enabling Ranked. Freeze content, eligibility, timing and scoring for the actual event; change `SCORING_VERSION` for a new release/event.

Parcel Sorter uses a visible binary conveyor with a Boolean exit swap at each junction. Pattern Painter accepts direction/paint instructions and at most one Repeat block (count two, at most four primitive instructions); expanded work is capped at 24 instructions. Both award completion without inventing an optimal-program efficiency penalty. Robot efficiency uses independent-checked shortest-path cost divided by submitted cost.

`prototypeGames` is populated from `ENABLE_PROTOTYPE_GAMES` at startup. `availableGames` filters selection and idle presentation. Prototype metadata keeps both new games out of Ranked even when their test catalogue is enabled.

## Game phases and clocks

Solo: called → wheel → first-encounter introduction (or countdown) → question → execution for puzzles → feedback → next question/result. Tutorial acknowledgement is per game and scoring version. Introduction expiry frees the turn and preserves the unstarted selection. A completed introduction starts a separate three-second countdown; only actual gameplay consumes a Ranked start.

Each of five questions has its own 30-second active allowance. A puzzle submission stores a unique run ID, copied program, evaluated path/frames, accumulated thinking time and execution deadline atomically. Robot/paint playback targets 220 ms per action, bounded to 600–4,000 ms; parcels use 4,000 ms. A failed run returns the remaining allowance and draft, or closes at zero after three runs. Score is committed at execution completion once. Client motion is presentation only, using server start/end timestamps and a reduced-motion path.

Live: lobby → wheel → ten-second sample → countdown → question → shared execution for puzzles → reveal → next round/winner. Coding uses five 30-second rounds; puzzles use three rounds at 30/35/40 seconds. Only shared closure publishes other players’ programs/results. Live playback reserves four seconds. A player cannot pause or privately test a Live puzzle.

The conservative solo slot is 282 seconds. Admission and phone wait calculations share `estimatedWaitMs`, including current/pending Live and future automatic sessions. Admission retains a ten-minute closing margin. These estimates are bounds, not appointment times.

## Scoring

Solo stores one million integer units per displayed point. Level maxima sum to 9.00. Correct quizzes receive 80% correctness plus up to 20% speed. Puzzles receive 80% completion, up to 15% efficiency and 5% speed. Exact-deadline answers score zero. Execution and feedback never spend thinking allowance. Live normalises the same factors separately to 1,000 points. Display rounds to two decimals; true exact ties share ranks and prize-boundary ties require an audited decision.

Changing numbers creates numerical variety but does not establish equal difficulty. The seed benchmark is a duplicate check, not evidence of fair cross-game scores or immunity to memorisation.
