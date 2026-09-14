import test from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { initialState } from '../server/state.js';
import { createStorage } from '../server/storage.js';
import { createApp } from '../server/app.js';
import { createReceiptCodec } from '../server/receipts.js';
import { issueSession, hash, passwordHash, secret } from '../server/security.js';
import { generate, publicQuestion } from '../server/games.js';
import { tick } from '../server/runtime.js';
import { SCORING_VERSION } from '../shared/catalog.js';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
test(
  'populated event: real scheduler, 50 answers, 100 spectators, host/displays and registration burst',
  { timeout: 60000 },
  async () => {
    const origin = 'http://127.0.0.1:3197',
      now = Date.now(),
      s = initialState(now),
      cookies = [];
    const password = 'local rehearsal passphrase',
      encoded = passwordHash(password);
    s.config.requireVerification = false;
    s.config.windows = [{ start: now - 1000, cutoff: now + 3600000, end: now + 7200000 }];
    for (let i = 0; i < 500; i++)
      s.accounts[i] = {
        id: String(i),
        email: `student${i}@bcu.ac.uk`,
        alias: `Player-${i}`,
        fullName: `Test Student ${i}`,
        course: 'Computing',
        level: 'Year 1',
        verified: true,
        password: encoded,
        recent: [],
      };
    const review = Array.from({ length: 5 }, (_, i) => publicQuestion(generate('output', i), true));
    for (let i = 0; i < 150; i++)
      s.attempts.push({
        id: `prior-${i}`,
        accountId: String(i),
        gameId: 'output',
        mode: 'ranked',
        status: 'completed',
        score: 4500000,
        version: SCORING_VERSION,
        started: now - 200000,
        ended: now - 100000,
        review,
      });
    for (let i = 0; i < 50; i++)
      cookies.push('arcade_session=' + issueSession(s, { accountId: String(i) }, now));
    const hostToken = issueSession(s, { staffId: 'host' }, now);
    const store = await createStorage({ filename: ':memory:', initial: s }),
      server = createApp({
        storage: store,
        origin,
        hostPasswordHash: encoded,
        receipts: createReceiptCodec(secret()),
      });
    const sockets = [],
      latency = [];
    let bytes = 0,
      patches = 0;
    await new Promise((r) => server.http.listen(3197, '127.0.0.1', r));
    try {
      await Promise.all(
        Array.from(
          { length: 153 },
          (_, i) =>
            new Promise((resolve, reject) => {
              const audience = i === 150 ? 'host' : i >= 151 ? 'display' : 'account';
              const socket = io(origin, {
                forceNew: true,
                transports: ['websocket'],
                query: { audience },
                auth: { audience },
                extraHeaders: {
                  Origin: origin,
                  Cookie: cookies[i] || (i === 150 ? 'arcade_host=' + hostToken : ''),
                },
              });
              sockets[i] = socket;
              socket.on('state', (v) => (bytes += Buffer.byteLength(JSON.stringify(v))));
              socket.on('statePatch', (v) => {
                patches++;
                bytes += Buffer.byteLength(JSON.stringify(v));
              });
              socket.once('connect', resolve);
              socket.once('connect_error', reject);
            }),
        ),
      );
      await store.transact((d) => {
        for (let i = 0; i < 50; i++) {
          d.accounts[i].inputConnection = sockets[i].id;
          d.accounts[i].inputSession = hash(cookies[i].split('=')[1]);
        }
      });
      server.startTimers();
      await pause(400);
      const idleCommits = store.metrics.commits,
        idlePatches = patches;
      await pause(1100);
      assert.equal(store.metrics.commits, idleCommits);
      assert.equal(patches, idlePatches);
      const writtenBefore = store.metrics.writtenBytes;
      const send = async (i, action, payload) => {
        const start = performance.now();
        const response = await fetch(origin + '/api/command', {
          method: 'POST',
          headers: {
            Origin: origin,
            'Content-Type': 'application/json',
            'X-Arcade-Connection': sockets[i]?.id || '',
            Cookie: cookies[i] || '',
          },
          body: JSON.stringify({ action, payload, id: crypto.randomUUID() }),
        });
        if (action === 'liveAnswer') latency.push(performance.now() - start);
        assert.equal(response.status, 200, await response.text());
      };
      for (const gameId of ['output', 'robot']) {
        await store.transact((d) => {
          d.live = {
            id: `load-${gameId}`,
            gameId,
            phase: 'countdown',
            until: Date.now(),
            level: 0,
            settings: { liveTimeScale: 1 },
            roster: Object.fromEntries(
              cookies.map((_, i) => [
                String(i),
                { accountId: String(i), answer: null, score: 0, responses: 0 },
              ]),
            ),
          };
          tick(d, Date.now());
        });
        const q = store.read((d) => d.live.question);
        const registration =
          gameId === 'output'
            ? Promise.all(
                Array.from({ length: 8 }, (_, i) =>
                  send(100, 'guest', {
                    email: `new${i}@bcu.ac.uk`,
                    password,
                    fullName: 'New Student',
                    course: 'Computing',
                    level: 'Year 1',
                  }),
                ),
              )
            : Promise.resolve();
        await Promise.all(
          cookies.map((_, i) =>
            send(i, 'liveAnswer', {
              challengeId: q.id,
              ...(q.kind === 'quiz' ? { answer: q.answer } : { program: q.solution }),
            }),
          ),
        );
        assert(store.read((d) => Object.values(d.live.roster).every((r) => r.answer !== null)));
        const deadline = Date.now() + 10000;
        while (
          store.read((d) => ['question', 'execution'].includes(d.live.phase)) &&
          Date.now() < deadline
        )
          await pause(100);
        assert.equal(
          store.read((d) => d.live.phase),
          'reveal',
        );
        assert.equal(
          store.read((d) => d.config.paused),
          false,
        );
        await registration;
      }
      latency.sort((a, b) => a - b);
      console.log(
        JSON.stringify({
          load: '500 accounts / 150 prior attempts / 153 sockets',
          acceptedAnswers: latency.length,
          registrations: 8,
          p95Ms: Math.round(latency[Math.floor(latency.length * 0.95)]),
          totalApplicationBytes: bytes,
          changedRecordBytes: store.metrics.writtenBytes - writtenBefore,
          stateReads: store.metrics.stateReads,
          idleCommits: 0,
          idlePatches: 0,
        }),
      );
    } finally {
      sockets.forEach((s) => s.disconnect());
      await server.close();
    }
  },
);
