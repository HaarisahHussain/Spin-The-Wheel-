# Operations · v1.0.0

## Open the event

1. Start the configured deployment and check `/api/health`. This checks runtime health, not admission hours or email delivery.
2. Sign in at `/host`. Set actual opening, admission-cutoff and closing times in Event; save. Set prize instructions, reply/collection deadlines, cleanup date and available instant-prize stock.
3. Open the QR monitor at `/display/join` and gameplay monitor at `/display/play`. Scan the QR using a real phone.
4. Test BCU verification/reset emails, a Practice turn and a Live round. All five games are in the standard pool. Enable Ranked after rehearsal; freeze content and scoring for the event.

BCU emails are required. Verification defaults on; turning it off only checks email format and weakens duplicate-person enforcement. It never resets attempts or marks accounts verified. Registration includes optional membership-email consent, not automatic permission for a campaign.

Before real registration, confirm the Legal page with the event organiser: controller identity and an enduring contact, lawful basis, actual service providers/data locations, retention date, backup/export deletion and any transfer safeguards. Edit `src/screens/Information.jsx` to reflect those confirmed facts. The application alone cannot establish organisational compliance. Public content must also reflect the actual prize arrangements and accessibility support available at the stall.

## Run the queue

Call the next player; their phone confirms readiness. Each queue position gives one session. Players rejoin at the back. Pausing admissions stops new entries, not running game clocks. The Live timer and manual controls live in the Live tab; multiplayer waits for an active solo turn to finish before taking the screen.

The shared host account uses `HOST_PASSWORD`. A second controller must explicitly take over; old commands stop being accepted. The control lease expires after 30 seconds; human inactivity expires authentication after 30 minutes. Sensitive exports, cleanup and finalisation can request password confirmation. Never share the password with players.

## Players, results and prizes

| View | Host task |
| --- | --- |
| Game sessions | Switch Ranked / Practice / Live. Check name, alias, email, account ID and UK timestamps. Resolve interrupted sessions. |
| Players | Find registered accounts, distinguish identical names and confirm identity before assisted queueing. Registration alone does not mean someone played. |
| Prizes | Review provisional Ranked leaders, finalise winners, verify email status and record physical collection. |
| Event records | Check aggregated attendance, email delivery and audit history; export results or perform retention cleanup. |

Ranked results cannot be voided or refunded. Resolving an interrupted session records a reason, preserves earned points and end time, counts the start, and grants no replacement. Practice technical voids remain available. Exported Ranked CSV includes account/session IDs and UTC start/end timestamps. New Live records include the first-question start time. Earlier Live records show only their recorded finish time; no missing start time is invented.

Provisional leaders are not yet prize recipients. Finish the queue and active games and resolve interruptions before **Finalise winners**. If a tie crosses third place, conduct a witnessed draw, select only the necessary tied recipients and record the outcome. Finalisation creates grand-prize records, player notifications and queued email. A provider acknowledgement does not prove inbox delivery.

Ask winners to show their signed-in account and match its alias/email before handing over a prize; then confirm collection. The same award can be collected only once. Live winners can win again but cannot reserve another prize while one is outstanding, or collect more than once per UK calendar day. Close unclaimed awards only after the stated deadline and with a reason.

Reopening decisions suspends grand-prize collection until finalised again. Collected recipients cannot silently be replaced. This does not enable Ranked voids. Unchanged winners are not emailed twice; removed recipients receive a correction notice.

## Recover an interruption

- Phone disconnect: reconnect or explicitly transfer controls. Server deadlines continue.
- Server restart/stall: admissions pause and unfinished solo sessions become interrupted. Resolve them in Game sessions; unfinished Live sessions cancel. Do not reset the database.
- Database failure: bounded errors stop uncertain writes. Restart, inspect persisted results and reconcile before repeating sensitive actions. Preserve the same command ID when retrying a request within ten minutes.
- Restore: retain `MAIL_KEY`, set `RECONCILIATION_REQUIRED=true`, reconcile attempts and physical prizes, then intentionally resume.
- Email failure: fix SMTP and retry under Event records → Email delivery. Verify/reset links expire after 15 minutes; replacements invalidate older links.
- Development stuck connecting: use the exact `PUBLIC_ORIGIN`, restart and reload. The development guard supports LAN HTTP polling through a same-origin referrer. Production retains stricter origin checks.

An empty DATABASE_URL selects SQLite, not an absent database. Startup releases only its own instance lock. `reset:dev` refuses production, PostgreSQL and active/uncertain owners; never remove a live writer’s lock. Use a new SQLite filename for a separate disposable event.

## Deployment limits and retention

Use one application writer and one trusted proxy hop. Keep the Node port inaccessible around the proxy, which must overwrite forwarded headers. Back up the database and encryption key securely. A rollback needs the matching database backup. SMTP requires TLS; there are two delivery workers and bounded retries/timeouts.

Protective ceilings are 600 sockets total, 550 per source, 3,000 commands and 2,400 reads per source per minute; these are not measured hosting capacity. State is read at startup, persisted by changed record and broadcast by changed fields. Socket keepalives continue while idle.

After prize distribution and the configured cleanup date, resolve every award and use **Delete event personal data** with a reason and password confirmation. Only aggregated attendance remains; small course/year groups are combined. Delete downloaded CSVs and expire backups separately. Keep host access restricted throughout.

Rehearse actual phones, Wi-Fi, HTTPS, PostgreSQL, SMTP, restore and crowd traffic before opening. A shared score formula does not establish equal game difficulty; compare all five games with unfamiliar players. See Validation for automated coverage and its limits.
