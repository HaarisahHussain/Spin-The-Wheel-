import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import { createStorage } from './storage.js';
import { createMail } from './mail.js';
import { createApp } from './app.js';
import { initialState } from './state.js';
import { secret } from './security.js';
const production = process.argv.includes('--production');
const port = Number(process.env.PORT || 3001),
  origin = process.env.PUBLIC_ORIGIN || `http://localhost:${port}`;
if (
  production &&
  (!process.env.DATABASE_URL || !origin.startsWith('https://') || !process.env.MAIL_KEY)
)
  throw Error('Production requires DATABASE_URL, HTTPS PUBLIC_ORIGIN and MAIL_KEY.');
mkdirSync('data', { recursive: true });
if (!process.env.MAIL_KEY && !existsSync('data/mail.key'))
  writeFileSync('data/mail.key', secret(), { mode: 0o600 });
const key = process.env.MAIL_KEY || readFileSync('data/mail.key', 'utf8').trim();
const preview = !production && process.env.MAIL_MODE !== 'smtp';
const storage = await createStorage({
  url: process.env.DATABASE_URL,
  filename: process.env.SQLITE_PATH || 'data/arcade.sqlite',
  initial: initialState(),
});
await storage.transact((s) => {
  if (s.active?.phase === 'playing') {
    const attempt = s.attempts.find((a) => a.id === s.active.attemptId);
    if (attempt) {
      attempt.status = 'interrupted';
      attempt.score = s.active.game.score;
      attempt.ended = Date.now();
      s.incidents.push({
        id: crypto.randomUUID(),
        attemptId: attempt.id,
        reason: 'Service restarted during gameplay',
        at: Date.now(),
        resolved: false,
      });
    }
    s.active = null;
    s.config.paused = true;
  }
  if (s.live) {
    s.live = null;
    s.config.nextLobbyAt = Date.now() + s.config.interval * 1000;
  }
  if (process.env.RECONCILIATION_REQUIRED === 'true') {
    s.config.paused = true;
    s.config.rankedEnabled = false;
  }
});
const mail = createMail({
  key,
  origin,
  preview,
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER,
  password: process.env.SMTP_PASSWORD,
  from: process.env.SMTP_FROM,
});
const server = createApp({ storage, mail, origin, production, preview });
if (production) {
  server.app.use(express.static(resolve('dist')));
  server.app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  server.app.use(vite.middlewares);
}
server.http.listen(port, '0.0.0.0', () => {
  console.log(
    `Arcade: ${origin}\nJoin display: ${origin}/display/join\nPlay display: ${origin}/display/play\nHost: ${origin}/host`,
  );
  server.startTimers();
});
for (const signal of ['SIGTERM', 'SIGINT'])
  process.once(signal, async () => {
    await server.close();
    process.exit(0);
  });
