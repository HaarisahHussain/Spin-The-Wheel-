# Changelog

## 0.7.0 — 2026-09-14

- Replaced repeated whole-event database reads/writes with a committed memory cache and atomic updates to changed records; added a preserving upgrade from v0.6.0 schema 7.
- Replaced full recurring screen snapshots with lean initial views and changed-field updates. Added server pagination for participants, results, prizes and standings, with individual reviews loaded on demand.
- Removed duplicate completed-question history, bounded command receipts, excluded heartbeats/errors/exports from receipt storage, and removed expired or delivered email payloads.
- Added transaction queue limits, database/password deadlines, traffic limits, source-scoped failed host-login throttling and validation before password hashing.
- Added polling fallback and non-overlapping, timed host heartbeats; retained server-authoritative gameplay, scoring, timers and Robot playback.
- Added production/development configuration guards, required production SMTP configuration and bounded concurrent TLS mail delivery.
- Fixed expired verification queue holds and repeat Live winners reserving prizes they cannot collect.
- Added persistence, security, pagination and populated-event load regressions; retained the existing game and browser coverage. See validation for deployment limits.

## 0.6.0 — 2026-09-13

- Redesigned minigames around programmatic thinking: small-input state tracing, explicit Debug goals, dependency routes, first-match rules and repeated painting.
- Added thirty authored tier/family combinations per coding task, independently executed Python references and one-statement repair checks.
- Rebuilt Robot Rescue with required items, numbered keys/gates and progressively tighter legal route budgets; retained moving robots and added collected-state playback.
- Replaced Parcel conveyor toggles with reorderable rules and acceptance of every valid order; removed solution clues from rule IDs and storage order.
- Added editable Painter Repeat blocks, separate visible-tile/executed-action budgets, exact-grammar efficiency scoring and source/body/iteration highlights.
- Applied 100%/90%/80% solo puzzle success multipliers, with no extra run charged for invalid or duplicate input; retained independent thinking clocks and one-lock Live play.
- Added offline verified puzzle banks, 150 annotated examples, Live recent-challenge avoidance, independent puzzle solvers and broader phone/monitor regressions.
- Removed superseded puzzle generators and updated game-extension/setup documentation. Requires a clean schema-7 pre-launch database; startup never deletes earlier data.
- Preserved platform flows and the default three-game pool. Parcel and Painter remain opt-in, unranked prototypes pending unfamiliar-player testing; cross-game balance remains a rehearsal gate.

## 0.5.1 — 2026-09-13

- Replaced the shared 90-second budget with five 30-second challenges, reweighted scores and matching queue/Live duration bounds.
- Added first-encounter examples, explicit readiness before a Ranked start, replayable phone help and retained selections after introduction expiry.
- Restored server-timed Robot movement on phones and monitors, step/collision feedback, editable failed routes, Undo and three bounded solo puzzle runs without charging playback time.
- Rebuilt Python questions around small values, concept tiers, meaningful distractors and corrected-statement feedback; fixed index faults hidden by duplicate list values.
- Removed Sort the Stream and Signal Switch. Added Parcel Sorter and Pattern Painter prototypes behind an opt-in rehearsal flag; both remain outside Ranked pending beginner acceptance.
- Added individual Live puzzle playback, grouped Robot markers and readable featured puzzle results; removed the unused lobby code.
- Simplified phone navigation during play, registration year selection, verification/resend status, queue language and estimates, completed-challenge review and empty public standings.
- Added settings draft/save feedback, discard confirmations, descriptive host states, participant pagination and password confirmation within protected actions.
- Fixed startup/schema failure cleanup and ownership-safe local reset; earlier event data requires an explicitly selected clean database and is never deleted on startup.
- Expanded Python, independent solver, phase-boundary, lock-recovery, 50-player HTTP/socket and browser checks. Real-device, hosted-load, email and beginner/balance rehearsals remain launch gates; see Validation.

## 0.5.0 — 2026-09-12

- Replaced player recovery secrets with email/password sign-in, verification links/codes and expiring, single-use password reset links.
- Replaced named staff/MFA accounts with one environment-configured host, explicit takeover, expiring control leases and protected sensitive actions.
- Added seeded Python questions across twelve families per coding game, procedural Robot mazes, Sort the Stream and Signal Switch; new games begin in Practice and Live.
- Enabled Live play for all five games, including private puzzle planning and shared Robot execution with numbered coloured markers.
- Reworked solo scoring around correctness, puzzle efficiency and server-measured response time, a 90-second answering budget and increasingly valuable levels.
- Added personal Practice top ten and high-score feedback, recent Live results, unread Updates, persistent winner screens and prize email status.
- Added private participant results and protected CSV export; strengthened finalisation corrections, email retries, retention cleanup and persistence ownership.
- Added deterministic generation, Python execution, authentication, takeover, scoring, 50-player HTTP/socket and browser checks. Requires a clean pre-launch database; physical-device, hosted-load, SMTP and representative balance validation remain launch gates.

## 0.4.0 — 2026-09-12

- Added fair ten-slot selection wheels for solo and multiplayer, with the selected game revealed only after spinning and before a shared countdown.
- Replaced wheel animation startup with server-time-based rendering and phone resume recovery; idle wheels now spin continuously with host and reduced-motion controls.
- Added prominent, synchronized coding answer feedback on phones and the gameplay monitor; multiplayer answers stay private until submissions close.
- Paused solo coding answering budgets during three-second feedback periods, including the final answer reveal.
- Added adjustable multiplayer pacing, deferred lobbies, end-window checks and five-minute solo intervals after live events.
- Added Text only / Wheel only / Both idle presentation and wrapped Python snippets while preserving indentation, copying and answer-line selection.
- Arranged Robot Rescue controls in a compact keyboard layout above a bounded, editable sequence; retained retry programs and stabilized movement scheduling.
- Replaced the calibration workflow with a saved Ranked play switch, preserving attempt limits and scoring-version isolation.
- Clarified beginner Debug Dash prompts, removed obsolete JavaScript questions and prevented a doubling question from accidentally having no bug.
- Added upgrade and service-stall recovery, regression coverage and updated release and operating documentation.

## 0.3.1 - 2026-09-12

- Replaced JavaScript challenges with Python in Debug Dash and Guess the Output, including Live Sessions.
- Added Python syntax highlighting.
- Expanded Robot Rescue to nine boards, introducing 7x7 mazes, misleading branches and routes that initially move away from the goal.
- Reduced early-board rewards and added progressively tighter movement limits.
- Made every robot run restart from its starting position; failed and stopped programs remain available for editing.
- Added individual move replacement, deletion and program clearing.
- Separated robot controls and maze generation into dedicated modules.
- Updated the scoring version and board validation tests. Cross-game difficulty remains subject to representative playtesting.

## 0.3.0 — 2026-09-11

- Replaced the earlier room-based prototype with persistent event accounts, one solo queue and independent public display routes.
- Added BCU-only eligibility, configurable email verification, recovery codes, scoped spare controllers and staff MFA.
- Added three-start Ranked allowance, retained random game selection, best-score standings, technical voids and one-time prize collection.
- Added timed 2–50-player Live sessions for Debug Dash and Guess the Output; kept Robot Rescue solo-only.
- Added adjustable opening windows, Live timings, Updates, finalisation and attendance cleanup.
- Rebuilt the interface with Poppins, Tailwind v4 utilities, light surfaces, React Icons and syntax-highlighted code.
- Separated authentication, player/host commands, scheduling, persistence, public projections, game adapters and host tabs.
- Added backend, HTTP/socket and browser checks. Ranked remains gated pending representative calibration; see validation limits.
