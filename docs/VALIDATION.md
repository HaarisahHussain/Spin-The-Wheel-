# v0.6.0 validation and release limits

Pre-launch source release, checked on 13 September 2026 with Node 24, Python 3, local SQLite and Chromium. Automation establishes implemented behaviour; it does not establish equal difficulty or production readiness.

## Automated evidence

- `npm run check`: lint, **53 server/content/HTTP/recovery tests**, and the production build pass.
- 10,000 seeded selections per game verify legal reference solutions, determinism, bounded inputs and content variety. Coding uses thirty tier/family combinations per task and at most ten logical lines with ordinary literals no larger than ten.
- Independent Python executes 1,200 coding samples. Each Debug reference changes observable output, and replacing exactly the selected statement restores the reference output. This is not an exhaustive proof against all compensating edits; the stated algorithm constrains the intended diagnosis.
- Independent state-aware breadth-first search verifies all 2,560 prepared Robot optima. Independent first-match routing checks every permutation for all 2,560 Parcel puzzles. A separately implemented exact-grammar search verifies all 320 Painter optima, including the single-Repeat and 18-action bounds.
- 150 annotated fixtures cover six examples per game per tier. They contain goals, mistakes, reference solutions and validation status. They are representative authored-family/seed fixtures, not a claim of 150 human-observed playtests.
- Tests check retry multiplication and final rounding, all three successful-run positions, invalid/duplicate rejection, item reset, repeat source/body/iteration events, idempotent painting, malformed/nested/excessive payloads and public projection secrecy.
- Existing account, queue, Ranked allowance, exclusive host, recovery and prize regressions remain. The HTTP/socket harness completes all five Live formats with 50 authenticated players, **950 accepted answers and 250 final participant records**. Latest local p95 acknowledgement was **837 ms**; this is a shared test environment and not a hosted capacity guarantee. Deadlines are enlarged and phases advanced deterministically in the harness.
- Browser coverage includes host/player authentication, takeover, password reset, all solo controls, Live Robot privacy, movement on both screens, refresh during playback, failed-draft repair, repeat construction/repair, wheel reduced motion, prizes, settings and contextual reauthentication. Narrow phone widths are 320/360/390 px; monitor checks cover 1280×720 and 1920×1080 questions/results. The full 13-test browser suite passed; focused controller/monitor checks were repeated after the final presentation adjustments.

## Content inventory and variety

| Game | Prepared inventory | Unique fingerprints / 10,000 seeded selections |
| --- | --- | ---: |
| Guess the Output | Runtime bounded AST families | 3,746 |
| Debug Dash | Runtime bounded AST families | 3,746 |
| Robot Rescue | 512 per tier; 2,560 total | 2,507 |
| Parcel Sorter | 512 per tier; 2,560 total | 2,507 |
| Pattern Painter | 64 per tier; 320 total | 313 |

Fingerprints distinguish playable content, not guaranteed distinct reasoning. Smaller beginner families repeat more often. Recent avoidance is bounded for both account and Live histories; permanent novelty is impossible in these finite banks. Numerical variation alone cannot prevent memorisation. The change prioritises interactions and dependencies rather than an arbitrary uniqueness percentage.

Heavy solvers run only through `npm run content:build`. Normal game creation selects a prepared puzzle and evaluates only bounded submitted work. The bank remains server-side and is absent from the browser bundle. No dependency additions were required.

## Required human and deployment gates

- Observe at least five unfamiliar people per game, including beginners. Check independent understanding, reading time, control discovery, explaining failure and repairing a program. Record completion by tier and device. None of these observations has been performed here.
- Compare beginner/experienced score and completion distributions across the three Ranked games. A shared formula cannot prove equal difficulty. Freeze content, timing and scoring version before prize-bearing play.
- Parcel Sorter and Pattern Painter remain disabled by default and excluded from Ranked even with `ENABLE_PROTOTYPE_GAMES=true`. Enable them only for rehearsal until beginner acceptance succeeds.
- Test actual Android Chrome and iPhone Safari, background/resume, enlarged text, reduced motion, network interruptions and monitor viewing distance. Desktop viewport automation is not physical-phone testing.
- Rehearse the intended HTTPS proxy, PostgreSQL/pooler, 50-player traffic, concurrent registrations, backup/restore and prize reconciliation. Local SQLite does not validate hosted persistence or latency.
- Check real verification/reset/winner mail delivery to both BCU domains, including spam handling. Only preview transport was exercised.

The application remains a single-writer event aggregate with full snapshots; large histories and broadcasts are scaling constraints. This release requires an explicitly selected fresh schema-7 database. Failed startup preserves earlier data and releases only owned resources.
