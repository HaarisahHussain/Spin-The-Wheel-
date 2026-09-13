# BCUSCA Welcome Week Arcade — v0.5.1 specification

**Status:** Approved audit direction, specified for implementation; not a claim of completed development or validation.

**Baseline:** v0.5.0. This specification supersedes its game catalogue, solo timing, game introduction, gameplay presentation and related scheduling requirements. All unchanged account, security, queue, privacy and prize rules remain in force.

## 1. Purpose and release scope

Make the arcade understandable and enjoyable for Welcome Week students, including people unfamiliar with Python. A player should understand what to do, see the result of their actions and have enough time to think. Difficulty must come from the problem, not unclear controls, excessive arithmetic, hidden rules or unreadable time limits.

This release covers the entire audit: games, timing, scoring, mobile interaction, both monitors, registration, verification, queue communication, host operations, recovery, architecture and validation. It is not restricted to the engineering priority list.

Keep the requested minimalist light design: off-white background, charcoal text, Poppins, Tailwind CSS v4 utilities, restrained React Icons and Python syntax highlighting. No neon, gradients or decorative information overload. Necessary instructions and feedback are part of a minimal interface.

Implement only relevant changes. Update the changelog, release metadata, setup/operations documentation and tests that describe affected behaviour. Preserve unrelated files and historical specifications. The version remains pre-launch: a fresh event database is permitted, but ordinary startup must never delete data.

## 2. Audit findings translated into requirements

| ID | Finding | Required outcome |
| --- | --- | --- |
| A01 | Robot execution became static | Animated submitted route on phone and play monitor; clear collision and completion feedback |
| A02 | Eight-second opening questions and 90-second shared budget | Five challenges with 30 seconds each; matching score weights and scheduling |
| A03 | Operands and array entries reach 999 | Normally use 0–10, with manageable intermediate results |
| A04 | Sort and Signal require too many unfamiliar concepts | Remove both implementations; prototype two visual replacements |
| A05 | Timed play begins without teaching the mechanic | Separate non-scoring visual example before a first scored encounter |
| A06 | Numeric uniqueness is mistaken for meaningful variety | Concept tiers, structural variation, independent correctness checks and human difficulty testing |
| A07 | Debug questions can admit alternative fixes | One defensible answer under an explicit, concise task |
| A08 | Failed submissions do not explain their outcome sufficiently | Demonstrate the action, identify the error and preserve editable work |
| A09 | Overlapping Live robots lose identity | Group markers on the monitor plus individual execution on each phone |
| A10 | Registration silently defaults academic year | Required unselected placeholder |
| A11 | Verification across browsers can be confusing | Explicit destination account, confirmation and next step |
| A12 | “Enqueue” and other technical labels | Familiar player-facing language throughout |
| A13 | Queue position provides little reassurance | People ahead, queue state and honest estimated wait where reliable |
| A14 | Account/navigation compete with active gameplay | Focused game layout with a deliberate exit |
| A15 | Empty leaderboard dominates join monitor | Stable dominant QR and compact empty state |
| A16 | Live join code has no corresponding input flow | Remove redundant code; retain direct phone joining |
| A17 | Disabled host actions lack local explanations | Explain the actual blocking condition beside each relevant action |
| A18 | Settings switches appear immediate but require Save | Explicit draft state, visible Save and confirmation |
| A19 | Reauthentication is a separate discoverable task | Prompt within the protected action, then safely continue it |
| A20 | Failed startup leaves an instance lock | Ownership-safe cleanup and actionable startup/reset errors |
| A21 | Tests prove submission works but not that play makes sense | Real-device, beginner-observation and gameplay-feedback acceptance tests |

## 3. Rules preserved from v0.5.0

- Exact `@mail.bcu.ac.uk` and `@bcu.ac.uk` eligibility. Verification defaults ON for all modes. Turning it OFF permits BCU-format accounts without asserting mailbox ownership.
- Email/password registration and sign-in; expiring, single-use emailed password reset. No recovery-secret login.
- Shared host username `host`, password from `HOST_PASSWORD`, no MFA or separate admin. Explicit takeover and server-enforced exclusive control remain.
- One solo queue entry per account; one entry gives one session; finishing requires joining the back again.
- Practice is unranked. Three started, non-void Ranked attempts per event; best exact score counts. No refund from refreshing, quitting or reconnecting.
- Ranked games are selected server-side; an unstarted retained selection cannot be rerolled by abandoning the introduction.
- Live is separate and unranked. It does not interrupt an admitted solo turn and yields back to solo play afterwards.
- Public identities remain generated aliases. Names, emails, course and year remain private to the participant and authenticated host.
- Personal Practice records, recent Live results, persistent grand-prize notifications, audited prize collection, email status and retention controls remain.
- Server-authoritative deadlines and scores, atomic persistence, idempotent commands, secure production cookies and explicit public projections remain mandatory.

## 4. Game catalogue and release eligibility

| Game | v0.5.1 decision | Modes |
| --- | --- | --- |
| Debug Dash | Keep; simplify content, wording and feedback | Solo Practice/Ranked; Live |
| Guess the Output | Keep; simplify arithmetic and progression | Solo Practice/Ranked; Live |
| Robot Rescue | Keep; restore execution and improve learning feedback | Solo Practice/Ranked; Live |
| Sort the Stream | Remove from active code and selection | None |
| Signal Switch | Remove from active code and selection | None |
| Parcel Sorter | Build and validate a small playable prototype, then integrate | Practice/Live after acceptance; Ranked off initially |
| Pattern Painter | Build and validate a small playable prototype, then integrate | Practice/Live after acceptance; Ranked off initially |

Replacement development is in scope. Acceptance is not automatic: a replacement that fails beginner testing must not enter the launch catalogue. Ship the three established games if necessary, documenting the omission rather than claiming five playable games.

Remove obsolete adapters, UI branches, generation and tests used solely by Sort and Signal. Remove their names from wheels, filters and onboarding. Historical documentation can retain their history; do not substitute new game names onto old score records.

Game enablement is release configuration, not an arbitrary host toggle during a Ranked event. Keep one host Ranked switch and no calibration form.

## 5. Introduction and learning flow

Offer a compact “How to play” preview on the phone before queueing. It uses a separate sample and can be replayed at the player's pace. No real challenge, future answer or generator seed is exposed.

After selection, a first-time player receives one brief game-specific example before gameplay. Show one objective, one demonstrated interaction and its visible result. Provide “I’m ready”; returning players may skip the sample. Persist tutorial acknowledgement per game/rules version.

Reserve at most 20 seconds of main-screen introduction time. If the player does not confirm, release the turn with a clear message, preserving any unstarted Ranked selection and allowance. They can review the example on their phone and rejoin. Do not automatically consume a Ranked attempt while someone is still reading instructions.

Live uses a common short demonstration before its countdown; participants cannot independently pause the shared event. It teaches the mechanic using a different problem. A replayable untimed sample remains available outside active Live play.

Tutorial progression, gameplay countdown and challenge opening must be separate states. Instructions never consume the scored challenge allowance.

## 6. Solo timing, phases and queue capacity

### 6.1 Proposed defaults

| Element | Default |
| --- | --- |
| Presence confirmation | Retain 20 seconds |
| Selection wheel | Retain 3 seconds |
| First-encounter introduction | Up to 20 seconds; explicit readiness |
| Gameplay countdown | 3 seconds |
| Challenges per session | 5 |
| Active thinking allowance per challenge | 30 seconds |
| Feedback after a closed challenge | 4 seconds |
| Session result | 6 seconds |
| Puzzle execution | Up to 4 seconds per submitted run; separate from feedback |
| Solo puzzle runs | Initially up to 3 per challenge, shown clearly |

These are implementation defaults subject to observed playtesting. They are not scientifically established optimal timings. If a question cannot reasonably be read and solved in its allowance, simplify or remove it rather than forcing it into the timer.

### 6.2 Clock semantics

Remove the 90-second shared budget. Every new challenge receives its own 30-second allowance; previous answers neither steal nor bank time. Show challenge progress and the current allowance, not a second competing session countdown.

An accepted coding answer closes that challenge. Incorrect answers and timeouts score zero; explain the result before progressing. There is one accepted coding submission per challenge. Selecting an option is reversible until Submit.

A solo puzzle run freezes its remaining thinking allowance while the server owns the execution phase. Editing is disabled. A failed run returns to editing with exactly the remaining allowance, without a refill. After the third unsuccessful run, close the challenge at zero. The remaining run count must be visible; never introduce a hidden retry limit. Practice teaching examples outside queued sessions may allow additional retries.

Record accumulated active thinking time at each accepted puzzle submission. Successful scoring uses that value, excluding server-controlled playback and feedback. Clients cannot pause clocks or claim latency adjustments. At or after the deadline, reject scoring input consistently.

Refreshing, reconnecting or duplicating a command cannot restart a phase, restore a run or grant extra thinking time. A successful result remains pending for display until execution completes; do not reveal “Solved” before the robot arrives.

### 6.3 Scheduling consequences

Derive slot estimates from the shared timing configuration, including presence confirmation, wheel, introduction, countdown, all five allowances, maximum puzzle runs/playback, feedback and result. With these conservative defaults a puzzle slot can approach five minutes; do not retain the previous 160-second estimate.

Update queue capacity, admission cutoff checks, host wait estimates, Live feasibility and closing-window calculations together. Only admit turns that fit the configured event window under the declared scheduling policy. Successful early completion frees capacity normally.

Show broad estimated wait ranges only when they reflect the current queue and scheduled Live interruption; label them estimates. Do not promise exact starting times. Held/ineligible entries must not distort the estimate for playable turns.

Measure actual throughput in rehearsal. If queue delay becomes unacceptable, reduce session challenge count consistently before the event or adjust the programme; do not silently rush later players.

## 7. Coding content and progression

### 7.1 Numeric constraints

Normally use integer literals and array items from 0 to 10 inclusive. Multiplication should normally use 2 or 3. Avoid negative values, division, modulo or larger values unless that particular concept has already been introduced and is the actual learning objective.

Use three or four list items initially and short loops, normally two to five iterations. Bound intermediate arithmetic as well as input values: early results should normally fit within 20 and later arithmetic within 50. Any justified exception must be reviewed for reading and mental-calculation burden. Do not generate large totals merely for uniqueness.

### 7.2 Five difficulty tiers

1. Read a value, index a short list or identify a basic operation.
2. Follow one condition or a simple update.
3. Trace a short loop or accumulator.
4. Combine two previously introduced concepts.
5. Solve a concise multi-step problem with a clear objective.

Tier is based on concepts, code length, number of state changes and plausible mistakes—not increasing digits. Advanced syntax such as comprehensions, aliasing or nested expressions must not appear as an unexplained early surprise.

Keep short logical Python lines. Preserve indentation, logical line numbers and original-source copy behaviour when wrapping. Do not shrink text to fit a needlessly long snippet.

### 7.3 Guess the Output

Present “What is printed?”, the code, four clear answer options and Submit. Generate distractors from actual misconceptions, such as an excluded range endpoint or an incorrect branch. Remove duplicate/equivalent options. Validate printed representations for numbers, strings and lists exactly.

Show the player's selected answer, correct answer and a brief explanation on the phone. In solo, show the selected answer and result on the play monitor. In Live, keep individual correctness private until shared closure; show aggregate answers during reveal.

### 7.4 Debug Dash

Each task must have one clearly defensible faulty line under the stated constraints. “Which line needs changing?” is insufficient if several edits can satisfy the prompt. Constrain the task concisely or replace the question. A generator's injected-fault index does not establish answer uniqueness.

Use direct beginner wording. Keep expected behaviour explicit without requiring the player to perform unnecessary arithmetic. Initially show short snippets with one concept; later introduce a combination of familiar concepts.

On reveal, highlight the submitted line and corrected line, show the corrected statement and provide one short explanation. Ensure success/failure is prominent on both relevant screens. Longer explanations remain available from the participant's result view instead of disappearing after four seconds.

## 8. Robot Rescue

### 8.1 Core interaction

Build route → Run → animated execution → success or collision → edit and retry when allowed.

Keep controls in the compact two-row arrangement:

| Left | Centre | Right |
| --- | --- | --- |
| Clear | Up | Remove |
| Left | Down | Right |

Directional icons must have accessible labels. Controls remain above the route and stationary as the route wraps. Use numbered arrow tiles, selected-step highlighting and a visible current execution step. Keep the Run action close to the editor. Do not require a player to scroll away from the board to understand what a selected step does.

Clarify Remove behaviour: remove the selected instruction when one is selected, otherwise the last instruction. Use a matching accessible label. Clear empties the draft; accidental clearing should be undoable without resetting the challenge clock.

### 8.2 Execution and feedback

The server validates and evaluates the route, then publishes the submitted execution path with a run ID and authoritative start/end times. No future solution is published. Both phone and monitor render the same run progress.

Animate movement smoothly between cells, highlighting each corresponding instruction. Target roughly 180–250 ms per step, bounded by the four-second playback allocation. Prefer appropriately bounded route lengths over making long paths unreadably fast.

Stop at the first invalid move. Mark the attempted blocked cell/boundary and failed instruction. Give a concise explanation such as “Step 4 hits a wall.” Retain the draft and selection so the player can correct it.

Keep the goal recognisable when occupied by the robot. After a successful route, the robot visibly remains at the goal during feedback. Present the player's route first; an alternative shortest solution is secondary and must not replace their execution.

Reduced motion uses discrete cell and instruction highlights with the same result and timing. Background/resume restores the current authoritative position; it does not replay from the start or score again.

### 8.3 Difficulty

Increase meaningful route decisions, dead ends and planning requirements gradually. Do not use misleading controls, indistinguishable tiles or arbitrary visual illusions. Start with an immediately understandable route before introducing longer alternatives.

Validate reachability and optimum cost independently. A shortest-path requirement must be explicit if used; otherwise accept every valid route within the visible move budget and score efficiency transparently. A fallback maze must match the intended tier rather than becoming an empty trivial board.

### 8.4 Live Robot

All participants receive the same board and planning allowance. Routes stay private until everyone is locked or the deadline expires. Locking is one final submission; no private test runs against the actual Live board.

After closure, display shared execution on the monitor and the participant's own animated route on their phone. Assign a persistent number plus colour for the session. Colour is supplemental, never the only identity cue.

Group overlapping robots with a count on the monitor. Keep a stable legend/progress list where feasible; never imply that every individual marker remains visible inside a group. The phone always preserves the player's identity and execution. Robots do not collide with each other or affect one another's score.

## 9. Replacement game: Parcel Sorter

### Goal and interaction

Route visibly labelled parcels to matching depots. Use a small spatial conveyor board, one source and initially two depots. Match shapes or symbols as well as colours. Avoid Signal Switch's J1/J2 labels, numeric predicates and dropdown network reconstruction.

Players tap a junction's visible choice to set its routing rule, then press Run. Each junction must visibly show both possible outgoing directions and the parcels each choice sends that way. The first example demonstrates a parcel passing through one junction.

### Progression

Begin with one junction and two parcel types. Add a second decision, then a third type or a dependency between decisions. Cap the board so it remains understandable in one phone view. Do not introduce hidden timing, collisions or undisclosed routing rules.

A successful run delivers every displayed parcel to its matching depot. Animate each route, highlight the first wrong destination and retain junction choices for correction. Judge the actual outcome, not equality with one hidden solution. Use completion scoring; use efficiency only if there is a meaningful, independently proven route-cost distinction.

### Live

Use the same board and parcel set for everyone, private configuration and a single locked submission. Phones animate their own results. The monitor shows a clearly labelled shared example or selected participant execution plus aggregate delivery progress; do not misleadingly show one configuration as everyone's route.

The prototype passes only if beginners can infer where parcels travel after the short example and can operate the junctions without verbal coaching.

## 10. Replacement game: Pattern Painter

### Goal and interaction

Reproduce a small target pattern on a grid using a robot's movement and Paint instructions. Show target and current canvas together. Keep the starting position and movement convention explicit; initially use absolute directions consistent with Robot Rescue.

The first challenge uses movement and painting only. Painting marks the current cell; moving alone does not paint. Do not add a colour selector initially. Provide a numbered program, Run, step replacement and undo/clear consistent with Robot Rescue.

### Progression

Start on a small grid with a few target cells. Increase spatial planning gradually. Introduce Repeat only through a worked example; initially support a single clearly bounded repeated group with a small count, not nested loops or free-form code.

Animate each movement and paint action. After execution, distinguish correctly painted, missing and extra cells using symbols/borders as well as colour. Keep the submitted canvas visible so the player understands the mismatch.

Success means matching the complete target under explicit rules. A movement budget and any instruction-efficiency calculation must be visible and well defined. Introduce program-length scoring only after the solver proves the optimum under exactly the same instruction set; otherwise use completion without an invented efficiency penalty.

### Live

All players receive the same target and rules. Programs stay private until closure. Phones show personal execution; the monitor shows numbered miniature canvases in a stable layout, with an aggregate completed count. At 50 players, do not shrink boards until they are unreadable: use a stable featured group/overview and retain full detail on phones.

The prototype passes only if beginners understand the distinction between Move and Paint and can repair a mismatch after watching execution.

## 11. Live timing and spectator presentation

Use five coding rounds at 30 seconds each. Use three puzzle rounds at 30, 35 and 40 seconds as initial defaults. Retain the configurable lobby, three-second selection, three-second countdown and eight-second winner period. Add a common demonstration using a different sample before the countdown; include it in the duration estimate.

Coding reveals last four seconds. Puzzle execution is bounded to four seconds, followed by four seconds of feedback. Freeze timing configuration when a session opens. Host changes apply to subsequent Live sessions.

The monitor must clearly distinguish “Plan”, “Running” and “Result”. Do not reveal the selected game's name before wheel completion, and do not reveal correctness before membership/answer closure. Show answer progress as a count, without pressuring slower players through individual public failure labels.

Remove the large lobby code because the supported phone flow uses Join Live directly. Reintroduce a code only alongside an intentional, tested code-entry flow.

Keep automatic Live scheduling adjustable. A due event waits for the selected solo turn; after Live, resume the existing queue gracefully and serve waiting solo play before another Live event. Derive all closing-window estimates from the configured format.

## 12. Scoring and meaningful variety

Retain exact integer scores with normal two-decimal presentation on a 0.00–9.00 scale, genuine shared exact ties and published prize-boundary resolution. Millisecond precision must not be presented as proof of fairness.

Replace the nine-level weights with five-level maxima totalling 9.00. Initial proposed weights are **0.80, 1.20, 1.80, 2.30 and 2.90**. They preserve increasing reward for harder challenges and require representative balance review before a prize-bearing event.

Retain the correctness-first formula as the initial baseline: quizzes 80% correctness and up to 20% speed; puzzles 80% completion, up to 15% meaningful efficiency and 5% speed. When efficiency has no meaningful distinction, use 1. Successful puzzle elapsed time is accumulated active thinking through the successful run; playback is excluded. Wrong/timeout questions score zero. Live remains separately normalised to 1,000 points.

Freeze scoring, content and Ranked eligibility for an actual event. Bump the scoring/content version; never mix old nine-level scores with new five-level standings or personal records without identifying incompatible versions. No automatic allowance reset on a toggle or login.

Practice should teach transferable skills. The objective is to reduce exact-answer repetition, not stop students improving. Generate variation in decisions, layout, branches, initial state and solution structure within a controlled tier. Continue recent-challenge avoidance with bounded generation and validated fallbacks.

The prior 99% fingerprint target must not force large numbers or cosmetic permutations. Retain seed, validity and repeat-rate measurements, but report meaningful structural coverage separately. Small beginner domains may repeat; document that honestly. Reject unanswerable tasks, trivial fallbacks, equivalent answer choices and generators whose advertised difficulty is based only on randomness.

Measure random-answer outcomes, completion rates, medians, upper percentiles, reading time and score/time relationships by game and tier. Do not describe score bands as measures of intelligence. Review systematic cross-game differences before enabling replacements in Ranked.

## 13. Player interface

### Registration and sign-in

Keep Full name, BCU email, password, course and academic year. Academic year starts with a required “Select academic year” placeholder; no silent Foundation selection. Preserve password-manager support, visible field labels and Show password. Keep optional membership consent separate from access.

Returning players must find Sign in directly. Forgot password stays adjacent to sign-in. Preserve entered safe form fields after an error; never repopulate or expose passwords unnecessarily.

### Verification and reset

On the signed-in verification screen, show the destination email, delivery status, code entry, resend availability and next step. In a different browser, retain the registration-password confirmation rule and explain that verification does not automatically sign that browser in.

Do not expose the full account identity to an unauthenticated visitor merely possessing an invalid token. Any address hint on a valid-link screen must be appropriately limited. Link-opening GETs never verify or consume reset tokens. Successful confirmation gives a direct Return to Arcade/Sign in action.

### Ready and waiting

Use Join queue, Leave queue and Join again in user-facing text. Retain Practice/Ranked choice and remaining Ranked starts. Explain unavailable Ranked or closed admissions locally, using the actual reason.

Waiting shows the generated alias, number of people ahead and queue state. Give a broad estimated wait only when reliable. During Live, explain that the solo position is retained. Make the called-turn action unmistakable and time-bound.

### Active game

Use a focused layout: compact game identity, challenge progress, one timer, objective, board/code and controls. Remove persistent Play/Scores/Updates/Account navigation during active solving and execution. Leave a deliberate End session action with confirmation explaining Ranked consequences. Do not silently pause the clock while confirming an exit.

Keep critical controls and primary content usable on narrow phones and with enlarged text. Do not squeeze text to avoid all scrolling; prefer compact content and predictable bounded secondary regions. New high-score/prize/update notifications must not cover controls during a timed challenge; present them at the next safe transition.

### Results and updates

Show score, grade, clear outcome and Join again. For a personal best, prominently identify the game and improvement. Preserve first-score messaging without falsely claiming an improvement over a previous record.

Practice top ten retains game/date/status/grade and filtering. Keep recent Live results separate. Provide expandable per-challenge feedback after the session, including corrected code or the player's executed route where relevant. Reveal only completed challenges belonging to that participant.

Keep the up-to-date Ranked leaderboard and persistent prize card. Grand-prize celebration is dismissible, keyboard accessible and acknowledged once; it remains available in Scores. State email queued/sent/failed accurately. Updates retain an unread indicator and a simple reading flow.

## 14. Public monitors

### Join monitor

Keep QR dominant, stationary and reliably scannable. Show a short readable address, concise join instruction, current admission status and next Live information. When no Ranked scores exist, use a compact empty state rather than a large vacant table. Expand to the top-five standings naturally when scores exist.

The QR should not disappear to make room for scores. Public status must distinguish open, paused, outside hours and finalised. Reconnection must label standings as potentially outdated. Do not publish private participant details or development errors.

### Play monitor

Retain host-selectable idle text/wheel/both and continuous idle animation with a disable/reduced-motion path. Preserve the ten-sector presentation and independent uniform server draw among eligible games.

During play, prioritise the shared problem and visible execution. Use enough scale for actual viewing distance, not just a screenshot that fits 720p. Keep game/phase, relevant player alias, progress and one timer. Avoid repeating long instructions and internal phase names. During reveal, show the player's action/result clearly; during Live preserve answer secrecy until closure.

## 15. Host interface and operations

Keep four top-level areas: Live, Event, Players & Results, Updates. Use descriptive task language. Remove redundant “host · host” identity text. Public display links remain easy to find.

### Live operations

Every disabled primary action needs a nearby explanation when its reason is not obvious: missing opening window, paused admissions, active turn, insufficient closing time or empty queue. Offer a direct path to the relevant setting where appropriate. Server checks remain authoritative even when the button appears enabled.

Show readable states such as Waiting for player, Selecting game, Playing and Showing result. Distinguish the current challenge timer from any queue estimate. Keep Pause admissions distinct from stopping a game.

### Event settings

All settings edited in the form are drafts until saved. Show Unsaved changes, keep Save reachable, confirm success and preserve edits on recoverable failure. Warn before abandoning unsaved changes. An immediate operational action such as Pause admissions must be visually distinct from a draft setting.

Group settings by task: Opening hours, Live schedule, Ranked/eligibility, Display, Prizes and Data cleanup. Keep necessary descriptions beside the field. Prevent overlapping/invalid windows and show why a schedule cannot accommodate a session. Explain that Ranked availability depends on both the switch and opening policy.

### Results and sensitive actions

Search participants by name, alias, email or course. Make result limits/pagination explicit; do not silently hide participants beyond the first list page. Keep private details off public routes.

Export, cleanup and finalisation correction initiate their own password-confirmation dialog when required. On success, continue the pending action once, rechecking current permissions, lease, revision and business constraints. Cancel performs nothing. Never ask users to find a separate “Confirm host password” button first.

Use consistent in-app dialogs for destructive actions instead of browser prompts. Explain what changes and what remains recoverable. Preserve CSV formula escaping, audit records, one-time prize collection and email retry controls. Prize corrections must notify affected participants without duplicating unchanged awards.

## 16. Accessibility and visual consistency

Use clear hierarchy for titles, objectives, secondary metadata and actions. Use whitespace deliberately without forcing key controls below the fold. Preserve Poppins, local font loading, off-white surfaces, charcoal text, Tailwind v4 utilities and Python syntax tokens.

Success/failure and robot identity must not rely on colour alone. Ensure visible keyboard focus, useful accessible names, readable contrast, correct dialog focus/return and adequate touch targets. Test code selection and copy separately from wrapping. Avoid redundant status announcements every animation frame or timer tick.

Use motion to explain execution and state transitions. Honour reduced motion without removing the information conveyed by an animation. Idle decoration may be disabled; essential game outcomes remain visible. Avoid misleading visual traps and unexplained icon-only controls.

## 17. Engineering, startup and recovery

Use a shared phase model for introduction, countdown, editing/question, execution, feedback and result. Persist phase/run IDs, timing, accepted submissions and remaining allowance/run counts. UI animation interpolates server state; it never determines scores or progression.

Keep adapter generation, validation/evaluation, public projection and rendering separate. Centralise timing, level weights, release eligibility and scoring version so scheduling cannot drift from gameplay. Reject stale challenge/run/session IDs and duplicate submissions atomically.

Preserve exclusive host control during refresh, takeover, sleeping tabs and stale in-flight requests. A lost host lease does not stop accepted games. Preserve participant controller ownership and private information boundaries.

Fix resource cleanup on every startup failure, including schema rejection after acquiring SQLite ownership. Release only a lock owned by this process; never delete another live writer's lock. Close acquired database connections and advisory locks in failure paths.

The reset command must distinguish an active instance from a confirmed stale local lock. It may reclaim a provably stale lock under the ownership policy, or explain exactly how to resolve it; it must never remove an uncertain/live lock or reset production data. Errors must identify the selected storage mode and safe database path without printing credentials.

Check the supported Node version early with an actionable message. Document that an empty DATABASE_URL selects SQLite; it does not mean no database exists. Startup encountering an incompatible schema must fail cleanly with a new-database/reset explanation, without leaving a new blocker.

For crashes during execution, retain already committed results and avoid awarding twice. If safe resumption is possible, resume from persisted timestamps. Otherwise record a technical interruption, pause affected admissions and require an audited disposition. Never refund a Ranked start merely because a browser or server disconnected.

## 18. Acceptance and validation

### Automated correctness

- Test all new timing boundaries, exact-deadline rejection, independent 30-second allowances, five-level completion and score maxima.
- Test accepted success, collision, failed-run retry, exhausted runs, execution/feedback exclusion and frozen editing.
- Verify score-once and attempt-once under duplicate Run/Submit, reconnect, host takeover and server recovery.
- Execute generated Python independently; review Debug alternative fixes and duplicate distractors.
- Validate every puzzle's solvability, legal controls, reference cost and bounded fallback using an independent solver where applicable.
- Verify generation tiers and small-number/intermediate-result constraints; report meaningful structural coverage rather than only hashes.
- Ensure no future answers, seeds, private routes or early Live correctness reach client projections.
- Verify queue/Live bounds include introductions and maximum execution time; test cutoff and closing edge cases.
- Regress password reset, verification, exclusive host control, account eligibility, privacy, protected exports, notifications and prize correction.
- Reproduce failed startup and confirm owned-lock cleanup; prove reset cannot remove another process's lock.

### Browser and physical devices

Test 320/360/390 px phones and 720p/1080p monitors, plus actual viewing distance. Use real Android Chrome and iPhone Safari, not only resized desktop Chromium. Check background/resume mid-spin and mid-run, slow delivery, reconnect, enlarged text, keyboard use and reduced motion.

Tests must assert movement through intermediate cells and matching instruction highlighting, not just that Solved eventually appears. Confirm collisions, goal occupancy, editing stability, maintained drafts and individual Live execution. Check that long routes and snippets remain understandable.

Exercise complete 50-player Live sessions against the intended HTTPS deployment and database, including packet delay/loss and concurrent authentication. Record latency and lost/duplicate accepted submissions. Keep the existing p95 acknowledgement target below 500 ms as a measured target, not a promise established by local tests.

### Observed gameplay

Before calling a game launch-ready, observe at least five unfamiliar participants per candidate, including beginners. This is a practical small-sample gate, not statistical proof. Do not coach them through a failing interface.

Record whether they can explain the goal, identify controls after the sample, finish reading with useful solving time remaining, execute an action, explain a failure and make a meaningful correction. Note confusion, accidental exits, scrolling, perceived fairness and willingness to play again. Revise repeated failures and test again.

Compare beginners and experienced students across games and tiers before opening prize-bearing Ranked. Confirm that challenging later problems remain readable, that transferable learning helps and that no game systematically dominates because of its scoring or input burden.

### Release report

Report exactly what passed, which browsers/devices were tested, actual timing/load observations, any omitted replacement game and unresolved balance issues. Do not reuse v0.5.0 test counts as evidence for the changed release. Passing automation does not replace playtesting.

## 19. Implementation order and deliverables

1. Establish shared five-challenge timing/scoring configuration and update scheduling boundaries.
2. Restore Robot execution, failure explanation and phone/monitor synchronisation.
3. Rebuild coding content and feedback around small values and controlled concept tiers.
4. Remove Sort/Signal; build and test the replacement prototypes before integrating accepted games.
5. Apply all registration, verification, queue, focused gameplay, results, monitor and host UI requirements above.
6. Fix startup/lock cleanup and protect recovery across new phases.
7. Run correctness, device, load and observed-play acceptance; document limits and release eligibility.

Deliver the full updated repository ZIP when implementation is requested, with only relevant files changed, a complete v0.5.1 changelog entry, an appropriate commit message and accurate setup/validation documentation. Do not include secrets, live data, dependencies or generated build output in the source archive.
