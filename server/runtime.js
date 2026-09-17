import { requireHost } from './host-control.js';
import { newGame, tickGame, generate, publicQuestion } from './games.js';
import { adapterFor, liveGames } from './games/registry.js';
import { selectGame } from './selection.js';
import { TIMING, LIVE_ROUNDS, LIVE_PUZZLE_ROUNDS, liveDuration } from '../shared/timing.js';
import { requireValue as assert, sessionFor } from './security.js';
import { openWindow, sessionResults } from './state.js';
const uuid = () => crypto.randomUUID();
function eligible(_s, account) {
  return !!account && !account.disabled;
}
function requireEligible(s, a) {
  assert(eligible(s, a), 'This account is unavailable.', 403);
}
function accountFor(s, ctx, now) {
  const session = sessionFor(s, ctx.token, now);
  assert(session?.accountId && !session.pending, 'Please sign in.', 401);
  return s.accounts[session.accountId];
}
function staffFor(s, ctx, now) {
  requireHost(s, ctx, now);
  return s.staff.host;
}
function requireOpen(s, now) {
  const w = openWindow(s, now);
  assert(
    w && now < w.cutoff && !s.config.paused && !s.purgedAt,
    s.purgedAt
      ? 'This event has ended.'
      : s.config.paused
        ? 'The host has paused admissions.'
        : 'Outside opening hours.',
  );
}
function createAttempt(s, now) {
  const active = s.active,
    a = s.accounts[active.accountId];
  requireEligible(s, a);
  const game = newGame(active.gameId, now, (a.recent ||= [])),
    id = uuid();
  s.attempts.push({
    id,
    accountId: a.id,
    mode: active.mode,
    gameId: active.gameId,
    status: 'started',
    score: 0,
    started: now,
    ended: null,
    policy: s.config.policyVersion,
    version: SCORING_VERSION,
    replacementOf: a.replacementOf || null,
  });
  a.replacementOf = null;
  a.pendingGame = null;
  Object.assign(active, { phase: 'playing', game, attemptId: id, until: game.deadline });
}
function finish(s, status, now) {
  const active = s.active,
    attempt = s.attempts.find((a) => a.id === active?.attemptId);
  if (!attempt || attempt.status !== 'started') return;
  const previousBest = s.attempts
    .filter(
      (a) =>
        a.id !== attempt.id &&
        a.accountId === attempt.accountId &&
        a.gameId === attempt.gameId &&
        a.mode === 'solo' &&
        a.version === SCORING_VERSION &&
        ['completed', 'timed_out', 'abandoned'].includes(a.status),
    )
    .reduce((best, a) => Math.max(best, a.score), -1);
  Object.assign(attempt, {
    personalBest: active.game.score > previousBest,
    firstScore: previousBest < 0,
    improvement: previousBest >= 0 ? Math.max(0, active.game.score - previousBest) : null,
    status,
    score: active.game.score,
    ended: now,
    review: active.game.history.map((q) => ({
      ...publicQuestion(q, true),
      correct: q.correct,
      selected: q.selected,
      path: q.path,
      frames: q.frames,
      painted: q.painted,
      routes: q.routes,
      points: q.points,
      runs: q.runs,
      feedback: q.feedback,
      failedIndex: q.failedIndex,
      failedSource: q.failedSource,
      events: q.events,
      failedCell: q.failedCell,
      timedOut: q.timedOut,
    })),
    breakdown: active.game.history.map((q) => ({
      level: q.level,
      correct: q.correct,
      points: q.points,
      runs: q.runs,
      elapsedMs: q.elapsedMs,
      allowanceMs: q.allowanceMs,
      efficiency: q.efficiency,
    })),
  });
  active.game.complete = true;
  Object.assign(active, { phase: 'result', until: now + TIMING.result });
  s.config.soloAfterLive = false;
}
export function canStartLive(s, now) {
  const w = openWindow(s, now);
  return !!(
    w &&
    now < w.cutoff &&
    !s.config.paused &&
    !s.purgedAt &&
    now + liveDuration(s.config) + 10000 < w.end
  );
}
export function liveDue(s, now) {
  return (
    !s.live &&
    (s.config.livePending || s.config.autoLive) &&
    now >= s.config.nextLobbyAt &&
    canStartLive(s, now) &&
    (!s.config.soloAfterLive || !s.queue.some((q) => eligible(s, s.accounts[q.accountId])))
  );
}
export function estimatedWaitMs(s, soloTurns) {
  const pending = s.live
    ? liveDuration(s.live.settings)
    : s.config.livePending
      ? liveDuration(s.config)
      : 0;
  const solo = soloTurns * TIMING.soloSlot;
  const future = s.config.autoLive
    ? Math.ceil(solo / (s.config.interval * 1000)) * liveDuration(s.config)
    : 0;
  return solo + pending + future;
}
export function queueFits(s, now, window) {
  const turns =
    s.queue.filter((q) => eligible(s, s.accounts[q.accountId])).length + 1 + (s.active ? 1 : 0);
  return now + estimatedWaitMs(s, turns) + 600000 < window.end;
}
function liveStart(s, now) {
  assert(!s.active && !s.live, 'Finish the current turn first.');
  const dueSolo = s.queue.some((q) => eligible(s, s.accounts[q.accountId]));
  assert(!s.config.soloAfterLive || !dueSolo, 'Serve one solo turn before another live game.');
  assert(
    canStartLive(s, now),
    'Live admissions are closed or there is insufficient time before closing.',
  );
  const available = liveGames(s.config);
  assert(available.length && available.length <= 10, 'Configure 1–10 multiplayer games.');
  s.config.livePending = false;
  s.live = {
    id: uuid(),
    gameId: null,
    phase: 'lobby',

    until: now + s.config.lobbySeconds * 1000,
    roster: {},
    level: 0,
    question: null,
    available: available.map((g) => ({ id: g.id })),
    settings: {
      lobbySeconds: s.config.lobbySeconds,
      liveTimeScale: s.config.liveTimeScale ?? 1,
    },
  };
}
export function tick(s, now, _connected = new Set()) {
  s.queue = s.queue.filter((q) =>
    s.config.windows.some((w) => now < w.end && q.admitted >= w.start),
  );
  s.queue = s.queue.filter((q) => eligible(s, s.accounts[q.accountId]));
  const a = s.active;
  if (a) {
    if (a.phase === 'playing') {
      tickGame(a.game, now);
      a.until =
        a.game.phase === 'feedback'
          ? a.game.feedbackUntil
          : a.game.phase === 'execution'
            ? a.game.execution.until
            : a.game.deadline;
      if (a.game.complete) finish(s, a.game.completionStatus || 'completed', now);
    } else if (a.until !== null && now >= a.until) {
      if (a.phase === 'called' || a.phase === 'result') {
        for (const [key, session] of Object.entries(s.sessions))
          if (session.controller && session.accountId === a.accountId) delete s.sessions[key];
        s.active = null;
      } else if (a.phase === 'wheel') Object.assign(a, { phase: 'introduction', until: null });
      else if (a.phase === 'countdown') {
        if (eligible(s, s.accounts[a.accountId])) createAttempt(s, now);
        else s.active = null;
      }
    }
  }
  const live = s.live;
  const allAnswered =
    live?.phase === 'question' &&
    now >= live.questionAt + 2000 &&
    Object.values(live.roster).every((e) => e.answer !== null);
  if (live && ((live.until !== null && now >= live.until) || allAnswered)) {
    if (live.phase === 'lobby') {
      for (const id of Object.keys(live.roster))
        if (!eligible(s, s.accounts[id])) delete live.roster[id];
      if (Object.keys(live.roster).length < 2) endLive(s, now, 'Not enough players');
      else {
        const selection = selectGame(live.available, now);
        Object.assign(live, {
          gameId: selection.gameId,
          selection,
          phase: 'wheel',
          until: selection.until,
        });
      }
    } else if (live.phase === 'wheel') Object.assign(live, { phase: 'introduction', until: null });
    else if (live.phase === 'countdown') nextLiveQuestion(s, now);
    else if (live.phase === 'question')
      Object.assign(live, {
        phase: adapterFor(live.gameId).kind === 'puzzle' ? 'execution' : 'reveal',
        until: now + (adapterFor(live.gameId).kind === 'puzzle' ? 4000 : TIMING.feedback),
        phaseAt: now,
      });
    else if (live.phase === 'execution')
      Object.assign(live, { phase: 'reveal', until: now + TIMING.feedback });
    else if (live.phase === 'reveal') {
      live.level++;
      if (live.level >= (adapterFor(live.gameId).kind === 'puzzle' ? 3 : 5)) finishLive(s, now);
      else nextLiveQuestion(s, now);
    } else if (live.phase === 'winner' || live.phase === 'cancelled') {
      s.live = null;
      s.config.nextLobbyAt = now + s.config.interval * 1000;
    }
  }
  if (!canStartLive(s, now)) s.config.livePending = false;
  if (!s.active && liveDue(s, now)) liveStart(s, now);
  cleanup(s, now);
}
export function cleanup(s, now) {
  for (const [key, session] of Object.entries(s.sessions))
    if (session.expires <= now || (session.staffId && now - session.lastActivity >= 1800000))
      delete s.sessions[key];
  for (const [key, t] of Object.entries(s.takeovers)) if (t.expires <= now) delete s.takeovers[key];
  for (const [key, command] of Object.entries(s.commands))
    if (command.at < now - 600000) delete s.commands[key];
  for (const [key, values] of Object.entries(s.rates)) {
    s.rates[key] = values.filter((t) => t > now - 3600000);
    if (!s.rates[key].length) delete s.rates[key];
  }
  for (const job of s.outbox) {
    if (
      job.sent ||
      job.cancelled ||
      (job.challengeId &&
        (!s.challenges[job.challengeId] || s.challenges[job.challengeId].expires <= now))
    ) {
      if (!job.sent && !job.cancelled) job.cancelled = true;
      delete job.payload;
    }
  }
  s.outbox = s.outbox.filter(
    (job) => !((job.sent || job.cancelled) && (job.completedAt || job.next) < now - 86400000),
  );
  for (const [key, ch] of Object.entries(s.challenges))
    if (ch.expires < now - 3600000) delete s.challenges[key];
}
function nextLiveQuestion(s, now) {
  const live = s.live;
  live.started ??= now;
  for (const id of Object.keys(live.roster)) s.accounts[id].attendedAt ||= now;
  live.question = generate(
    live.gameId,
    Math.min(4, live.level * (adapterFor(live.gameId).kind === 'puzzle' ? 2 : 1)),
    (s.liveRecent ||= []),
  );
  live.phase = 'question';
  live.questionAt = now;
  live.until =
    now +
    Math.round(
      (adapterFor(live.gameId).kind === 'puzzle' ? LIVE_PUZZLE_ROUNDS : LIVE_ROUNDS)[live.level] *
        live.settings.liveTimeScale,
    ) *
      1000;
  for (const entry of Object.values(live.roster)) {
    entry.answer = null;
    entry.correct = null;
    entry.result = null;
    entry.points = 0;
  }
}
function finishLive(s, now) {
  const live = s.live,
    entries = Object.values(live.roster),
    contenders = entries.filter((e) => e.responses > 0);
  const maximum = Math.max(...contenders.map((e) => e.score), -1);
  const winners =
    contenders.length >= 2 && maximum > 0 ? contenders.filter((e) => e.score === maximum) : [];
  live.winners = winners.map((e) => e.accountId);
  live.phase = 'winner';
  live.until = now + TIMING.winner;
  const previousResults = sessionResults(s);
  for (const entry of entries) {
    const previousBest = previousResults
      .filter((a) => a.accountId === entry.accountId && a.gameId === live.gameId)
      .reduce((best, a) => Math.max(best, a.score), -1);
    entry.personalBest = entry.score > previousBest;
    s.liveResults.push({
      id: uuid(),
      liveId: live.id,
      started: live.started ?? null,
      scoreVersion: '1.1.0',
      accountId: entry.accountId,
      gameId: live.gameId,
      score: entry.score,
      at: now,
      won: live.winners.includes(entry.accountId),
      personalBest: entry.personalBest,
    });
  }
}
function endLive(s, now, message) {
  if (s.live) Object.assign(s.live, { phase: 'cancelled', message, until: now + TIMING.cancelled });
  s.config.nextLobbyAt = now + s.config.interval * 1000;
  s.config.soloAfterLive = true;
}

export { eligible, requireEligible, requireOpen, accountFor, staffFor, finish, liveStart, endLive };
import { SCORING_VERSION } from '../shared/catalog.js';

// Cheap scheduler predicates; maintenance does not need four full scans a second.
export function transitionDue(s, now) {
  const game = s.active?.phase === 'playing' ? s.active.game : null;
  const until = game
    ? game.phase === 'execution'
      ? game.execution.until
      : game.phase === 'feedback'
        ? game.feedbackUntil
        : game.deadline
    : s.active?.until;
  if (s.active && until !== null && now >= until) return true;
  if (
    s.live &&
    ((s.live.until !== null && now >= s.live.until) ||
      (s.live.phase === 'question' &&
        now >= s.live.questionAt + 2000 &&
        Object.values(s.live.roster).every((e) => e.answer !== null)))
  )
    return true;
  if (s.queue.some((q) => q.heldUntil && now >= q.heldUntil)) return true;
  return !s.active && liveDue(s, now);
}
