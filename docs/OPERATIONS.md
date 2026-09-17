# Operations · v1.3.0

## Open the event

1. Start the deployment and check `/api/health`. This confirms runtime health, not admission hours or venue connectivity.
2. Sign in at `/host` with username `host` and the environment password. Save opening windows, cutoff, closing time and cleanup date in Event.
3. Open `/display/join` on the QR monitor and `/display/play` on the gameplay monitor. Scan the QR using a phone; a guest account should appear automatically.
4. Rehearse a solo turn and a Live round. All five games are always available. There is no email provider, verification setting or prize setup.

## During play

Call the next player and let their phone confirm readiness. A queue place gives one game session. Players rejoin at the back; there is no lifetime attempt limit. Pausing admissions stops new entries and host calls, not active game clocks.

The Live timer and lobby controls are in Live; scheduled multiplayer waits for an active solo turn to finish. A player’s queue place is preserved while participating in Live. Both formats contribute to the same leaderboard through each account’s best session, not accumulated points.

A generated username is public and editable; real names are optional and host-only. Multiple accounts are permitted. These are browser accounts, not verified people. No username/password recovery exists. Clearing cookies or changing devices creates a different account; the previous score remains until event cleanup.

## Host views

- **Live:** call players, start selected games, check Live readiness, pause/resume admissions, schedule/delay/cancel multiplayer, report a technical interruption.
- **Event:** save hours, queue capacity, Live timing, idle presentation and cleanup date. Unsaved edits remain drafts.
- **Players & Results:** search username, optional name or account ID; inspect solo/Live start/end times in UK time; view account/session IDs; assist queue entry after confirming the username.
- **Event records:** inspect recent activity, export private result records or delete event data.
- **Updates:** publish concise notices to players.

Exports include both formats, account/session IDs, scores and UTC timestamps. Treat optional names and exported account records as private. There is no prize collection, finalisation, tie-break draw or email workflow. Exact ties share ranks. Interrupted solo sessions can be resolved with a reason and earned points retained; no replacement points are invented.

## Control and recovery

Only one host controller can act. A second browser must confirm takeover, after which old commands are rejected. The host lease expires after 30 seconds without renewal. Human inactivity expires host authentication after 30 minutes; exports and cleanup may ask for password confirmation.

Phones may reconnect or explicitly transfer control between tabs using the same browser account. Server deadlines continue during disconnects. A stopped/stalled server pauses admissions and records unfinished solo work as interrupted; unfinished Live games cancel. Resolve interrupted work before resuming. Never reset the database to fix a connection or login issue.

Production requires HTTPS, one trusted reverse-proxy hop, one application writer and PostgreSQL with an ownership lock. Prevent direct access around the proxy. Preserve the receipt encryption key and database backup. A database error stops uncertain writes; restart, inspect committed records and reconcile before repeating sensitive actions. `RECONCILIATION_REQUIRED=true` keeps admissions paused after restore.

For development, use the exact PUBLIC_ORIGIN, restart and reload after editing it. LAN HTTP polling is supported without disabling production origin checks. An empty DATABASE_URL selects SQLite; the configured path identifies the actual database. Local reset refuses PostgreSQL, production and active/uncertain owners.

## Close and clean up

Pause admissions and finish or clear the queue. After the configured cleanup date, use Delete event data with a reason and explicit confirmation. It permanently removes guest accounts, optional names, scores, sessions and event activity, then closes admissions. Host settings and published Updates remain; remove personal information from notices separately. Delete exported CSV files and expire backups separately.

Before public use, confirm the organiser contact, retention date and actual hosting/data arrangements in the Legal page. Rehearse real phones, Wi-Fi, HTTPS, PostgreSQL and restore. Request limits are protective ceilings, not capacity promises: 600 sockets total, 550 per source, 3,000 commands and 2,400 reads per source per minute. Guest creation allows 1,000 per source per hour. These limits target overload, not one-person enforcement.

## Gameplay audio

Enable sound on the Play display after each load; check speaker volume. Mute it there when needed. Phones, the Join display and host panel remain silent. Audio is optional and never controls deadlines or scoring.

## Reading and starting

Calling a player and reading instructions have no timeout. If someone leaves, use Skip selected turn with a reason. The player or host starts solo gameplay; both buttons address the selected session so a late click cannot start a different turn. Live shows a ready count. Start for everyone is a host override; otherwise all participants must confirm. Reading can delay the next Live event and estimated closing time.

## Upgrade recovery

Use the existing v1.1+ database and stable receipt key. A first upgrade saves a private JSON state snapshot in `arcade_backups` with an ID beginning `pre-v1.3.0:`. Inspect with `SELECT id, created FROM arcade_backups;`; export the matching `body` using your database tool if recovery is needed. Never paste it into public logs. The snapshot preserves the original state, including private records.

For rollback, stop the app and restore the full provider/SQLite backup with its matching application version. The in-database JSON snapshot is an additional recovery source, not a replacement for a full database backup or a one-click rollback. Reconcile any results recorded after the snapshot before restoring; blindly overwriting them would lose new play history. Delete event data also removes these in-database snapshots transactionally.
