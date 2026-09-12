# Event operations

## Upgrading to v0.4.0

1. Stop admissions, finish active sessions and back up event data plus the mail encryption key. Deploy with one server process. Never point a simultaneous local test server at the production event database.
2. Replace source files, preserving private `.env`/deployment variables and data in the existing installation. This distribution omits those private runtime files and generated `dist`. Run `npm ci` and `npm run build`; restart the backend. Development does not hot-reload backend changes.
3. Upgrading from v0.3 applies new presentation/Live defaults once and disables Ranked. Existing v0.4 settings are retained. Accounts and attempt history survive; old-version scores are excluded from current standings, but existing starts still count. Use a separate database only for a genuinely new competition; retain the old event for outstanding prizes. Never reset an ongoing event to replenish attempts.
4. Enable Host → Event → Ranked play and Save settings. No calibration evidence or playoff form is required to switch it on. Admissions still require an opening window, an eligible account and remaining attempts, and must not be paused or finalised. Switching off blocks new ranked admissions; already admitted turns may finish. Publish prize/tie arrangements and balance games through development playtests.
5. Recheck both displays and a real phone. Legacy Robot sessions cannot be resumed under new rules; startup closes incompatible unstarted state and records already-playing sessions as interrupted for review.

## v0.4.0 controls and timing

Host → Event changes, including verification and Automatic, take effect on **Save settings**. Configure the idle gameplay monitor as Text only / Wheel only / Both; the optional continuous rotation is suppressed by reduced motion. Actual selection lasts three seconds; only the following three-second countdown names the chosen game. Resuming a phone refreshes server state, without extending gameplay time. The QR monitor stays static with standings.

The automatic interval is 180–900 seconds (default 300) of solo time after Live completes. Lobby duration is 15–45 seconds (default 20). Live question multiplier is 0.75–1.5 (default 1), applied to 15/15/20/20/25/25 seconds. Active Live sessions retain their original settings. Unchanged timing fields do not reschedule the next lobby when saving visual settings.

Open Live during a solo turn marks it pending without enabling automatic events. Delay Live adds 60 seconds. Pending Live waits through the current result and yields one queued solo session after the previous Live event. A live event requires enough room for its maximum duration plus ten seconds before event end. Admission cutoff blocks new lobbies, but an admitted lobby can finish within its closing window.

Solo coding games have 75 seconds of answering time plus up to 27 seconds of automatic feedback; Robot has 100 elapsed seconds. A selected solo slot is at most 134 seconds under normal service operation, with 145 seconds budgeted for queue estimates. Default full Live duration is at most 172 seconds. Do not shorten ranked timing mid-event to manage queues; pause admissions or adjust future Live cadence instead.

A server update stall exceeding three seconds interrupts active solo play or cancels active Live and pauses admissions. Review the incident and use the existing technical-void process where warranted. Brief client disconnection alone does not stop the clock or grant extra answers. SMTP and real venue connectivity still need rehearsal.


## Before opening

Configure actual dated windows under Host → Event. Use the laptop in Europe/London: the datetime inputs currently use the laptop timezone and persist absolute timestamps. Keep the same database for all event days. Opening a new day does not reset attempts. Configure the live interval, lobby duration, per-question timer and prize stock; automatic Live may be switched off independently.

Verification must work through actual BCU inboxes. Test both permitted domains, a fresh device, the six-digit code path, expiry and resend. Links work in the initiating browser; when an email app opens another browser, enter the code on the original device. OFF is a deliberate host policy change, never an automatic response to delivery failure. It does not prove mailbox ownership.

For Ranked, publish tie arrangements and playtest every game with representative students. Tune challenge difficulty in code and keep scoring fixed throughout a competition. The Ranked switch is an operational control, not evidence of equal difficulty across games.

Test the exact deployment with the two monitors, laptop and phones. Verify QR reachability, campus Wi-Fi client isolation, mobile data access, proxy origins, socket reconnects, visibility at stall distance and accessibility. Load-test 50 authenticated live players on the production database/network; a 50-socket connection test is not a performance guarantee.

## During the event

Call next player only after confirming the alias is physically present. One called turn gets one phone Ready response and one game. If a person misses their call, skip them or allow the 20-second deadline to expire; no unstarted attempt is charged. A selected Ranked game remains selected on their next Ranked turn.

A live timer reaching zero means the lobby is due. The current selected solo turn finishes first. Live proceeds through lobby, eligibility check, wheel, countdown, six shared questions, reveals and winners. Fewer than two eligible admitted players cancels the lobby. All-zero results award no instant prize. Ranked standings remain on Monitor 1 while the live game uses Monitor 2.

Use Pause admissions for operational delays. It is not a game-clock pause. Report a technical interruption for a game affected by a system fault, record the evidence, then adjudicate the interrupted attempt. A void restores the Ranked allowance and retains that game for replacement; a second void for the same account requires an administrator. Never silently edit scores.

For a spare device: find the eligible participant in Results, enqueue them if needed, choose Pair controller, and enter the one-use code at `/controller`. The grant expires after five minutes if unused. The resulting controller session lasts at most 30 minutes and only for that queue turn. It has no account-management privileges. Mailbox access stays on the participant’s own device.

## Recovery and storage

Use a monitored PostgreSQL service with encrypted backups and tested restore procedures. Protect `MAIL_KEY` separately; restoring the database without that key makes queued messages and cached credential responses unreadable. Keep the application to one instance and disable host sleeping during an event.

After an unexpected restart, inspect Results for interrupted attempts. Review saved evidence, void documented technical failures where justified, then resume admissions. A normal disconnect does not automatically refund an attempt. Code recovery rotates the recovery secret and revokes other sessions and outstanding controller grants without resetting attempts.

After restoring a backup, start with `RECONCILIATION_REQUIRED=true`. Admissions remain paused and Ranked is disabled. Compare the restore point with the incident log and any records of prizes already handed out. Reconcile missing attempts and prize collections before enabling Ranked and resuming admissions. The Ranked switch does not perform reconciliation or restore lost data.

Monitor `/api/health` and application logs. Mail jobs retry up to five times with bounded delays. Delivery success means SMTP accepted the message, not that a human received/read it. No full end-to-end email deliverability check has been performed in this workspace.

## Prizes and disputes

Tied scores keep the same public rank. Finalisation blocks if a tie crosses the third-prize boundary unless the adjudicator selects only eligible tied recipients and records the published playoff/witnessed-draw outcome. Notify tied finalists and manage replies using the event team’s published arrangements; automated finalist invitation/reply tracking is not included. Allow at least the published response period before resolving absence.

Finalisation records grand-prize awards and queues contact emails. The authenticated account also sees its award. Check the claimant and account identity before collection; an alias shown on a monitor is not proof. Collection retries do not spend prize stock twice. One instant prize may be collected per account per London calendar day. Close an unclaimed award with a documented reason only after its agreed claim period.

Reopen results for a correction, never silently overwrite finalised outcomes. Changes that would replace someone who has already collected a grand prize are blocked and require the event lead to resolve the physical award outside the app. Keep that resolution documented.

## Data retention

Registration collects no full name. Attendance is reported by course/level, counting participants called for a solo turn or admitted to an actual live game; small groups are combined into Other. Public identity uses generated neutral aliases. Course text is privately held before aggregation; review exports before publication to avoid identifying small cohorts.

After prizes and the **published correction period**, an administrator can run Retention cleanup. Timing is an operator-controlled procedure in this release, not an automatic deletion job. It deletes account records, credentials, individual attempts/awards, incidents and prior audit details from the active event, retaining grouped attendance. It closes registration. Do not run it while claims/disputes remain.

Apply the same schedule to PostgreSQL backups, logs, exports and any separate finalist correspondence. Database deletion cannot erase copies in external backups or previously exported files. The optional membership consent is stored; sending a membership campaign is an external, separately controlled operation, not an automated message sent by this build.

Verification proves mailbox access, not one human per mailbox. Someone with multiple legitimate BCU addresses may still create multiple accounts. OFF additionally allows unproven addresses. Do not strip plus tags or dots without an institutional identity rule. Use staff identity checks for prize claims; stronger person-level enforcement requires an institutional identity integration or an audited identity-linking workflow.
