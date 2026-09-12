# v0.4.0 validation and release limits

This is an implemented source release for configuration and rehearsal. It has not been deployed to a real Welcome Week event and is not certified production-ready.

## Automated evidence

Validated on 12 September 2026: **41 backend/integration tests and 11 Chromium browser tests passed**. Lint passed and the production client built successfully. Browser checks used the bundled Chromium fallback. No new dependency audit or production deployment is claimed for this release.

- Retained account/verification, recovery, ranked limits, idempotency, queue, prize and SQLite persistence checks.
- Added deterministic wheel-selection tests for 1–10 games, circular layout and retained outcomes; slot multiplicity cannot affect the game draw.
- Added solo feedback timing, timeout/final-answer reveal, score-once and future-answer privacy checks.
- Added lobby/wheel/countdown ordering, frozen membership, 50-member engine rounds including disconnects, reveal privacy, timing snapshots, scheduling/end-window bounds and zero-score prize handling.
- Added migration/version isolation, service-stall interruption and unchanged-setting scheduling checks.
- Retained the real HTTP/cookie/origin test with 50 Socket.IO connections. The 50-player engine test is synthetic; it is not a real 50-phone venue load test.
- Browser checks cover registration/verification/queue recovery, staff MFA/settings saving, all controllers and both monitors, 320/360/390 px Python layouts, 720p/1080p display fit, prominent feedback on phone/monitor, logical line selection/copy, fixed robot controls, retained programs, wheel reconnects, delayed result reveal, continuous idle motion, phone-sized animation/resume and reduced-motion idle.
- Checked 450 generated Robot boards for reachability and 180 rounds of both quiz generators for legal answers.


The generated-board tests establish solvability, not fun or calibrated difficulty. Browser scenes use clearly isolated synthetic fixtures. A successful development test does not establish PostgreSQL behaviour under production latency, campus networking, SMTP delivery or peak-load capacity.

## Remaining production gates and specification gaps

| Area                    | Current implementation / required follow-through                                                                                                                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Score fairness          | Pilot bank and explicit Ranked switch implemented; there is no calibration UI gate. Representative difficulty calibration, fresh challenge breadth and the desired rarity of 7–9 scores remain unproven. Do not open prize-bearing Ranked before this work.                                                               |
| PostgreSQL / operations | Adapter implemented; only SQLite persistence tested here. Validate PostgreSQL, backups/restores, single-instance deployment and full 50-player rounds under real latency.                                                                                                          |
| Email                   | Encrypted outbox, verification and winner emails implemented. Actual SMTP and both BCU inbox routes require deployment testing.                                                                                                                                                    |
| Identity                | Per-account controls implemented; mailbox verification cannot guarantee one human per account. Complex disputed ownership, merging multiple institutional addresses and post-Ranked address correction need supervised operational handling; there is no automated identity merge. |
| Tie logistics           | Boundary blocking, shared ranks and recorded recipient selection implemented. Automated finalist invitations, replies and playoff rounds are not implemented; the event team runs the published procedure.                                                                         |
| Retention               | Explicit administrative cleanup and grouped attendance implemented. Correction-period timing, external backup/export cleanup and privacy requests remain operator-managed.                                                                                                         |
| Restore reconciliation  | Safe pause and Ranked block implemented. Reopening after a stale backup is a reviewed data-reconciliation task; no automatic self-service reconciliation wizard.                                                                                                                   |
| Accessibility / venue   | Keyboard-native controls, dialog focus containment, reduced-motion wheel and monitor-fit checks implemented. Real assistive-technology, enlarged text, varied phones and bright-room testing remain necessary.                                                                     |
| Extension               | Server adapters and catalogue-driven wheel/live selection implemented. A new interaction type still needs a frontend renderer and explicit command permissions; arbitrary multiplayer formats are not drop-in.                                                                     |

The complete specification describes the target behaviour. This table deliberately distinguishes implemented behaviour from operational procedures and remaining work; passing tests does not erase those distinctions.
