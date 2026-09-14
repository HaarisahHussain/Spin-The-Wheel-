import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { initialState } from '../server/state.js';
import { createStorage } from '../server/storage.js';
import { createApp } from '../server/app.js';
import { createMail } from '../server/mail.js';
import { authCommand } from '../server/commands/auth.js';
import { authPreflight } from '../server/limits.js';
import { details } from '../server/details.js';
import { tick, transitionDue } from '../server/runtime.js';
import { newGame, answerGame } from '../server/games.js';
import { execute } from '../server/engine.js';
import { secret, issueSession } from '../server/security.js';

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
test('idle scheduler makes no database commits', async () => {
  const s = initialState(),
    storage = await createStorage({ filename: ':memory:', initial: s });
  const server = createApp({
    storage,
    origin: 'http://localhost',
    mail: createMail({ key: secret(), origin: 'http://localhost', preview: true }),
  });
  const count = storage.metrics.commits;
  server.startTimers();
  try {
    await pause(1300);
    assert.equal(storage.metrics.commits, count);
    assert.equal(storage.metrics.stateReads, 1);
  } finally {
    await server.close();
  }
});
test('legacy schema-7 data imports once, changed records persist, rollback and restart preserve scores', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'arcade-upgrade-')),
    filename = join(dir, 'arcade.sqlite');
  const s = initialState();
  s.accounts.a = { id: 'a', email: 'a@bcu.ac.uk', verified: true };
  s.attempts.push({
    id: 'attempt',
    accountId: 'a',
    score: 123456,
    status: 'completed',
    review: [{ code: 'print(1)' }],
    history: [{ private: 'redundant' }],
  });
  const db = new DatabaseSync(filename);
  db.exec('CREATE TABLE arcade_state (id INTEGER PRIMARY KEY,body TEXT NOT NULL)');
  db.prepare('INSERT INTO arcade_state VALUES (1,?)').run(JSON.stringify(s));
  db.close();
  let store;
  try {
    store = await createStorage({ filename, initial: initialState() });
    assert.equal(store.snapshot().attempts[0].score, 123456);
    assert.equal(store.snapshot().attempts[0].history, undefined);
    const records = store.metrics.changedRecords;
    await store.transact((d) => {
      d.config.paused = true;
    });
    assert.equal(store.metrics.changedRecords - records, 1);
    await assert.rejects(
      store.transact((d) => {
        d.attempts[0].score = 0;
        throw Error('rollback');
      }),
    );
    await store.close();
    store = null;
    store = await createStorage({ filename, initial: initialState() });
    assert.equal(store.snapshot().attempts[0].score, 123456);
    assert(store.snapshot().config.paused);
  } finally {
    await store?.close();
    await rm(dir, { recursive: true, force: true });
  }
});
test('transaction queue is bounded and expired work cannot mutate committed state', async () => {
  const storage = await createStorage({
    filename: ':memory:',
    initial: initialState(),
    maxPending: 2,
    maxWaitMs: 20,
  });
  let release;
  const blocked = storage.transact(async () => {
    await new Promise((r) => (release = r));
  });
  await pause(1);
  const expired = storage.transact((s) => {
    s.config.paused = true;
  });
  const checked = assert.rejects(expired, (e) => e.status === 503);
  await assert.rejects(
    storage.transact(() => {}),
    (e) => e.status === 503,
  );
  await pause(30);
  release();
  await blocked;
  await checked;
  assert.equal(storage.snapshot().config.paused, false);
  await storage.close();
});
test('failed host attempts do not block a valid login from a different source', async () => {
  const s = initialState(),
    now = Date.now(),
    services = { hostPasswordHash: 'encoded', preparedAuth: { checks: [] } };
  for (let i = 0; i < 12; i++)
    await assert.rejects(
      authCommand(
        s,
        'staffLogin',
        { username: 'host', password: 'wrong' },
        { ip: 'bad' },
        services,
        now,
      ),
      (e) => e.status === 401,
    );
  const result = await authCommand(
    s,
    'staffLogin',
    { username: 'host', password: 'correct', tabId: 'tab' },
    { ip: 'good', connectionId: 'socket' },
    {
      ...services,
      preparedAuth: { checks: [{ value: 'correct', encoded: 'encoded', matches: true }] },
    },
    now,
  );
  assert(result.token);
});
test('invalid reset requests reject before password preparation; errors are not cached', async () => {
  const s = initialState(),
    now = Date.now();
  assert.throws(() =>
    authPreflight(
      s,
      'resetPassword',
      { password: 'long enough password', linkToken: 'bad' },
      '',
      now,
    ),
  );
  const r = await execute(s, 'unknown', {}, { token: '', ip: 'test', now, commandId: 'error' }, {});
  assert(r.error);
  assert.equal(Object.keys(s.commands).length, 0);
});
test('queue verification holds expire, and scheduler follows puzzle playback deadlines', () => {
  const s = initialState(),
    now = Date.now();
  s.config.windows = [{ start: now - 1000, cutoff: now + 3600000, end: now + 7200000 }];
  s.accounts.a = { id: 'a', email: 'a@bcu.ac.uk', verified: false };
  s.queue = [{ accountId: 'a', admitted: now, sequence: 1, heldUntil: now + 10 }];
  tick(s, now + 11);
  assert.equal(s.queue.length, 0);
  const g = newGame('robot', now);
  answerGame(g, g.question.solution, g.question.id, now + 100);
  s.active = { phase: 'playing', game: g, until: g.deadline };
  assert(transitionDue(s, g.execution.until));
});
test('repeat Live winners do not reserve stock twice or after collection that day', () => {
  const s = initialState(),
    now = Date.now();
  for (const id of ['a', 'b']) s.accounts[id] = { id, email: `${id}@bcu.ac.uk`, verified: true };
  s.awards.push({
    id: 'previous',
    type: 'instant',
    accountId: 'a',
    collected: true,
    collectedDay: new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(now),
  });
  s.live = {
    id: 'live',
    gameId: 'output',
    phase: 'reveal',
    until: now,
    level: 4,
    roster: {
      a: { accountId: 'a', responses: 5, score: 5 },
      b: { accountId: 'b', responses: 5, score: 2 },
    },
  };
  tick(s, now);
  assert.deepEqual(s.live.winners, ['a']);
  assert.deepEqual(s.live.prizeRecipients, []);
  assert.equal(s.awards.length, 1);
});
test('history is paginated and private, with reviews fetched only by their owner or host', () => {
  const s = initialState(),
    now = Date.now();
  for (let i = 0; i < 80; i++)
    s.accounts[i] = {
      id: String(i),
      email: `p${i}@bcu.ac.uk`,
      fullName: `Student ${i}`,
      alias: `Player ${i}`,
    };
  s.attempts = [
    {
      id: 'private',
      accountId: '0',
      status: 'completed',
      score: 10,
      review: [{ code: 'private review' }],
    },
  ];
  const token = issueSession(s, { accountId: '1' }, now),
    host = issueSession(s, { staffId: 'host' }, now);
  assert.throws(
    () => details(s, token, now, { section: 'review', id: 'private' }),
    (e) => e.status === 404,
  );
  assert.throws(
    () => details(s, token, now, { section: 'results' }),
    (e) => e.status === 403,
  );
  const page = details(s, host, now, { section: 'results', people: 30 });
  assert.equal(page.people.length, 30);
  assert.equal(page.totals.people, 80);
  assert.equal(page.attempts[0].review, undefined);
});

test('queued answers use server receipt time for points and commit time for full playback', () => {
  const now = Date.now(),
    instant = newGame('robot', now),
    queued = structuredClone(instant);
  answerGame(instant, instant.question.solution, instant.question.id, now + 1000);
  answerGame(queued, queued.question.solution, queued.question.id, now + 3000, now + 1000);
  assert.equal(queued.elapsedMs, instant.elapsedMs);
  assert.equal(queued.execution.started, now + 3000);
  assert.equal(
    queued.execution.until - queued.execution.started,
    instant.execution.until - instant.execution.started,
  );
});
