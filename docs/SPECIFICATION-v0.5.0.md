# BCUSCA Welcome Week Arcade — v0.5.0 specification

Status: implementation specification; not a claim of completed implementation or production validation.

This document supersedes conflicting v0.4.0 requirements. It incorporates the agreed pre-launch reset policy, one shared host account, expanded procedural games, conventional player authentication and detailed scoring. “Must” denotes a release requirement. Numerical pacing and balance defaults are proposed product decisions to validate before v1.0.0, not research-established optimums.

## 1. Purpose and scope

Students must be able to join quickly, understand a game without programming experience, enjoy a short challenge and see their results. Hosts must be able to run a busy stall without navigating unnecessary settings. The server must own eligibility, admission, selection, timing, attempts, scores and prizes.

The deployment has two public monitors, one controlling host laptop and students’ phones. One shared solo queue and occasional 2–50-player Live sessions share the gameplay monitor. Live never interrupts an admitted solo turn.

### Included

- Clean pre-launch architecture and database schema; no legacy migrations.
- Email/password player accounts, email verification and password reset.
- A single environment-configured host account with exclusive control and explicit takeover.
- Substantial structural variation in all games, plus Sort the Stream and Signal Switch.
- Robot Rescue multiplayer with private planning and shared execution.
- Personal Practice records, detailed Ranked scoring and confirmed-winner notifications.
- Modular game adapters, server authority, recovery, privacy and release tests.

### Explicitly excluded

- Host registration, host profiles, host approval, Admin accounts and MFA.
- Recovery passwords as the normal player sign-in method.
- Calibration forms or evidence submission in the control panel.
- Promises that every generated game is globally unique or that a score measures intelligence.
- Arbitrary score editing, live changes to Ranked difficulty, and database reset controls on the event dashboard.

## 2. Pre-launch and v1.0.0 boundary

During v0.x, breaking schema changes and deliberate resets of test data are permitted. Backward compatibility with previous prototypes is unnecessary. Resets must use an explicit development command, name the destination database and require confirmation. Production startup and deployment must never clear data automatically.

Development, rehearsal and production must use separate databases, secrets and origins. A local test must never connect accidentally to the real event database.

Before v1.0.0: initialise a clean production database, configure dated event windows and email delivery, verify the host credentials, publish prize/tie rules and perform the release checks in section 18. After real participation begins, retain accounts, attempts, awards and audit records until their agreed cleanup point. Versions and challenge seeds remain useful for reproducibility even without legacy migrations.

## 3. Screens and information hierarchy

| Surface | Primary content | Secondary content |
| --- | --- | --- |
| Join monitor `/display/join` | Large player QR code and short public URL | Ranked top five, next Live status and a current event announcement when present |
| Gameplay monitor `/display/play` | Current wheel, challenge, reveal or results | Current alias/Live participation and essential timer |
| Phone: Play | One next action: sign in, verify, enqueue, ready, control or join Live | Queue position, session state and concise recovery message |
| Phone: Scores | Personal Ranked standing and Practice top ten | Game filter, detailed result and separate recent Live results |
| Phone: Updates | Published host announcements | Unread indicator |
| Phone: Account | Private account details, verification and password controls | Sign out |
| Host: Live | Queue, current turn and next Live controls | Connection/control ownership, admissions state |
| Host: Event | Opening hours, Ranked switch, verification switch and Live pacing | Idle presentation, prize stock and prize instructions |
| Host: Players & Results | Searchable participants, attempts, incidents and prizes | Private identity details and controlled export |
| Host: Updates | Write, edit and archive announcements | Preview |

Phone navigation is Play / Scores / Updates. Account remains a small header action. No extra dashboard, separate notifications tab or duplicated leaderboard route is required.

Use a light, minimalist interface: Poppins, off-white background, charcoal text, restrained solid accents, React Icons only where useful, and Tailwind CSS v4 utilities. No neon, gradients or custom stylesheet rules. SVG geometry and animation attributes are permitted where functional rendering requires them. Python code uses a light syntax-highlighting palette and monospace font, preserving indentation and logical lines when visually wrapped.

Primary actions need at least 44-by-44 CSS-pixel touch targets. Keep labels, focus states and screen-reader names even where symbols communicate visually. Respect reduced motion. Reserve space for transient messages so controls do not move under a finger. Vertical scrolling remains available for small screens and zoom; no clipped content or forced tiny text.

## 4. Player accounts

### 4.1 Registration

Collect Full Name, BCU Email, Password, Course and Academic Year. Generate a safe public alias; the player does not enter a public name. Do not ask for a duplicate confirmation password; provide Show password, password-manager support and inline requirements.

Accept only exact `mail.bcu.ac.uk` and `bcu.ac.uk` domains with a valid local part. Trim surrounding whitespace, apply a documented normalisation policy consistently and enforce a database uniqueness constraint. Do not invent equivalence between different addresses or strip meaningful local-part characters.

Optional membership-email consent is a separate unchecked choice. Explain briefly why private data is collected and when it will be deleted. Registration does not enqueue automatically. Re-registering an existing or pending address never overwrites its password or profile. An owner of an already-claimed pending address can regain control through the mailbox reset flow, revoke previous sessions and review the profile before activating it.

### 4.2 Verification

With verification ON, all solo and Live participation requires a verified mailbox. Signed-in unverified players may read Scores and Updates and see a single verification action on Play.

Send a verification link and a six-digit fallback code. The link works when opened from another browser or email app. A GET only opens the confirmation screen; it does not activate the account. Confirmation requires the initiating authenticated session or re-entry of the registration password, preventing a recipient from unknowingly activating an attacker-created account. Successful confirmation marks the account verified but must not authenticate an unrelated browser. Code entry stays within the initiating signed-in account. Verification expires after 15 minutes. Allow five code guesses per challenge and resend after 60 seconds, with additional account/IP delivery limits. Issuing a replacement invalidates the previous challenge. The UI polls or refreshes verification state so users do not need to sign out and back in.

With verification OFF, valid BCU-format accounts may play without mailbox confirmation. This does not set `verified=true`. Restoring verification holds unverified waiting entries without losing their relative order; exclude them from calling and Live membership. An already-started game may finish. Explain the required action privately.

The switch deliberately weakens eligibility: email format alone does not establish mailbox ownership. Even verification cannot establish one human per account when a person has multiple legitimate BCU addresses. State the actual rule as three Ranked starts per eligible account; duplicate identity concerns require host review, not fingerprinting or claims of perfect prevention.

### 4.3 Sign in and passwords

Returning users sign in using email and password. Keep the session through refreshes and brief network loss. Use password hashing through a maintained implementation, with unique salts and deployment-benchmarked work factors. Never store plaintext player passwords. Allow long passphrases, spaces and password managers; do not silently truncate or impose arbitrary symbol rules. Default minimum: 15 characters; support at least 64 characters, with a documented resource-safe maximum.

Use generic sign-in errors and layered account/IP throttling rather than permanent account lockouts. Authentication must be served over HTTPS in production. These controls follow the [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

### 4.4 Forgotten and changed passwords

“Forgot password?” requests a reset email with the same response whether the account exists or not. Use a cryptographically random, single-use, hashed server-side token expiring after 15 minutes. A newer request invalidates the older token. GET must only show the form: mail scanners must not consume the token. Password replacement and token consumption occur atomically on POST.

After reset, revoke existing sessions and reset tokens, send a change notification and return the player to sign-in. Do not automatically log in the reset browser. Password reset remains email-based when gameplay verification is OFF. Use the configured public origin for links, never a supplied Host header or arbitrary redirect. Keep tokens out of logs and referrer leakage. These reset requirements follow [OWASP’s Forgot Password guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

Changing a known password requires the current password and revokes other sessions. Account recovery never resets attempts, queue membership or scores. Keep email immutable through self-service for this event; the host cannot silently change an email to bypass verification or hand an account to another person.

## 5. One host account and exclusive control

### 5.1 Credentials and powers

The only staff identity is username `host`. Set `HOST_PASSWORD` through the server environment. It must have no default, must not use a frontend-prefixed variable and must never appear in a build, log or API response. Fail production startup when it is missing or weak. Derive a password verifier at startup rather than persisting plaintext in the database. Rotating this credential and restarting invalidates existing host sessions.

No MFA, Admin or registration flow exists. The host manages all event settings, participants, incidents, announcements and prize decisions. Password recovery for this identity means the operator changes the environment secret; there is no public host reset endpoint.

Use secure, HttpOnly, same-site cookies and server-side revocation for both account types. Rotate identifiers at login. Player sessions last up to seven days; host authentication expires after 30 minutes of human inactivity or 12 hours absolute. Heartbeats do not count as human activity. Re-enter the host password for exports, retention cleanup and prize-finalisation corrections when authentication is older than 15 minutes. Session handling follows the [OWASP Session Management guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html); these exact durations are project policy.

### 5.2 Control ownership

Only one host tab may issue operational commands. Authentication and control ownership are separate. A valid cookie alone does not confer control.

Maintain a server-owned lease containing host session ID, a server-issued tab/controller identifier, an increasing control epoch and expiry. The controlling tab heartbeats every five seconds; the lease expires after 30 seconds without renewal. Heartbeats are bound to the current session, controller and epoch. Secondary tabs are read-only and cannot renew another tab’s lease. Public monitors require no host session.

Every host mutation must verify the current lease and epoch inside the same serialised transaction as the mutation. Stale WebSockets, HTTP retries and in-flight commands cannot bypass this check. Read-only connections must not receive command authority through a browser-shared token. Bind control claims to the individual connection/tab and test duplicated-tab behaviour.

### 5.3 Takeover

Validate credentials before disclosing host-session status. If a lease is active, show:

> Host controls are open elsewhere. Taking over will sign out the other session. Games and the queue will continue.

Actions: **Cancel** and **Take over**.

Credential validation must not overwrite the existing host cookie before takeover is confirmed. Issue a short-lived takeover challenge bound to the requesting browser and observed epoch. Confirmation atomically checks that epoch, revokes the former controlling session, increments the epoch and grants the new lease. If ownership changed in the meantime, show the confirmation again; a stale confirmation must not evict a newer controller.

Notify the former screen: “Host control moved to another session.” Disable its controls immediately, but rely on server rejection for enforcement. A completed command remains completed; a command that lost authority before commit is rejected. Retrying never duplicates an action.

A second tab in the same authenticated browser shows “Host controls are open in another tab” and **Take control here**. Transfer the lease, not the browser-wide cookie; revoke that former tab’s control without unnecessarily signing out the new one.

Refresh may reclaim the same tab’s lease after server validation. Brief loss does not pause gameplay. After lease expiry, a returning tab must explicitly reacquire control and cannot steal it from a newer holder. Sign-out releases its own lease immediately. Server restart invalidates all control leases. Shared credentials provide session-level accountability, not proof of which committee member acted.

## 6. Queue, attempts and scheduling

- One queue entry per account, across Practice and Ranked. One entry grants one solo session.
- Completing a turn returns the phone to its result and an explicit Enqueue again action; never auto-requeue.
- Practice is unlimited. Ranked grants three actual starts per account across all event days.
- Charge the start atomically when the server enters gameplay, after wheel and countdown. Refresh, duplicate Ready, failed delivery or a no-show must not charge twice.
- Persist a selected Ranked game through abandoned unstarted turns and technical replacements; leaving after selection cannot obtain a reroll.
- A started abandoned, timed-out or client-disconnected attempt remains used. A documented server fault may be voided by the host with a reason; preserve that game for the replacement.
- Ranked On/Off gates new admissions only. Existing admitted turns may finish. Paused admissions does not pause active game clocks.
- Show specific admission reasons: outside opening hours, paused, Ranked off, verification required, no attempts left or insufficient remaining event time. Do not label every failure “Admissions closed”.

Opening windows use explicit dated instants and Europe/London presentation. Validate start < cutoff < close and prevent overlapping windows. Never infer the event schedule from a weekday without dates.

Live defaults to five minutes of solo time after the previous Live session ends. Interval may be 180–900 seconds; lobby 15–45 seconds; question/planning multiplier 0.75–1.5. These changes apply to future sessions only. “Open live lobby” during solo makes it pending; “Delay live” adds 60 seconds. Pending Live yields at least one queued eligible solo turn between Live sessions.

A new lobby or solo admission requires sufficient time for its worst-case remaining duration before close. Queue estimates must use adapter-specific timing bounds, pending Live time and a safety margin. Exclude held ineligible entries from playable capacity estimates, while making their status visible to the host. Do not silently increase timers after poor network delivery.

## 7. Game catalogue and extension contract

| Game | Solo | Live | Primary skill |
| --- | --- | --- | --- |
| Guess the Output | Yes | Yes | Tracing state and execution |
| Debug Dash | Yes | Yes | Finding a faulty operation |
| Robot Rescue | Yes | Yes | Sequencing and route planning |
| Sort the Stream | Yes | Yes | Designing compare/swap sequences |
| Signal Switch | Yes | Yes | Conditions and routing |

All five games ship in v0.5.0. Practice and Live enablement precede Ranked inclusion. Ranked eligibility is a release configuration, not an arbitrary mid-event host toggle per game. The host sees one Ranked play switch; no calibration forms.

Each adapter defines ID/name, supported modes, content/scoring version, level profiles, bounded generation, private solution/validator, public projection, allowed actions, deterministic evaluation, timing bounds and result presentation. Keep shared queue/auth/score/session logic outside game modules. Frontend renderers use explicit interaction types rather than importing server solvers.

There is one server registry and one shared presentation catalogue; adding a game must not require editing unrelated authentication, queue or timing branches. Private keys, solutions, seeds sufficient to reconstruct solutions and future challenges must not appear in player bundles or public snapshots. Game evaluators accept constrained structured inputs, never executable client code.

## 8. Challenge variety and correctness

Replace a small fixed bank with structural generators. Changing variable names, colours or numbers alone does not meet this requirement.

Coding games need at least 12 structural families each across their difficulty bands: combinations of indexing, accumulation, branching, loops, string/list operations and bounded function behaviour. Debug families must have a clearly intended faulty logical line; avoid questions whose randomly chosen inputs hide the fault. Use simple prompts ending “Which line needs changing?”. Live questions require no prior knowledge beyond the brief game demonstration and the shown Python constructs.

Puzzle generators vary meaningful topology, dependency patterns, route constraints and optimum solution length. Difficulty includes branching, misleading but honest alternatives, program length and inference steps, not just board dimensions.

For each game, sample at least 10,000 seeds across its supported bands in automated validation. Require at least 99% unique canonical challenge fingerprints in that sample, excluding cosmetic renaming and equivalent symmetric copies where applicable. Report family coverage separately; passing uniqueness is not proof of educational variety or equal difficulty. Store the benchmark and generator version in development documentation.

Avoid a player’s last 100 exact challenge fingerprints across Practice and Ranked, and avoid immediately repeating the same structural family when alternatives exist. Generation has a bounded retry/time budget; use a validated equivalent-difficulty fallback pool on exhaustion. Never hang a game or insert an unvalidated harder puzzle. Bounded fallback may repeat a challenge; do not promise absolute global uniqueness.

Each session has a persisted seed and difficulty profile. Validate solutions at generation time, not after gameplay starts. Coding reference answers are checked against an isolated, bounded Python test harness during development; production does not execute arbitrary Python. Puzzle tests establish reachability, legal actions and optimum costs using independent solver checks where feasible.

Practice and Ranked use the same concepts and difficulty progression, with fresh instances. Practice should improve understanding. Higher difficulty must not mean hidden controls, false walls or obscure wording.

## 9. Solo game mechanics

### Guess the Output and Debug Dash

One final submission per challenge. Selecting an option or line is editable until Submit. Disable repeated submission while acknowledging it. Correct, incorrect and timeout feedback is prominent on phone and monitor and lasts three seconds; show the correct answer/line. Feedback never consumes answering time.

### Robot Rescue

Keep Clear / Up / Remove in the top control row and Left / Down / Right below; full-width Run/Stop follows, then count/edit status and a bounded sequence. Remove deletes the selected move, otherwise the last. Preserve drafts during transient errors. Each run starts from the original square; no partial-progress accumulation.

A submitted route is evaluated deterministically by the server. Successful completion time is the accepted submission time, not the time a phone finishes animating it. A successful execution is visualised within the three-second reveal. Failed runs consume planning time, leave the draft editable and award nothing. Maximum program length and evaluation cost are bounded.

### Sort the Stream

Show a short input row and a program made of pairwise compare/swap instructions. A compare/swap places the lower value first in its chosen pair. Players build a reusable program that sorts the displayed row and its published permutations; the rule explicitly states that one example alone is insufficient. Start with three distinct items and adjacent comparisons; introduce larger rows and broader comparisons progressively.

Solo allows Run tests while its planning clock continues; show which published test remains unsorted. Reward successful programs with fewer instructions, measured against a proven optimum for that generated challenge. Live accepts one locked program, evaluated against the same published test set for everyone. No hidden test cases with unstated requirements.

### Signal Switch

Show packets with visible attributes, a small routing graph and labelled destinations. Players configure conditions on junctions so all displayed packets reach their matching destination. Teach the first predicate visually, then combine conditions and limited routing options. All packets and required destinations are visible; nothing depends solely on colour.

Solo permits testing while the planning clock continues; Live evaluates once after locking. Bound graph size and reject cycles or handle them with a fixed hop limit. Generated puzzles must be solvable. Equivalent correct configurations earn equal correctness credit; efficiency uses total traversed edges across the displayed packets, compared with the solver-proven minimum for that same graph and packet set, not equality with one hidden answer.

## 10. Live multiplayer

### Shared flow

Announcement/lobby → membership closes → ten-slot wheel → game reveal/countdown → rounds → winners → solo resumes.

The server selects uniformly among enabled Live games after closing membership. Decorative slot counts never determine odds. Ten sectors repeat eligible game labels without adjacent repeats where feasible. The selected game name is hidden until the server advances from the three-second spin to the three-second countdown. Reduced motion shows a neutral wheel before reveal. Idle wheel rotation remains continuous, with a host disable switch.

Freeze eligible roster membership at lobby close. Below two players: cancel with a brief message and resume solo; no score or prize. Disconnected admitted players retain membership and may return before deadlines. No joins after selection, and no removed answer to accelerate a round.

### Coding Live

Six rounds, one locked answer per account per round. Reveal correctness only when the deadline passes or all roster members answer after at least two seconds. Show each phone its own feedback; show the shared answer and aggregate responses on the monitor. No public correct/incorrect signals before closure.

### Puzzle Live, including Robot Rescue

Three rounds. Everyone receives the identical puzzle and constraints within a round, with independent state. Private planning and editing → lock program/configuration → shared execution → result. No public routes, switch configurations or intermediate correctness during planning. Phones may show “Locked”; they must not reveal whether the answer is correct early.

The main screen shows planning time and locked/total count. After closure, render shared execution within four seconds, then a three-second result. Robot markers use a stable symbol/number plus colour for the session. Robots do not collide. Group overlapping markers with a count and highlight finishers; do not draw 50 permanent crossing paths. Phones always identify their own robot clearly. Sort and Signal reveals use the same score summary but game-specific execution visualisation.

All-zero results award no instant prize. For a tied highest Live score, recognise joint winners; if stock cannot cover them, use a disclosed random draw among the tied winners and persist the draw outcome. Never choose by join order. Live has its own score totals and cannot affect Ranked or solo Practice records.

## 11. Timing and scoring

### 11.1 Fixed timing profile

| Phase | Default |
| --- | --- |
| Called-player Ready window | 20 seconds |
| Selection / subsequent countdown | 3 seconds each |
| Solo active answering/planning budget | 90 seconds for every game |
| Solo challenge caps, levels 1–9 | 8, 8, 10, 10, 12, 12, 15, 15, 20 seconds |
| Solo feedback | 3 seconds per presented challenge |
| Solo result | 6 seconds |
| Live coding rounds | 15, 15, 20, 20, 25, 25 seconds |
| Live puzzle planning rounds | 30, 35, 40 seconds |
| Live puzzle execution / reveal | Up to 4 seconds / 3 seconds |
| Live winners | 8 seconds |
| Idle decorative rotation | Continuous; 24 seconds per revolution |

These solo defaults replace v0.4’s 75-second coding and 100-second robot budgets. At each challenge start, its effective allowance is min(level cap, remaining session budget). Subtract actual active elapsed time on accepted completion, timeout or failed-run progression; feedback is excluded exactly once. Timeout gives zero, shows feedback and advances if session time remains. Early answers save time for later levels. Wrong answers also consume actual elapsed time but award zero. Skipping difficult questions may reach later ones but cannot score skipped levels.

All deadline comparisons use server authority. A submission received at or after its deadline is too late. Persist phase IDs and deadlines; client animations never advance the server. Measure response time from the scheduled challenge opening to server receipt, excluding prior loading/countdown. Do not trust client timestamps or grant client-claimed latency refunds. Preload generic assets, not secret questions. Track delivery latency during rehearsal; millisecond precision cannot eliminate network advantage.

A full solo slot is bounded by 20 + 3 + 3 + 90 + 27 + 6 = 149 seconds under normal scheduling; budget 160 seconds for queue admission. Default Live coding is at most 172 seconds, puzzle Live at most 160 seconds. Recompute bounds for every permitted Live multiplier/lobby duration and include an additional closing safety margin. A server stall follows recovery rules instead of extending the event indefinitely.

### 11.2 Score formula

Use nine level maxima, summing to 9.00:

`0.30, 0.40, 0.50, 0.60, 0.80, 1.00, 1.40, 1.80, 2.20`

This reserves a substantial part of the score for harder levels. It does not establish their real difficulty; level profiles require playtesting.

Let `R = clamp(1 - elapsedMs / effectiveAllowanceMs, 0, 1)`.

- Coding: correct before deadline earns `levelMaximum × (0.80 + 0.20 × R)`; otherwise zero.
- Puzzles: valid completion before deadline earns `levelMaximum × (0.80 + 0.15 × E + 0.05 × R)`; otherwise zero.
- `E` is the proven optimum cost divided by the submitted solution cost, clamped to 0–1. A puzzle with no meaningful efficiency dimension uses `E=1`; no invented penalties for equivalent solutions.
- Failed runs cannot accumulate score. Test/retry time remains charged. Faster correctness earns more, but blind speed cannot replace solving.

Multiple-choice luck remains possible with one submission. Do not claim the formula eliminates guessing. Measure random-answer baseline performance and top-score frequency. Do not add obscure questions or hidden negative marking to manufacture rarity.

Store integer score units at 1,000,000 units per displayed point, with one documented rounding operation per challenge. Sum stored units; do not repeatedly round displayed decimals. Rank by the exact total of the best Ranked attempt, not the sum of three attempts. Practice improvement also compares exact units within the same game/rules version. Equal exact scores share ranks.

Display two decimals normally. If different exact scores round to the same displayed number, retain their true order and offer a compact result breakdown showing accuracy, efficiency where relevant and time contribution. Do not silently break ties by earliest participation or account ID.

Grade boundaries use the displayed, rounded score so text and number agree:

| Displayed score | Grade |
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

The intended distribution is that strong ordinary performance is around 6, with 7–9 increasingly rare. Establish that through challenge difficulty and measured performance, not a claim that 9 identifies genius. Exact ties at a grand-prize boundary require the published playoff procedure; use a disclosed draw only if the published rules permit it.

Live reuses correctness/efficiency/time factors with per-round weights normalised to 1,000 total points for that Live session. Its score is a separate competition and never presented as equivalent to a 0–9 solo result.

### 11.3 Balance policy

Freeze game eligibility, content versions, solo timings, level weights and scoring formula for an actual Ranked event. Host timing controls affect Live only. Record development comparisons of medians, upper percentiles, completion rates, random-answer outcomes and score/time correlations across games. Investigate systematic differences before enabling a new game in Ranked. No evidence upload or calibration button exists in the host UI.

## 12. Personal results and prizes

Practice top ten lists the player’s highest ten valid solo Practice session scores across enabled games, with game, date and grade; game filtering makes personal comparison clear. Separate recent Live results from this list. Abandoned/timed-out Practice sessions may retain earned scores and must be labelled; interrupted/voided sessions cannot set records.

A completed transaction that beats the player’s previous exact per-game best creates one “New personal best” event. The first result says “First score”, not “New record”. If the improvement rounds to the same two decimals, describe it as a faster/better personal best with the detailed score available. No blocking celebration during play. Persist notification IDs and acknowledgements so reconnects do not repeatedly celebrate.

Host Players & Results shows full name, email, course, academic year, verification status, alias, Ranked usage, individual attempts, best score and award status. Details are protected on the server and absent from public snapshots. Escape exported spreadsheet cells that could execute formulas. Do not add academic details to the public leaderboard.

Finalisation requires the queue and active sessions to finish, unresolved scoring incidents to be reviewed, and prize-boundary ties to be settled. Persist an immutable final standings snapshot and prize assignments in the same transaction. An outbox queues one instructions email and one in-app award notification per recipient, with idempotent retry.

Confirmed winners get a full-screen dismissible celebration: “You won a grand prize”, followed by concise collection guidance. Distinguish instructions queued, email sent and delivery needing attention; SMTP acceptance is not proof of inbox arrival. Show the registered email privately and retain a prize card after dismissal. Offline winners see it on next sign-in. A temporary top-three position never triggers this award screen.

Hosts can mark collection once after confirming identity. Prize corrections require password re-entry, a reason, conflict checking against already collected awards and a follow-up notification; do not silently erase an already-announced prize. No direct score editing.

## 13. Privacy and retention

Names, emails and account metadata are private to that player and the controlling host’s authorised views. Aliases and scores are public. Attendance reports aggregate course and academic year; suppress or combine very small groups before calling an output anonymous. Aggregate reporting must not expose the underlying attendee list.

Set an explicit cleanup date after Welcome Week and prize distribution. The host reviews unresolved prizes before confirming cleanup. Delete personal records, tokens, queued sensitive messages and exports according to the retention plan; account for backups in that plan. Keep only genuinely non-identifying attendance totals. Marketing consent is optional and independent from access to games; no automatic membership mailing.

## 14. Architecture and server safeguards

Use a single application service serving React, API and Socket.IO from one configured origin, backed by transactional persistent storage. Run one event scheduler/application instance for launch; fail deployment checks that accidentally configure multiple independent schedulers. Do not claim multi-instance safety without distributed coordination.

Separate modules for authentication, eligibility, host control leases, queue/scheduling, game registry/adapters, scoring, projections, notifications/mail, persistence and frontend screens/components. Keep secrets and solvers in server-only modules. Version API payloads and validate command shapes, lengths, enum values, membership and phase permissions.

All mutable commands carry an idempotency key and expected session/phase identifiers. Scope duplicate detection to the actor and payload; a reused key with a different payload is rejected. Check authorisation before replaying cached sensitive responses. Database transactions protect admission, attempt consumption, takeover, scoring, award creation and notification state. Settings use revision checks to avoid overwriting concurrent changes.

Protect state-changing HTTP calls against CSRF and validate WebSocket origins and authentication. Rate-limit expensive operations and payload size, not just login. Use parameterised database queries. Never render announcement text as raw HTML. Do not log passwords, reset tokens, complete private snapshots or bearer credentials. Public endpoints receive explicit allowlisted projections, never a full object with a few fields deleted.

Maintain a small durable mail outbox with retries, backoff and host-visible failure state. Encrypt sensitive queued mail payloads at rest and protect the mail key separately. Sanitize infrastructure error responses; provide useful user-facing next actions without exposing internal traces.

## 15. Connection and recovery behaviour

Show “Reconnecting…” only while connection recovery is occurring. Preserve draft inputs locally for the same challenge, but never replay an answer automatically against a newer challenge. Resume from an authoritative snapshot after reconnect or visibility change; stale revisions cannot overwrite newer state.

An account may sign in on another device, but only one controller owns its active game input at a time. Moving control to another device preserves the attempt, deadline and submitted answer. Additional devices may view results; server checks prevent multiple answer streams. Shared phones must sign out before changing participants.

An accepted answer remains accepted if its response was lost; retry returns the same result. Late answers are rejected with the current phase. Ordinary disconnections, tab backgrounding and slow phones do not refund Ranked starts or pause the clock.

After an unexpected server restart or a scheduler stall longer than three seconds: pause admissions, invalidate host control leases, preserve earned results, mark in-progress solo attempts interrupted and cancel unfinished Live rounds without inventing winners. Preserve already completed winner/award records. Unstarted selections retain their game but require fresh host/player readiness. The host reviews incidents and explicitly resumes. A technical void requires a reason and retains the selected replacement game.

Health checks cover process, storage and scheduler responsiveness. Host status shows actionable email/storage/connectivity failures without technical clutter on public displays. Backups and restore rehearsal are required before v1.0.0; a restore must not silently resurrect collected prizes or spent attempts.

## 16. Host usability details

Use plain labels: Open admissions / Pause admissions, Ranked play, Require email verification, Next live game, Lobby duration, Question time, Players & Results and Finish event. Disable unavailable actions with one specific explanation.

Settings apply on Save settings; show confirmation and the next scheduled lobby time. Preview affects only the host. Finalisation, takeover, credential re-entry and data cleanup warrant confirmation; ordinary queue actions should not require repetitive dialogs.

Playoff arrangements and prize email text are configured separately from Ranked enablement. Before finalising, missing required collection instructions or tie resolution must be explained at the point of action.

## 17. Implementation order

1. Clean schema, conventional player authentication, shared host identity and exclusive lease enforcement.
2. Authoritative phase/scoring contracts, exact score storage, public projections and command idempotency.
3. Procedural coding/puzzle generators with bounded validators and content checks.
4. Robot Rescue Live, then Sort the Stream and Signal Switch using the shared adapter contract.
5. Personal records, private host results, confirmed-award notifications and email delivery state.
6. Full interface integration, fault injection, balance rehearsal and v1.0.0 readiness review.

Do not combine unfinished game adapters with a working launch path through ad hoc exceptions. A game without passing validation stays excluded from its unsupported release modes; document any scope reduction rather than claiming it shipped.

## 18. Acceptance and launch checks

### Authentication and ownership

- Existing email cannot create a second account; verification OFF never marks mailbox ownership verified.
- Verification works through a separate email browser and the fallback code; expiry, guess limits and resend invalidation are tested.
- Reset links survive mail-scanner GETs but cannot be reused after successful POST; old sessions stop working.
- Wrong host credentials reveal no lease status. Two simultaneous login/takeover requests produce one owner.
- The former controller’s HTTP, WebSocket and already queued commands cannot mutate state after takeover commits.
- Refresh, duplicated tabs, browser close, sleeping laptop, expired lease, stale takeover confirmation and server restart all preserve single-controller enforcement.

### Game and scoring integrity

- Per-game seed benchmarks and independent answer/solver checks meet section 8; invalid generation falls back within a bounded time.
- Identical persisted inputs reproduce identical scores. Test zero-time, deadline-minus-one-ms, exact deadline, duplicate answer, failed puzzle run and remaining-budget exhaustion.
- Answering time excludes each feedback interval exactly once; reload never grants extra time.
- No future answers, reconstructable seeds, private routes or early Live correctness appear in client bundles or public projections.
- Practice, Ranked and Live records cannot mix; toggles and account recovery never replenish Ranked attempts.
- The selected game is not explicitly revealed before spin ends on phone, host status or public monitor.

### Experience and operations

- Test real Android Chrome and iPhone Safari, not only resized desktop Chromium; verify refresh/background/reconnect while spinning and playing.
- Check 320/360/390-pixel phones, 720p/1080p monitors, keyboard navigation, enlarged text, reduced motion and screen-reader names.
- Robot controls stay fixed as routes wrap. Long Python lines remain readable and copy as original source.
- Run 50 authenticated Live participants through complete coding and puzzle sessions against the intended deployment. A connection-only test does not qualify.
- Exercise packet delay/loss, storage errors, scheduler stalls, SMTP failure and resuming after host takeover. Under the representative load, target p95 command acknowledgement below 500 ms with no lost or duplicate accepted commands; record actual results and environmental limits.
- Check mailbox delivery for both BCU domains, public QR reachability and venue networking.
- Finalise tied and untied fixtures; verify one notification/email per award, offline delivery, dismissal persistence and one-time collection.
- Verify clean production initialisation and a backup restore; no normal startup path deletes data.

### Balance and release decision

Use representative beginners and experienced students to compare games, not just the developers. Record difficulty distributions and practical duration. The goal is learnable controls with difficult later problems, not confusion. A near-deadline release date must not be presented as evidence that untested competition rules are fair.

v1.0.0 is released when the core flows, security invariants, real-device rehearsal and enabled-game validation pass. This specification authorises implementation choices; it does not assert those checks have already passed.


## Implementation refinement

Sort the Stream uses a seeded damaged comparison program and an edit budget, with all eight test rows visible. This closes the universal-program repetition loophole while preserving the sorting/programming objective. Correct programs are validated against every published row. Sort and Signal ship in Practice and Live; their release Ranked flags remain off until representative balance validation. The shared scoring framework does not by itself establish cross-game fairness.
