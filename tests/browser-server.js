// Isolated test fixtures only. Never imported by the application entry point.
import express from 'express';
import { resolve } from 'node:path';
import { initialState } from '../server/state.js';
import { createStorage } from '../server/storage.js';
import { createMail } from '../server/mail.js';
import { createApp } from '../server/app.js';
import { passwordHash, secret, issueSession } from '../server/security.js';
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
    s.active = {
      accountId: id,
      phase: 'playing',
      mode: 'practice',
      gameId,
      game,
      attemptId,
      until: game.deadline,
    };
    return issueSession(s, { accountId: id, pending: false }, time);
  });
  res.cookie('arcade_session', token, { httpOnly: true, sameSite: 'lax' }).json({ ok: true });
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
