// Synthetic fixtures only: never imported by the production application.
import express from 'express';
import { resolve } from 'node:path';
import { initialState } from '../server/state.js';
import { createStorage } from '../server/storage.js';
import { createReceiptCodec } from '../server/receipts.js';
import { createApp } from '../server/app.js';
import { secret, passwordHash, issueSession } from '../server/security.js';
import { newGame, answerGame, tickGame, publicQuestion } from '../server/games.js';
import { adapterFor } from '../server/games/registry.js';
import { selectGame } from '../server/selection.js';
import { games, SCORING_VERSION } from '../shared/catalog.js';
const origin = 'http://localhost:3200',
  password = 'browser test passphrase';
const fresh = () => {
  const s = initialState();
  s.config.requireVerification = false;
  s.config.windows = [
    { start: Date.now() - 60000, cutoff: Date.now() + 18000000, end: Date.now() + 21600000 },
  ];
  return s;
};
const storage = await createStorage({ filename: ':memory:', initial: fresh() });
const testMail = createReceiptCodec(secret());
const app = createApp({
  storage,
  origin,
  preview: true,
  hostPasswordHash: passwordHash(password),
  receipts: testMail,
});
app.app.post('/__test/reset', async (_req, res) => {
  await storage.transact((s) => {
    for (const k of Object.keys(s)) delete s[k];
    Object.assign(s, fresh());
  });
  res.json({ ok: true });
});
app.app.post('/__test/scene', async (req, res) => {
  const token = await storage.transact((s) => {
    const id = 'scene-player',
      now = Date.now(),
      gameId = req.body.gameId || 'debug';
    s.accounts[id] = {
      id,
      email: 'scene@bcu.ac.uk',
      fullName: 'Scene Student',
      alias: 'CedarOtter-3291',
      course: 'Computing',
      level: 'Year 1',
      verified: true,
      password: passwordHash(password),
      recent: [],
    };
    const g = newGame(gameId, now);
    if (req.body.level !== undefined) {
      g.level = req.body.level;
      g.question = adapterFor(gameId).create(g.level);
    }
    if (req.body.robotPath) {
      Object.assign(g.question, {
        size: 5,
        items: [],
        gates: [],
        start: 0,
        position: 0,
        goal: 4,
        blocks: [5, 6, 7, 8, 9],
        solution: ['right', 'right', 'right', 'right'],
        optimum: 4,
        maxMoves: 8,
      });
    }
    g.deadline = now + 90000;
    g.allowance = 90000;
    if (req.body.feedback) {
      answerGame(g, g.question.answer ?? g.question.solution, g.question.id, now + 100);
      if (g.execution) tickGame(g, g.execution.until);
      g.feedbackUntil = now + 90000;
    }
    const attemptId = crypto.randomUUID();
    s.attempts.push({
      id: attemptId,
      accountId: id,
      gameId,
      mode: 'solo',
      status: 'started',
      score: 0,
      started: now,
      version: SCORING_VERSION,
    });
    s.active = {
      accountId: id,
      gameId,
      phase: 'playing',
      mode: 'solo',
      attemptId,
      until: g.deadline,
      game: g,
    };
    s.live = null;
    if (req.body.wheel) {
      const selection = selectGame(games, now, gameId);
      s.active = { ...s.active, phase: 'wheel', selection, until: selection.until };
    }
    if (req.body.introduction) {
      const selection = selectGame(games, now, gameId);
      s.active = { ...s.active, phase: 'introduction', selection, until: null };
    }
    if (req.body.live) {
      s.active = null;
      s.live = {
        id: 'fixture-live',
        gameId,
        phase: 'question',
        question: g.question,
        questionAt: now,
        until: now + 90000,
        level: 0,
        settings: { liveTimeScale: 1 },
        roster: {
          [id]: { accountId: id, answer: null, score: 0, responses: 0 },
          other: { accountId: 'other', answer: null, score: 0, responses: 0 },
        },
      };
      s.accounts.other = {
        id: 'other',
        alias: 'PixelFox-3000',
        email: 'other@bcu.ac.uk',
        verified: true,
      };
    }
    return issueSession(s, { accountId: id }, now);
  });
  res.cookie('arcade_session', token, { httpOnly: true, sameSite: 'lax' }).json({ ok: true });
});
app.app.post('/__test/history', async (_req, res) => {
  await storage.transact((s) => {
    s.active = null;
    s.live = null;
    for (let i = 0; i < 80; i++)
      s.accounts[`history-${i}`] = {
        id: `history-${i}`,
        email: `history${i}@bcu.ac.uk`,
        fullName: `History Student ${i}`,
        alias: `History-${i}`,
        course: 'Computing',
        level: 'Year 1',
        verified: true,
      };
    const q = publicQuestion(newGame('output', Date.now()).question, true);
    s.attempts.push({
      id: 'history-attempt',
      accountId: 'scene-player',
      gameId: 'output',
      mode: 'solo',
      status: 'completed',
      version: SCORING_VERSION,
      score: 4500000,
      started: Date.now() - 100000,
      ended: Date.now() - 1000,
      review: [{ ...q, selected: q.answer, correct: true, points: 4500000 }],
    });
  });
  res.json({ ok: true });
});
app.app.post('/__test/results', async (_req, res) => {
  await storage.transact((s) => {
    s.active = null;
    s.live = null;
    s.queue = [];

    for (let i = 0; i < 3; i++) {
      s.accounts[`history-${i}`].fullName = 'Sam Student';
      s.attempts.push({
        id: `ranked-${i}`,
        accountId: `history-${i}`,
        gameId: 'robot',
        mode: 'solo',
        status: 'completed',
        version: SCORING_VERSION,
        score: (3 - i) * 1000000,
        started: Date.now() - 100000,
        ended: Date.now() - 1000,
      });
    }
    s.liveResults.push({
      id: 'live-history',
      liveId: 'live-round',
      accountId: 'history-0',
      gameId: 'parcel',
      score: 1000000,
      at: Date.now(),
      won: true,
    });
  });
  res.json({ ok: true });
});
app.app.get('/__test/solution', (_req, res) => {
  const s = storage.snapshot(),
    q = s.live?.question || s.active?.game?.question;
  res.json({ answer: q?.answer, solution: q?.solution, starter: q?.starter });
});
app.app.post('/__test/close-live', async (_req, res) => {
  await storage.transact((s) => {
    s.live.until = Date.now();
  });
  res.json({ ok: true });
});
app.app.post('/__test/old-auth', async (_req, res) => {
  await storage.transact((s) => {
    for (const session of Object.values(s.sessions))
      if (session.staffId) session.reauthenticated = Date.now() - 900001;
  });
  res.json({ ok: true });
});
app.app.post('/__test/clear', async (_req, res) => {
  await storage.transact((s) => {
    s.active = null;
    s.live = null;
    s.queue = [];
  });
  res.json({ ok: true });
});
app.app.use(express.static(resolve('dist')));
app.app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
app.http.listen(3200, '127.0.0.1', () => app.startTimers());
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, async () => {
    await app.close();
    process.exit(0);
  });
