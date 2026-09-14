import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, host, player, start, command, NOW } from './helpers.js';
import { details } from '../server/details.js';
import { usedAttempts, leaderboard } from '../server/state.js';
import { availableGames, SCORING_VERSION } from '../shared/catalog.js';
import { selectGame } from '../server/selection.js';

test('every standard game can be selected and started as Ranked', async () => {
  const games = availableGames();
  assert.equal(games.length, 5);
  assert(games.every((g) => g.ranked && g.live && !g.prototype));
  for (const g of games) {
    assert.equal(selectGame(games, NOW, g.id).gameId, g.id);
    const f = fixture();
    await host(f);
    const p = await player(f);
    await start(f, p, g.id, 'ranked');
    assert.equal(f.s.active.gameId, g.id);
    assert.equal(f.s.attempts[0].mode, 'ranked');
  }
});
test('Ranked cannot be voided; interrupted results close without restoring allowance or points', async () => {
  const f = fixture();
  await host(f);
  const p = await player(f);
  await start(f, p);
  const a = f.s.attempts[0];
  a.status = 'interrupted';
  a.score = 1234567;
  a.ended = NOW + 6500;
  f.s.active = null;
  f.s.incidents.push({ attemptId: a.id, resolved: false });
  const reason = 'Connection lost at the stall; retained earned points.';
  const denied = await command(f, 'host.void', { attemptId: a.id, reason }, f.host, NOW + 7000);
  assert.match(denied.error, /Ranked attempts cannot be voided/);
  assert.equal(f.s.attempts[0].status, 'interrupted');
  const resolved = await command(
    f,
    'host.resolveInterruption',
    { attemptId: a.id, reason },
    f.host,
    NOW + 7001,
  );
  assert(!resolved.error, resolved.error);
  assert.equal(f.s.attempts[0].score, 1234567);
  assert.equal(f.s.attempts[0].ended, NOW + 6500);
  assert.equal(usedAttempts(f.s, p.id), 1);
  assert.equal(leaderboard(f.s)[0].score, 1234567);
  assert(!f.s.accounts[p.id].replacementOf);
  assert(f.s.incidents[0].resolved);
  f.s.config.prizeInstructions = 'Please visit the host to collect your prize.';
  assert(!(await command(f, 'host.finalise', {}, f.host, NOW + 7002)).error);
});
test('host results distinguish identical names, filter modes, include Live and search prizes', async () => {
  const f = fixture();
  await host(f);
  const a = await player(f, 'one@bcu.ac.uk'),
    b = await player(f, 'two@bcu.ac.uk');
  f.s.attempts.push(
    ...['ranked', 'practice'].map((mode, i) => ({
      id: mode,
      accountId: i ? b.id : a.id,
      mode,
      status: 'completed',
      started: NOW,
      ended: NOW + 100,
      score: 2000000,
      version: SCORING_VERSION,
    })),
  );
  f.s.liveResults.push({
    id: 'live-result',
    liveId: 'live',
    accountId: b.id,
    at: NOW + 200,
    gameId: 'robot',
    score: 100,
    won: true,
  });
  f.s.awards.push({ id: 'prize', accountId: b.id, type: 'instant', at: NOW });
  let d = details(f.s, f.host, NOW, { section: 'results', mode: 'ranked' });
  assert.equal(d.attempts.length, 1);
  assert.equal(d.attempts[0].started, NOW);
  assert.equal(d.accounts.length, 2);
  assert.notEqual(d.accounts[0].email, d.accounts[1].email);
  d = details(f.s, f.host, NOW, { section: 'results', mode: 'live', q: 'two@bcu.ac.uk' });
  assert.equal(d.attempts[0].ended, NOW + 200);
  assert.equal(d.awards.length, 1);
  d = details(f.s, f.host, NOW, { section: 'results', q: a.id });
  assert.equal(d.awards.length, 0);
  assert.throws(() => details(f.s, a.token, NOW, { section: 'results' }), /Host access required/);
});
test('leaders are provisional until finalisation and grand collection is blocked while reopened', async () => {
  const f = fixture();
  await host(f);
  const p = await player(f);
  f.s.attempts.push({
    id: 'rank',
    accountId: p.id,
    mode: 'ranked',
    status: 'completed',
    score: 2000000,
    ended: NOW,
    version: SCORING_VERSION,
  });
  let d = details(f.s, f.host, NOW, { section: 'results' });
  assert.equal(d.leaderboard.length, 1);
  assert.equal(d.awards.length, 0);
  f.s.config.prizeInstructions = 'Collect from the host after showing your account.';
  assert(!(await command(f, 'host.finalise', {}, f.host)).error);
  const id = f.s.awards[0].id;
  d = details(f.s, f.host, NOW, { section: 'results' });
  assert.equal(d.awards[0].mailStatus, 'queued');
  assert(
    !(
      await command(
        f,
        'host.reopen',
        { reason: 'Review prize decision with the event team.' },
        f.host,
      )
    ).error,
  );
  const blocked = await command(f, 'host.collect', { id, identityConfirmed: true }, f.host);
  assert.match(blocked.error, /Finalise winners/);
  assert(!(await command(f, 'host.finalise', {}, f.host)).error);
  assert(!(await command(f, 'host.collect', { id, identityConfirmed: true }, f.host)).error);
  assert(!(await command(f, 'host.collect', { id, identityConfirmed: true }, f.host)).error);
  assert.equal(f.s.awards.length, 1);
  assert.equal(f.s.outbox.filter((m) => m.awardId === id).length, 1);
});
