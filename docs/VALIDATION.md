# v0.3 validation and release limits

This is an implemented source release for configuration and rehearsal. It has not been deployed to a real Welcome Week event and is not certified production-ready.

## Automated evidence

Validated on 11 September 2026: **27 backend/integration tests and 4 Chromium browser tests passed**, lint passed, and the production client built successfully. `npm audit --omit=dev` reported **zero known production dependency vulnerabilities** at that check. Browser tests ran using the bundled Chromium fallback because the normal browser download was unavailable in this workspace.

- Backend/integration suite: domain policy, verification binding/expiry limits, recovery, idempotency, queue uniqueness, cutoffs, three Ranked starts, retained random game selection, technical voids, prize collection/finalisation, public projections and durable local storage.
- Generated game checks: 600 Robot boards checked for reachability and 180 rounds of both quiz generators checked for valid unique choices/answer lines.
- HTTP integration: cookies, hostile-origin rejection, public display isolation and 50 real Socket.IO connections.
- Browser suite: two monitor layouts, all three game controllers, registration through verification, queue recovery after refresh, and host MFA/verification-switch persistence.
- Lint and production client build are part of `npm run check`.

The generated-board tests establish solvability, not fun or calibrated difficulty. Browser scenes use clearly isolated synthetic fixtures. A successful development test does not establish PostgreSQL behaviour under production latency, campus networking, SMTP delivery or peak-load capacity.

## Remaining production gates and specification gaps

| Area                    | Current implementation / required follow-through                                                                                                                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Score fairness          | Pilot bank and calibration gate implemented. Representative difficulty calibration, fresh challenge breadth and the desired rarity of 7–9 scores remain unproven. Do not open prize-bearing Ranked before this work.                                                               |
| PostgreSQL / operations | Adapter implemented; only SQLite persistence tested here. Validate PostgreSQL, backups/restores, single-instance deployment and full 50-player rounds under real latency.                                                                                                          |
| Email                   | Encrypted outbox, verification and winner emails implemented. Actual SMTP and both BCU inbox routes require deployment testing.                                                                                                                                                    |
| Identity                | Per-account controls implemented; mailbox verification cannot guarantee one human per account. Complex disputed ownership, merging multiple institutional addresses and post-Ranked address correction need supervised operational handling; there is no automated identity merge. |
| Tie logistics           | Boundary blocking, shared ranks and recorded recipient selection implemented. Automated finalist invitations, replies and playoff rounds are not implemented; the event team runs the published procedure.                                                                         |
| Retention               | Explicit administrative cleanup and grouped attendance implemented. Correction-period timing, external backup/export cleanup and privacy requests remain operator-managed.                                                                                                         |
| Restore reconciliation  | Safe pause and Ranked block implemented. Reopening after a stale backup is a reviewed data-reconciliation task; no automatic self-service reconciliation wizard.                                                                                                                   |
| Accessibility / venue   | Keyboard-native controls, dialog focus containment, reduced-motion wheel and monitor-fit checks implemented. Real assistive-technology, enlarged text, varied phones and bright-room testing remain necessary.                                                                     |
| Extension               | Server adapters and catalogue-driven wheel/live selection implemented. A new interaction type still needs a frontend renderer and explicit command permissions; arbitrary multiplayer formats are not drop-in.                                                                     |

The complete specification describes the target behaviour. This table deliberately distinguishes implemented behaviour from operational procedures and remaining work; passing tests does not erase those distinctions.
