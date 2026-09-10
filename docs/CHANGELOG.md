# Changelog

## 2027-09-10.1 - Modularise and Fix Some Bugs

### Findings addressed

| Priority | Finding                                                                                                    | Change                                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| High     | Answer keys and future levels were broadcast to every participant                                          | Central public-state projection strips private game fields                                                    |
| High     | Any joined player could send `GAME_FINISHED` and end the active round                                      | Removed client completion; engine owns completion and scores                                                  |
| High     | Gameplay actions could run during announcements or after the deadline                                      | Validate active membership, round state, completion, and deadline before dispatch                             |
| High     | New forms, spins, and queued players could overwrite the monitor's active phase                            | Protect active gameplay and results; queue selection exits when a group is active                             |
| High     | Reset left per-player wheels and outstanding callbacks alive                                               | Clear tracked timers and wheel maps; reset player defaults centrally                                          |
| Medium   | Single-player grouping could select up to four queued players                                              | Admit one for single-player; retain four-player multiplayer cap                                               |
| Medium   | Finishing one player's challenge dropped other participants' scores                                        | Collect the whole active group's scores before clearing state                                                 |
| Medium   | Last-player disconnect left an empty running group                                                         | Release the group and game timer; remove disconnected wheel/game data                                         |
| Medium   | Robot programs could grow without bounds or change while executing                                         | Cap at 100 commands, filter commands, and reject mid-run replacement                                          |
| Medium   | A generated false division comparison could have a nonexistent answer; numeric distractors could duplicate | Correct answer mapping, deduplicate options, randomize option order, and evaluate generated examples in tests |
| Medium   | Monitor and phone timers could diverge after Debug level changes                                           | One deadline-aware timer component; fixed whole-round deadline                                                |
| Medium   | Finished wheel reset visually to its starting angle                                                        | Render the final angle and use a cancellable browser animation with elapsed-time offset                       |
| Medium   | Host socket lived on `window`; action acknowledgements could leave controls busy forever                   | Hook-owned ref, connection checks, and five-second acknowledgement timeout                                    |
| Medium   | Reconnecting phones kept an incompatible old screen                                                        | Rejoin as a new player and return to the form                                                                 |
| Medium   | `npm start` always ran Vite middleware                                                                     | Separate production static serving, lazy development import, and graceful shutdown                            |
| Low      | Dead starter CSS constrained width, colours, headings, and code                                            | Remove starter styles and define a small arcade base stylesheet                                               |
| Low      | Dynamic Tailwind colour classes and incomplete robot labels                                                | Explicit utility mappings and shared command labels                                                           |
| Low      | Duplicate unused public game-event payloads                                                                | Use authoritative state snapshots; retain only the consumed finish notification                               |
| Low      | No-op leaderboard button and unsupported sound claim                                                       | Remove misleading controls/copy; sort live scores and show all round results                                  |
| Low      | Stale sessions and audio contexts had no complete cleanup                                                  | Expire unoccupied sessions and close audio contexts on unmount                                                |

### Structure and redundancy

- Feature folders separate host, phone, and monitor hooks from their views.
- Each mini-game has separate player and monitor components, challenge generation, and server event rules.
- Server session modules own wheel selection, lifecycle, timer tracking, player defaults, and public projections.
- Shared game metadata defines the wheel's outcomes and colours; registries make supported handlers/views explicit.
- One timer, game shell, scoreboard, socket factory, and command-label definition replace repeated implementations.
- Removed unused `App.css`, the Vite starter rule block, unused helpers/history state, duplicate README sections, fake leaderboard action, missing-favicon reference, and unused direct development dependencies.
- The delivery omits `node_modules`, `dist`, and embedded `.git`. Install from the lockfile and build locally. This is a clean source archive, not a Git-history export; no remote repository was changed.

### Behaviour intentionally retained

This is an in-memory, single-process local arcade. It does not use PostgreSQL despite the wider project's potential stack. Multiplayer is independent challenges with a first-finisher round ending, not a shared buzzer question. Debug/Guess have a 25-second total round; Robot has 35 seconds. No persistent cross-round leaderboard was implemented.

### Remaining engineering work

| Priority / context                | Limitation                                                                                                                    | Next step                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Before public hosting             | Anyone able to connect can create a host session; no accounts, rate limiting, or production origin allowlist                  | Add host authentication, authorization policy, request/event quotas, and deployment controls      |
| Before reliable unattended events | Host reconnect creates a new session; phone identity is socket-bound                                                          | Add resumable session/player tokens and host recovery                                             |
| Before persistent statistics      | Sessions, profiles, and scores disappear on restart                                                                           | Design a database model, retention policy, and persistent leaderboard                             |
| Game design decision              | Multiplayer uses different random challenges and first finisher ends everyone's round                                         | Decide whether to keep this or implement shared/fair challenge seeds and a shared buzzer          |
| Game content quality              | Debug prompts are drawn randomly rather than ordered by measured difficulty; the threshold example is pedagogically ambiguous | Curate explicit expected-behaviour challenges and difficulty tiers                                |
| Scale                             | Whole visible-state snapshots go to the room; empty sessions expire but connected idle sessions are unbounded                 | Add capacity/session limits and profile before introducing incremental updates                    |
| Device reliability                | Countdown/animation use local device time and browser audio permissions                                                       | Add clock-offset synchronization; test actual phones and audio gestures                           |
| UI robustness                     | Player actions optimistically advance screens without acknowledgements; screens have no React error boundary                  | Add acknowledged transitions and recoverable error states if this grows beyond a supervised stall |

### Verification

- `npm run lint`: no warnings or errors, enforced with `--deny-warnings`.
- `npm test`: 16 passing tests covering generated answer correctness, robot path validity, answer redaction, unknown games, queue limits, authorization, deadlines, concurrent arrivals, reset, wheel alignment, multiplayer scores/buzzers, robot execution, timer ownership, and a real Socket.IO onboarding/disconnect flow.
- `npm run build`: production assets compile successfully.
- Production process starts and serves the health endpoint and built HTML.
- Browser visual testing could not run: no browser binary was installed, and its download timed out. Physical phone/monitor layout, audio, and animation acceptance remain unverified; use the maintenance guide's checklist before the event.

No claim is made that this prototype is hardened for public deployment or that all gameplay/visual edge cases have been eliminated.
