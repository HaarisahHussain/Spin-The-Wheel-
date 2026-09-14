# v0.7.0 — event efficiency and reliability

## Scope

Preserve the v0.6.0 games, generators, scoring version, ranked allowance, tutorials, answer privacy, timing and visual design. Address the storage, bandwidth, authentication, congestion, mail and operational findings. Keep one Node process, one database and Socket.IO.

## Persistence

- Import recognised schema-7 aggregates once into keyed records. Preserve accounts, scores, prizes and event state; remove duplicate history when a canonical review exists. Reject unrecognised schemas.
- Read the database at startup, serve committed memory thereafter, and atomically write only changed records. Preserve the unique email constraint and single-writer ownership lock.
- Acknowledge durable changes only after commit. Roll back rejected mutations. Stop writes after ambiguous PostgreSQL failures until restart reloads authoritative records.
- Bound database connections, queries, pending work and queue wait. Completed reviews are immutable; mutable attempt metadata is isolated between transactions.
- No database writes for idle timer checks or lease heartbeats. Keep transient traffic/lease state in memory. Bound successful retry receipts to ten minutes/4,000; exclude errors, exports and heartbeats.

## Screen delivery

- Initial lean snapshot, then changed fields only. Client timers and movement use server deadlines; preserve reconnect behaviour and answer privacy.
- Coalesce broadcasts and avoid accumulating updates for slow transports. Clear expired authentication fields explicitly.
- Fetch player top-ten scores, recent summaries and individual reviews on demand. Fetch paginated host participants/results/prizes and full standings on demand. Keep grand-prize notifications visible in the lean player view.
- Enable polling with WebSocket upgrade. Bound client fetches and prevent overlapping host heartbeats.

## Authentication and deployment

- Validate cheap request fields and reset/verification token eligibility before expensive password work. Revalidate authority and current password hashes when committing.
- Scope failed host-login throttling to the source; successful logins do not consume the failed-login quota. Retain bounded per-source, identity and global resource limits suitable for shared campus networks.
- Production safeguards apply to either the production command or NODE_ENV. Reject contradictory development settings, preview mail and missing required sender configuration.
- Development uses local SQLite unless explicitly authorised through ALLOW_REMOTE_DEV_DATABASE for a separate test database.

## Email and event rules

- Two bounded mail workers, explicit connection/greeting/socket timeouts, encrypted queued payloads and required TLS.
- Remove sensitive payloads after successful delivery, cancellation or challenge expiry; retain bounded delivery metadata. Surface queued/failed delivery in host results.
- Expire ineligible queue holds after five minutes, leaving a clear rejoin notice.
- Preserve Live winners while excluding already-collected daily recipients and existing pending prize recipients from new stock reservations.

## Acceptance

Run the existing backend/content/browser checks plus regressions for migration/restart, rollback, bounded queues, no-op persistence, login throttling, private pagination, queue expiry and repeat-prize stock. Rehearse a populated event with 50 answering players, spectators, both monitors, the host and concurrent registrations with scheduler timers enabled. Report local evidence separately from remote PostgreSQL, real SMTP and physical-device checks.
