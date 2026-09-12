import { SCORING_VERSION } from '../../shared/catalog.js';
import { attendanceSummary } from '../attendance.js';
import {
  secret,
  hash,
  sessionFor,
  revokeAccountCredentials,
  requireValue as assert,
  textValue,
} from '../security.js';
import { usedAttempts, leaderboard, openWindow, log } from '../state.js';
import {
  eligible,
  requireEligible,
  requireOpen,
  staffFor,
  liveStart,
  endLive,
  holdUnverified,
  canStartLive,
  liveDue,
  queueFits,
} from '../runtime.js';
const uuid = () => crypto.randomUUID();
export function hostCommand(s, action, p, ctx, now, services) {
  const privileged = [
    'void',
    'finalise',
    'reopen',
    'resolveIdentity',
    'collect',
    'forfeitAward',
    'purge',
    'adjudicateTie',
  ];
  const staff = staffFor(
    s,
    ctx,
    now,
    privileged.includes(action) ? ['adjudicator', 'admin'] : undefined,
  );
  if (privileged.includes(action))
    assert(
      now - sessionFor(s, ctx.token, now).created < 1800000,
      'Sign in again before this sensitive action.',
      401,
    );
  const reason = textValue(p.reason, 500);
  if (action === 'pair') {
    assert(p.identityConfirmed === true, 'Confirm the participant is present.');
    const account = s.accounts[p.accountId];
    requireEligible(s, account);
    assert(
      s.queue.some((q) => q.accountId === account.id) || s.active?.accountId === account.id,
      'Enqueue this participant before assigning a controller.',
    );
    for (const [key, value] of Object.entries(s.sessions))
      if (value.accountId === account.id && value.controller) delete s.sessions[key];
    s.controllerGrants ||= {};
    for (const grant of Object.values(s.controllerGrants))
      if (grant.accountId === account.id) grant.used = true;
    const turn = s.queue.find((q) => q.accountId === account.id) || s.active;
    const code = secret(6);
    s.controllerGrants[hash(code)] = {
      accountId: account.id,
      sequence: turn.sequence,
      expires: now + 300000,
      used: false,
    };
    log(s, staff.id, action, { accountId: account.id }, now);
    return { pairingCode: code };
  } else if (action === 'assistedEnqueue') {
    const account = s.accounts[p.accountId];
    requireEligible(s, account);
    assert(p.identityConfirmed === true, 'Confirm participant identity.');
    assert(['practice', 'ranked'].includes(p.mode), 'Choose a mode.');
    requireOpen(s, now, p.mode);
    assert(
      !s.queue.some((q) => q.accountId === account.id) && s.active?.accountId !== account.id,
      'Participant is already queued or playing.',
    );
    assert(p.mode !== 'ranked' || usedAttempts(s, account.id) < 3, 'No ranked attempts remain.');
    assert(
      s.queue.length < s.config.capacity && queueFits(s, now, openWindow(s, now)),
      'There is no queue capacity for another turn.',
    );
    s.queue.push({
      accountId: account.id,
      mode: p.mode,
      admitted: now,
      sequence: s.nextSequence++,
    });
  } else if (action === 'call') {
    assert(!s.active && !s.live && !s.config.paused, 'Another turn or live event is active.');
    assert(!liveDue(s, now), 'The live lobby is due.');
    const next = s.queue
      .filter((q) => eligible(s, s.accounts[q.accountId]))
      .sort((a, b) => a.sequence - b.sequence)[0];
    assert(next, 'No eligible player is waiting.');
    s.queue = s.queue.filter((q) => q !== next);
    s.active = { ...next, phase: 'called', until: now + 20000 };
    s.accounts[next.accountId].attendedAt ||= now;
  } else if (action === 'skip') {
    assert(reason, 'Give a short reason.');
    if (p.accountId) s.queue = s.queue.filter((q) => q.accountId !== p.accountId);
    else {
      assert(
        s.active && s.active.phase !== 'playing',
        'Use the incident action for an active game.',
      );
      s.active = null;
    }
  } else if (action === 'settings') {
    const oldInterval = s.config.interval,
      oldAuto = s.config.autoLive;
    assert(
      ![
        'scoringVersion',
        'feedbackSeconds',
        'resultSeconds',
        'duration',
        'questionBank',
        'calibrationVersion',
      ].some((key) => key in p),
      'Competitive timing and scoring require a versioned release and compatible scoring version.',
    );
    assert(
      p.revision === s.config.policyVersion,
      'Settings changed in another tab. Refresh and try again.',
      409,
    );
    if ('rankedEnabled' in p) {
      assert(typeof p.rankedEnabled === 'boolean', 'Choose Ranked on or off.');
      assert(!p.rankedEnabled || !s.config.finalised, 'Reopen results before enabling Ranked.');
      assert(
        !p.rankedEnabled || s.config.scoringVersion === SCORING_VERSION,
        'Update the server before enabling Ranked.',
      );
      s.config.rankedEnabled = p.rankedEnabled;
    }
    for (const [key, min, max] of [
      ['interval', 180, 900],
      ['lobbySeconds', 15, 45],
      ['capacity', 1, 100],
      ['instantPrizes', 0, 500],
    ])
      if (key in p) {
        assert(Number.isInteger(p[key]) && p[key] >= min && p[key] <= max, `Invalid ${key}.`);
        s.config[key] = p[key];
      }
    for (const key of ['paused', 'autoLive', 'requireVerification', 'animateIdleWheel'])
      if (key in p) {
        assert(typeof p[key] === 'boolean', `Invalid ${key}.`);
        s.config[key] = p[key];
      }
    if ('liveTimeScale' in p) {
      assert(
        Number.isFinite(p.liveTimeScale) && p.liveTimeScale >= 0.75 && p.liveTimeScale <= 1.5,
        'Invalid live time scale.',
      );
      s.config.liveTimeScale = p.liveTimeScale;
    }
    if ('idlePresentation' in p) {
      assert(
        ['text', 'wheel', 'both'].includes(p.idlePresentation),
        'Choose an idle presentation.',
      );
      s.config.idlePresentation = p.idlePresentation;
    }
    if ('windows' in p) {
      assert(Array.isArray(p.windows) && p.windows.length <= 10, 'Invalid opening windows.');
      for (const w of p.windows)
        assert(
          [w.start, w.cutoff, w.end].every(Number.isFinite) &&
            w.start < w.cutoff &&
            w.cutoff < w.end,
          'Each window needs start < cutoff < end.',
        );
      s.config.windows = p.windows;
    }
    for (const key of ['playoffAt', 'playoffLocation', 'replyDeadline'])
      if (key in p) s.config[key] = textValue(p[key], 160);
    if (s.config.interval !== oldInterval || s.config.autoLive !== oldAuto)
      s.config.nextLobbyAt = now + s.config.interval * 1000;
    s.config.policyVersion++;
    if (s.config.requireVerification) holdUnverified(s, now);
    s.updates.push({
      id: uuid(),
      title: 'Event settings updated',
      body: 'Check Play for current admission and live-game availability.',
      at: now,
      system: true,
    });
  } else if (action === 'openLive') {
    assert(!s.live, 'A live event is already active.');
    assert(
      canStartLive(s, now),
      'Live admissions are closed or there is insufficient time before closing.',
    );
    if (
      s.active ||
      (s.config.soloAfterLive && s.queue.some((q) => eligible(s, s.accounts[q.accountId])))
    ) {
      s.config.livePending = true;
      s.config.nextLobbyAt = now;
    } else liveStart(s, now);
  } else if (action === 'cancelLive') {
    assert(reason, 'Give a reason.');
    s.config.livePending = false;
    endLive(s, now, reason);
  } else if (action === 'delayLive') {
    assert(!s.live, 'A live event is already active.');
    s.config.nextLobbyAt = Math.max(now, s.config.nextLobbyAt) + 60000;
  } else if (action === 'incident') {
    assert(reason, 'Describe the fault.');
    assert(s.active?.phase === 'playing', 'No game is active.');
    const attempt = s.attempts.find((a) => a.id === s.active.attemptId);
    Object.assign(attempt, { status: 'interrupted', score: s.active.game.score, ended: now });
    s.incidents.push({ id: uuid(), attemptId: attempt.id, reason, at: now, resolved: false });
    s.active = null;
    s.config.paused = true;
  } else if (action === 'void') {
    assert(reason, 'Record evidence for the technical void.');
    assert(!s.config.finalised, 'Reopen finalisation first.');
    const attempt = s.attempts.find((a) => a.id === p.attemptId);
    assert(attempt && attempt.status !== 'started', 'Choose a finished or interrupted attempt.');
    if (attempt.status === 'voided') return {};
    const previous = s.attempts.filter(
      (a) => a.accountId === attempt.accountId && a.status === 'voided',
    ).length;
    assert(previous < 1 || staff.role === 'admin', 'A repeated void requires an administrator.');
    attempt.status = 'voided';
    attempt.voidReason = reason;
    attempt.voidBy = staff.id;
    s.accounts[attempt.accountId].pendingGame = attempt.gameId;
    s.accounts[attempt.accountId].replacementOf = attempt.id;
    for (const incident of s.incidents)
      if (incident.attemptId === attempt.id) incident.resolved = true;
  } else if (action === 'update') {
    const title = textValue(p.title, 100),
      body = textValue(p.body, 1500);
    assert(title && body, 'Enter a title and message.');
    const update = s.updates.find((u) => u.id === p.id);
    if (update) {
      update.title = title;
      update.body = body;
      update.edited = now;
    } else s.updates.push({ id: uuid(), title, body, at: now });
  } else if (action === 'archiveUpdate') {
    const update = s.updates.find((u) => u.id === p.id);
    assert(update, 'Message not found.');
    update.archived = true;
  } else if (action === 'finalise') {
    if (s.config.finalised) return {};
    assert(
      !s.active &&
        !s.live &&
        !s.queue.length &&
        !s.attempts.some((a) => a.status === 'interrupted'),
      'Finish the queue and resolve interrupted attempts first.',
    );
    const rows = leaderboard(s);
    assert(rows.length > 0, 'There are no ranked results.');
    const boundary = rows[2]?.score;
    const tied = boundary === undefined ? [] : rows.filter((r) => r.score === boundary);
    const above = boundary === undefined ? [] : rows.filter((r) => r.score > boundary);
    let chosen = rows.slice(0, 3);
    if (above.length + tied.length > 3) {
      assert(
        Array.isArray(p.winnerIds) &&
          p.winnerIds.length === 3 - above.length &&
          new Set(p.winnerIds).size === p.winnerIds.length &&
          p.winnerIds.every((id) => tied.some((r) => r.accountId === id)) &&
          reason.length >= 20,
        'Record the published playoff/draw outcome and select only the tied prize recipients.',
      );
      chosen = [...above, ...tied.filter((r) => p.winnerIds.includes(r.accountId))];
    }
    assert(
      !s.awards.some(
        (a) =>
          a.type === 'grand' && a.collected && !chosen.some((r) => r.accountId === a.accountId),
      ),
      'A collected prize is affected. Resolve the physical prize with the event lead before changing recipients.',
    );
    s.awards = s.awards.filter((a) => a.type !== 'grand' || a.collected);
    for (const row of chosen)
      if (!s.awards.some((a) => a.type === 'grand' && a.accountId === row.accountId)) {
        s.awards.push({
          id: uuid(),
          type: 'grand',
          accountId: row.accountId,
          at: now,
          collected: false,
        });
        s.outbox.push({
          id: uuid(),
          payload: services.mail.seal({
            email: s.accounts[row.accountId].email,
            subject: 'BCUSCA Arcade prize',
            text: 'You have been selected for a BCUSCA Arcade grand prize. Open the Arcade on your signed-in device and speak to the event team to confirm your identity and arrange collection.',
          }),
          sent: false,
          next: now,
          tries: 0,
        });
      }
    s.config.finalised = true;
  } else if (action === 'reopen') {
    assert(reason, 'Record the correction reason.');
    s.config.finalised = false;
  } else if (action === 'collect') {
    assert(p.identityConfirmed === true, 'Confirm the claimant and account identity.');
    const award = s.awards.find((a) => a.id === p.id);
    assert(award, 'Award not found.');
    if (award.collected) return {};
    assert(!award.forfeited, 'This award has been closed without collection.');
    if (award.type === 'instant') {
      const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(now);
      assert(s.config.instantPrizes > 0, 'No instant prizes remain.');
      assert(
        !s.awards.some(
          (a) => a.accountId === award.accountId && a.type === 'instant' && a.collectedDay === day,
        ),
        'This account already collected today.',
      );
      award.collectedDay = day;
      s.config.instantPrizes--;
    }
    award.collected = true;
    award.collectedAt = now;
    award.collectedBy = staff.id;
  } else if (action === 'forfeitAward') {
    const award = s.awards.find((a) => a.id === p.id);
    assert(
      award && !award.collected && reason.length >= 20,
      'Select an uncollected award and record the reason.',
    );
    award.forfeited = true;
    award.forfeitReason = reason;
    award.closedAt = now;
  } else if (action === 'resolveIdentity') {
    assert(
      reason.length >= 20 && p.identityConfirmed === true,
      'Record the identity check and correction evidence.',
    );
    const a = s.accounts[p.accountId];
    assert(a && !s.active && !s.live, 'Resolve identity while no game is active.');
    // Recovery is issued to the operator privately; does not mark email verified.
    const recovery = secret(20);
    a.recoveryHash = hash(recovery);
    revokeAccountCredentials(s, a.id);
    log(s, staff.id, action, { accountId: a.id, reason }, now);
    return { recovery };
  } else if (action === 'purge') {
    if (s.purgedAt) return {};
    assert(
      staff.role === 'admin' &&
        s.config.finalised &&
        p.confirmation === 'DELETE PERSONAL DATA' &&
        reason,
      'Finalise and explicitly confirm retention cleanup.',
    );
    assert(
      !s.awards.some((a) => !a.collected && !a.forfeited),
      'Complete prize distribution before cleanup.',
    );
    s.attendanceSummary = attendanceSummary(s.accounts);
    s.purgedAt = now;
    s.accounts = {};
    s.attempts = [];
    s.awards = [];
    s.incidents = [];
    s.audit = [];
    s.controllerGrants = {};
    s.sessions = {};
    s.challenges = {};
    s.outbox = [];
    s.rates = {};
    s.commands = {};
  } else assert(false, 'Unknown host action.');
  log(
    s,
    staff.id,
    action,
    action === 'purge' ? {} : { reason, ...(p.attemptId ? { attemptId: p.attemptId } : {}) },
    now,
  );
  return {};
}
