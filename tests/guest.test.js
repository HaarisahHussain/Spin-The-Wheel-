import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, host, player, command, start, NOW } from './helpers.js';
import { leaderboard, initialState } from '../server/state.js';
import { project } from '../server/projection.js';
import { details } from '../server/details.js';
import { upgradeGuestEvent } from '../server/upgrade.js';
import { liveMaximum, scoreChallenge } from '../shared/scoring.js';
import { hash } from '../server/security.js';

test('guest entry needs no personal information, reuses its session and cannot impersonate by username', async () => {
  const f = fixture(),
    a = await player(f),
    b = await player(f);
  assert.notEqual(a.id, b.id);
  assert.notEqual(f.s.accounts[a.id].alias, f.s.accounts[b.id].alias);
  assert(!f.s.accounts[a.id].email);
  assert(!f.s.accounts[a.id].password);
  assert(!(await command(f, 'guest', {}, a.token)).token);
  assert.equal(Object.keys(f.s.accounts).length, 2);
  assert(
    !(await command(f, 'updateProfile', { alias: 'My_Name', fullName: 'My private name' }, a.token))
      .error,
  );
  assert((await command(f, 'updateProfile', { alias: 'my_name', fullName: '' }, b.token)).error);
  assert((await command(f, 'login', { username: 'My_Name' })).error);
  assert((await command(f, 'updateProfile', { alias: 'Other', fullName: '' }, 'fake')).error);
  assert.equal(project(f.s, '', NOW, 'http://localhost').me, null);
  assert(!JSON.stringify(project(f.s, '', NOW, 'http://localhost')).includes('My private name'));
});
test('guests can play every game, requeue without limits, and keep only one queue position', async () => {
  for (const game of ['debug', 'output', 'robot', 'parcel', 'painter']) {
    const f = fixture();
    await host(f);
    const p = await player(f);
    f.s.attempts = Array.from({ length: 8 }, (_, i) => ({
      id: `old${i}`,
      accountId: p.id,
      mode: 'solo',
      status: 'completed',
      score: 1,
      ended: NOW - 1,
    }));
    await start(f, p, game, 'solo');
    assert.equal(f.s.active.gameId, game);
    assert.equal(f.s.attempts.length, 9);
    assert(
      !(await command(f, 'quit', { attemptId: f.s.active.attemptId }, p.token, NOW + 7000)).error,
    );
    f.s.active = null;
    assert(!(await command(f, 'enqueue', {}, p.token, NOW + 7001)).error);
    assert(!(await command(f, 'enqueue', {}, p.token, NOW + 7002)).error);
    assert.equal(f.s.queue.length, 1);
  }
});
test('unified best-session standings and histories include Live and do not reward volume', async () => {
  const f = fixture();
  await host(f);
  const a = await player(f),
    b = await player(f);
  f.s.attempts = [
    {
      id: 'a',
      accountId: a.id,
      gameId: 'robot',
      mode: 'solo',
      status: 'completed',
      score: 6000000,
      ended: NOW,
    },
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `b${i}`,
      accountId: b.id,
      gameId: 'parcel',
      mode: 'solo',
      status: 'completed',
      score: 5000000,
      ended: NOW,
    })),
  ];
  f.s.liveResults = [
    {
      id: 'live',
      accountId: b.id,
      gameId: 'painter',
      score: 7000000,
      scoreVersion: '1.1.0',
      at: NOW + 1,
    },
  ];
  assert.equal(leaderboard(f.s)[0].accountId, b.id);
  assert.equal(leaderboard(f.s)[0].score, 7000000);
  assert.equal(leaderboard(f.s)[1].score, 6000000);
  assert.equal(details(f.s, b.token, NOW, { section: 'scores' }).best[0].mode, 'live');
  assert.throws(() => details(f.s, a.token, NOW, { section: 'results' }), /Host access required/);
  assert.equal(details(f.s, f.host, NOW, { section: 'results', mode: 'live' }).attempts.length, 1);
});
test('both Live formats have exactly nine available points and late answers score zero', () => {
  for (const puzzle of [false, true]) {
    const count = puzzle ? 3 : 5;
    const max = Array.from({ length: count }, (_, i) => liveMaximum(i, puzzle));
    assert.equal(
      max.reduce((a, b) => a + b),
      9000000,
    );
    assert.equal(
      max
        .map((maximum) =>
          scoreChallenge({
            correct: true,
            efficiency: 1,
            elapsed: 0,
            allowance: 30000,
            maximum,
            puzzle,
          }),
        )
        .reduce((a, b) => a + b),
      9000000,
    );
    assert.equal(
      scoreChallenge({ correct: true, elapsed: 30000, allowance: 30000, maximum: max[0], puzzle }),
      0,
    );
  }
});
test('supported guest data is unchanged; older formats fail without mutation', () => {
  const s = initialState();
  s.accounts.a = { id: 'a', alias: 'Player-123', fullName: 'Name' };
  s.sessions[hash('token')] = { accountId: 'a', expires: NOW + 1000 };
  s.attempts = [{ id: 'solo', accountId: 'a', mode: 'solo', score: 5000000 }];
  s.liveResults = [{ id: 'live', accountId: 'a', score: 7200000, scoreVersion: '1.1.0' }];
  s.audit = [{ id: 'audit', reason: 'Keep me' }];
  const before = structuredClone(s);
  upgradeGuestEvent(s);
  upgradeGuestEvent(s);
  assert.deepEqual(s, before);
  s.config.releaseVersion = '1.0.0';
  const old = structuredClone(s);
  assert.throws(() => upgradeGuestEvent(s), /v1.1.0 and later/);
  assert.deepEqual(s, old);
});
test('removed verification and prize commands cannot change the event', async () => {
  const f = fixture();
  await host(f);
  const p = await player(f);
  for (const action of [
    'verify',
    'sendVerification',
    'forgotPassword',
    'resetPassword',
    'changePassword',
    'register',
    'host.finalise',
    'host.collect',
    'host.void',
  ])
    assert(
      (await command(f, action, {}, action.startsWith('host.') ? f.host : p.token)).error,
      action,
    );
  assert.equal(f.s.awards.length, 0);
  assert.equal(f.s.outbox.length, 0);
});
