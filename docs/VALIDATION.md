# v0.5.1 validation and release limits

Pre-launch source release, validated on 13 September 2026 with Node 24, local SQLite and desktop Chromium. Automation establishes implemented behaviour, not equal game difficulty or production readiness.

## Automated evidence

- `npm run check`: lint, 45 server/generator/HTTP/recovery tests and production build pass.
- Eleven Chromium browser tests cover host login/refresh/takeover, player registration and password reset, all five solo controllers, Live Robot privacy/execution, wheel motion/reduced motion, persistent prizes, settings draft cancellation and contextual export reauthentication.
- Robot regression checks assert intermediate cells on phone and monitor, matching instruction highlighting, completion after refreshing mid-run, retained collision drafts and the remaining run count. They do not merely wait for a Solved label.
- Layout checks use 320/360/390 px phone widths and a 1280×720 monitor. Solo question and result layouts are checked for monitor overflow; screenshots are inspected for visual hierarchy and clipping. These are desktop browser viewports, not actual phones or viewing-distance tests.
- Python independently executes 720 generated coding samples. Every sampled Debug fault changes observable behaviour; the intentional non-terminating loop is checked through its corrected program. This is not an exhaustive proof that no alternative semantic fix exists.
- All five generators are exercised across 10,000 deterministic seeds each. Separate Robot breadth-first search checks 1,000 shortest paths; independent Parcel traversal checks 1,000 solutions. Coding checks enforce small literals, bounded answers and four distinct answer choices. Painter tests cover legal solutions, expanded Repeat limits, nested-repeat rejection and failure frames.
- The HTTP/socket harness completes all five Live formats with 50 authenticated participants: **950 accepted answers and 250 final participant records**. Latest local p95 acknowledgement: **166 ms**. Other v0.5.1 runs measured 187–325 ms. Deadlines are enlarged and phases advanced deterministically for this correctness/load harness; it does not represent human-paced play or the hosted network.
- Tests cover exact-deadline rejection, five independent allowances, score maxima, three-run exhaustion, duplicate submissions, introduction expiry/readiness and unchanged Ranked allowance, prototype exclusion, private projections, account recovery, exclusive host ownership and finalisation.
- SQLite tests cover transaction rollback, competing writers, failed initialization, incompatible-schema startup, dead-PID reclamation, uncertain/live ownership refusal and reset refusing a live writer. Old schema/data remains intact after failed startup.

## Generator coverage

| Game | Unique fingerprints / 10,000 seeds | Coverage |
| --- | ---: | --- |
| Guess the Output | 211 | 12 concept families across five tiers |
| Debug Dash | 211 | 12 fault families across five tiers |
| Robot Rescue | 9,995 | Two board sizes; bounded reachable routes |
| Parcel Sorter | 196 | One- and two-decision-depth conveyors |
| Pattern Painter | 1,912 | Spatial move/paint targets; later bounded Repeat |

These figures deliberately replace the old 99% uniqueness target. Small beginner inputs repeat; cosmetic or numerical permutations are not evidence of novel reasoning. Recent-challenge avoidance is bounded and cannot guarantee no repetition in a finite domain. The candidate generators and new score weights need observation before any fairness claim. No score band measures intelligence.

## Catalogue acceptance

The default catalogue contains Debug Dash, Guess the Output and Robot Rescue. Parcel Sorter and Pattern Painter are integrated prototypes, disabled by default through `ENABLE_PROTOTYPE_GAMES=false`. Set it to true for a rehearsal and restart. Both remain excluded from Ranked regardless of that flag.

Neither replacement has passed observed beginner acceptance. Before including either at launch, observe at least five unfamiliar participants, including beginners: can they explain the goal, find controls, read with time left, execute a program, explain a failure and repair it without coaching? If a candidate fails, keep it disabled. Do not treat automated solution submission as this gate.

## Remaining deployment and gameplay gates

| Area | Required rehearsal |
| --- | --- |
| Physical devices/accessibility | Android Chrome and iPhone Safari, background/resume, slow delivery, reconnect, enlarged text, keyboard/focus and reduced motion. Check actual monitor viewing distance and 1080p presentation. |
| Hosted load | Repeat 50-player sessions over the intended HTTPS proxy and PostgreSQL, with latency/loss and concurrent registration. Record p95 and confirm no lost or duplicated accepted answers. Local p95 does not establish hosted capacity. |
| PostgreSQL/recovery | Exercise advisory ownership, database failures, backup restore and prize reconciliation on the intended provider/pooler. SQLite testing is not PostgreSQL validation. |
| Email | Deliver verification, reset, winner and correction messages to both BCU domains. Check spam folders, expiry, retry and failures. Only preview transport was used here. Sent means provider acceptance, not inbox delivery. |
| Game balance | Compare beginner/experienced completion rates, reading time, medians, upper percentiles and score/time relationships by tier and game. Freeze content/scoring before prize-bearing Ranked. The formula alone cannot equalise games. |
| Throughput | Rehearse conservative 282-second solo slots, Live interruptions, cutoff and closing policy with realistic queue traffic. Reduce challenge count only through a consistent pre-event release if throughput is unacceptable. |
| Security/operations | Rehearse origin/cookie/proxy behaviour, takeovers, technical voids, prize collection and cleanup; review dependencies and deployment security. No independent penetration test is claimed. |

The service remains a single-writer event aggregate. Expected event history size affects persistence and broadcast costs. Clients cannot claim latency refunds or extra thinking time using their own clocks. The release requires an explicitly selected clean v0.5.1 database; no automatic migration or data deletion occurs.

## Audit coverage

A01–A09: execution, clock/score changes, small coding inputs, removed old puzzles, gated replacements, examples, content tiers, corrected feedback and individual/group Live playback are implemented. Human clarity and balance remain gates above.

A10–A16: required academic-year selection, verification destination/status/resend, familiar queue labels and estimates, focused play, completed-challenge review, compact empty standings and direct Live joining are implemented.

A17–A20: local host blocking reasons, settings drafts/save/discard, contextual password confirmation, participant pagination and ownership-safe startup/reset are implemented.

A21: correctness and browser coverage is expanded. Physical-device, hosted and unfamiliar-player observations remain explicitly unperformed.
