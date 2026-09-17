# v1.3.0 validation

Checked on 16 September 2026: all 63 backend/content/HTTP/load/recovery tests pass, lint and production build pass, and all 17 Chromium browser tests pass.

New coverage verifies indefinite solo/Live instructions, null-deadline scheduler behaviour, explicit player and host starts, rejection of stale/duplicate/unauthorised starts, all-player Live readiness and host override. Browser checks cover all five instruction pages at 720p and phone width, player starts, host starts and existing gameplay/audio regressions. Instruction and wheel screenshots were visually inspected.

The persistence test upgrades and reopens a populated v1.1-format SQLite database and compares account, session, score, history, update and audit records. It checks that the original private snapshot is retained once, not overwritten on restart, and removed during explicit cleanup. Unsupported formats are rejected without deleting records. Production PostgreSQL statements use the existing transaction path; a hosted PostgreSQL upgrade was not executed here. Take a provider backup before deployment.

No game rules, score values or active-question allowances changed. Instruction wait time is deliberately unlimited, so queue and closing estimates cannot guarantee an exact finishing time. Physical phones, event speakers and venue connectivity retain the deployment limits below.

# v1.2.0 validation

Checked on 15 September 2026. Lint and production build pass. Three new audio tests verify wheel timing, cue deduplication, correct/incorrect solo and Live results, zero-score endings and countdowns.

The browser regression run passed 13 existing cases and caught a 720p overflow after adding the sound control. Display spacing was corrected; the affected monitor-layout test and new audio test then both passed. These cover all 15 browser cases across the initial and targeted runs. The new test exercises a real browser AudioContext, explicit opt-in, wheel clicks, successful-level audio, immediate mute, quiet reload and a silent Join display. The enlarged wheel screenshot was visually inspected.

Audio quality and speaker loudness still need a brief check on the event hardware. Desktop automation verifies audio scheduling, not subjective sound quality. No backend/game rules or database format changed; the previous backend evidence follows.

# v1.1.0 validation and release limits

Checked locally on 14 September 2026 using Node, Python, SQLite and Chromium. Automated checks establish implemented behaviour, not equal game difficulty or hosted capacity.

## Release checks

- `npm run check` passed: lint, 57 backend/content/HTTP/recovery/load tests and the production build.
- All 14 Chromium browser tests passed against the rebuilt client. The host results screen was visually inspected.
- Guest coverage checks automatic entry, browser session reuse, case-insensitive username uniqueness, private optional names, unlimited re-enqueueing and ownership independent of a public username.
- Shared scoring checks best-session standings across solo and Live, private history, exact nine-point session maxima and zero credit after the deadline.
- Upgrade checks preserve account ownership and solo scores, convert legacy Live scores once, remove obsolete identity/prize data and reject upgrades during active games.
- Host password authentication, exclusive control, takeover, contextual reauthentication, private review access, origin checks, command limits and persistence remain covered.
- Browser checks exercise all five solo controllers, Live Robot privacy, movement playback, wheel behaviour, narrow layouts, settings, paginated results, information pages and the simplified guest/account screens.

## Content and load coverage

- 10,000 seeded selections per game check legal reference solutions, determinism, bounded inputs and variety. Independent Python executes 1,200 coding samples.
- Independent solvers verify all 2,560 prepared Robot optima, all 2,560 Parcel puzzles and all 320 Painter optima. Normal gameplay selects prepared puzzles; heavy solvers run only during content generation.
- The HTTP/socket harness completes all five Live formats with 50 players, 950 accepted answers and 250 final participant records. It advances phases deterministically and is not a real-time hosted capacity guarantee.
- A populated local load fixture exercises 500 accounts and 153 Socket.IO connections, including 50 active players, concurrent guest creation and the running scheduler. Idle-state checks verify no unnecessary database commits or state patches.
- Recovery checks preserve earned scores, reject stale inputs and protect question time during service stalls. Tests also cover bounded work queues, expired work, duplicate commands, changed-record persistence and rollback.

## Practical limits

Game mechanics and content banks are unchanged in this release. Live scoring now uses the same nine-point session scale and tier weighting as solo. This does not prove equal difficulty between games or formats; observe real completion rates and score distributions before adjusting balance. Finite content banks can repeat.

Historical Live results are converted proportionally from their former scale. Their original rounds cannot be retrospectively reweighted, so they are not identical to newly scored sessions. Existing solo scores are retained.

Physical Android/iPhone testing, venue Wi-Fi, the intended HTTPS proxy, hosted PostgreSQL/pooler and backup/restore still need an operational rehearsal. Local SQLite and desktop browser automation do not validate those environments. No live user database or email account was accessed.

The platform remains a single-writer event application with a committed memory cache and persisted records. Keep the receipt key stable across restarts. Finish active games and back up the database before upgrading. The organiser should review the published information and cleanup schedule for the actual event.
