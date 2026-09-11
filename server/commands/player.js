import { randomInt } from 'node:crypto';
import { games } from '../../shared/catalog.js';
import { requireValue as assert } from '../security.js';
import { usedAttempts, openWindow } from '../state.js';
import { answerGame } from '../games.js';
import { adapterFor } from '../games/registry.js';
import { accountFor, requireEligible, requireOpen, finish } from '../runtime.js';
export function playerCommand(s, action, p, ctx, now) {
  const account = accountFor(s, ctx, now);
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
    assert(
      now + (s.queue.length + 1) * 155000 + 600000 < window.end,
      'There is not enough time for another turn in this window.',
    );
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
  if (action === 'ready') {
    requireEligible(s, account);
    const active = s.active;
    assert(
      active?.accountId === account.id && active.phase === 'called',
      'Your turn is not ready.',
    );
    const gameId =
      active.mode === 'ranked'
        ? account.pendingGame || games[randomInt(games.length)].id
        : games[randomInt(games.length)].id;
    if (active.mode === 'ranked') account.pendingGame = gameId;
    Object.assign(active, { gameId, phase: 'wheel', until: now + 2600 });
    return {};
  }
  if (action === 'answer' || action === 'robot' || action === 'quit') {
    const active = s.active;
    assert(
      active?.accountId === account.id && active.phase === 'playing',
      'There is no active turn.',
      409,
    );
    assert(now < active.game.deadline, 'Time is up.', 409);
    assert(p.attemptId === active.attemptId, 'This action belongs to an old attempt.', 409);
    if (action === 'quit') {
      finish(s, 'abandoned', now);
      return {};
    }
    if (action === 'answer') {
      assert(
        answerGame(active.game, p.answer, p.challengeId, now),
        'This answer is no longer available.',
        409,
      );
      if (active.game.complete) finish(s, 'completed', now);
      return {};
    }
    assert(
      adapterFor(active.game.id).program?.(active.game, p, now),
      'This game does not accept movement programs.',
      409,
    );
    return {};
  }
  if (action === 'joinLive') {
    requireEligible(s, account);
    const live = s.live;
    assert(live?.phase === 'lobby', 'The lobby is closed.');
    assert(p.code === live.code, 'Enter the lobby code on the screen.');
    assert(
      Object.keys(live.roster).length < 50 || live.roster[account.id],
      'The live game is full.',
    );
    live.roster[account.id] ||= { accountId: account.id, score: 0, responses: 0, answer: null };
    return {};
  }
  if (action === 'liveAnswer') {
    const live = s.live,
      entry = live?.roster[account.id];
    assert(
      live?.phase === 'question' && entry && now < live.until,
      'This question is closed.',
      409,
    );
    assert(
      p.challengeId === live.question.id && entry.answer === null,
      'Your answer is already locked or the question changed.',
      409,
    );
    const answer = String(p.answer);
    assert(adapterFor(live.gameId).live.validAnswer(live.question, answer), 'Invalid answer.');
    entry.answer = answer;
    entry.correct = answer === live.question.answer;
    entry.responses++;
    if (entry.correct) entry.score += 100;
    return {};
  }
  throw Object.assign(new Error('Unknown action.'), { status: 400 });
}
