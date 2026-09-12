# Changelog

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
