import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import { createStorage } from './storage.js';
import { createMail } from './mail.js';
import { createApp } from './app.js';
import { initialState } from './state.js';
import { secret, passwordHash } from './security.js';
if (Number(process.versions.node.split('.')[0]) < 24)
  throw Error('Arcade requires Node.js 24 or newer. Upgrade Node, then run npm ci.');
const production = process.argv.includes('--production') || process.env.NODE_ENV === 'production';
if (process.argv.includes('--production') && process.env.NODE_ENV === 'development')
  throw Error('Production launch conflicts with NODE_ENV=development.');
if (production && process.env.MAIL_MODE === 'preview')
  throw Error('Email previews cannot run in production. Set MAIL_MODE=smtp.');
if (!production && process.env.DATABASE_URL && process.env.ALLOW_REMOTE_DEV_DATABASE !== 'true')
  throw Error(
    'Development uses SQLite by default. To deliberately use a separate remote test database, set ALLOW_REMOTE_DEV_DATABASE=true.',
  );
if (production && (!process.env.SMTP_HOST || !process.env.SMTP_FROM))
  throw Error('Configure SMTP_HOST and SMTP_FROM before launching production.');
if (
  !process.env.HOST_PASSWORD ||
  process.env.HOST_PASSWORD.length < 15 ||
  process.env.HOST_PASSWORD.length > 256
)
  throw Error('Set HOST_PASSWORD to a unique passphrase of 15–256 characters.');
const hostPasswordHash = passwordHash(process.env.HOST_PASSWORD);
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
let storage, vite, server;
try {
  storage = await createStorage({
    url: process.env.DATABASE_URL,
    filename: process.env.SQLITE_PATH || 'data/arcade.sqlite',
    initial: initialState(),
  });
  await storage.transact((s) => {
    if (s.schemaVersion !== 7)
      throw Error(
        'Use a clean v0.6.0 database. Set SQLITE_PATH to a new file locally, or select an empty PostgreSQL database. No data was deleted.',
      );
    for (const [id, session] of Object.entries(s.sessions))
      if (session.staffId) delete s.sessions[id];
    s.config.releaseVersion = '0.7.0';
    s.config.prototypeGames = process.env.ENABLE_PROTOTYPE_GAMES === 'true';
    s.hostLease = null;
    s.controlEpoch++;
    s.takeovers = {};
    if (s.active && !['playing', 'result'].includes(s.active.phase)) {
      s.active = { ...s.active, phase: 'called', until: Date.now() + 20000 };
      s.config.paused = true;
    }
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
    if (s.live && s.live.phase !== 'winner') {
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
  server = createApp({ storage, mail, origin, production, preview, hostPasswordHash });
  if (production) {
    server.app.use(express.static(resolve('dist')));
    server.app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
  } else {
    const { createServer } = await import('vite');
    vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    server.app.use(vite.middlewares);
  }
  await new Promise((resolve, reject) => {
    server.http.once('error', reject);
    server.http.listen(port, '0.0.0.0', resolve);
  });
  {
    console.log(
      `Arcade: ${origin}\nJoin display: ${origin}/display/join\nPlay display: ${origin}/display/play\nHost: ${origin}/host`,
    );
    server.startTimers();
  }
  for (const signal of ['SIGTERM', 'SIGINT'])
    process.once(signal, async () => {
      await vite?.close();
      await server.close();
      process.exit(0);
    });
} catch (error) {
  await vite?.close();
  if (server) await server.close();
  else await storage?.close();
  console.error(error.message);
  process.exitCode = 1;
}
