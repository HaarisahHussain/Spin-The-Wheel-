# BCUSCA Welcome Week Arcade — v0.4.0 Specification

Date: 12 September 2026  
Status: Approved scope for implementation; timing and difficulty defaults require event playtesting.  
Baseline: v0.3 event specification, with the Python challenges and Robot Rescue changes recorded in v0.3.1.

This release specification adds and overrides the behaviours below. Account eligibility, verification controls, recovery, queue ownership, three started ranked attempts, best-score ranking, prize management, retention and staff permissions remain governed by the baseline. This document specifies work; it does not claim that v0.4.0 has been implemented or production-tested.

## 1. Design decisions and game theory

Use game theory to examine incentives, information and opportunities for manipulation. Use interaction design and playtesting to choose readable layouts and pacing. There is no claim that game theory proves an optimal animation duration or guarantees equal difficulty between games.

- Each eligible game has equal selection probability. Repeated wheel labels must not change those odds.
- Players cannot choose a ranked game, obtain a reroll through cancellation, or gain another ranked attempt through reconnection.
- Multiplayer correctness stays secret until submissions close. Answer distributions, correct-answer counts and early winners are also withheld.
- Submitting late must not confer a scoring benefit. Deliberately withholding a live answer can delay progression only until the fixed round deadline.
- Mandatory feedback must not consume a player's answering allowance. It also must not expose the next question early.
- Robot difficulty comes from planning, branches and limited programs, not hidden rules or visually indistinguishable walls.
- Equal selection odds are not proof of equal expected scores. Balance the Python games and Robot Rescue through development playtests. The host has a simple Ranked play On/Off switch; no calibration evidence is entered in the control panel.

Keep the 0.00–9.00 score display and existing grade boundaries. This release introduces no adaptive difficulty based on identity, previous rank or host preference.

## 2. Screen responsibilities

| Surface | Required content |
| --- | --- |
| QR monitor — `/display/join` | Stable QR and short join address; top-five ranked leaderboard; compact next-live countdown or event status. During a lobby, retain the QR and show Join Live availability. |
| Gameplay monitor — `/display/play` | Idle attraction; current and next player when relevant; selection wheel; game; prominent answer feedback; session result. During live play: lobby, wheel, countdown, shared questions, reveals and winners. |
| Phone | Registration/account, enqueue, waiting, controller/answers, personal feedback/results, leaderboard and Updates. |
| Host laptop — `/host` | Queue and session controls, event timing, live controls, idle-display settings, operational errors and existing account/prize tools. |

Do not place the ambient wheel on the QR monitor, host dashboard or phone. Do not rotate the QR away to show another page. During gameplay, the ranked leaderboard remains naturally visible on the QR monitor and accessible on phones; it must not displace the current question or robot board.

Public displays use generated aliases only. Host contact and account details remain private.

## 3. Ten-slot selection wheel

### Selection and visual layout

Every actual selection wheel contains exactly ten labelled sectors. Build the layout from the eligible game registry for the current mode. Solo uses all enabled solo games; live uses only live-capable games. Robot Rescue remains solo-only.

For N eligible games, choose the game uniformly on the server with probability 1/N. Then choose uniformly among the sectors labelled with that game. Persist the game, sector, layout and phase timestamps together. The frontend only animates the recorded result.

With three games, the labels necessarily split 4–3–3, but each game still has a one-third chance. With the current two live games, labels split 5–5 and each game has a one-half chance. Show the brief caption **Equal chance per game** during real selection, so the decorative sector counts do not misrepresent the rules.

Distribute labels as evenly as possible, avoiding adjacent identical labels, including across the circle boundary, when feasible. Randomly assign surplus sectors and layout orientation independently of game selection. Never apply a no-repeat rule to outcomes; consecutive selections of the same game remain valid.

The ten-sector design supports one to ten eligible games. Reject configurations with no eligible games. A future pool larger than ten requires an explicit selection-screen design change; do not silently exclude registered games.

### Behaviour

- Actual spin: 3 seconds with “Selecting game…” and no explicit winner label, including accessible labels. Reveal the selected game only when the server advances to countdown.
- Game countdown: 3 seconds after the wheel, shared by phone and monitor.
- No host or player reroll button.
- Refreshing, reconnecting or retrying a command restores the same selection and phase.
- Retain the baseline pending ranked game across pre-start cancellation. A ranked attempt is consumed atomically only on entry to actual gameplay, never during the wheel or countdown.
- Registry and timing settings are snapshotted for the session. Changes during a spin cannot alter its labels, odds or selected game.
- Reduced-motion clients show a neutral static wheel until the server advances to countdown; they cannot reveal or start the game early.

## 4. Multiplayer flow and scheduling

Flow: pending live event → finish active solo session and result → lobby → wheel → countdown → six question/reveal pairs → winners → solo queue resumes.

When a live event becomes due, mark it pending. Do not interrupt a solo game, answer-feedback phase or result. Do not call another solo player while that pending event is waiting to start. Keep the QR monitor's status honest: **Live after this turn**, rather than a negative countdown.

Open a 20-second lobby. Phones show Join Live and the participant count. Close membership atomically at its deadline, then select and reveal the live game through the wheel. Participants cannot join after seeing the selected game. A disconnected admitted participant remains in the roster and may reconnect to the same session; reconnecting never grants extra time or another answer.

If fewer than two players are admitted at lobby close, show **Not enough players** for 3 seconds and return to solo. Do not spin, award prizes or automatically run repeated lobbies. Maximum membership remains 50.

On successful lobby close, freeze the roster for answer counting. Each question has one immutable answer per player. Early completion happens only when every roster member has answered and at least 2 seconds of the question have elapsed; otherwise the deadline closes it. An absent player can hold the round open only until that deadline. A disconnect never removes a submitted answer or changes eligibility to submit twice.

While answers are open, show only the prompt, choices or code, countdown and total submissions. After an individual submits, their phone says **Answer locked**. Neither the phone nor the monitor reveals correctness until the common reveal phase.

At reveal, every phone shows its own outcome; the monitor shows the correct answer and optional final response distribution. Reveal lasts 3 seconds, including after question six. Then show the live winners for 8 seconds before returning to solo.

Live scores remain separate from ranked. Preserve equal per-correct-answer live points; do not add latency-sensitive speed bonuses or let answer speed decide prize eligibility. Apply the existing instant-prize tie policy transparently; no new arbitrary client-timestamp tie-breaker. All-zero results receive no prize.

### Cadence

Define the default five-minute interval as **five minutes of solo operation after a live event finishes or is cancelled**, before the next lobby becomes due. This intentionally avoids back-to-back live events and catch-up bursts. It is not a promise of a live game starting at every wall-clock multiple of five minutes.

The host may adjust this interval from 3 to 15 minutes or disable automatic events. Manual Open Live uses the same pending-session rules. Resume at least one waiting solo session between consecutive live events; if nobody is queued, this minimum does not block a host-requested live event.

Persist `nextLobbyAt`; derive countdowns from server time. When auto-live is off, show **Live games announced here** rather than a false countdown. A timing change explicitly recalculates the next scheduled lobby and shows its resulting time to the host. Delay Live adds 60 seconds by default.

Admissions must be open to start a new lobby. Do not start one that cannot fit its maximum duration and a 10-second buffer before the configured event end. An already-admitted lobby may finish after admission cutoff if it still fits before event end. Never cut off an active solo session to squeeze in a live event. At event closure, suppress additional scheduling.

## 5. Solo answer feedback

Debug Dash and Guess the Output use an explicit server-owned cycle:

`question → feedback → next question`, followed after the last answer by `feedback → result`.

On an accepted submission, validate the challenge ID, eligibility and deadline, lock the answer, calculate points once, and persist the selected and correct answers for that completed question. Duplicate requests return the recorded outcome without awarding points twice.

Both phone and gameplay monitor enter feedback together. The main monitor must show the player's submitted answer, not merely a generic score increment.

### Presentation

- Correct: prominent check symbol, **Correct**, and points earned.
- Incorrect: prominent cross symbol, **Incorrect**, the player's selection and the correct answer.
- Debug Dash: highlight the correct logical line; mark a different selected line as incorrect. Show **Correct line: N** prominently.
- Guess the Output: mark the selected choice and clearly identify the correct choice. If they are the same, use one correct treatment.
- Keep enough of the original question visible to make the explanation meaningful. Never cover the correct line with an overlay.
- Do not rely on colour alone. Use symbols and text; audio is optional and never required.
- Feedback automatically ends after 3 seconds. No player-controlled Continue button during scored play.
- Do not send the next question, its answer, or its choices before its question phase begins.

When the answering budget expires without a submission, close that question, show **Time up** with its answer for 3 seconds, then show the session result. Unseen questions are not revealed or scored. A last-moment accepted answer still receives its full feedback interval.

## 6. Timing model and defaults

These are deliberate starting values, not empirically established universal optima.

| Phase or interaction | Default | Rule |
| --- | --- | --- |
| Called player's Ready window | 20 seconds | Existing no-show handling applies. |
| Actual solo/live wheel | 3 seconds | Outside scored time. |
| Game countdown | 3 seconds | Outside scored time; questions hidden. |
| Solo coding games | 75 seconds total answering time | Up to nine questions; feedback excluded. |
| Solo question feedback | 3 seconds | Same length for correct, incorrect and timeout. |
| Robot Rescue | 100 seconds elapsed game time | Planning, execution and retries all count. |
| Robot movement | 250 ms per cell | Stable server schedule; no speed control. |
| Robot failure feedback | Immediate, persistent until edit/new run | No additional forced wait or clock pause. |
| Solo session result | 6 seconds | Phone can retain its result afterwards. |
| Live lobby | 20 seconds | Capacity 2–50. |
| Live question limits | 15, 15, 20, 20, 25, 25 seconds | Six progressively harder rounds. |
| Earliest live reveal | 2 seconds after question opens | Only if everyone has submitted. |
| Live answer reveal | 3 seconds | Every round, including the last. |
| Live winners | 8 seconds | Then resume solo. |
| Insufficient-player announcement | 3 seconds | Then resume solo. |
| Automatic live interval | 300 seconds | Counted from previous live completion/cancellation. |
| Idle attraction motion | Continuous, 24 seconds per rotation | Disabled by host toggle or reduced motion. |
| Ordinary UI transitions | 150–200 ms | Never delay input acceptance. |

### Correct handling of the coding clock

Persist the remaining answering budget and question/feedback phase timestamps. At submission, subtract server-measured answering time once. Freeze the remaining budget throughout feedback. On the next question's activation, set a new deadline from the remaining budget and reset the question's speed-bonus origin.

Do not merely add three seconds to a continuously running global deadline: retries, reconnections and scheduler delays must not repeatedly extend it. The frontend animation completion event has no authority over phase advancement or scoring. Backgrounding a phone does not pause a question.

Persist phase transitions and use a monotonic revision/phase identifier for client updates. If the service cannot advance or publish a phase correctly, expose a recovery condition rather than silently charging unseen question time. A server restart follows the existing interruption/technical-void policy; do not reconstruct an active game from browser state.

Nine coding feedback periods add at most 27 seconds to the 75-second answering allowance: a coding session takes at most 102 seconds before its result. Robot remains 100 seconds. Including a 20-second Ready window, wheel, countdown and result, a normal solo slot is at most 134 seconds; budget 145 seconds operationally. Queue admission estimates must use these phase-aware bounds, plus pending live time and the existing end-of-event safety margin.

A full live event takes at most 172 seconds: 20 lobby + 3 wheel + 3 countdown + 120 answering + 18 reveals + 8 winners. The five-minute solo interval therefore avoids spending most stall time in multiplayer.

### Host settings and competitive consistency

Idle presentation, motion and automatic-live cadence may change immediately when appropriate. Lobby/reveal/result timing changes apply to the next session only. Expose sensible bounded live lobby settings (15–45 seconds) and live round time scaling (0.75–1.5× the profile), applied identically to all players.

Ranked answering budgets, feedback duration, question banks, scoring rules and robot movement/budget profiles form a versioned competitive configuration. Lock them for a ranked event after its first started attempt. A substantive change requires a new scoring version and separately managed competition; never mix old and new scores silently. Host traffic controls must not secretly make one ranked participant's session easier.

## 7. Idle attraction

Host setting `idlePresentation`: **Text only / Wheel only / Both**. Default: **Both**. A separate **Animate idle wheel** toggle defaults on; it has no effect on actual game-selection odds or phases.

While idle, continuously rotate the decorative ten-sector wheel once every 24 seconds. Use elapsed server time, not an animation-start event. Socket updates must not restart it. Actual selection uses a finite three-second animation with a persisted outcome and deadline; a resumed phone refreshes state and catches up rather than replaying the selection.

Reduced-motion preference and the host's disable switch suppress this idle motion. Wheel-only still retains essential status and accessible screen identity; it only removes the large Ready to Play heading. The idle wheel has no winning pointer/result, does not select a game and never consumes an attempt. Called-player, live and gameplay states take priority and end the attraction immediately.

## 8. Python code layout

Use the same Python code component on phones, the gameplay display, solo questions, live questions and feedback. Retain Prism tokenisation and the existing light VS Code-like palette, Poppins interface font and monospace code font.

Use visual soft wrapping only. Preserve the source text, indentation and zero-based answer index. One logical line has one displayed line number and, in Debug Dash, one answer target even if it occupies multiple visual rows. Clicking any continuation selects the original line. Copying code must reproduce the original source without added newlines or indentation.

Continuation rows receive a subtle continuation indicator or hanging offset distinct from source indentation. Token spans must allow wrapping within long strings/identifiers without changing the copied source. Do not turn Python indentation into decorative padding that obscures meaning.

Remove horizontal scroll as the normal way to read a snippet. Use responsive widths, full literal Tailwind utility classes and a content budget. Start authoring at approximately 55 characters per logical line and at most 10 nonblank lines for a live/solo question, with review exceptions only after viewport checks. Prefer rewriting an overlong question over shrinking text to illegibility.

At ordinary phone dimensions, keep Submit reachable and avoid nested scrolling for code. Whole-page vertical scrolling remains available for small screens, landscape and zoom. On the gameplay monitor, the full prompt/code/choices or reveal must fit at 1280×720 and 1920×1080 without a scrollbar. Do not claim that soft wrapping alone guarantees this.

## 9. Robot Rescue controller stability

Required vertical order:

1. Board and existing session status/timer.
2. Six controls in two rows: Clear / Up / Remove, then Left / Down / Right. Remove deletes the selected move, or the last move when nothing is selected.
3. Full-width Run/Stop button.
4. Selected-move editing status and move count.
5. Program sequence in a fixed-height region (approximately 112 px on phones).
6. Persistent, compact failure feedback.

Reserve room for optional editing/feedback text so it does not shift controls. The program region wraps moves and scrolls vertically only when its fixed region is full. Adding/replacing moves must not scroll the whole page or move a button under a finger. Scroll a newly appended move into that region's view; do not drag the user's scroll position back to execution while they are inspecting it. Keep sequence chips operable by touch and keyboard.

Retain complete-program execution from v0.3.1: each Run starts at the starting square; Stop or failure returns there; preserve the submitted sequence for editing and refresh recovery. No partial route progress survives a retry. Movement limits remain server-enforced. The interface shows the limit before submission.

Preserve the nine-board reward profile (0.50 each for boards 1–3, 1.00 for 4–6, 1.50 for 7–9), route-efficiency scoring and 5×5/7×7 difficulty tiers pending calibration. Do not further nerf scores just to compensate for UI friction. Keep walls unmistakable; misleading routes are valid visible branches, not false graphics.

## 10. State, architecture and recovery

- Share one wheel renderer with separate idle and actual-selection modes. Separate registry-derived sector layout from authoritative random selection.
- Introduce shared answer-feedback presentation, with game-specific line/choice details. Do not duplicate timing logic in React components.
- Persist solo question/feedback phases and live lobby/wheel/countdown/question/reveal/winner phases, their timestamps, scoring version and frozen session settings.
- Bind every answer/program command to the session/attempt, challenge and valid phase. Idempotency must include transitions and scoring, not only HTTP retry handling.
- Public projections reveal only the active question and, during reveal, its completed answer. Never expose future answers, private participant details or hidden correctness through intermediate scores.
- Reconnecting clients receive the authoritative current phase, remaining time, locked selection and permitted reveal. Ignore older revisions. They do not restart the wheel or countdown.
- Deploy between sessions. Detect old Robot board schemas missing size/start/maxMoves; recover or close the incompatible session explicitly rather than displaying a blank grid or guessing new rules.
- Keep the one-active-server constraint until proper multi-process scheduling ownership exists. SQLite development and production databases remain separate.
- Use Tailwind CSS v4 utilities only, shared class maps, React Icons where meaningful, off-white surfaces and charcoal text. No neon, gradients, custom component CSS or gratuitous icons.

## 11. Acceptance and release gates

### Fairness and state tests

- Exactly ten sectors for every supported eligible pool; every eligible game represented. Solo-only adapters never enter live selection.
- Deterministic selection tests prove the random game draw is independent of slot multiplicity; supplementary sampling checks detect gross bias without treating sample equality as proof.
- Retry, cancellation and reconnect cannot change a persisted ranked game or consume another attempt before actual start.
- No private correctness, answers or answer distributions reach any participant before live reveal, including through reconnect payloads and running scores.
- Only one answer and one points award per player/question. Submissions at or after deadline are rejected; feedback commands cannot reopen questions.
- All-question and timeout paths obey the 75-second answering allowance, fixed feedback durations and final reveal before result.
- Duplicate callbacks, settings changes and reconnects cannot extend answering time or restart transitions.
- A missing live participant cannot hold a round beyond its deadline; fewer than two admitted players cancels cleanly.
- Event cutoff, end time, pending live and minimum solo-between-live rules work together without starvation or catch-up loops.

### Visual and interaction tests

- Phones: 320, 360 and 390 px widths, plus short landscape; browser zoom and reduced motion. Displays: 1280×720 and 1920×1080.
- Long Python lines wrap without losing indentation, line identity, token highlighting or correct copying. No hidden horizontally clipped answer text.
- Monitor and phone show the same accepted answer and outcome. Debug feedback is legible from stall viewing distance.
- Add a second and third row of robot moves: direction/Run/Stop control coordinates must remain unchanged. Replacement, deletion, clear and keyboard focus work.
- QR and leaderboard remain readable during attraction, real spins and live rounds.
- Restart and schema-version mismatches show recoverable state instead of empty boards.

### Human playtest

Before ranked release, use a mixed cohort including freshers, students without Python experience and experienced students. Target at least 20 completed sessions per game for an initial pilot, balanced across familiarity groups; this is a practical pilot, not statistical proof. Record score distribution, answering/planning time, completion, retries, misunderstood feedback and host interventions without introducing unnecessary personal data.

Compare medians and upper score quantiles by game and familiarity group. Investigate material differences before enabling ranked; changing wheel probabilities is not a substitute for balancing the games. Check whether novices understand failures and can correct programs. Validate end-to-end live behaviour with 2 players and a representative high-concurrency trial up to 50, including slow/disconnected phones.

Verify host/phone/monitor flows, real delivery/connectivity, timing bounds and migration before opening. Ranked is switched on in Event settings and saved. No calibration form or evidence gate exists. Switching Ranked never resets attempts; previous scoring versions remain excluded from standings.

## 12. Supporting accessibility guidance

The following sources support presentation requirements, not the specific game durations or a claim of complete WCAG conformance:

- Brief or controllable ambient motion: [W3C — Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).
- Wrapping and responsive reading: [W3C — Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).
- Correctness conveyed by symbols/text as well as colour: [W3C — Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).


## 13. Beginner Debug Dash wording

State the intended behaviour in plain language and end every prompt with “Which line needs changing?”. Explain unfamiliar terms in context. Keep a clearly intended faulty line and test generated values so the displayed program actually differs from the required behaviour. Preserve the Python source and logical line answer indices.
