# BCUSCA Welcome Week Arcade — v0.3, resolved revision

Updated 10 September 2026 following the v0.3 loophole audit. Both `mail.bcu.ac.uk` and `bcu.ac.uk` qualify for every mode. Email verification is required by default and can be switched off/on by the host for the event. This is the authoritative product and engineering specification. It supersedes earlier conflicting rules and proposed defaults. It is not an implementation, security certification or claim of completed playtesting.

The 18 audit findings are resolved into requirements below. Their implementation and acceptance checks remain release work. Numeric operating defaults are project choices, not universal industry standards.

## 1. Experience and eligibility

Two public monitors have distinct roles: Monitor 1 continuously shows joining information and the overall ranked leaderboard; Monitor 2 owns the wheel, selected-player flow, gameplay and round results. One laptop runs the private control panel. Phones provide registration/verification, queue actions, controls, personal results, the leaderboard and Updates. Section 17 defines the exact screen content.

| Mode | Email requirement | Allowance | Ranked leaderboard |
| --- | --- | --- | --- |
| Practice | Allowed BCU address; verified when verification is ON | Unlimited sessions, subject to queue capacity | Excluded |
| Ranked | Allowed BCU address; verified when verification is ON | Three started, non-void attempts per event participant | Best eligible score |
| Live multiplayer | Allowed BCU address; verified when verification is ON | One entry per live event; may join later events | Excluded |

Visitors may register with an eligible BCU address, verify and view public information. While verification is ON, unverified accounts cannot enqueue, reserve a turn, join a live roster or start gameplay. While OFF, a syntactically valid address on either allowed domain satisfies the email eligibility check without mailbox proof. Other email domains cannot register for gameplay or receive a verification challenge. The host switch never disables the domain restriction, account authentication, attempt limits or other event rules.

### Control-panel switch: Require email verification

Provide one event-wide ON/OFF switch, default ON for new events, available to authenticated hosts/operators and administrators. It applies to all three modes. ON requires mailbox verification; OFF requires valid email syntax and an exact allowed domain. Show the current policy in the control panel and phone registration/eligibility screens. OFF explains that mailbox ownership is not checked and duplicate/false addresses are easier to use. Never change the policy automatically because email delivery fails.

Persist the policy and its version server-side. Record actor, old/new values and time for each acknowledged change, broadcast it, and preserve it across restart and daily closure. Reject conflicting stale edits. This switch does not disable staff sign-in, MFA or privileged-action protection. Hosts need no additional approval workflow to operate it.

Check the current policy on admission and actual game start. Store policy version and actual verification status on each session/attempt. Switching OFF never marks an address verified, creates another allowance or resets progress. Optional verification remains available. Switching ON does not interrupt already-started games or invalidate results earned under OFF, including Ranked/prize eligibility subject to normal identity and claim checks. Do not retroactively require mailbox verification to retain those results.

On switching ON, hold unverified queued/selected but unstarted entries and release their monitor reservations. Retain the pending ranked game and original order among still-waiting entries; held entries do not block eligible players. Show a verification-required message. Expire a hold after five minutes or the applicable hard closure without consuming an attempt. Verification, or switching OFF before expiry, restores eligibility under the original admitted mode, not permission for new admissions/mode changes after cutoff. Recheck live rosters before actual start, exclude now-ineligible players and cancel if fewer than two ready eligible players remain. Already-started live games continue unchanged.

Registration while OFF issues an authenticated session and a private high-entropy recovery code scoped to that unverified account, so reconnect/recovery does not require email delivery. This credential cannot prove ownership or upgrade eligibility when ON. A repeated claimed address cannot create another allowance or sign someone into an existing record: require the session/recovery credential or staff-assisted resolution. An unverified claim cannot block a genuine owner from proving ownership later. Quarantine conflicting claims for adjudication rather than transferring sessions, scores or allowances automatically; retain history and resolve duplicate participation before prize allocation. Verification rotates OFF-mode credentials as specified in §3.

Practice and Ranked share one first-in-first-out solo queue. A queue position grants one session. After it ends, players must explicitly rejoin the back. Multiplayer supports 2–50 participants and runs separately between solo turns. Robot Rescue is solo-only; Debug Dash and Guess The Output support both solo modes and multiplayer.

The backend owns identity, eligibility, admission, random selection, time, scoring and event state. Socket IDs are never player identities or credentials.

## 2. Registration and public identity

Collect an eligible BCU email, course and academic level. Provide appropriate staff/not-applicable options because both permitted domains are eligible for all modes; do not infer a person's role solely from the domain. Omit full name. Generate a public alias from a curated, neutral vocabulary and a unique event suffix, for example `OrbitOtter-482`. No free-text public naming. Staff may replace an alias without changing its underlying identity or history.

Validate email syntax, trim surrounding whitespace and apply consistent case normalisation. For every mode, parse and match the entire domain against the shared allowlist: exactly `mail.bcu.ac.uk` or `bcu.ac.uk`. Substring matches, lookalikes and other subdomains do not qualify. Check before registration/sending verification, on identity changes and at every admission/start boundary, including live rosters and assisted controllers. A previously verified address outside this allowlist is ineligible. Do not infer provider-specific alias equivalence by stripping dots or plus suffixes without a verified institutional rule.

Verification proves access to a mailbox, not that a person has only one mailbox. All-game BCU verification raises the cost of duplicate accounts but cannot guarantee one human per account, including someone with addresses on both allowed domains. Apply the admission controls in §5. Grand-prize eligibility includes staff confirmation of the claimant's identity against the BCU ranked account and the policy recorded at its start. Do not collect identity-document photographs for this check.

Unverified registrations are provisional records, not claims on an email identity. Only successful ownership verification establishes an ownership-proven account/address binding. While OFF, claimed-address uniqueness is an admission/allowance control, not proof of ownership; conflicts follow §1. An already-owned address routes to account sign-in/recovery; it never automatically merges accounts, transfers scores or gives another registrant access. Unverified records cannot prevent the mailbox owner from registering.

## 3. Easy verification, sign-in and identity changes

### Verification ceremony

When verification is required, registration leads to the destination address and **Send verification email**. When OFF, continue directly to Play and keep verification optional in account settings. The email contains a link and an alternative six-digit code for the same challenge. A challenge expires after 15 minutes. Opening a link with GET does not consume it; the page requires explicit confirmation.

Link confirmation succeeds only when the browser also proves possession of the initiating session. If the email opens on another device or in a separate in-app browser, show instructions to enter the emailed code in the original Arcade verification screen. Confirming an email elsewhere must not automatically promote an unrelated waiting browser. The email explains which action is being authorised and says not to share the code.

The originating phone preserves its state, accepts pasted/autofilled codes and shows success immediately. Successful completion atomically consumes the challenge, verifies the address and issues a fresh authenticated session. The link and code cannot be used independently twice. A repeat success response does not disclose credentials or grant a new session to an unauthorised requester.

Use cryptographically random opaque link tokens with at least 128 bits of entropy; store token/code verification material securely, not raw credentials in logs. Bind the challenge to its purpose, provisional/account identity, target address and initiating flow. A verification token is not a password-reset, controller-pairing or prize-claim token. Do not place authentication tokens in analytics, third-party resources or arbitrary redirect URLs. Verification links use the configured trusted application origin.

### Resends and failures

Show **Resend**, **Change email**, expiry and delivery status. Resend has a 60-second server-enforced cooldown. Default budgets: five sends per target address per hour and five incorrect code entries per challenge; aggregate guessing limits also apply across replacement challenges and browser sessions. These budgets can be raised by an administrator for a documented delivery incident. Hosts can disable the gameplay verification requirement through §1; this never fabricates a successful verification.

A resend retransmits the same still-valid challenge where securely supported by the delivery service; otherwise it creates an explicit replacement within that same initiating flow. Do not invalidate the existing valid challenge merely because a different browser requested the same address. For replacement sends, activate the replacement only once the delivery provider accepts the message, retaining the previous valid challenge on a failed send. Provider acceptance is not proof of inbox delivery; clearly label the status and let students retry or use their still-valid challenge as applicable. Never keep multiple simultaneously redeemable generations within one flow after replacement activation.

Store any temporarily needed resend payload encrypted with bounded retention and keep public token verification storage separate. Serialize replacement and redemption so an in-flight resend cannot revive a redeemed challenge. Correcting the address explicitly revokes the prior flow's challenge.

Per-address limits are supplemented by per-session and generous venue-aware network/global limits. A single public campus IP is not treated as a single student. Rate-limit responses explain when to retry. Unauthenticated requests cannot permanently lock the account or cancel another flow. Test delayed, duplicated and out-of-order mail and the expected venue registration burst before opening.

### Sessions and recovery

On verification, rotate the initiating session and revoke old provisional sessions and recovery material. Recovery credentials issued before verification cannot establish verified status; they permit only the access allowed by the current event policy. Existing-account sign-in uses a purpose-bound emailed link/code with the same browser-binding rule, or an authenticated recovery credential; an email address alone never grants access.

An optional high-entropy recovery code is issued after successful verification (or as the restricted OFF-mode credential defined in §1), stored as a verifier, shown privately once and rotated on use. Recovery revokes prior sessions and controller grants as appropriate. It never creates an event identity or allowance. Staff may assist after an identity check and recorded reason, but cannot mark an unverified address as verified without mailbox proof. For loss of the original initiating session during verification, start a fresh explicit flow; do not recover it from knowledge of the destination email alone.

Successfully verifying either permitted BCU domain establishes email eligibility for all modes; Ranked also checks the event window and remaining allowance. Adding or replacing an ownership-proven address requires the same allowlist and ownership verification. OFF-mode provisional address corrections remain unverified and cannot reset attempts or overwrite another identity. Linking an already-bound address is a conflict/recovery flow, not a silent merge. Require recent authentication for identity changes. Retain historical ranked-address bindings for the event. After the first ranked start, disable self-service ranked-identity replacement; authorised staff may correct a genuine error after ownership checks, preserving the same participant and all attempts. Keep contact-email changes separate from ranked identity, and retain the BCU-only allowlist for account contact addresses.

An event participant has an immutable ID, one ranked allowance and at most one public leaderboard entry. Email correction, another browser, account recovery, a new day or an alias change cannot create three more attempts. Do not allow account deletion/recreation to re-enter the same running event with a clean allowance: explain this consequence in the account-closure flow and retain only the minimal event integrity record permitted by the declared retention policy, or close that participant's event eligibility. Document any privacy-request handling separately before deployment.

## 4. Connectivity and assisted devices

Gameplay requires a connection to the server; mailbox verification also requires inbox access on some device. Support venue Wi-Fi/mobile data where the server is reachable. All credential-bearing access, including a local deployment, uses trusted HTTPS/WSS. A disconnected phone cannot act as a live controller.

A connected spare phone/tablet may serve a participant eligible under the current verification policy through a staff-mediated, short-lived controller grant. It cannot confer email verification, access the mailbox or act as a host. Its permissions are limited to the assigned participant, event and turn. Students should access their inbox on their own device rather than sign into it on the shared controller.

At handover, revoke the controller grant server-side, close its subscriptions and clear private client state, caches and visible credentials. A waiting entry remains associated with its account; staff can assign a fresh controller at its turn. Old tokens, Back navigation and reconnect must not restore previous-player access. Pairing codes are single-use, short-lived and are never permanent recovery credentials.

The number of available spare devices limits simultaneous assisted multiplayer participants. Spare devices follow the same event-wide policy: verification is mandatory when ON and format-only eligibility applies when OFF.

## 5. Admission and solo queue

Enqueue requires an authenticated account on either allowed BCU domain, verification if the policy is ON, and a Practice/Ranked choice. Ranked additionally requires an available allowance and an open ranked admission window. Apply these conditions to every route, including staff-assisted actions and mode changes.

Each participant is in only one solo state: idle, queued, selected or playing. It cannot hold a future queue entry while selected/playing. Enqueue is idempotent; multiple tabs return the same position. Use a stable database ordering sequence rather than client time. Return a clear success/failure acknowledgement.

Show position, approximate wait, connection state, the next multiplayer timer and **Leave queue**. Reconnect preserves position. Changing mode before selection preserves position only if the target mode is open and eligible. Practice-to-Ranked is a ranked admission and records its admission timestamp. An existing Practice entry is never silently upgraded following verification.

Default queue capacity is 30 admitted solo entries; an administrator may lower it or increase it only against the remaining-time budget in §10. One browser may hold only one active solo admission as a soft control, with an explicit staff-mediated exception for the shared controller workflow. This is not fingerprinting or proof of a unique person. Apply account/session/global admission limits and expose suspicious repeated admissions to staff; do not hard-limit all players behind the same IP.

Screen-based solo participation requires physical stall presence. Before selecting the next person, staff confirm the displayed alias is present. The phone offers a readiness response with a default 20-second window. If absent or unresponsive, skip the entry and allow re-enqueueing; no attempt is consumed. Staff can provide a pre-start accessibility/readiness accommodation with a recorded reason, without changing scored time ad hoc. An absent person cannot reserve the monitor merely by clicking Ready remotely.

Upon selection, atomically reserve the monitor and lock the mode. Draw and persist the ranked game once for that pending attempt slot. That game survives cancellation, refresh, sign-out, account recovery and day closure until the slot starts or an authorised disposition occurs. Repeated game selections across the three slots remain allowed. Selection is made server-side using unpredictable randomness; the wheel animates the committed outcome.

Instructions before start are generic. Do not transmit the exact scored challenge, reconstructible seed or future answers before the attempt is durably started. Confirm the controller/assets are ready, then commit the start/deadline and disclose the challenge. A missing delivery acknowledgement after commitment creates an incident to adjudicate, not an automatic refund.

The selected turn owns the monitor through wheel, instructions, countdown, gameplay and result. Pre-game stages have a 45-second combined default bound after selection; on expiry cancel the reservation without consuming an unstarted attempt, retain its ranked game and require re-enqueueing. The game duration comes from its frozen game version; its upper bound participates in queue budgeting.

## 6. Ranked attempts, terminal results and voids

Three ranked attempts means three started, non-void attempts for one participant over the entire event, not three per day. It is an allowance, not a guarantee that screen capacity will permit all three. No attempt is consumed during registration, verification, queueing, readiness or the wheel.

Start is one database transaction: check event/participant eligibility, claim the pending slot, commit game/content/scoring versions, record the deadline and consume the allowance. Only committed starts can accept gameplay. Competing starts cannot overrun the allowance.

| Outcome | Allowance | Score treatment |
| --- | --- | --- |
| Completed | Consumed | Commit earned score |
| Timed out | Consumed | Commit earned credit under the frozen game rules |
| Abandoned/quit | Consumed | Commit earned credit; no completion bonus for unfinished work |
| Temporarily disconnected | Already consumed | Same attempt and deadline; reconnect resumes or shows terminal result |
| Interrupted by service fault | Reserved/consumed pending adjudication | Provisional, excluded from final winner calculation |
| Voided | Releases that slot exactly once | Entire attempt excluded; retain history |

All scoring contributions are nonnegative and earned by completed valid objectives; an incorrect quiz submission locks that objective at zero. There is no deferred whole-run penalty that quitting can evade. A player cannot erase a wrong answer or improve their existing score by disconnecting. No late offline inputs are accepted after the server deadline.

A phone disconnect alone does not establish a service fault. A technical void requires server evidence or a staff-observed incident, authorised actor and recorded reason. A replacement retains the selected game but receives fresh equivalent challenge content; it is linked to the voided attempt. A second technical void for the same participant requires an administrator review. Duplicate void commands release the slot once. Voiding a best score recomputes the best remaining eligible result.

Normal host staff can flag incidents and pause admission; only the adjudicator/administrator can void ranked attempts or correct identity bindings. After finalisation, corrections require an explicit reopen with a recorded reason and public notice if standings change. A screen reset or service restart never erases attempts.

## 7. Scores, content and comparable difficulty

### Visible scale

Use a single authoritative integer score from 0 to 900, displayed as 0.00–9.00. Leaderboard ordering and grades use that same value. There are no hidden extra decimal places or raw-millisecond tie-breaks.

| Score | Grade |
| --- | --- |
| 0.00 | No score |
| 0.01–1.00 | F |
| 1.01–2.00 | E |
| 2.01–3.00 | D |
| 3.01–4.00 | C |
| 4.01–5.00 | B |
| 5.01–6.00 | A |
| 6.01–7.00 | S |
| 7.01–8.00 | SS |
| 8.01–9.00 | SSS |

Terminal zero and no attempt yet are distinct UI states. Score calculations use exact/fixed-point arithmetic, clamp to the range, and round half-up once to the final integer. Grade and display are derived from that stored result. Exact ties are legitimate.

The first 600 points come from core objectives; the final 300 require explicit progressively harder stretch objectives. Accuracy/completion dominates. A correctly completed objective may use at most 10% of its credit for a bounded game-appropriate efficiency bonus. No bonus is awarded for an incorrect objective. For the initial quiz modes, use coarse, published time bands rather than fine reaction timing. Robot efficiency is based on valid solution/program quality, not phone/network speed. Performance criteria and maximum attainable credit are declared in each scoring version.

Scores above 6 should require stretch performance; 7, 8 and 9 become progressively harder. They are game achievement labels, not validated measures of intelligence. Every tier, including 9, must be mechanically possible within the frozen deadline after allowing unavoidable execution time and realistic input/reading time.

### Game rules and calibration gate

For Debug Dash and Guess The Output, each challenge permits one final submitted answer. Allow a selection followed by Submit, show submission acknowledgement, and reject every later answer for that participant/challenge even if it has a new command ID. Wrong answers earn zero for that objective. In shared rounds, reveal solutions only after the window closes or every eligible participant locks their answer. Earlier answers and correctness are not leaked through live feedback or public snapshots.

Robot Rescue uses explicit, consistent movement controls, visible orientation where needed, editable draft state, a Stop execution action and clear collision feedback. Stopping does not reset the attempt deadline or earned results. Cap program length against the remaining execution budget and freeze command timing in the version. Boards must be solver-validated for reachability; scoring must not reward redundant loops or repeated command spam. The program clears after execution without resurrecting a stale draft.

Practice teaches the same mechanics using separate instances and an adequately varied challenge pool. Do not expose a tiny ranked answer bank through unlimited Practice. Prevent exact individual ranked repeats where feasible; use validated generators and retain reproducible versions/seeds server-side. Do not expose future content or seeds through bundles, history, logs or public APIs. Keep rules/scoring frozen during the event while drawing fresh content from the frozen generator.

Ranked requires unaided play at the stall. Staff observe the actual participant and may flag obvious external solving/help. Do not treat tab changes, accessibility tools or network interruptions alone as cheating. This policy deters assistance; it does not claim browser software can perfectly prevent collusion.

Before Ranked is enabled, each game needs a written scoring function, fixtures for attainable scores, generator checks and representative cross-game playtests. Compare distributions and upper-tail outcomes at comparable skill levels, including the best-of-three selection effect. Matching average scores is insufficient: a higher-variance game can have a higher expected best score despite the same mean. Document sample limitations; do not claim statistical equivalence from a few convenient players.

Freeze calibrated mappings and content versions before the first ranked start. No live percentiles or retrospective scaling. If calibration is incomplete, the deployed event can run Practice and multiplayer under the current verification policy, but Ranked stays disabled. Reaching that gate requires measurements; the specification does not invent them.

## 8. Scheduled multiplayer

Monitor 1 and phones show **Next multiplayer lobby** using a persisted server time. Defaults: five-minute interval after the previous live block ends, 30-second lobby, five-second countdown and ten-second winner display. Game duration is fixed by its live version. The control panel may adjust future timings; already-started games retain their rules and deadlines.

When the lobby becomes due, stop selecting new solo turns. An already-selected turn retains the monitor until its bounded completion/cancellation. Display **After this turn** once due; never a negative countdown. The sequence is announcement, lobby, countdown, shared game, winner, then resume the original solo queue order.

Students can join multiplayer without losing a solo queue position. Accounts must satisfy the current verification policy to enter. Require a short-lived lobby code visible at the stall as a deterrent to casual remote entry; it is not secret proof of presence. Live capacity and one-entry-per-participant admission are enforced atomically on the server. One active controller per participant; deliberate takeover requires authenticated confirmation and revokes the previous controller. Reconnect does not create another entry.

Freeze the roster at countdown and recheck at actual game start that at least two ready connected participants remain. Otherwise cancel, announce why and resume solo play. Late arrivals spectate. Dropouts after start retain earned points and the original deadlines; absent players earn nothing for unanswered objectives. Do not end everyone's game because one participant finishes.

Initial multiplayer variants use simultaneous locked answers, not buzzer racing. All players receive the same current challenge and deadline. The monitor displays one shared challenge and compact standings; never 50 individual boards. A future buzzer variant requires its own explicit server-owned shared-lock contract and latency testing.

If fewer than two participants submit any valid gameplay response during the whole event, it produces no prize-eligible competitive result. Otherwise rank by that live game's declared score. Equal live winners share recognition; the equal-winner instant-prize budget is configured and shown to staff before live games open. Never invent a winner for a cancelled session.

After finish/cancellation, schedule the next lobby relative to that time. Do not replay missed intervals. Controls include Open after current turn, Delay, Skip and Disable automatic multiplayer. After each live block, serve at least one ready solo turn if queued before another live block; repeated manual start commands cannot bypass this. Pausing the entire event is a separate visible control.

## 9. Leaderboards, ties and prizes

The best non-void ranked result from each participant determines the public leaderboard. Show alias, score and shared rank; show the grade on personal result/detail views rather than adding another public leaderboard column; the player's private view includes attempts used and personal results. Results persist on phones after the monitor moves on. Scores remain provisional until finalisation. A disconnected leaderboard shows its last-update time and stale status.

The top three eligible participants receive grand prizes; one grand prize per participant. Both allowed email domains have the same Ranked and prize eligibility. Public alias/rank is not a prize credential. Staff confirm the claimant's identity against the ranked account and record a one-time collection transaction against the award. A private short-lived claim view/code helps identify the correct account. Duplicate staff collection requests return the original collection state.

Only a tie crossing the three-prize boundary needs allocation adjudication when prizes have equal value. If prize values differ by place, ties affecting that allocation also need adjudication; the prize configuration and rules are published before Ranked opens.

### Fixed tie procedure

Before opening Ranked, configure and publish the supervised playoff date/time, location and a response deadline at least 24 hours after finalist notification. Multi-day participants are told this arrangement in advance. Contact each tied participant at their recorded BCU email and through private in-app notification. For an OFF-mode unverified address, do not claim delivery or ownership is confirmed; explain the published response/playoff arrangements on the participant's authenticated result screen as well. Do not publish their contact details.

Playoff participation does not consume or replenish ranked attempts and does not alter the ordinary best-score calculation. Use an identical, previously unexposed shared challenge with fixed scoring and no hidden timing precision. Offer up to two supervised rounds. There is no unsupervised remote alternative that claims equal conditions. A participant who declines, misses the published deadline or does not attend forfeits prize allocation eligibility under the prepublished rule, while their historical leaderboard score remains.

If a prize-boundary tie persists after two rounds, allocate the remaining prize places by a witnessed random draw among the still-tied eligible participants, record the outcome and retain their shared score rank. Publish this fallback before Ranked opens; the draw allocates prizes, not fabricated performance points. If all tied participants withdraw, move to the next eligible score group using the same procedure.

Small live prizes require staff-confirmed presence and a private claim linked to the live result. An account may collect at most one instant-prize award per event day; later wins still receive recognition. This is an account-level rule and staff supervise obvious duplicate-person claims. Equal winners each receive the configured small award only while within their individual allowance and the declared event stock policy.

Eligibility confirmation, adjudication, winner finalisation and collection are separate persisted states. Finalisation waits for all admitted ranked attempts and any prize-affecting disputes/ties to receive explicit dispositions. Post-finalisation correction requires authorised reopening, never a silent edit.

## 10. One-day or multi-day scheduling and capacity

Configure one event with explicit dated opening windows, admission cutoffs and final end time. Use Europe/London for display and unambiguous persisted timestamps. Prospective Monday/Tuesday/Thursday 09:00–15:00 windows are not assigned dates automatically. One event retains accounts, attempt allowances, results, aliases and Updates across all its days. Starting a separate event is an explicit administrator action.

Admission checks use server time. At ranked cutoff, freeze the actual admitted Ranked entries and their modes. New Ranked enqueue and Practice-to-Ranked conversion are rejected. An admitted Ranked entry switched away from Ranked loses its grandfathered status and cannot switch back after cutoff. Host-assisted actions follow the same rule.

At each window's solo admission cutoff, also close new Practice admissions; drain the already-admitted queue in order. Suspend new scheduled multiplayer while draining. Publish the cutoff separately from venue closing, leaving time to serve the queue and explain any technical interruption. Players who leave or miss readiness during draining cannot re-enqueue after cutoff.

Do not promise more turns than fit. Budget remaining time using the maximum complete solo-turn duration among enabled games, bounded pre-game/result overheads, already-committed live time and a ten-minute operational reserve. Stop admissions when another turn would exceed that budget, even before the nominal cutoff. Queue capacity is an additional cap. Use shorter average times only for approximate wait display, not a guarantee. The operator sees the projected drain time and reason admissions are paused.

Changing the cutoff does not silently expel accepted entries. Publish schedule changes in Updates and on the monitor. If a hard shutdown prevents draining, close unstarted entries without consuming attempts, record the incident and either resume the same event later or mark those entries cancelled. A cancelled admission is not a completed game.

Three attempts remain a maximum allowance, not guaranteed capacity. Configure schedules, playoff arrangements, prize stock, calibrated game versions and connectivity before opening; incomplete configuration prevents Ranked admission. Live games may remain disabled independently.

## 11. Phone UI, Updates and attendance reporting

Phone tabs are **Play**, **Leaderboard**, **Updates**. Play shows verification status, eligibility, queue state, readiness, instructions, controller, results and remaining attempts. Provide readable text, explicit status/feedback, keyboard and assistive-technology support, reduced motion, safe focus changes and muted-audio operation. Gameplay does not depend on sound or colour alone.

Updates are persistent in-app messages composed by authorised staff. Support preview, publish, edit, archive, timestamps and unread status. Treat content as text or a tightly constrained safe format; no arbitrary HTML. On reconnect, retrieve missed updates. Publish critical scheduling changes at safe boundaries without covering active controls. This feed does not imply SMS, operating-system push or general promotional email.

Transactional verification, recovery and prize messages are separate from optional membership email consent. Membership consent is explicit and unchecked by default. Course/academic-level reports contain aggregate counts with small groups combined/suppressed where appropriate. Raw account-linked records remain personal records. Public APIs expose only approved public fields; private results, email, recovery resources and raw exports require separate authorisation.

Report registrations, verified accounts, verified ranked identities, daily active accounts and game sessions accurately. Do not label them verified unique human attendance. Keep operational and aggregate reports separate. Retain names nowhere because registration does not collect them.

After prize distribution and a configured correction period, delete identifying records and credentials according to a published retention schedule. Document coverage of raw exports, logs and backups before deployment; keep only suitably aggregated long-term statistics. Finalising a leaderboard does not prematurely delete winner contact information. Retention and any required privacy handling need deployment review; this engineering specification does not certify legal compliance.

## 12. Authoritative commands, timing and durable recovery

### Command processing

Every action is authenticated and authorised for its event, participant and role. Gameplay commands carry attempt, challenge, controller and command IDs. The server validates current state, payload and deadline. Answer keys/future content remain private. Never trust client scores, eligibility, mode, timestamps or completion assertions.

Use one ordered authoritative processor per round. An action's deadline eligibility is determined by server receipt into that processor after admission validation, not a client timestamp or eventual database completion time. Finalisation is an ordered barrier: resolve admitted pre-deadline actions before committing the result. Bound outstanding work and detect overload; do not accept unlimited buffered input as timely gameplay.

Deduplication keys include actor, event, action and command ID. Persist a payload fingerprint and original outcome; reject a reused ID with changed payload. Duplicate replies are scoped to the same authorised actor. Apply this to enqueue, start, answers, voids, schedule changes and prize collection. Database uniqueness/transactions protect the business invariant as well as transport duplicates: distinct IDs cannot create two answers or a fourth ranked start.

Commit consequential state before acknowledging success. A crash after commit but before acknowledgement returns the committed outcome on retry. Public broadcasts follow committed state and carry monotonic versions. Reconnect fetches an authorised current snapshot and missed persistent Updates; do not rely exclusively on transient socket replay. Expired offline gameplay inputs are rejected, not blindly replayed into a later challenge.

Use server-owned absolute deadlines and a client offset for display. No player-triggered pause or latency refund. Stop/pause UI actions do not create extra scored time. A host-requested global service pause has an explicit attempt disposition, not invisible score-clock manipulation.

### Restart versus restore

Host and monitor reconnect to the same persisted event; they never silently create another room. One scheduler owns transitions, protected by a lease/version or equivalent transactional exclusion. Old timer callbacks cannot overwrite a newer monitor state. Restore deadlines, not fresh durations.

After a normal restart, recover the latest durable event/queue/results before accepting play. Resume an attempt only where state and timing are reconstructible fairly; otherwise mark it interrupted, pause new Ranked starts and require the technical disposition in §6. A committed but undelivered start follows the same rule. Missing client acknowledgement alone does not refund it.

If the database is unavailable, pause admissions and gameplay with a visible service-interrupted state. Do not create in-memory Ranked results or a silent Practice fallback. Preserve already committed data and reconcile in-flight attempts on return.

A backup/data-loss restore is a different incident: reopen in reconciliation mode with Ranked disabled, compare the restored point with available later logs/results/award records, and record any unrecoverable effects. Never continue from stale counters automatically. Select a persistence configuration with no intended loss of acknowledged attempts under the expected single-service restart failure; document actual backup recovery-point limits separately. Rehearse restore before the event. If acknowledged results cannot be reconstructed, the adjudicator must publish the affected-period remedy before resuming Ranked.

## 13. Staff security, privacy boundaries and operations

Use named staff accounts and MFA. Roles are host/operator, adjudicator and administrator. Operators manage normal turns, lobby timing, Updates and the event-wide verification switch. Adjudicators resolve attempts and awards. Administrators manage event configuration, staff and identity correction. Every privileged HTTP/socket action checks the role server-side; client buttons are not access control.

Require recent authentication for account recovery, identity changes, destructive event operations and finalisation/reopening. Log actor, action, target, timestamp and reason for sensitive changes without recording raw credentials. Revoke access on logout, role removal and account suspension, including already-connected sockets. Concurrent host operations use state-version checks rather than last-write-wins.

Require HTTPS/WSS, secure HttpOnly session cookies with appropriate SameSite policy, explicit trusted-origin validation and CSRF protection for applicable cookie-authenticated mutations. Validate and bound every message, subscription, connection and payload. Origin validation is not a substitute for authenticating non-browser clients. Do not place host privileges in the QR code, monitor URL or assisted controller.

The control panel shows database/service readiness, queue drain estimate, event state, next lobby, current incidents, pending interrupted attempts and prize collection status. Record operational errors and rate-limit events without unnecessarily exposing student email. Separate public-state projections from private account/attempt data across all APIs, not only visible pages.

These requirements draw on established authentication, session and messaging practices; the particular product policies and numeric defaults are BCUSCA choices. Supporting guidance: [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [OWASP recovery-token guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html), [OWASP WebSocket Security](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html), [Socket.IO delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/), [Socket.IO connection recovery](https://socket.io/docs/v4/connection-state-recovery/) and [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html).

## 14. Maintainable game architecture

Separate identity/verification, admission/queue, attempts, solo orchestration, live orchestration, scoring, scheduling, awards, Updates and reporting. Games call explicit platform contracts; they do not change authentication, allowances, queue positions or monitor ownership themselves.

| Game | Practice | Ranked | Multiplayer |
| --- | --- | --- | --- |
| Debug Dash | Yes | Yes, after calibration | Yes |
| Guess The Output | Yes | Yes, after calibration | Yes |
| Robot Rescue | Yes | Yes, after calibration | No |

A registry entry declares stable ID, supported modes, player bounds, content/scoring versions, duration and presentation components. Each package provides generation, validated inputs, deterministic transitions, objective completion, scoring, public/private projections, instructions, phone controller, monitor presentation and contract fixtures. Solo/live adapters are separate where rules differ. Capability flags drive the wheel and lobby options.

Adding a game means a package, registry entry, validated scoring/content version and contract tests. It must not require modifying identity, attempt accounting or scheduler internals. An enabled ranked-game set is frozen per event; a discovered faulty game pauses Ranked for adjudication rather than silently changing the odds for later participants. Practice/live rotation may disable a faulty game safely between sessions.

## 15. Audit resolution and release checks

| Audit finding | Binding resolution | Acceptance check |
| --- | --- | --- |
| A01 Wrong-browser verification | §3 session-bound link or original-phone code | Unrelated browser confirmation cannot promote the requester |
| A02 Stale credentials/identity | §3 rotate credentials; immutable event identity | Old provisional credentials fail; address/recovery changes grant no allowance |
| A03 Duplicate-account queueing | §1 host-selectable BCU verification; §5 capacity/admission/presence | ON blocks unverified admission; OFF permits format-only admission on both BCU domains; outside domains always fail; attempts never reset |
| A04 Rerolls | §5 persist pending game unconditionally | Cancel/reconnect/change day returns same pending game |
| A05 Scoring fairness | §7 visible fixed-point score and calibration gate | Validate achievable tiers and cross-game best-of-three distributions |
| A06 Reused content/assistance | §7 varied private content and supervised Ranked | Practice does not expose a trivial ranked bank; no future-content API leakage |
| A07 Answer spam/reveals | §7 one final answer; §8 common reveal | Different command IDs cannot earn repeated credit or reveal answers early |
| A08 Voids/results | §6 terminal-state and adjudication rules | One void releases once and removes its result; replacement remains traceable |
| A09 Command/deadline races | §12 ordered processor and transaction invariants | Concurrent deadline/start/answer requests produce one consistent result |
| A10 Cutoff conversion | §10 frozen ranked admission/mode | Practice-to-Ranked after cutoff fails, including host-assisted routes |
| A11 Monitor/lobby races | §5 whole-turn reservation; §8 start roster check | Trigger lobby at every solo stage; test 51 joins and pre-start dropout |
| A12 Presence/prize claims | §5 observed presence; §9 atomic collection | Alias alone cannot claim; simultaneous staff claims award once |
| A13 Ties/nonresponse | §9 published bounded playoff/allocation procedure | Ties, no-shows and second ties reach a defined outcome |
| A14 Restart/restore | §12 separate reconciliation modes | Stale backup cannot reopen Ranked with restored allowances |
| A15 Staff/session security | §13 roles, MFA, revocation and transport | Player/monitor/controller cannot invoke host actions; revoked sockets fail |
| A16 Verification disruption | §3 flow-scoped resend, guesses and delivery states | Test concurrent flows, failed/out-of-order sends and campus NAT burst |
| A17 Capacity/drain | §10 bounded budget and admission freeze | Accepted queue fits budget; repeated manual live games cannot starve solo |
| A18 Reporting/shared device | §4 scoped controller; §11 precise metrics | Handover tokens reveal nothing; reports do not claim unique humans |

Release also requires actual venue-phone/email tests, a readable monitor with a full live roster, accessibility checks, dependency/configuration review and a rehearsed host fault workflow. The earlier source-code audit's defects require implementation fixes and regression checks; this document does not close them by wording alone.

Verification-switch acceptance: test ON and OFF for both permitted domains and an outside domain in every mode; host permissions versus player commands; toggles during queueing, wheel, countdown and active play; held-entry expiry and cutoff; OFF-mode recovery followed by verification; unchanged verification flags, scores and allowance counters; concurrent host edits; and persistence after restart. Verify that claimed-email collisions never grant access to another account and that an OFF-mode result is not retroactively invalidated by switching ON.

Exact event dates, deployment connectivity, email-service configuration, calibrated game content/scoring and prize/playoff logistics are configured before opening. They are operational inputs and validation work, not permissions needed to continue development. Until the required gates pass, the system must accurately expose which modes are available.

## 16. Visual design and frontend implementation

This section is binding across the player phone, both public monitors, laptop control panel and every game. Use light mode and a minimalist composition with deliberate alignment, restrained colour and generous but purposeful whitespace. Do not add a dark-mode alternative. No gradients, neon, glowing edges, glass panels, decorative background blobs, unnecessary badges or icons attached to every heading. The games should be enjoyable through interaction, motion and clarity rather than visual clutter.

### Palette and surfaces

Interpret half-white as a soft off-white. Use this small shared palette; token names describe intent rather than individual screens.

| Role | Value | Use |
| --- | --- | --- |
| Page background | `#F7F7F2` | Default background on every surface |
| Surface | `#FFFFFF` | Inputs, code panels and purposeful grouped areas |
| Primary text | `#252525` | Charcoal headings, text and primary controls |
| Secondary text | `#62625C` | Necessary supporting information |
| Divider | `#DDDDD5` | Subtle separation, not the sole control boundary |
| Accent | `#365E53` | Restrained selected/focus/interactive emphasis |
| Error | `#A33030` | Actionable errors and incorrect responses |

Use white text on charcoal for the main action. Prefer spacing and alignment to surrounding everything with cards. Use a small corner-radius scale: 8px for controls, 12px for grouped surfaces; circular geometry is reserved for the wheel or genuine circular controls. Avoid heavy shadows; use a modest shadow only when elevation communicates an overlay. Important input/control boundaries must remain distinguishable, including in bright venue lighting. Check actual contrast during visual QA; these palette choices are not a claim of completed accessibility validation.

### Typography and spacing

Use **Poppins** for all interface text, with weights 400, 500 and 600. Use weight 700 sparingly for the primary result or monitor headline. Load font assets with the application, with a sensible sans-serif fallback, so rendering does not depend on a third-party font request at the stall. Code uses a readable monospace font with ligatures disabled so programming operators remain literal; Poppins remains the font for surrounding instructions and controls.

| Role | Phone/control panel starting size | Monitor starting size |
| --- | --- | --- |
| Main title | 28–32px | 48–64px |
| Section heading | 20–24px | 28–36px |
| Body/action label | 16px | 24–28px |
| Supporting label | 14px | 20–24px |
| Primary score/countdown | 48–64px | 80–112px |

These are a hierarchy, not instructions to display every size on every screen. Use at most three principal text sizes in an ordinary view. Body line-height is approximately 1.5; headings are tighter. Avoid tiny all-caps labels, excessive letter spacing, lightweight low-contrast text and shrinking code to force it into a panel. Use tabular numeric presentation where supported to stabilise timers and scores.

Use a 4px spacing base, principally 4, 8, 12, 16, 24, 32, 48 and 64px. Related items are close; separate tasks have more space. Phone gutters start at 20–24px and adapt to narrow screens. Controls have a minimum 44px touch target. Align labels, content edges and actions consistently. Monitor layout is composed for viewing at a distance and never treated as a stretched phone page.

### Information discipline

Each screen has one primary purpose and one obvious next action. Include only the information necessary for the current decision or interaction. Remove repeated headings, celebratory filler, explanatory subtitles that repeat a label, technical connection details during normal operation and decorative metrics.

Prefer direct visual feedback where it is unambiguous: a selected line, a robot turning, an answer becoming locked, a highlighted next player or an updating progress marker. A brief visual demonstration may replace a paragraph of rules. Do not replace understandable words with unfamiliar symbols or hide essential eligibility, submission, time-limit, connection/error or recovery information. Keep persistent input labels; placeholders are not their replacement. Icon-only controls still have accessible names, and state changes have appropriate nonvisual announcements.

| View | Visual focus and necessary content |
| --- | --- |
| Registration/verification | One compact form or code entry, clear field labels, one primary action; resend/change address secondary |
| Play home | Practice/Ranked choice, remaining ranked attempts where relevant, Enqueue; verification only when it affects the action |
| Waiting | Queue position as the main number, approximate wait, next lobby time, Leave queue secondary |
| Selected player | Alias and Ready; one short visual briefing before countdown |
| Wheel | One wheel, legible game labels and the selected result; no surrounding feature cards |
| Solo gameplay | Challenge/board first, essential timer/progress, controls and immediate meaningful feedback |
| Live lobby | Join instruction/code, participant count and start timer; bounded roster preview rather than 50 crowded cards |
| Live gameplay | One shared challenge, common timer and concise progress; solution reveal waits for the agreed boundary |
| Result | Score and grade, clear outcome, remaining attempts and re-enqueue action; personal details secondary |
| Leaderboard | Aligned rank/alias/score rows, own position on phone; explicit shared ranks without trophy decoration everywhere |
| Updates | Plain chronological messages with timestamp/unread treatment; no redundant card chrome |
| Control panel | Current session/next action first; queue and essential controls adjacent; configuration grouped separately |

Keep the compact next-multiplayer timer on Monitor 1. The QR code and overall ranked leaderboard remain on Monitor 1 throughout play; Monitor 2 does not rotate through duplicate joining or overall leaderboard screens. Section 17 takes precedence over general single-monitor layout examples. Public screens never show internal identifiers, email addresses or audit logs. Technical details belong in the host's incident/detail views. Use progressive disclosure in the control panel, but keep urgent pause/recovery actions easy to reach.

### Code presentation

Use a **VS Code light-theme-style syntax highlighter**, with a light code surface, dark base text and restrained distinct token colours for keywords, strings, numbers, comments and functions. Do not imitate a whole editor window: omit fake tabs, traffic lights, toolbars and filenames unless needed by the challenge.

Render source text faithfully with preserved indentation and meaningful line numbers. A selectable code line is a real accessible control with full-row hit area, keyboard operation and clear selected/submitted states. Keep highlighting of code tokens separate from answer-selection feedback. Avoid line wrapping that changes the apparent structure of a challenge. Prefer short, curated snippets that fit the phone; provide horizontal scrolling when unavoidable rather than reducing text to unreadable sizes.

Use a tokenising highlighter and render token spans with a shared Tailwind class map. Do not import a standalone highlighter theme stylesheet or inject inline token styles. Do not ship hidden answer metadata with tokenised code. The same CodeBlock/CodeChoice primitives serve solo, live and phone/monitor variants with appropriate sizing.

### Icons and motion

Use **React Icons**, not Lucide or the Lucide subset exposed through an aggregator. Select one coherent icon family as the default and import only the icons actually used. Add an icon when it clarifies a familiar action, state or movement; plain text buttons are the default for actions such as Enqueue, Verify and Submit. No icons solely to decorate cards or headings. Standardise icon size, stroke/fill character and baseline alignment. Decorative icons are hidden from assistive technology; interactive icons have accessible labels. React Icons supports named imports from its included icon families; see the [official React Icons documentation](https://react-icons.github.io/react-icons/).

Use restrained transitions for state changes, typically 120–200ms. The wheel and robot movement may have longer intentional game animation, but avoid ambient bouncing, flashing, perpetual pulsing and excessive confetti. Animation must not delay accepted input, alter scored deadlines or make controls move under a finger. Respect reduced motion with a direct state transition or shortened equivalent; audio is never required to understand the result.

### Pure Tailwind CSS v4 and modularity

All authored visual styling uses **Tailwind CSS v4 utilities** in components, including responsive layout, state variants, typography, colour, borders, focus and transitions. No handwritten CSS selectors/rules, CSS Modules, Sass, styled-components, component-specific stylesheets or inline style objects. The Tailwind entry contains the framework import; font loading uses bundled font-package assets/definitions rather than handwritten styling rules. Do not introduce custom CSS or `@apply` to shorten component markup.

Keep the palette and component variants in shared, statically discoverable class maps. Use complete literal utility strings; do not build class names by interpolating colour names or pixel values at runtime. Exact palette values may use Tailwind arbitrary-value utilities in those shared definitions. This keeps styling explicit and reusable without scattering one-off values across screens. Tailwind's utility and state-variant approach is documented in its [official utility styling guide](https://tailwindcss.com/docs/styling-with-utility-classes).

SVG geometry for the wheel, board and progress visuals is functional drawing data, not a replacement styling system: use SVG attributes for coordinates/path geometry and Tailwind classes for their visual appearance. Do not use a CSS gradient to construct the wheel. Motion implementations must respect the utility-only styling boundary rather than quietly adding bespoke stylesheets.

Share focused primitives for Button, Field, Dialog, Status, CodeBlock, CodeChoice, Score, Timer and LeaderboardRow. Compose separate PhoneShell, JoinDisplayShell, PlayDisplayShell and HostShell layouts; share display primitives without coupling the two monitor lifecycles. Share game presentation primitives where useful, but keep each game's rules and controller separate from layout/styling. Use explicit component variants for size/state/context rather than copying a screen or adding dozens of unrelated Boolean props. Abstract repeated visual patterns after identifying a real common responsibility; do not build a universal component for everything.

### Visual acceptance

Review the actual rendered phone, monitor, host and each game state before release. Check narrow phones, larger text, keyboard/focus, bright room viewing, a full live roster, long permitted aliases and every loading/empty/error/recovery state. The monitor must fit its intended display without hidden controls or whole-page scrolling. Confirm Poppins loads, code remains readable, no dark theme/gradients/neon/custom styles have crept in, and icons earn their place. Review screenshots as a coherent system rather than judging isolated components. The intended outcome is calm, precise and enjoyable; no claim of achieved visual quality is made until the interface is built and inspected.

## 17. Screen content: two monitors, one laptop and phones

These are the final screen responsibilities, replacing earlier single-monitor arrangements. Assume landscape public monitors for the initial layout and verify both at the venue's actual resolution. The two displays are separate read-only views of the same event; opening or refreshing either must never advance the game, reset a room or create an event. Monitor ownership/reservations elsewhere in this document mean Monitor 2's active presentation. Monitor 1 remains independently visible through those transitions.

### Monitor 1 — Join and ranked standings

Use one steady two-column composition, with a small BCUSCA Arcade heading. Allocate approximately 45% of the usable width to joining and 55% to standings. Keep generous margins and one quiet vertical divider if needed; do not put both sides inside decorative cards.

**Left:** a large, high-contrast QR code, the short action label **Scan to play**, and a short human-readable fallback address. The QR points to the stable participant entry URL, not a changing live-room token. Preserve a clear quiet zone and verify scanning at realistic distance and lighting. The QR does not move, animate or disappear during games. Avoid extra registration instructions and verification policy paragraphs on this screen; the phone handles them.

**Right:** **Ranked leaderboard** with the top five participants, showing only rank, generated alias and score. Aligned rows and subtle emphasis identify the top three; no trophy icons, charts, avatars or separate stat tiles. Keep the full rankings on phones. At the fifth-row boundary, include the whole tied group when it fits; otherwise show a compact count of additional tied players rather than implying the visible alias is the only one at that rank. Do not auto-scroll or paginate the display. Before any ranked result, use one quiet line: **No ranked scores yet**.

**Bottom status line:** the next multiplayer lobby time/countdown and, when relevant, the next selected/next eligible solo alias. A due live lobby replaces the next-solo indication. Use a single current state such as **Lobby open · 18 joined · starts in 00:20**, **Live game in progress**, **Admissions paused**, or **Closed · next opening …**. Do not repeat the live countdown as several different counters. Published cutoff changes can replace secondary footer text briefly; no news ticker.

The QR and overall leaderboard stay visible during solo and multiplayer games. Multiplayer scores never replace the overall Ranked list. After event finalisation, the heading becomes **Final ranked standings**; during an interruption, retain last-known standings with a small explicit stale/update status. If Ranked is disabled before any results exist, the right side states **Ranked unavailable** and shows only the next event/opening information needed; never fill the space with invented content.

### Monitor 2 — Wheel, gameplay and results

This screen follows the active experience. It has no persistent QR panel, full queue, overall leaderboard, Updates feed or host controls. The dominant object is the wheel, code challenge, robot board or result—not an enclosing dashboard.

| State | Show |
| --- | --- |
| Idle, no eligible queue | A quiet **Ready to play** and one short **Join on the other screen** instruction |
| Waiting for selected player | Large alias, mode, readiness status; at most the next two eligible aliases in a small Up next line |
| SpinWheel | One large wheel with readable game labels, selected alias and Practice/Ranked label |
| Briefing | Game title, a short visual demonstration and only an essential instruction not evident from the controls |
| Countdown | One large countdown; no competing panels |
| Solo gameplay | Main challenge/board, compact time remaining and objective progress; alias/mode in a quiet header |
| Solo result | Alias, score and grade; for Ranked only, best-score/position change if applicable; next player in a secondary line |
| Live announcement/lobby | Game title, lobby code, **Join Live on your phone**, participant count and start countdown |
| Live countdown | Shared game title and one countdown |
| Live question | Shared question/code and labelled choices where needed, common timer, compact submitted/eligible count |
| Live reveal | Correct answer with concise visual explanation; brief round standings when useful |
| Live final result | Winner or tied winners and their scores; show up to five leading rows if needed; **Solo play resumes** secondary |
| Paused/interrupted | One clear state and the next useful instruction; retain committed state without presenting a frozen timer as live |

No 50-name lobby wall or 50-board grid. The phone confirms an individual's successful join. Avoid animating ranks while participants are still answering. Result transitions follow configured time bounds and cannot steal an active round. When a result warrants a short explanation, show it; minimalist does not mean omitting correctness feedback.

### Laptop — private control panel

Use four destinations: **Live**, **Event**, **Results**, **Updates**. Open to Live by default. Keep this as an operator workspace rather than a copy of the public screens.

| Destination | Show |
| --- | --- |
| Live | Current state/player, one main next action, ordered eligible queue with mode and readiness, next-live countdown and lobby count when applicable |
| Event | Opening windows/cutoff, live interval/durations, Require email verification switch, capacity and enabled/calibrated game configuration |
| Results | Searchable participant/results list, pending incidents, permitted void/adjudication actions, finalisation and prize collection |
| Updates | Compose/publish action and compact list of published messages with edit/archive controls |

On Live, show **Pause admissions** consistently and context-specific actions such as Confirm present, Skip, Open lobby after this turn, Start live or Cancel lobby. Expose only actions valid in the current state. Keep recovery/end-session actions reachable from a labelled secondary menu with clear consequences. Show verification ON/OFF as a small status link to its Event control, not a repeated explanation. Host-facing eligibility incidents are concise; technical logs open in details only when needed.

The active queue may scroll inside its own region, but primary controls remain visible. Do not add attendance charts, score trends, decorative KPI cards, a giant QR preview or a permanent duplicate game canvas. Provide **Open Join Display** and **Open Play Display** links in setup; the two public browser windows can then be placed on their monitors. Read-only display routes never inherit host authority or expose account details.

### Phones — personal task and controller

Use Play, Leaderboard and Updates as the normal navigation. Focused gameplay replaces the surrounding navigation visually while preserving its state; restoring it after the result does not reset the account or queue.

| Screen | Essential content |
| --- | --- |
| Register | BCU email, course, academic level, required notices and separately optional membership consent; one Continue action |
| Verify, when required | Destination email, code field, Verify; Resend and Change email secondary |
| Play home | Practice/Ranked selection, remaining ranked attempts only when relevant, Enqueue; Join Live when a lobby is open |
| Waiting | Own position, approximate wait, own alias for matching the public callout, Leave queue; Join Live when available |
| Called/briefing | Ready, game-specific short visual guidance and start countdown |
| Debug Dash | Readable code with selectable lines, selected line state, Submit, essential timer/progress |
| Guess The Output | Question/code context, labelled answer options, Submit, essential timer/progress |
| Robot Rescue | Board, controls with unambiguous direction/orientation, current program, Run/Stop and essential timer/progress |
| Submitted/live wait | Locked selection and **Answer submitted** state; wait for the shared reveal |
| Result | Own score/grade, brief outcome, best ranked score/remaining attempts where applicable, Enqueue again and View leaderboard |
| Leaderboard | Full paginated rank/alias/score list, own highlighted position, best score and last-update state; personal attempts in a secondary detail view |
| Updates | Unread indication, message text and timestamp; no promotional filler generated by the application |

Keep question context on phones where students need it to answer reliably; forcing repeated glances at a distant monitor is not useful minimalism. In multiplayer, phones show the same current question and choice labels as Monitor 2; they do not reveal solutions before the common reveal. The monitor remains the shared focal point, while the phone is independently usable by a student with an obstructed view.

Do not duplicate the whole queue or overall leaderboard inside every controller. Return clear actionable feedback for failed enqueue/verification, lost connection and insufficient attempts. Personal profile/recovery settings are secondary access from Play, not another permanent tab. New Updates do not interrupt answers or replace controls mid-game.

### Coherence and acceptance

The same alias, score formatting, eligibility and event state appear consistently across all four surfaces. Monitor 1 can show overall standings while Monitor 2 shows unranked live results; headings must make that distinction explicit. Use independent layout components and shared public selectors so the two displays cannot overwrite each other's presentation.

Check the whole setup together: QR scanning while Monitor 2 animates, top-five standings with ties/long aliases, 50-player live rounds, a solo-to-live-to-solo transition, both display refreshes, host reconnect, keyboard-only operation and lost-network states. Both public monitors fit without scrolling. The laptop keeps operational actions visible. Each phone screen offers a clear next action with no redundant decoration or technical exposition.
