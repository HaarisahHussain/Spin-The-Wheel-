import { recoverServiceDelay } from '../server/recovery.js';
import { selectGame } from '../server/selection.js';
import { migrateState } from '../server/migration.js';
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
import {
  question,
  board,
  shortest,
  newGame,
  answerGame,
  tickGame,
  publicGame,
} from '../server/games.js';
import { allowedEmail, SCORING_VERSION } from '../shared/catalog.js';
const now = 1800000000000;
function fixture() {
  const s = initialState(now);
  s.config.windows = [{ start: now - 1000, cutoff: now + 18000000, end: now + 21600000 }];
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
  tick(f.s, now + 3000);
  tick(f.s, now + 6000);
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
  assert.equal(game.phase, 'feedback');
  assert(!answerGame(game, q.answer, q.id, now + 200));
  tickGame(game, now + 3100);
  assert.equal(game.level, 1);
  assert(!answerGame(game, q.answer, q.id, now + 3200));
});
test('three starts are the limit, across account recovery and days', async () => {
  const f = fixture(),
    p = await player(f);
  for (let i = 0; i < 3; i++)
    f.s.attempts.push({
      id: crypto.randomUUID(),
      accountId: p.id,
      mode: 'ranked',
      version: SCORING_VERSION,
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
      version: SCORING_VERSION,
      gameId: 'debug',
      status: 'completed',
      score: 800,
      ended: now,
    },
    {
      id: 'b',
      accountId: p.id,
      mode: 'ranked',
      version: SCORING_VERSION,
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
  tick(f.s, now + 20000);
  tick(f.s, now + 23000);
  tick(f.s, now + 26000);
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
    version: SCORING_VERSION,
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
      version: SCORING_VERSION,
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
  for (let i = 0; i < 450; i++) {
    const q = board(i % 9);
    const distance = shortest(q.blocks, q.start, q.goal, q.size);

    assert(Number.isFinite(distance));
    assert.equal(distance, q.distance);
    assert(distance <= q.maxMoves);
    assert(!q.blocks.includes(q.start));
    assert(!q.blocks.includes(q.goal));
    assert.equal(q.position, q.start);
    assert(q.blocks.every((cell) => cell >= 0 && cell < q.size * q.size));
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

test('feedback freezes answering time, reveals only the completed question and scores once', () => {
  const game = newGame('output', now),
    q = game.question;
  assert(answerGame(game, q.answer, q.id, now + 5000));
  assert.equal(game.remainingMs, 70000);
  assert.equal(game.score, 98);
  assert(!answerGame(game, q.answer, q.id, now + 5001));
  tickGame(game, now + 7999);
  assert.equal(game.question.id, q.id);
  const view = publicGame(game);
  assert.equal(view.question.answer, q.answer);
  assert.equal(view.history, undefined);
  tickGame(game, now + 8000);
  assert.equal(game.deadline, now + 78000);
  assert.equal(game.questionAt, now + 8000);
  assert.equal(publicGame(game).question.answer, undefined);
  assert.equal(game.feedback, null);
  assert.equal(game.score, 98);
});

test('timeout and ninth answer keep the final three-second reveal before completion', () => {
  const timed = newGame('debug', now);
  tickGame(timed, now + 75000);
  assert.equal(timed.phase, 'feedback');
  assert(!timed.complete);
  tickGame(timed, now + 77999);
  assert(!timed.complete);
  tickGame(timed, now + 78000);
  assert(timed.complete);
  assert.equal(timed.completionStatus, 'timed_out');
  const game = newGame('output', now);
  let time = now;
  for (let i = 0; i < 9; i++) {
    time += 1000;
    assert(answerGame(game, game.question.answer, game.question.id, time));
    assert(!game.complete);
    time += 3000;
    tickGame(game, time);
  }
  assert(game.complete);
  assert.equal(game.score, 900);
  assert.equal(game.remainingMs, 66000);
});

test('ten wheel slots preserve equal game draws, retained outcomes and circular alternation', () => {
  for (let n = 1; n <= 10; n++) {
    const available = Array.from({ length: n }, (_, i) => ({ id: `g${i}` }));
    for (let chosen = 0; chosen < n; chosen++) {
      let calls = 0;
      const selection = selectGame(available, now, null, (maximum) => {
        if (calls++ === 0) {
          assert.equal(maximum, n);
          return chosen;
        }
        return 0;
      });
      assert.equal(selection.gameId, `g${chosen}`);
      assert.equal(selection.slots[selection.sector], selection.gameId);
      assert.equal(selection.slots.length, 10);
      assert.equal(new Set(selection.slots).size, n);
      if (n > 1) assert(selection.slots.every((id, i) => id !== selection.slots[(i + 1) % 10]));
    }
  }
  assert.throws(() => selectGame([], now));
  assert.throws(() => selectGame([{ id: 'a' }], now, 'missing'));
});

async function liveFixture(count = 2) {
  const f = fixture(),
    players = [];
  for (let i = 0; i < count; i++) players.push(await player(f, `live${i}@bcu.ac.uk`));
  assert(!(await cmd(f, 'host.openLive', {}, f.host)).error);
  for (const p of players)
    assert(!(await cmd(f, 'joinLive', { code: f.s.live.code }, p.token)).error);
  return { f, players };
}

test('live freezes membership, selects after lobby, hides early answers and ends on all submissions', async () => {
  const { f, players } = await liveFixture();
  assert.equal(f.s.live.gameId, null);
  tick(f.s, now + 20000);
  assert.equal(f.s.live.phase, 'wheel');
  const selection = structuredClone(f.s.live.selection);
  assert((await cmd(f, 'joinLive', { code: f.s.live.code }, players[0].token, now + 20001)).error);
  tick(f.s, now + 23000);
  tick(f.s, now + 26000);
  assert.deepEqual(f.s.live.selection, selection);
  const q = f.s.live.question;
  for (const p of players)
    assert(
      !(await cmd(f, 'liveAnswer', { challengeId: q.id, answer: q.answer }, p.token, now + 26100))
        .error,
    );
  const view = project(f.s, players[0].token, now + 26200, 'http://localhost');
  assert.equal(view.live.question.answer, undefined);
  assert(view.live.roster.every((e) => e.score === undefined));
  assert.equal(view.me.liveEntry.correct, undefined);
  tick(f.s, now + 27999);
  assert.equal(f.s.live.phase, 'question');
  tick(f.s, now + 28000);
  assert.equal(f.s.live.phase, 'reveal');
  assert.equal(project(f.s, '', now + 28000, 'http://localhost').live.question.answer, q.answer);
  tick(f.s, now + 31000);
  assert.equal(f.s.live.level, 1);
});

test('50-player roster survives disconnects; silence has a fixed deadline and no prizes', async () => {
  const { f, players } = await liveFixture(50);
  tick(f.s, now + 20000, new Set());
  tick(f.s, now + 23000);
  tick(f.s, now + 26000);
  assert.equal(Object.keys(f.s.live.roster).length, 50);
  let time = now + 26000;
  for (const seconds of [15, 15, 20, 20, 25, 25]) {
    assert.equal(f.s.live.until, time + seconds * 1000);
    time = f.s.live.until;
    tick(f.s, time);
    assert.equal(f.s.live.phase, 'reveal');
    time += 3000;
    tick(f.s, time);
  }
  assert.equal(f.s.live.phase, 'winner');
  assert.equal(f.s.awards.length, 0);
  time += 8000;
  tick(f.s, time);
  assert.equal(f.s.live, null);
  assert.equal(f.s.config.nextLobbyAt, time + 300000);
  assert.equal(players.length, 50);
});

test('live settings are snapshotted and solo input time cannot be changed through host settings', async () => {
  const { f } = await liveFixture();
  assert(
    !(await cmd(f, 'host.settings', { revision: 1, lobbySeconds: 45, liveTimeScale: 1.5 }, f.host))
      .error,
  );
  assert.equal(f.s.live.until, now + 20000);
  tick(f.s, now + 20000);
  tick(f.s, now + 23000);
  tick(f.s, now + 26000);
  assert.equal(f.s.live.until, now + 41000);
  assert((await cmd(f, 'host.settings', { revision: 2, feedbackSeconds: 0 }, f.host)).error);
});

test('insufficient lobby cancels; pending live waits for result and never reruns back to back', async () => {
  const { f } = await liveFixture(1);
  tick(f.s, now + 20000);
  assert.equal(f.s.live.phase, 'cancelled');
  tick(f.s, now + 23000);
  assert.equal(f.s.live, null);
  assert.equal(f.s.config.nextLobbyAt, now + 323000);
  const p = await player(f, 'queued@bcu.ac.uk');
  await cmd(f, 'enqueue', { mode: 'practice' }, p.token, now + 24000);
  await cmd(f, 'host.openLive', {}, f.host, now + 24000);
  tick(f.s, now + 24000);
  assert.equal(f.s.live, null);
  assert(!(await cmd(f, 'host.call', {}, f.host, now + 24000)).error);
  assert(f.s.active);
});

test('end window guards pending live and does not starve remaining solo queue', async () => {
  const f = fixture(),
    p = await player(f);
  f.s.config.windows = [{ start: now - 1000, cutoff: now + 100000, end: now + 180000 }];
  f.s.config.autoLive = true;
  f.s.config.nextLobbyAt = now;
  assert((await cmd(f, 'host.openLive', {}, f.host)).error);
  f.s.queue.push({ accountId: p.id, mode: 'practice', sequence: 1, admitted: now });
  assert(!(await cmd(f, 'host.call', {}, f.host)).error);
});

test('migration preserves accounts and old scores but gates the new competitive version', () => {
  const f = fixture();
  delete f.s.config.releaseVersion;
  f.s.attempts = [
    {
      id: 'old',
      accountId: 'x',
      mode: 'ranked',
      status: 'completed',
      score: 900,
      version: '0.3-old',
    },
  ];
  f.s.accounts.x = { id: 'x', alias: 'Existing player' };
  migrateState(f.s, now);
  assert.equal(f.s.accounts.x.alias, 'Existing player');
  assert.equal(f.s.attempts.length, 1);
  assert.equal(f.s.config.rankedEnabled, false);
  assert.equal(leaderboard(f.s).length, 0);
  const snapshot = structuredClone(f.s);
  migrateState(f.s, now + 100);
  assert.deepEqual(f.s, snapshot);
});

test('service stalls interrupt active attempts once without refunding or erasing scores', async () => {
  const f = fixture(),
    p = await player(f);
  await start(f, p);
  f.s.active.game.score = 200;
  recoverServiceDelay(f.s, now + 10000);
  assert.equal(f.s.attempts[0].status, 'interrupted');
  assert.equal(f.s.attempts[0].score, 200);
  assert.equal(usedAttempts(f.s, p.id), 1);
  assert.equal(f.s.active, null);
  assert(f.s.config.paused);
  recoverServiceDelay(f.s, now + 11000);
  assert.equal(f.s.incidents.length, 1);
});

test('idle-only settings do not reset the automatic live schedule', async () => {
  const f = fixture();
  f.s.config.autoLive = true;
  const deadline = f.s.config.nextLobbyAt;
  assert(
    !(
      await cmd(
        f,
        'host.settings',
        {
          revision: 1,
          interval: 300,
          autoLive: true,
          idlePresentation: 'text',
          animateIdleWheel: false,
        },
        f.host,
        now + 1000,
      )
    ).error,
  );
  assert.equal(f.s.config.nextLobbyAt, deadline);
});

test('Ranked settings work without calibration and toggling preserves attempts and standings', async () => {
  const f = fixture(),
    p = await player(f);
  const a = await start(f, p);
  f.s.attempts[0].status = 'completed';
  f.s.attempts[0].score = 400;
  f.s.attempts[0].ended = now + 7000;
  f.s.active = null;
  for (const rankedEnabled of [false, true]) {
    const result = await cmd(
      f,
      'host.settings',
      { revision: f.s.config.policyVersion, rankedEnabled },
      f.host,
    );
    assert(!result.error, result.error);
    assert.equal(f.s.config.rankedEnabled, rankedEnabled);
    assert.equal(usedAttempts(f.s, p.id), 1);
    assert.equal(leaderboard(f.s)[0].score, 400);
    const admission = await cmd(f, 'enqueue', { mode: 'ranked' }, p.token);
    assert.equal(Boolean(admission.error), !rankedEnabled);
  }
  assert.equal(a.mode, 'ranked');
});

test('Ranked enabling rejects finalised results, incompatible versions and stale settings', async () => {
  for (const config of [{ finalised: true }, { scoringVersion: 'old' }, { policyVersion: 2 }]) {
    const f = fixture();
    Object.assign(f.s.config, { rankedEnabled: false }, config);
    const r = await cmd(f, 'host.settings', { revision: 1, rankedEnabled: true }, f.host);
    assert(r.error);
    assert.equal(f.s.config.rankedEnabled, false);
  }
});

test('Debug prompts use a consistent beginner question and valid answer line', () => {
  for (let level = 0; level < 9; level++) {
    for (let i = 0; i < 20; i++) {
      const q = question('debug', level);
      assert(q.prompt.endsWith('Which line needs changing?'));
      assert(q.code.split('\n')[Number(q.answer)].trim());
    }
  }
});
