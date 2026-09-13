# Operations · v0.6.0

## Before a rehearsal

Use a clean v0.6.0 database, not an earlier event. Keep private `.env` values outside source control. Set a strong `HOST_PASSWORD`, log in as `host`, and keep the password available only to authorised operators. Rotating it requires restart, which revokes host sessions. There is no bypass account, admin or MFA setup page.

Production requires HTTPS, PostgreSQL, one trusted proxy hop, one application writer and SMTP. Use a database connection that supports the dedicated advisory-lock connection; verify ownership behavior with the actual provider/pooler. Do not run multiple replicas. Keep `MAIL_KEY` consistent across restarts and restores. Without it, queued encrypted messages cannot be decrypted.

For development, omit DATABASE_URL, set a new SQLITE_PATH and use MAIL_MODE=preview. An explicit `npm run reset:dev` asks for `RESET TEST DATA`; it refuses production/PostgreSQL and an active instance. Never delete a real event to fix login. An empty hosted database must be provisioned deliberately outside the application.

## Host controls

Set opening windows, cutoff, closing time, Live timings and prize collection instructions in Event, then save. All form changes are drafts; Unsaved changes and the sticky Save action make this explicit. Leaving the tab or signing out asks before discarding edits. No admission window means admissions are closed. The pause switch closes new admissions; it does not freeze gameplay clocks. Ranked defaults off and has no calibration form. New games remain outside the release Ranked pool until playtested.

The current host tab renews its control lease every five seconds; expiry is 30 seconds. Another browser must confirm takeover. Old commands are fenced immediately after takeover commits. Same-browser tabs can transfer control without replacing their shared cookie. A refresh can reclaim the same tab after its old connection disappears. Human inactivity expires authentication after 30 minutes; heartbeats do not extend it. Absolute host duration is 12 hours.

Players verify exact BCU emails before all games by default. Turning verification off permits format-only BCU accounts and weakens one-person enforcement; it does not mark them verified or reset attempts. Players can log in on a new device or use Forgot password. Reset confirmation revokes old sessions. A mailbox may be shared or aliased; email alone cannot prove a unique physical person.

## Interruptions

A disconnected player keeps the server deadline. They can reconnect or explicitly move controls; refreshing grants no additional time. A stopped or stalled server marks solo work interrupted and pauses admissions. Review the incident and use a technical void only with a detailed reason. Voids retain the selected game for replacement; they are not performance retries. Unfinished Live rounds are cancelled after restart, with completed awards retained.

Test database failure, WebSocket loss, sleeping tabs and restore before the event. `/api/health` signals runtime health; it does not prove SMTP delivery or that admission hours are configured. After restore set RECONCILIATION_REQUIRED=true, reconcile prizes and attempts, then intentionally resume.

## Results, emails and privacy

Players & Results contains names, BCU emails, course/year, attempts and awards. Export and other protected actions prompt for the host password when authentication is older than 15 minutes; successful confirmation continues that action once. Cancel performs no protected action. Export cells are escaped against spreadsheet formula interpretation. Keep downloaded CSV files private and delete them according to the same retention plan; the application cannot delete files downloaded onto other devices.

Finalisation requires finished admitted turns, resolved incidents and prize instructions. Resolve exact ties crossing third place by the published playoff or witnessed draw and record the decision. Winners receive one persisted award with an email job and dismissible full-screen notification. Confirm identity before one-time physical collection. Unchanged recipients are not emailed twice on correction; removed recipients receive a correction notice. Reopening and correcting awards requires recent password confirmation.

Email delivery is queued with bounded retries. Inspect failures under Email delivery and retry after fixing SMTP. A successful provider send is not proof of inbox delivery. Verify both BCU domains and spam folders with real accounts. Password-reset and verification links expire after 15 minutes; issuing replacements invalidates older links. Opening a link alone does not consume it.

Set a cleanup date after the event and prize distribution. Resolve outstanding awards, then confirm retention cleanup with a reason and fresh authentication. Delete personal records, tokens and queued sensitive mail; preserve only aggregated attendance. Arrange expiry/deletion of backups and any CSV copies separately. Optional membership consent is not automatic authorisation for the application to send a campaign.

## Launch gate

Run `npm run check` and `npm run test:e2e`, then rehearse against the deployed URL with actual Android/iPhone devices, both monitors, real SMTP and at least one 50-player load exercise. Compare scores for beginners and experienced students before awarding Ranked prizes. See VALIDATION.md for what was and was not tested in this package.

## Local storage and failed startup

An empty `DATABASE_URL` selects SQLite; it does not mean no database exists. `.env.example` selects `data/arcade-v060.sqlite`. With no SQLITE_PATH the fallback is `data/arcade.sqlite`, relative to the project working directory. Use Node.js 24 or newer; earlier versions are rejected explicitly.

If startup reports an incompatible schema, point SQLITE_PATH at a new filename or deliberately run `npm run reset:dev` for disposable local test data. Ordinary startup never deletes data. Startup failures after acquiring ownership close the database and release only this process's lock.

Reset refuses PostgreSQL, production mode and a live SQLite owner. A lock with a provably dead PID can be reclaimed. Unknown/malformed ownership is retained: inspect the named file and confirm all Arcade processes have stopped before manually removing an uncertain lock. If an interrupted stale-lock recovery left a `.reclaim` directory, confirm no recovery/start/reset process remains before removing that directory. Do not delete a live writer's files.

## Timing and prototype rehearsal

Each queued session has five challenges with 30 seconds each. First-time instructions reserve up to 20 seconds; a player who does not confirm is returned to Ready without using a Ranked start. The selected Ranked game is retained. Phone How to play is untimed. Three runs per solo puzzle share one thinking allowance; playback is separate. Successful retries earn 90% then 80% of the calculated challenge value. Invalid submissions do not count as runs. Longer slots can approach five minutes. Rehearse throughput and use conservative queue estimates rather than promising an exact start time.

The new puzzle prototypes default OFF. Enable `ENABLE_PROTOTYPE_GAMES=true` only for a test event, then restart. Observe at least five unfamiliar participants per candidate as described in the specification. Keep failed/unobserved prototypes out of launch; keep both out of Ranked in this release. Established games also need representative scoring/balance checks before prize-bearing play.
