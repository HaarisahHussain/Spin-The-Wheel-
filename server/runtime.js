import { newGame, tickGame } from './games.js';
import { adapterFor, liveGames } from './games/registry.js';
import { randomInt } from 'node:crypto';
import { selectGame } from './selection.js';
import { TIMING, LIVE_ROUNDS, liveDuration } from '../shared/timing.js';
import { requireValue as assert, sessionFor } from './security.js';
import { usedAttempts, openWindow } from './state.js';
const uuid = () => crypto.randomUUID();
function eligible(s, account) {
  return (
    account &&
    !account.disabled &&
    allowedEmail(account.email) &&
    (!s.config.requireVerification || account.verified)
  );
}
function requireEligible(s, a) {
  assert(eligible(s, a), 'Verify your BCU email before playing.', 403);
}
function accountFor(s, ctx, now) {
  const session = sessionFor(s, ctx.token, now);
  assert(session?.accountId && !session.pending, 'Please sign in.', 401);
  return s.accounts[session.accountId];
}
function staffFor(s, ctx, now, roles = ['host', 'adjudicator', 'admin']) {
  const session = sessionFor(s, ctx.token, now),
    staff = s.staff[session?.staffId];
  assert(
    staff && roles.includes(staff.role),
    'This action requires an authorised staff account.',
    403,
  );
  return staff;
}
function requireOpen(s, now, mode) {
  const window = openWindow(s, now);
  assert(
    window && now < window.cutoff && !s.config.paused && !s.config.finalised,
    'Admissions are closed.',
  );
  if (mode === 'ranked')
    assert(
      s.config.rankedEnabled && s.config.scoringVersion === SCORING_VERSION,
      'Ranked is not open yet.',
    );
}
function createAttempt(s, now) {
  const active = s.active,
    a = s.accounts[active.accountId];
  requireEligible(s, a);
  assert(
    active.mode !== 'ranked' || usedAttempts(s, a.id) < 3,
    'All three ranked attempts are used.',
  );
  const game = newGame(active.gameId, now),
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
    verified: a.verified,
    version: SCORING_VERSION,
    replacementOf: a.replacementOf || null,
  });
  a.replacementOf = null;
  if (active.mode === 'ranked') a.pendingGame = null;
  Object.assign(active, { phase: 'playing', game, attemptId: id, until: game.deadline });
}
function finish(s, status, now) {
  const active = s.active,
    attempt = s.attempts.find((a) => a.id === active?.attemptId);
  if (!attempt || attempt.status !== 'started') return;
  Object.assign(attempt, {
    status,
    score: active.game.score,
    ended: now,
    history: active.game.history,
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
    !s.config.finalised &&
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
export function queueFits(s, now, window) {
  const pendingMs = s.live
    ? liveDuration(s.live.settings)
    : s.config.livePending || s.config.autoLive
      ? liveDuration(s.config)
      : 0;
  const soloMs = (s.queue.length + 1 + (s.active ? 1 : 0)) * TIMING.soloSlot;
  const futureLiveMs = s.config.autoLive
    ? Math.ceil(soloMs / (s.config.interval * 1000)) * liveDuration(s.config)
    : 0;
  return now + soloMs + pendingMs + futureLiveMs + 600000 < window.end;
}
function liveStart(s, now) {
  assert(!s.active && !s.live, 'Finish the current turn first.');
  const dueSolo = s.queue.some((q) => eligible(s, s.accounts[q.accountId]));
  assert(!s.config.soloAfterLive || !dueSolo, 'Serve one solo turn before another live game.');
  assert(
    canStartLive(s, now),
    'Live admissions are closed or there is insufficient time before closing.',
  );
  const available = liveGames();
  assert(available.length && available.length <= 10, 'Configure 1–10 multiplayer games.');
  s.config.livePending = false;
  s.live = {
    id: uuid(),
    gameId: null,
    phase: 'lobby',
    code: String(randomInt(100000, 1000000)),
    until: now + s.config.lobbySeconds * 1000,
    roster: {},
    level: 0,
    question: null,
    available: available.map((g) => ({ id: g.id })),
    settings: { lobbySeconds: s.config.lobbySeconds, liveTimeScale: s.config.liveTimeScale ?? 1 },
  };
}
function holdUnverified(s, now) {
  for (const q of s.queue) if (!eligible(s, s.accounts[q.accountId])) q.heldUntil ||= now + 300000;
  if (
    s.active &&
    !['playing', 'result'].includes(s.active.phase) &&
    !eligible(s, s.accounts[s.active.accountId])
  ) {
    s.queue.push({
      accountId: s.active.accountId,
      mode: s.active.mode,
      sequence: s.active.sequence,
      admitted: s.active.admitted,
      heldUntil: now + 300000,
    });
    s.active = null;
  }
}
export function tick(s, now, _connected = new Set()) {
  s.queue = s.queue.filter(
    (q) =>
      (!q.heldUntil || q.heldUntil > now) &&
      s.config.windows.some((w) => now < w.end && q.admitted >= w.start),
  );
  for (const q of s.queue) if (eligible(s, s.accounts[q.accountId])) q.heldUntil = null;
  const a = s.active;
  if (a) {
    if (a.phase === 'playing') {
      if (a.game.id === 'robot' && now >= a.game.deadline) finish(s, 'timed_out', now);
      else {
        tickGame(a.game, now);
        a.until = a.game.phase === 'feedback' ? a.game.feedbackUntil : a.game.deadline;
        if (a.game.complete) finish(s, a.game.completionStatus || 'completed', now);
      }
    } else if (now >= a.until) {
      if (a.phase === 'called' || a.phase === 'result') {
        for (const [key, session] of Object.entries(s.sessions))
          if (session.controller && session.accountId === a.accountId) delete s.sessions[key];
        s.active = null;
      } else if (a.phase === 'wheel')
        Object.assign(a, { phase: 'countdown', until: now + TIMING.countdown });
      else if (a.phase === 'countdown') {
        if (eligible(s, s.accounts[a.accountId])) createAttempt(s, now);
        else holdUnverified(s, now);
      }
    }
  }
  const live = s.live;
  const allAnswered =
    live?.phase === 'question' &&
    now >= live.questionAt + 2000 &&
    Object.values(live.roster).every((e) => e.answer !== null);
  if (live && (now >= live.until || allAnswered)) {
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
    } else if (live.phase === 'wheel')
      Object.assign(live, { phase: 'countdown', until: now + TIMING.countdown });
    else if (live.phase === 'countdown') nextLiveQuestion(s, now);
    else if (live.phase === 'question')
      Object.assign(live, { phase: 'reveal', until: now + TIMING.feedback });
    else if (live.phase === 'reveal') {
      live.level++;
      if (live.level >= LIVE_ROUNDS.length) finishLive(s, now);
      else nextLiveQuestion(s, now);
    } else if (live.phase === 'winner' || live.phase === 'cancelled') {
      s.live = null;
      s.config.nextLobbyAt = now + s.config.interval * 1000;
    }
  }
  if (!canStartLive(s, now)) s.config.livePending = false;
  if (!s.active && liveDue(s, now)) liveStart(s, now);
  for (const [key, session] of Object.entries(s.sessions))
    if (session.expires <= now) delete s.sessions[key];
  for (const [key, command] of Object.entries(s.commands))
    if (command.at < now - 86400000) delete s.commands[key];
  for (const [key, values] of Object.entries(s.rates)) {
    s.rates[key] = values.filter((t) => t > now - 3600000);
    if (!s.rates[key].length) delete s.rates[key];
  }
  for (const [key, ch] of Object.entries(s.challenges))
    if (ch.expires < now - 3600000) delete s.challenges[key];
}
function nextLiveQuestion(s, now) {
  const live = s.live;
  for (const id of Object.keys(live.roster)) s.accounts[id].attendedAt ||= now;
  live.question = adapterFor(live.gameId).live.question(live.level);
  live.phase = 'question';
  live.questionAt = now;
  live.until = now + Math.round(LIVE_ROUNDS[live.level] * live.settings.liveTimeScale) * 1000;
  for (const entry of Object.values(live.roster)) {
    entry.answer = null;
    entry.correct = null;
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
  for (const entry of winners)
    s.awards.push({
      id: uuid(),
      type: 'instant',
      accountId: entry.accountId,
      liveId: live.id,
      at: now,
      collected: false,
    });
  s.config.soloAfterLive = true;
}
function endLive(s, now, message) {
  if (s.live) Object.assign(s.live, { phase: 'cancelled', message, until: now + TIMING.cancelled });
  s.config.nextLobbyAt = now + s.config.interval * 1000;
  s.config.soloAfterLive = true;
}

export {
  eligible,
  requireEligible,
  requireOpen,
  accountFor,
  staffFor,
  finish,
  liveStart,
  endLive,
  holdUnverified,
};
import { allowedEmail, SCORING_VERSION } from '../shared/catalog.js';
