import { beginSolo, beginLive } from '../start-game.js';
import { sessionFor, requireValue as assert, textValue } from '../security.js';
import { sessionResults, openWindow, log } from '../state.js';
import {
  eligible,
  requireEligible,
  requireOpen,
  staffFor,
  liveStart,
  endLive,
  canStartLive,
  liveDue,
  queueFits,
} from '../runtime.js';
const uuid = () => crypto.randomUUID();
export function hostCommand(s, action, p, ctx, now) {
  const staff = staffFor(s, ctx, now);
  if (
    ['purge', 'export'].includes(action) &&
    now - sessionFor(s, ctx.token, now).reauthenticated >= 900000
  )
    throw Object.assign(Error('Re-enter the host password before this action.'), {
      status: 401,
      code: 'REAUTHENTICATE',
    });
  const reason = textValue(p.reason, 500);
  if (action === 'export') {
    const cell = (value) => {
      let text = String(value ?? '');
      if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    const rows = [
      [
        'Username',
        'Optional name',
        'Game',
        'Format',
        'Score',
        'Status',
        'Session ID',
        'Account ID',
        'Started (UTC)',
        'Ended (UTC)',
      ],
    ];
    for (const attempt of sessionResults(s)) {
      const a = s.accounts[attempt.accountId] || {};
      rows.push([
        a.alias,
        a.fullName,
        attempt.gameId,
        attempt.mode,
        (attempt.score / 1000000).toFixed(2),
        attempt.status,
        attempt.id,
        attempt.accountId,
        attempt.started ? new Date(attempt.started).toISOString() : '',
        attempt.ended ? new Date(attempt.ended).toISOString() : '',
      ]);
    }
    log(s, staff.id, 'host.export', { count: rows.length - 1 }, now);
    return { csv: rows.map((row) => row.map(cell).join(',')).join('\r\n') };
  }

  if (action === 'startGame') {
    if (p.liveId) beginLive(s, p.liveId, now);
    else beginSolo(s, p.selectionId, now);
  } else if (action === 'assistedEnqueue') {
    const account = s.accounts[p.accountId];
    requireEligible(s, account);
    assert(p.identityConfirmed === true, 'Confirm participant identity.');
    requireOpen(s, now);
    assert(
      !s.queue.some((q) => q.accountId === account.id) && s.active?.accountId !== account.id,
      'Participant is already queued or playing.',
    );
    assert(
      s.queue.length < s.config.capacity && queueFits(s, now, openWindow(s, now)),
      'There is no queue capacity for another turn.',
    );
    s.queue.push({
      accountId: account.id,
      mode: 'solo',
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
    s.active = { ...next, phase: 'called', until: null };
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
    for (const [key, min, max] of [
      ['interval', 180, 900],
      ['lobbySeconds', 15, 45],
      ['capacity', 1, 100],
    ])
      if (key in p) {
        assert(Number.isInteger(p[key]) && p[key] >= min && p[key] <= max, `Invalid ${key}.`);
        s.config[key] = p[key];
      }
    for (const key of ['paused', 'autoLive', 'animateIdleWheel'])
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
      const sorted = [...p.windows].sort((a, b) => a.start - b.start);
      assert(
        sorted.every((w, i) => !i || sorted[i - 1].end <= w.start),
        'Opening windows must not overlap.',
      );
      s.config.windows = sorted;
    }
    if ('cleanupAt' in p) s.config.cleanupAt = textValue(p.cleanupAt, 160);
    if (s.config.interval !== oldInterval || s.config.autoLive !== oldAuto)
      s.config.nextLobbyAt = now + s.config.interval * 1000;
    s.config.policyVersion++;
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
  } else if (action === 'resolveInterruption') {
    const attempt = s.attempts.find((a) => a.id === p.attemptId);
    assert(attempt?.status === 'interrupted', 'Choose an interrupted session.');
    assert(reason.length >= 20, 'Record what happened (at least 20 characters).');
    // Preserve points, end time; no points are invented.
    attempt.status = 'abandoned';
    attempt.resolution = { reason, at: now, by: staff.id };
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
  } else if (action === 'purge') {
    assert(
      !s.active && !s.live && !s.queue.length,
      'Finish active games and clear the queue first.',
    );
    assert(
      p.confirmation === 'DELETE EVENT DATA' && reason.length >= 20,
      'Confirm deletion and give a reason.',
    );
    assert(
      s.config.cleanupAt && Date.parse(s.config.cleanupAt) <= now,
      'Set and reach the cleanup date first.',
    );
    s.accounts = {};
    s.sessions = {};
    s.attempts = [];
    s.liveResults = [];
    s.commands = {};
    s.rates = {};
    s.notifications = [];
    s.awards = [];
    s.challenges = {};
    s.outbox = [];
    s.incidents = [];
    s.audit = [];
    s.hostLease = null;
    s.controlEpoch++;
    s.purgedAt = now;
    s.config.paused = true;
  } else assert(false, 'Unknown host action.');
  const actingSession = sessionFor(s, ctx.token, now);
  if (actingSession) actingSession.lastActivity = now;
  log(
    s,
    staff.id,
    action,
    action === 'purge' ? {} : { reason, ...(p.attemptId ? { attemptId: p.attemptId } : {}) },
    now,
  );
  return {};
}
