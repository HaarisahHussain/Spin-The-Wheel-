# Architecture and game extension · v0.7.0

## Boundaries

| Module                       | Responsibility                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------- |
| shared/catalog.js            | Public metadata, fixed release eligibility, BCU syntax and score presentation    |
| shared/scoring.js, timing.js | Integer score formula, level weights and phase durations                         |
| server/passwords.js          | Bounded asynchronous scrypt work outside database transactions                   |
| server/commands/auth.js      | Registration, verification, password reset and host authentication               |
| server/host-control.js       | Exclusive session/tab/connection lease, epochs and takeover challenges           |
| server/commands/player.js    | Account actions, controller ownership, queue and submissions                     |
| server/commands/host.js      | Settings, incidents, finalisation, exports and cleanup                           |
| server/engine.js, runtime.js | Idempotent dispatch, server phases, deadlines and scheduling                     |
| server/games/                | Server-only seeded generators, validators and evaluators                         |
| server/projection.js         | Explicit public, participant and host views                                      |
| server/storage.js            | Single-writer committed cache, changed-record persistence and unique email index |
| server/mail.js               | Encrypted outbox and email transport                                             |
| src/state.jsx                | Same-origin commands, separate audiences, reconnect and heartbeat                |
| src/games/                   | Shared quiz/puzzle rendering and phone editors                                   |

## Authority

Clients submit an intention with a command ID, challenge ID and connection identity, never scores or trusted timestamps. The HTTP server records arrival time for scoring; queued database work does not reduce a player’s speed score. Authentication and control ownership use execution time. Playback starts at execution time so congestion does not shorten the animation. Mutations run through a serialized transaction. Host commands are fenced by session, connection, epoch and lease before even returning a cached result. Acknowledgements follow persistence. Rejected domain commands restore business state while keeping abuse counters. Password comparisons prepared asynchronously are checked against the exact current hash in the transaction.

Public questions use allowlists. Seeds, reference Python, solutions and locked Live programs stay server-side until the appropriate reveal. Participant and host cookies are separate. Public monitor routes request a public projection even in an authenticated browser. Player input belongs to one connected device; transfers require explicit confirmation while another owner is present.

## Persistence and recovery

SQLite WAL is local only. PostgreSQL uses `arcade_records(key, body)` with separately keyed accounts, attempts, sessions, receipts, outbox entries and other collections. Core configuration and the active game remain small aggregates. One dedicated PostgreSQL advisory lock or SQLite process lock fences other writers. PostgreSQL needs a direct or session-pooler connection, not transaction pooling.

Startup reads the records once. Serialized commands create isolated working state, persist only changed records in one transaction, then publish the committed cache. Completed reviews/breakdowns are frozen and shared between drafts; editing them requires replacing the value. State selectors are internal read-only APIs. No-op transactions issue no SQL. Database connection/query deadlines are bounded; an ambiguous PostgreSQL failure disables further writes until restart reloads authoritative state. Pending transactions are capped at 128 with a five-second queue deadline.

The 250 ms scheduler checks in-memory deadlines; maintenance runs at most every 30 seconds except when a game transition also runs cleanup. Rates, takeover challenges and host leases are transient. Successful command receipts last ten minutes and are capped at 4,000; rejected commands, exports and lease heartbeats are not stored as receipts. A retry must reuse its command ID. Significant results are saved before acknowledgement; there is no periodic deferred save window.

Socket.IO sends an initial lean view followed by changed top-level fields, coalesced over 100 ms. Slow transports keep a dirty flag for resynchronisation rather than a growing application update queue. Private views remain audience/session scoped. Expired authentication explicitly clears host fields. The full leaderboard is paginated; monitors retain their top-five display. `server/details.js` serves paginated host data, player top-ten/recent summaries, and individually authorised reviews. `src/useDetails.js` fetches those resources only for mounted screens. Shared standings/counts are computed once per committed snapshot.

Restart revokes host sessions and control ownership. Interrupted solo sessions preserve earned points for review and do not refund Ranked allowance automatically. Unfinished Live sessions are cancelled; saved results and prize records remain. Scheduler stalls pause admissions and require intervention. An interrupted challenge is never silently replayed for free. Schema-7 aggregate data is imported once and its redundant legacy tables retired after successful commit. Unknown schemas are rejected. Keep a matching backup for rollback.

## Add or change a game

1. Add metadata to `shared/catalog.js`; initially keep `ranked: false`. Public clients must never import server generators.
2. Register an adapter with `kind`, `create(level, seed)`, `valid(question, answer)` and `evaluate(question, answer)` in `server/games/registry.js`. Evaluation is pure and bounded; it returns correctness and meaningful efficiency, not a client-provided score.
3. Provide public fields through `publicQuestion`; preserve answer/solution secrecy before reveal. Add editor and monitor representations to the shared game components, not a new queue or session engine.
4. Generate a valid reference answer/solution for every seed and bounded retry/fallback behavior. Extend 10,000-seed tests, independent correctness checks and real browser controls. Include Live closure/execution/reveal behavior.
5. Benchmark difficulty with intended students before enabling Ranked. Freeze content, eligibility, timing and scoring for the actual event; change `SCORING_VERSION` for a new release/event.

Game modules are independent: `robot.js`, `parcel.js`, `painter.js`; `quiz-content.js` contains authored Python AST families and `program.js` renders/interprets only that bounded grammar. `registry.js` wires validators/evaluators to session creation. The interpreter never evaluates arbitrary source or player code.

`content-bank.json` is a checked-in, server-only source artifact. `content.js` selects and copies a prepared challenge in bounded time. `scripts/build-game-content.js` performs expensive shortest-route, exhaustive-order and exact-grammar searches offline. It rejects unproved candidates and writes the bank plus 150 annotated fixtures. Rebuild deliberately with `npm run content:build`; never add these solvers to a request/transaction path. Generation is deterministic for its versioned seed set.

Robot search includes collected-item state, not just location. Parcel evaluation uses first-match rules and accepts every correct permutation; opaque rule IDs and storage order do not reveal a solution. Painter search uses the exact one-Repeat grammar, visible tile cost and expanded-action cap. Its optimum is private; the tile budget is public because it is part of the puzzle.

`src/games/Parcel.jsx` owns rule controls and matching feedback; `Painter.jsx` owns canvas and Repeat editing; `Robot.jsx` owns the board and collected state. `Puzzles.jsx` shares sequence editing, execution/reveal and Live presentation. Server events identify source instruction, repeat-body index and iteration. Render frames using persisted server timestamps; reconnect must not restart evaluation. Live recent fingerprints are stored separately from account histories.

`prototypeGames` is populated from `ENABLE_PROTOTYPE_GAMES` at startup. `availableGames` filters selection and idle presentation. Prototype metadata keeps both new games out of Ranked even when their test catalogue is enabled.

## Game phases and clocks

Solo: called → wheel → first-encounter introduction (or countdown) → question → execution for puzzles → feedback → next question/result. Tutorial acknowledgement is per game and scoring version. Introduction expiry frees the turn and preserves the unstarted selection. A completed introduction starts a separate three-second countdown; only actual gameplay consumes a Ranked start.

Each of five questions has its own 30-second active allowance. A puzzle submission stores a unique run ID, copied program, evaluated path/frames, accumulated thinking time and execution deadline atomically. Robot/paint playback targets 220 ms per action, bounded to 600–4,000 ms; parcels use 4,000 ms. A failed run returns the remaining allowance and draft, or closes at zero after three runs. Score is committed at execution completion once. Client motion is presentation only, using server start/end timestamps and a reduced-motion path.

Live: lobby → wheel → ten-second sample → countdown → question → shared execution for puzzles → reveal → next round/winner. Coding uses five 30-second rounds; puzzles use three rounds at 30/35/40 seconds. Only shared closure publishes other players’ programs/results. Live playback reserves four seconds. A player cannot pause or privately test a Live puzzle.

The conservative solo slot is 282 seconds. Admission and phone wait calculations share `estimatedWaitMs`, including current/pending Live and future automatic sessions. Admission retains a ten-minute closing margin. These estimates are bounds, not appointment times.

## Scoring

Solo stores one million integer units per displayed point. Level maxima sum to 9.00. Correct quizzes receive 80% correctness plus up to 20% speed. Puzzles receive 80% completion, up to 15% efficiency and 5% speed. Solo puzzle success is then multiplied by 1.0/0.9/0.8 for the first/second/third accepted run, rounding only after multiplication. Live has one lock and no retry multiplier. Exact-deadline answers score zero. Execution and feedback never spend thinking allowance. Live normalises the same factors separately to 1,000 points. Display rounds to two decimals; true exact ties share ranks and prize-boundary ties require an audited decision.

Changing numbers creates numerical variety but does not establish equal difficulty. The seed benchmark is a duplicate check, not evidence of fair cross-game scores or immunity to memorisation.
