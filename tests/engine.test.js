import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initialState, usedAttempts, leaderboard } from '../server/state.js';
import { execute, tick } from '../server/engine.js';
import {
  issueSession,
  secret,
  hash,
  passwordHash,
  passwordMatches,
  totp,
} from '../server/security.js';
import { createMail } from '../server/mail.js';
import { createStorage } from '../server/storage.js';
import { project } from '../server/projection.js';
import { question, board, shortest, newGame, answerGame } from '../server/games.js';
import { allowedEmail, SCORING_VERSION } from '../shared/catalog.js';
const now = 1800000000000;
function fixture() {
  const s = initialState(now);
  s.config.windows = [{ start: now - 1000, cutoff: now + 18000000, end: now + 21600000 }];
  s.config.calibrationVersion = SCORING_VERSION;
  s.config.rankedEnabled = true;
  s.config.requireVerification = false;
  s.staff.host = { id: 'host', username: 'host', role: 'admin' };
  const host = issueSession(s, { staffId: 'host' }, now);
  const mail = createMail({ key: secret(), origin: 'http://localhost:3001', preview: true });
  return { s, host, mail };
}
async function cmd(f, action, p = {}, token = '', time = now, id = crypto.randomUUID()) {
  return execute(f.s, action, p, { token, ip: 'test', now: time, commandId: id }, { mail: f.mail });
}
async function player(f, email = 'student@mail.bcu.ac.uk') {
  const r = await cmd(f, 'register', { email, course: 'Computing', level: 'Year 1' });
  assert(!r.error, r.error);
  return { token: r.token, id: Object.keys(f.s.accounts).at(-1), recovery: r.recovery };
}
async function start(f, p, mode = 'ranked') {
  assert(!(await cmd(f, 'enqueue', { mode }, p.token)).error);
  assert(!(await cmd(f, 'host.call', {}, f.host)).error);
  assert(!(await cmd(f, 'ready', {}, p.token)).error);
  tick(f.s, now + 2600);
  tick(f.s, now + 6100);
  tick(f.s, now + 9100);
  assert.equal(f.s.active.phase, 'playing');
  return f.s.active;
}

test('both exact BCU domains accepted; lookalikes and malformed local parts rejected', () => {
  for (const value of ['a@bcu.ac.uk', 'A.B@mail.bcu.ac.uk', 'a+b@bcu.ac.uk'])
    assert(allowedEmail(value));
  for (const value of [
    'a@gmail.com',
    'a@bcu.ac.uk.evil.com',
    'a@x.bcu.ac.uk',
    'a..b@bcu.ac.uk',
    '.a@bcu.ac.uk',
    'a@bcu.ac.uk\nattack',
  ])
    assert(!allowedEmail(value), value);
});
test('ON blocks every mode; OFF does not fake verification or reset counts', async () => {
  const f = fixture(),
    p = await player(f);
  f.s.config.requireVerification = true;
  assert.equal((await cmd(f, 'enqueue', { mode: 'practice' }, p.token)).status, 403);
  assert.equal((await cmd(f, 'enqueue', { mode: 'ranked' }, p.token)).status, 403);
  f.s.live = { phase: 'lobby', code: '123456', roster: {} };
  assert.equal((await cmd(f, 'joinLive', { code: '123456' }, p.token)).status, 403);
  f.s.live = null;
  assert(
    !(await cmd(f, 'host.settings', { revision: 1, requireVerification: false }, f.host)).error,
  );
  assert(!(await cmd(f, 'enqueue', { mode: 'practice' }, p.token)).error);
  assert.equal(f.s.accounts[p.id].verified, false);
});
test('verification binds to requesting session and rotates guest recovery credentials', async () => {
  const f = fixture(),
    p = await player(f);
  await cmd(f, 'sendVerification', {}, p.token);
  const message = f.mail.open(f.s.outbox[0].payload);
  const other = issueSession(f.s, { accountId: p.id, pending: true }, now);
  assert((await cmd(f, 'verify', { linkToken: message.token }, other)).error);
  const r = await cmd(f, 'verify', { code: message.code }, p.token);
  assert(!r.error);
  assert(f.s.accounts[p.id].verified);
  assert(!f.s.sessions[hash(p.token)]);
  assert.notEqual(r.recovery, p.recovery);
  assert((await cmd(f, 'recover', { code: p.recovery })).error);
});
test('failed verification persists guess budget but cannot change ownership', async () => {
  const f = fixture(),
    p = await player(f);
  await cmd(f, 'sendVerification', {}, p.token);
  for (let i = 0; i < 5; i++) assert((await cmd(f, 'verify', { code: '000000' }, p.token)).error);
  assert.equal(Object.values(f.s.challenges)[0].guesses, 5);
  assert(!f.s.accounts[p.id].verified);
});
test('replaying registration response is idempotent without plaintext credential storage', async () => {
  const f = fixture(),
    id = crypto.randomUUID(),
    payload = { email: 'a@bcu.ac.uk', course: 'Staff', level: 'Staff' };
  const a = await cmd(f, 'register', payload, '', now, id),
    b = await cmd(f, 'register', payload, '', now, id);
  assert.deepEqual(a, b);
  assert.equal(Object.keys(f.s.accounts).length, 1);
  assert(!JSON.stringify(f.s).includes(a.recovery));
});
test('a rejected settings mutation rolls back earlier fields', async () => {
  const f = fixture();
  const r = await cmd(f, 'host.settings', { revision: 1, interval: 120, lobbySeconds: -1 }, f.host);
  assert(r.error);
  assert.equal(f.s.config.interval, 300);
});
test('one queue entry and no enqueue while selected/playing', async () => {
  const f = fixture(),
    p = await player(f);
  await cmd(f, 'enqueue', { mode: 'ranked' }, p.token);
  await cmd(f, 'enqueue', { mode: 'ranked' }, p.token);
  assert.equal(f.s.queue.length, 1);
  await cmd(f, 'host.call', {}, f.host);
  assert((await cmd(f, 'enqueue', { mode: 'practice' }, p.token)).error);
});
test('ranked selection survives pre-start cancellation without using an attempt', async () => {
  const f = fixture(),
    p = await player(f);
  await cmd(f, 'enqueue', { mode: 'ranked' }, p.token);
  await cmd(f, 'host.call', {}, f.host);
  await cmd(f, 'ready', {}, p.token);
  const chosen = f.s.active.gameId;
  await cmd(f, 'host.skip', { reason: 'Player needs a moment' }, f.host);
  assert.equal(usedAttempts(f.s, p.id), 0);
  await cmd(f, 'enqueue', { mode: 'ranked' }, p.token);
  await cmd(f, 'host.call', {}, f.host);
  await cmd(f, 'ready', {}, p.token);
  assert.equal(f.s.active.gameId, chosen);
});
test('turning ON holds unstarted accounts but allows already-started OFF games to finish', async () => {
  const f = fixture(),
    p = await player(f),
    active = await start(f, p);
  assert.equal(usedAttempts(f.s, p.id), 1);
  await cmd(f, 'host.settings', { revision: 1, requireVerification: true }, f.host, now + 10000);
  assert.equal(f.s.active.phase, 'playing');
  await cmd(f, 'quit', { attemptId: active.attemptId }, p.token, now + 11000);
  assert.equal(f.s.attempts[0].status, 'abandoned');
  assert.equal(f.s.attempts[0].verified, false);
});
test('Practice to Ranked conversion cannot bypass cutoff', async () => {
  const f = fixture(),
    p = await player(f);
  await cmd(f, 'enqueue', { mode: 'practice' }, p.token);
  const r = await cmd(f, 'mode', { mode: 'ranked' }, p.token, now + 18000001);
  assert(r.error);
  assert.equal(f.s.queue[0].mode, 'practice');
});
test('stale answers and distinct-ID repeated choices cannot affect next challenge', () => {
  const game = newGame('debug', now),
    q = game.question;
  assert(answerGame(game, q.answer, q.id, now + 100));
  assert.equal(game.level, 1);
  assert(!answerGame(game, q.answer, q.id, now + 200));
  assert.equal(game.level, 1);
});
test('three starts are the limit, across account recovery and days', async () => {
  const f = fixture(),
    p = await player(f);
  for (let i = 0; i < 3; i++)
    f.s.attempts.push({
      id: crypto.randomUUID(),
      accountId: p.id,
      mode: 'ranked',
      status: 'abandoned',
      score: 0,
    });
  assert((await cmd(f, 'enqueue', { mode: 'ranked' }, p.token)).error);
  const recovered = await cmd(f, 'recover', { code: p.recovery });
  assert(!recovered.error);
  assert((await cmd(f, 'enqueue', { mode: 'ranked' }, recovered.token)).error);
  assert(!(await cmd(f, 'enqueue', { mode: 'practice' }, recovered.token)).error);
});
test('void refunds once, removes best score, and retains selected game for replacement', async () => {
  const f = fixture(),
    p = await player(f);
  f.s.attempts = [
    {
      id: 'a',
      accountId: p.id,
      mode: 'ranked',
      gameId: 'debug',
      status: 'completed',
      score: 800,
      ended: now,
    },
    {
      id: 'b',
      accountId: p.id,
      mode: 'ranked',
      gameId: 'output',
      status: 'completed',
      score: 500,
      ended: now,
    },
  ];
  assert.equal(leaderboard(f.s)[0].score, 800);
  await cmd(f, 'host.void', { attemptId: 'a', reason: 'Observed service interruption' }, f.host);
  await cmd(f, 'host.void', { attemptId: 'a', reason: 'Retry' }, f.host);
  assert.equal(usedAttempts(f.s, p.id), 1);
  assert.equal(leaderboard(f.s)[0].score, 500);
  assert.equal(f.s.accounts[p.id].pendingGame, 'debug');
});
test('a due live event cannot steal a selected solo turn', async () => {
  const f = fixture(),
    p = await player(f);
  await cmd(f, 'enqueue', { mode: 'practice' }, p.token);
  await cmd(f, 'host.call', {}, f.host);
  await cmd(f, 'host.openLive', {}, f.host);
  tick(f.s, now + 100);
  assert(f.s.active);
  assert.equal(f.s.live, null);
  tick(f.s, now + 21000);
  assert.equal(f.s.active, null);
  assert.equal(f.s.live.phase, 'lobby');
});
test('live answer locks once and remains private before reveal', async () => {
  const f = fixture(),
    a = await player(f, 'a@bcu.ac.uk'),
    b = await player(f, 'b@bcu.ac.uk');
  await cmd(f, 'host.openLive', {}, f.host);
  for (const p of [a, b]) await cmd(f, 'joinLive', { code: f.s.live.code }, p.token);
  tick(f.s, now + 30001, new Set([a.id, b.id]));
  tick(f.s, now + 35002, new Set([a.id, b.id]));
  const q = f.s.live.question;
  assert(
    !(await cmd(f, 'liveAnswer', { challengeId: q.id, answer: q.answer }, a.token, now + 36000))
      .error,
  );
  assert(
    (await cmd(f, 'liveAnswer', { challengeId: q.id, answer: q.answer }, a.token, now + 36001))
      .error,
  );
  const view = project(f.s, '', now + 36000, 'http://localhost');
  assert.equal(view.live.question.answer, undefined);
  assert.equal(view.live.roster[0].score, undefined);
});
test('public projection never contains account email, answer keys or host settings', async () => {
  const f = fixture(),
    p = await player(f);
  await start(f, p);
  const view = project(f.s, '', now, 'http://localhost');
  assert(!JSON.stringify(view).includes('student@mail.bcu.ac.uk'));
  assert.equal(view.active.game.question.answer, undefined);
  assert.equal(view.host, undefined);
  assert.equal(view.active.game.history, undefined);
});
test('player session cannot mutate host state', async () => {
  const f = fixture(),
    p = await player(f);
  const r = await cmd(f, 'host.settings', { revision: 1, requireVerification: false }, p.token);
  assert.equal(r.status, 403);
});
test('spare controller is single-use, private and limited to its assigned queue turn', async () => {
  const f = fixture(),
    p = await player(f);
  await cmd(f, 'enqueue', { mode: 'practice' }, p.token);
  const grant = await cmd(f, 'host.pair', { accountId: p.id, identityConfirmed: true }, f.host);
  const paired = await cmd(f, 'claimController', { code: grant.pairingCode });
  assert(!paired.error);
  assert((await cmd(f, 'claimController', { code: grant.pairingCode })).error);
  const view = project(f.s, paired.token, now, 'http://localhost');
  assert.equal(view.me.email, undefined);
  assert.deepEqual(view.me.attempts, []);
  for (const action of ['enqueue', 'changeEmail', 'sendVerification', 'host.settings'])
    assert.equal((await cmd(f, action, {}, paired.token)).status, 403);
  await cmd(f, 'leave', {}, p.token);
  await cmd(f, 'enqueue', { mode: 'practice' }, p.token);
  assert.equal(project(f.s, paired.token, now, 'http://localhost').me, null);
});
test('exhausted verification can be replaced after cooldown and old code stays invalid', async () => {
  const f = fixture(),
    p = await player(f);
  await cmd(f, 'sendVerification', {}, p.token);
  const old = Object.values(f.s.challenges)[0];
  old.guesses = 5;
  assert(!(await cmd(f, 'sendVerification', {}, p.token, now + 61000)).error);
  assert(f.s.challenges[old.id].used);
  const fresh = Object.values(f.s.challenges).at(-1);
  assert.notEqual(fresh.id, old.id);
  const payload = f.mail.open(f.s.outbox.at(-1).payload);
  assert(!(await cmd(f, 'verify', { code: payload.code }, p.token, now + 62000)).error);
});
test('finalisation persists one award and email per winner across retries', async () => {
  const f = fixture(),
    p = await player(f);
  f.s.attempts.push({
    id: 'score',
    accountId: p.id,
    gameId: 'debug',
    mode: 'ranked',
    status: 'completed',
    score: 500,
    ended: now,
  });
  for (let i = 0; i < 2; i++) assert(!(await cmd(f, 'host.finalise', {}, f.host)).error);
  assert.equal(f.s.awards.length, 1);
  assert.equal(f.s.outbox.length, 1);
  assert.equal(f.mail.open(f.s.outbox[0].payload).email, 'student@mail.bcu.ac.uk');
});
test('grand-prize boundary ties block silent finalisation', async () => {
  const f = fixture();
  for (let i = 0; i < 4; i++) {
    const p = await player(f, `p${i}@bcu.ac.uk`);
    f.s.attempts.push({
      id: String(i),
      accountId: p.id,
      mode: 'ranked',
      status: 'completed',
      score: 600,
      ended: now,
    });
  }
  assert((await cmd(f, 'host.finalise', {}, f.host)).error);
  assert.equal(f.s.config.finalised, false);
  assert.equal(leaderboard(f.s)[3].rank, 1);
});
test('prize collection is idempotent', async () => {
  const f = fixture(),
    p = await player(f);
  f.s.awards.push({ id: 'award', accountId: p.id, type: 'instant', collected: false });
  for (let i = 0; i < 2; i++)
    assert(!(await cmd(f, 'host.collect', { id: 'award', identityConfirmed: true }, f.host)).error);
  assert.equal(f.s.config.instantPrizes, 49);
});
test('generated Robot boards are reachable, with valid positions at every tier', () => {
  for (let i = 0; i < 600; i++) {
    const q = board(i % 6);
    assert(Number.isFinite(shortest(q.blocks)));
    assert(!q.blocks.includes(0) && !q.blocks.includes(24));
  }
});
test('generated questions have a legal unique answer option/line', () => {
  for (let i = 0; i < 180; i++) {
    for (const id of ['debug', 'output']) {
      const q = question(id, i % 9);
      if (id === 'output') assert.equal(q.choices.filter((x) => x === q.answer).length, 1);
      else assert(Number(q.answer) < q.code.split('\n').length);
    }
  }
});
test('staff passwords and TOTP have valid and invalid paths', () => {
  const encoded = passwordHash('a long test password');
  assert(passwordMatches('a long test password', encoded));
  assert(!passwordMatches('wrong', encoded));
  const otp = totp('JBSWY3DPEHPK3PXP');
  assert.equal(otp.validate({ token: otp.generate({ timestamp: now }), timestamp: now }), 0);
});
test('durable storage serializes concurrent mutations and survives reopen', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'arcade-store-'));
  const filename = join(directory, 'state.sqlite');
  let store = await createStorage({ filename, initial: initialState(now) });
  await Promise.all(
    Array.from({ length: 20 }, () =>
      store.transact((s) => {
        s.config.capacity++;
      }),
    ),
  );
  assert.equal(store.snapshot().config.capacity, 50);
  await store.close();
  store = await createStorage({ filename, initial: initialState(now) });
  assert.equal(store.snapshot().config.capacity, 50);
  await store.close();
  await rm(directory, { recursive: true });
});
