import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { initialState } from '../server/state.js';
import { createStorage } from '../server/storage.js';
import { createApp } from '../server/app.js';
import { createMail } from '../server/mail.js';
import { secret, passwordHash, issueSession } from '../server/security.js';
const PASSWORD = 'a local integration password';
test('HTTP host takeover fences old sockets; cookies and player identity are isolated', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'arcade-http-')),
    origin = 'http://127.0.0.1:3199';
  const s = initialState();
  s.config.requireVerification = false;
  const storage = await createStorage({ filename: join(dir, 'test.sqlite'), initial: s });
  const server = createApp({
    storage,
    origin,
    hostPasswordHash: passwordHash(PASSWORD),
    mail: createMail({ key: secret(), origin, preview: true }),
  });
  await new Promise((r) => server.http.listen(3199, '127.0.0.1', r));
  const sockets = [];
  const connection = async (cookie = '', audience = 'host') => {
    const socket = io(origin, {
      forceNew: true,
      transports: ['websocket'],
      query: { audience },
      auth: { audience },
      extraHeaders: { Origin: origin, Cookie: cookie },
    });
    sockets.push(socket);
    await new Promise((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
    return socket;
  };
  const cmd = async (
    socket,
    cookie,
    action,
    payload = {},
    audience = 'host',
    id = crypto.randomUUID(),
  ) =>
    fetch(origin + '/api/command', {
      method: 'POST',
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
        'X-Arcade-Audience': audience,
        'X-Arcade-Connection': socket?.id || '',
        Cookie: cookie,
      },
      body: JSON.stringify({ action, payload, id }),
    });
  try {
    const evil = await fetch(origin + '/api/command', {
      method: 'POST',
      headers: { Origin: 'https://evil.invalid', 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(evil.status, 403);
    const a = await connection(),
      b = await connection();
    const login = await cmd(a, '', 'staffLogin', {
      username: 'host',
      password: PASSWORD,
      tabId: 'a',
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    assert(cookie.startsWith('arcade_host='));
    assert(login.headers.get('set-cookie').includes('HttpOnly'));
    const first = await login.json();
    a.disconnect();
    const hostSocket = await connection(cookie);
    let r = await cmd(hostSocket, cookie, 'hostControl', {
      expectedEpoch: first.epoch,
      tabId: 'a',
    });
    assert.equal(r.status, 200);
    const lease = await r.json();
    const commits = storage.metrics.commits;
    const receipts = Object.keys(storage.snapshot().commands).length;
    const heartbeat = await cmd(hostSocket, cookie, 'hostControl', {
      heartbeat: true,
      controlEpoch: lease.epoch,
    });
    assert.equal(heartbeat.status, 200);
    assert.equal(storage.metrics.commits, commits);
    assert.equal(Object.keys(storage.snapshot().commands).length, receipts);
    r = await cmd(b, '', 'staffLogin', { username: 'host', password: PASSWORD, tabId: 'b' });
    const pending = await r.json();
    assert(pending.takeover);
    assert.equal(r.headers.get('set-cookie'), null);
    r = await cmd(b, '', 'hostTakeover', { challenge: pending.takeover });
    assert.equal(r.status, 200);
    r = await cmd(hostSocket, cookie, 'host.settings', {
      revision: 1,
      paused: true,
      controlEpoch: lease.epoch,
    });
    assert.equal(r.status, 401);
    assert.equal(storage.snapshot().config.paused, false);
    const register = await cmd(
      null,
      '',
      'register',
      {
        email: 'x@bcu.ac.uk',
        password: PASSWORD,
        fullName: 'Private Name',
        course: 'Computing',
        level: 'Year 1',
      },
      'account',
    );
    assert.equal(register.status, 200);
    assert(register.headers.get('set-cookie').startsWith('arcade_session='));
    const display = await (
      await fetch(origin + '/api/state?audience=display', { headers: { Cookie: cookie } })
    ).json();
    assert(!display.host && !display.me);
    assert(!JSON.stringify(display).includes('Private Name'));
  } finally {
    for (const socket of sockets) socket.disconnect();
    await server.close();
    await rm(dir, { recursive: true, force: true });
  }
});
test('50 authenticated real sockets submit complete Live coding and puzzle sessions', async () => {
  const origin = 'http://127.0.0.1:3198',
    s = initialState();
  s.config.requireVerification = false;
  s.config.windows = [
    { start: Date.now() - 60000, cutoff: Date.now() + 3600000, end: Date.now() + 7200000 },
  ];
  const cookies = [];
  for (let i = 0; i < 50; i++) {
    const id = String(i);
    s.accounts[id] = { id, alias: 'Player-' + i, email: `p${i}@bcu.ac.uk`, verified: true };
    cookies.push('arcade_session=' + issueSession(s, { accountId: id }, Date.now()));
  }
  const storage = await createStorage({ filename: ':memory:', initial: s }),
    server = createApp({
      storage,
      origin,
      mail: createMail({ key: secret(), origin, preview: true }),
      hostPasswordHash: passwordHash(PASSWORD),
    });
  await new Promise((r) => server.http.listen(3198, '127.0.0.1', r));
  const sockets = [];
  const latency = [];
  try {
    await Promise.all(
      cookies.map(
        (cookie, i) =>
          new Promise((resolve, reject) => {
            const socket = io(origin, {
              forceNew: true,
              transports: ['websocket'],
              query: { audience: 'account' },
              auth: { audience: 'account' },
              extraHeaders: { Origin: origin, Cookie: cookie },
            });
            sockets[i] = socket;
            socket.once('connect', resolve);
            socket.once('connect_error', reject);
          }),
      ),
    );
    await storage.transact((s) =>
      sockets.forEach((socket, i) => {
        s.accounts[i].inputConnection = socket.id;
        s.accounts[i].inputSession = Object.keys(s.sessions).find(
          (k) => s.sessions[k].accountId === String(i),
        );
      }),
    );
    const { tick } = await import('../server/engine.js');
    for (const gameId of ['debug', 'output', 'robot', 'parcel', 'painter']) {
      await storage.transact((s) => {
        s.live = {
          id: gameId,
          gameId,
          phase: 'countdown',
          level: 0,
          until: Date.now(),
          settings: { liveTimeScale: 1 },
          roster: Object.fromEntries(
            cookies.map((_, i) => [
              String(i),
              { accountId: String(i), answer: null, score: 0, responses: 0 },
            ]),
          ),
        };
        tick(s, Date.now());
      });
      while (storage.snapshot().live.phase !== 'winner') {
        const current = storage.snapshot().live;
        if (current.phase === 'question') {
          // Keep real test deadlines long enough to measure submission load; no scheduler timer in this harness.
          await storage.transact((s) => {
            s.live.until = Date.now() + 120000;
            s.live.questionAt = Date.now() - 100;
          });
          const q = current.question;
          await Promise.all(
            sockets.map(async (socket, i) => {
              const start = performance.now();
              const response = await fetch(origin + '/api/command', {
                method: 'POST',
                headers: {
                  Origin: origin,
                  'Content-Type': 'application/json',
                  'X-Arcade-Connection': socket.id,
                  Cookie: cookies[i],
                },
                body: JSON.stringify({
                  action: 'liveAnswer',
                  id: crypto.randomUUID(),
                  payload: {
                    challengeId: q.id,
                    ...(q.kind === 'quiz' ? { answer: q.answer } : { program: q.solution }),
                  },
                }),
              });
              latency.push(performance.now() - start);
              assert.equal(response.status, 200, await response.text());
            }),
          );
          assert(Object.values(storage.snapshot().live.roster).every((e) => e.answer !== null));
        }
        await storage.transact((s) => tick(s, s.live.until));
      }
    }
    assert.equal(storage.snapshot().liveResults.length, 250);
    latency.sort((a, b) => a - b);
    console.log(
      `50-player local p95 acknowledgement: ${Math.round(latency[Math.floor(latency.length * 0.95)])} ms (${latency.length} accepted answers)`,
    );
  } finally {
    sockets.forEach((s) => s.disconnect());
    await server.close();
  }
});
test('SQLite persistence rolls back a failed transaction and rejects duplicate server ownership', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'arcade-storage-')),
    filename = join(dir, 'state.sqlite');
  const a = await createStorage({ filename, initial: initialState() });
  try {
    await assert.rejects(createStorage({ filename, initial: initialState() }));
    await assert.rejects(
      a.transact((s) => {
        s.config.paused = true;
        throw Error('fault');
      }),
    );
    assert(!a.snapshot().config.paused);
  } finally {
    await a.close();
  }
  const b = await createStorage({ filename, initial: initialState() });
  assert(!b.snapshot().config.paused);
  await b.close();
  await rm(dir, { recursive: true, force: true });
});
