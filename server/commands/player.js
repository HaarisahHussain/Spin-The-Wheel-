import { TIMING } from '../../shared/timing.js';
import { scoreChallenge } from '../../shared/scoring.js';
import { selectGame } from '../selection.js';
import { queueFits } from '../runtime.js';
import { availableGames, SCORING_VERSION } from '../../shared/catalog.js';
import { requireValue as assert, hash } from '../security.js';
import { usedAttempts, openWindow } from '../state.js';
import { answerGame } from '../games.js';
import { adapterFor } from '../games/registry.js';
import { accountFor, requireEligible, requireOpen, finish } from '../runtime.js';
export function playerCommand(s, action, p, ctx, now) {
  const account = accountFor(s, ctx, now);
  if (action === 'readUpdates') {
    account.updatesReadAt = now;
    return {};
  }
  if (action === 'ackNotification') {
    const n = s.notifications.find((n) => n.id === p.id && n.accountId === account.id);
    assert(n, 'Notification not found.');
    n.acknowledged = true;
    return {};
  }
  if (action === 'updateProfile') {
    assert(!account.attendedAt, 'Details are fixed after participation. Speak to the host.');
    for (const key of ['fullName', 'course', 'level']) {
      assert(
        typeof p[key] === 'string' && p[key].trim().length > 0 && p[key].length <= 120,
        'Complete all profile fields.',
      );
      account[key] = p[key].trim();
    }
    return { message: 'Details updated.' };
  }
  if (action === 'ackAward') {
    const award = s.awards.find((a) => a.id === p.id && a.accountId === account.id);
    assert(award, 'Award not found.');
    award.acknowledged = true;
    return {};
  }
  if (action === 'claimPlayerControl') {
    assert(ctx.connectionId, 'Connect before taking control.');
    assert(
      !account.inputConnection ||
        account.inputConnection === ctx.connectionId ||
        !ctx.connections?.has(account.inputConnection) ||
        p.confirm === true,
      'This account is controlled elsewhere. Take control here?',
      409,
    );
    account.inputConnection = ctx.connectionId;
    account.inputSession = hash(ctx.token);
    return {};
  }
  if (
    ['ready', 'tutorialReady', 'answer', 'robot', 'puzzle', 'quit', 'liveAnswer'].includes(action)
  ) {
    assert(
      account.inputConnection === ctx.connectionId && account.inputSession === hash(ctx.token),
      'This game is controlled on another device. Take control here.',
      409,
    );
  }
  if (action === 'enqueue' || action === 'mode') {
    requireEligible(s, account);
    assert(['practice', 'ranked'].includes(p.mode), 'Choose Practice or Ranked.');
    requireOpen(s, now, p.mode);
    assert(!s.active || s.active.accountId !== account.id, 'Finish your current turn first.');
    assert(
      p.mode !== 'ranked' || usedAttempts(s, account.id) < 3,
      'All three ranked attempts are used.',
    );
    const existing = s.queue.find((q) => q.accountId === account.id);
    if (existing) {
      existing.mode = p.mode;
      return {};
    }
    assert(s.queue.length < s.config.capacity, 'The queue is full. Please try again shortly.');
    const window = openWindow(s, now);
    assert(queueFits(s, now, window), 'There is not enough time for another turn in this window.');
    s.queue.push({
      accountId: account.id,
      mode: p.mode,
      sequence: s.nextSequence++,
      admitted: now,
    });
    return {};
  }
  if (action === 'leave') {
    s.queue = s.queue.filter((q) => q.accountId !== account.id);
    return {};
  }
  if (action === 'tutorialReady') {
    requireEligible(s, account);
    const a = s.active;
    assert(
      a?.accountId === account.id && a.phase === 'introduction' && now < a.until,
      'Introduction expired. Join the queue again.',
    );
    (account.tutorials ||= {})[a.gameId] = SCORING_VERSION;
    Object.assign(a, { phase: 'countdown', until: now + TIMING.countdown });
    return {};
  }
  if (action === 'ready') {
    requireEligible(s, account);
    const active = s.active;
    assert(
      active?.accountId === account.id && active.phase === 'called',
      'Your turn is not ready.',
    );
    const selection = selectGame(
      availableGames(s.config).filter((g) => active.mode !== 'ranked' || g.ranked),
      now,
      active.mode === 'ranked' ? account.pendingGame : null,
    );
    if (active.mode === 'ranked') account.pendingGame = selection.gameId;
    Object.assign(active, {
      gameId: selection.gameId,
      selection,
      phase: 'wheel',
      until: selection.until,
    });
    return {};
  }
  if (action === 'answer' || action === 'robot' || action === 'puzzle' || action === 'quit') {
    const active = s.active;
    const receivedAt = Math.min(now, ctx.receivedAt ?? now);
    assert(
      active?.accountId === account.id && active.phase === 'playing',
      'There is no active turn.',
      409,
    );
    assert(
      action === 'quit' || active.game.phase === 'question',
      'Wait for the next question.',
      409,
    );
    assert(action === 'quit' || receivedAt < active.game.deadline, 'Time is up.', 409);
    assert(p.attemptId === active.attemptId, 'This action belongs to an old attempt.', 409);
    if (action === 'quit') {
      finish(s, 'abandoned', now);
      return {};
    }
    if (action === 'answer') {
      assert(
        answerGame(active.game, p.answer, p.challengeId, now, receivedAt),
        'This answer is no longer available.',
        409,
      );
      if (active.game.complete) finish(s, 'completed', now);
      return {};
    }
    assert(adapterFor(active.game.id).kind === 'puzzle', 'This is not a puzzle.');
    assert(
      answerGame(active.game, p.program, p.challengeId, now, receivedAt),
      'This program is invalid or expired.',
      409,
    );
    return {};
  }
  if (action === 'joinLive') {
    requireEligible(s, account);
    const live = s.live;
    assert(live?.phase === 'lobby' && now < live.until, 'The lobby is closed.');
    assert(p.liveId === live.id, 'This lobby has changed. Join the current lobby.');
    assert(
      Object.keys(live.roster).length < 50 || live.roster[account.id],
      'The live game is full.',
    );
    live.roster[account.id] ||= { accountId: account.id, score: 0, responses: 0, answer: null };
    return {};
  }
  if (action === 'liveAnswer') {
    const receivedAt = Math.min(now, ctx.receivedAt ?? now);
    const live = s.live,
      entry = live?.roster[account.id];
    assert(
      live?.phase === 'question' && entry && receivedAt < live.until,
      'This question is closed.',
      409,
    );
    assert(
      p.challengeId === live.question.id && entry.answer === null,
      'Your answer is already locked or the question changed.',
      409,
    );
    const adapter = adapterFor(live.gameId),
      answer = adapter.kind === 'puzzle' ? p.program : String(p.answer);
    assert(adapter.valid(live.question, answer), 'Invalid answer or program.');
    entry.answer = answer;
    entry.result = adapter.evaluate(live.question, answer);
    entry.correct = entry.result.correct;
    entry.responses++;
    entry.points = scoreChallenge({
      ...entry.result,
      elapsed: Math.max(0, receivedAt - live.questionAt),
      allowance: live.until - live.questionAt,
      maximum: Math.floor(1000000000 / (adapter.kind === 'puzzle' ? 3 : 5)),
      puzzle: adapter.kind === 'puzzle',
    });
    entry.score += entry.points;
    return {};
  }
  throw Object.assign(new Error('Unknown action.'), { status: 400 });
}
