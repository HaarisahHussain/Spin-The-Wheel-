// Isolated test fixtures only. Never imported by the application entry point.
import express from 'express';
import { resolve } from 'node:path';
import { initialState } from '../server/state.js';
import { createStorage } from '../server/storage.js';
import { createMail } from '../server/mail.js';
import { createApp } from '../server/app.js';
import { passwordHash, secret, issueSession } from '../server/security.js';
import { selectGame } from '../server/selection.js';
import { games, SCORING_VERSION } from '../shared/catalog.js';
import { question } from '../server/games/quiz.js';
import { newGame } from '../server/games.js';
const now = Date.now(),
  state = initialState(now);
state.config.windows = [{ start: now - 60000, cutoff: now + 18000000, end: now + 21600000 }];
state.staff.host = {
  id: 'host',
  username: 'host',
  role: 'admin',
  password: passwordHash('browser-test-password'),
  totpSecret: 'JBSWY3DPEHPK3PXP',
};
for (let i = 0; i < 7; i++) {
  const id = `fixture-${i}`;
  state.accounts[id] = {
    id,
    alias: [
      'OrbitOtter-4821',
      'CedarFinch-2097',
      'PixelFox-8146',
      'CopperRobin-3502',
      'LunarPanda-6001',
      'MapleOtter-8245',
      'OrbitRobin-1372',
    ][i],
    email: `fixture${i}@bcu.ac.uk`,
    verified: true,
    course: 'Computing',
    level: 'Year 1',
  };
  state.attempts.push({
    id: `result-${i}`,
    accountId: id,
    mode: 'ranked',
    version: SCORING_VERSION,
    gameId: 'debug',
    status: 'completed',
    score: [721, 685, 643, 611, 598, 561, 523][i],
    ended: now,
  });
}
const storage = await createStorage({ filename: ':memory:', initial: state }),
  origin = 'http://localhost:3200';
const app = createApp({
  storage,
  mail: createMail({ key: secret(), origin, preview: true }),
  origin,
  preview: true,
});
// Render/action test fixture, available only in this isolated test server.
app.app.post('/__test/scene', async (req, res) => {
  const gameId = req.body.gameId;
  if (!['debug', 'output', 'robot'].includes(gameId)) return res.sendStatus(400);
  const token = await storage.transact((s) => {
    const time = Date.now(),
      id = 'scene-player';
    s.accounts[id] = { id, alias: 'CedarOtter-3291', email: 'scene@bcu.ac.uk', verified: true };
    const game = newGame(gameId, time),
      attemptId = crypto.randomUUID();
    s.attempts.push({
      id: attemptId,
      accountId: id,
      mode: 'practice',
      gameId,
      status: 'started',
      started: time,
      score: 0,
    });
    s.live = null;
    if (req.body.level !== undefined) {
      game.level = req.body.level;
      if (gameId !== 'robot') game.question = question(gameId, game.level);
    }
    if (req.body.code) game.question.code = req.body.code;
    s.active = {
      accountId: id,
      phase: 'playing',
      mode: 'practice',
      gameId,
      game,
      attemptId,
      until: game.deadline,
    };
    if (req.body.wheel) {
      const selection = selectGame(games, time, gameId);
      s.active = { ...s.active, phase: 'wheel', selection, until: selection.until };
    }
    if (req.body.live) {
      s.active = null;
      const q = question(gameId === 'robot' ? 'output' : gameId, req.body.level || 0);
      s.live = {
        id: crypto.randomUUID(),
        phase: 'question',
        gameId: gameId === 'robot' ? 'output' : gameId,
        level: req.body.level || 0,
        question: q,
        questionAt: time,
        until: time + 25000,
        settings: { liveTimeScale: 1 },
        roster: {
          [id]: { accountId: id, answer: null, correct: null, score: 0, responses: 0 },
          other: { accountId: 'other', answer: null, correct: null, score: 0, responses: 0 },
        },
      };
      s.accounts.other = {
        id: 'other',
        alias: 'MapleFox-1234',
        email: 'other@bcu.ac.uk',
        verified: true,
      };
    }
    return issueSession(s, { accountId: id, pending: false }, time);
  });
  res.cookie('arcade_session', token, { httpOnly: true, sameSite: 'lax' }).json({ ok: true });
});
app.app.post('/__test/close-live', async (_req, res) => {
  await storage.transact((s) => {
    if (s.live?.phase === 'question') s.live.until = Date.now();
  });
  res.json({ ok: true });
});
app.app.post('/__test/clear', async (_req, res) => {
  await storage.transact((s) => {
    s.active = null;
    s.live = null;
  });
  res.json({ ok: true });
});
app.app.use(express.static(resolve('dist')));
app.app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
app.http.listen(3200, '127.0.0.1', () => app.startTimers());
process.once('SIGTERM', async () => {
  await app.close();
  process.exit(0);
});
