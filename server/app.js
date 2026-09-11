import express from 'express';
import helmet from 'helmet';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { execute, tick } from './engine.js';
import { project } from './projection.js';
import { sessionFor, hash } from './security.js';

const tokenFrom = (request) => {
  const pairs = (request.headers.cookie || '').split(';').map((v) => v.trim().split('='));
  return pairs.find(([name]) => name === 'arcade_session')?.[1] || '';
};
export function createApp({ storage, mail, origin, production = false, preview = false }) {
  const app = express(),
    http = createServer(app);
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: production
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'"],
              fontSrc: ["'self'"],
              imgSrc: ["'self'", 'data:'],
              connectSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(express.json({ limit: '16kb' }));
  const io = new Server(http, {
    maxHttpBufferSize: 16384,
    cors: { origin, credentials: true },
    allowRequest: (req, callback) =>
      callback(
        null,
        req.headers.origin === origin ||
          (!req.headers.origin &&
            req.headers['sec-fetch-site'] === 'same-origin' &&
            req.headers.host === new URL(origin).host),
      ),
  });
  let healthy = true,
    running = false;
  const connected = new Map();
  const view = (token, publicOnly = false) => ({
    ...project(storage.snapshot(), publicOnly ? '' : token, Date.now(), origin),
    serviceHealthy: healthy,
    development: preview,
  });
  const update = () => {
    for (const socket of io.sockets.sockets.values())
      socket.emit('state', view(socket.data.token, socket.data.publicOnly));
  };
  io.on('connection', (socket) => {
    socket.data.token = tokenFrom(socket.request);
    socket.data.publicOnly = socket.handshake.auth?.audience === 'display';
    const sess = sessionFor(storage.snapshot(), socket.data.token, Date.now());
    if (sess?.accountId && !sess.pending && !socket.data.publicOnly)
      connected.set(socket.id, sess.accountId);
    socket.emit('state', view(socket.data.token, socket.data.publicOnly));
    socket.on('disconnect', () => connected.delete(socket.id));
  });
  app.get('/api/state', (req, res) => {
    res
      .set('Cache-Control', 'no-store')
      .json(view(tokenFrom(req), req.query.audience === 'display'));
  });
  app.get('/api/health', (_req, res) => res.status(healthy ? 200 : 503).json({ ready: healthy }));
  const requests = new Map();
  app.post('/api/command', async (req, res) => {
    if (req.headers.origin !== origin)
      return res.status(403).json({ error: 'Request origin is not allowed.' });
    if (!req.is('application/json')) return res.status(415).json({ error: 'Use JSON.' });
    const ip = req.ip,
      now = Date.now(),
      hits = (requests.get(ip) || []).filter((t) => t > now - 60000);
    if (hits.length >= 3000) return res.status(429).json({ error: 'Please slow down.' });
    hits.push(now);
    requests.set(ip, hits);
    const { action, payload = {}, id } = req.body || {};
    if (typeof id !== 'string' || id.length > 80 || !id.length)
      return res.status(400).json({ error: 'A command ID is required.' });
    try {
      const result = await storage.transact((state) =>
        execute(
          state,
          action,
          payload,
          { token: tokenFrom(req), ip, commandId: id, now },
          { mail },
        ),
      );
      if (result.token)
        res.cookie('arcade_session', result.token, {
          httpOnly: true,
          secure: production,
          sameSite: 'lax',
          path: '/',
          maxAge: 96 * 3600000,
        });
      if (result.logout) res.clearCookie('arcade_session', { path: '/' });
      const { token: _token, ...safe } = result;
      res.status(result.status || 200).json(safe);
      update();
    } catch (error) {
      console.error('command failed', error.message);
      res
        .status(503)
        .json({ error: 'Service interrupted. Your saved results are safe; please wait.' });
    }
  });
  if (preview)
    app.get('/api/development-mail', (req, res) => {
      const state = storage.snapshot(),
        flow = hash(tokenFrom(req));
      const challenge = Object.values(state.challenges)
        .filter((c) => c.flow === flow)
        .at(-1);
      const message = challenge ? mail.previewMessages.get(challenge.id) : null;
      res
        .set('Cache-Control', 'no-store')
        .json(message ? { code: message.code, link: message.link } : { pending: true });
    });
  app.use((error, _req, res, _next) =>
    res.status(error.status || 400).json({ error: 'The request could not be read.' }),
  );
  async function pulse() {
    if (running) return;
    running = true;
    try {
      await storage.transact((s) => {
        const now = Date.now(),
          present = new Set();
        for (const socket of io.sockets.sockets.values()) {
          const session = sessionFor(s, socket.data.token, now);
          if (session?.accountId && !session.pending && !socket.data.publicOnly)
            present.add(session.accountId);
        }
        tick(s, now, present);
      });
      healthy = true;
      update();
    } catch (error) {
      healthy = false;
      console.error('persistence unavailable', error.message);
      update();
    } finally {
      running = false;
    }
  }
  let mailing = false;
  async function sendMail() {
    if (mailing) return;
    mailing = true;
    try {
      const job = storage
        .snapshot()
        .outbox.find((m) => !m.sent && m.next <= Date.now() && m.tries < 5);
      if (job) {
        let error = null;
        try {
          await mail.send(job);
        } catch (e) {
          error = e.message;
        }
        await storage.transact((s) => {
          const current = s.outbox.find((m) => m.id === job.id);
          if (current) {
            current.tries++;
            current.sent = !error;
            current.error = error ? 'Delivery failed; check SMTP configuration.' : null;
            current.next = Date.now() + Math.min(60000, current.tries * 10000);
          }
        });
      }
    } catch (error) {
      console.error('mail worker unavailable', error.message);
    } finally {
      mailing = false;
    }
  }
  const timers = [];
  return {
    app,
    http,
    io,
    view,
    startTimers() {
      timers.push(setInterval(pulse, 250), setInterval(sendMail, 1000));
    },
    async close() {
      timers.forEach(clearInterval);
      io.disconnectSockets();
      await new Promise((resolve) => io.close(resolve));
      await storage.close();
    },
  };
}
