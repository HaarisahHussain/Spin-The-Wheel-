import { preparePasswords } from './passwords.js';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { recoverServiceDelay } from './recovery.js';
import { execute, tick } from './engine.js';
import { project } from './projection.js';
import { sessionFor, hash } from './security.js';

const hostAudience = (request) =>
  request.headers['x-arcade-audience'] === 'host' ||
  request._query?.audience === 'host' ||
  request.query?.audience === 'host';
const tokenFrom = (request) => {
  const pairs = (request.headers.cookie || '').split(';').map((v) => v.trim().split('='));
  return (
    pairs.find(
      ([name]) => name === (hostAudience(request) ? 'arcade_host' : 'arcade_session'),
    )?.[1] || ''
  );
};

export function createApp({
  storage,
  mail,
  origin,
  production = false,
  preview = false,
  hostPasswordHash,
}) {
  const app = express(),
    http = createServer(app);

  app.disable('x-powered-by');
  if (production) app.set('trust proxy', 1); // In production

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
              // connectSrc: ["'self'"], // In development
              connectSrc: ["'self'", origin.replace(/^http/, 'ws')], // in production
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: production ? { policy: 'same-origin' } : false,
      originAgentCluster: production,
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

  const view = (token, publicOnly = false, connectionId = null, snapshot = storage.snapshot()) => ({
    ...project(snapshot, publicOnly ? '' : token, Date.now(), origin, connectionId),
    serviceHealthy: healthy,
    development: preview,
  });

  let broadcastTimer = null;
  const update = () => {
    if (broadcastTimer) return;
    broadcastTimer = setTimeout(() => {
      broadcastTimer = null;
      const snapshot = storage.snapshot();
      for (const socket of io.sockets.sockets.values())
        socket.emit('state', view(socket.data.token, socket.data.publicOnly, socket.id, snapshot));
    }, 100);
  };

  io.on('connection', (socket) => {
    socket.data.token = tokenFrom(socket.request);
    socket.data.publicOnly = socket.handshake.auth?.audience === 'display';
    const sess = sessionFor(storage.snapshot(), socket.data.token, Date.now());
    if (sess?.accountId && !sess.pending && !socket.data.publicOnly)
      connected.set(socket.id, sess.accountId);
    socket.emit('state', view(socket.data.token, socket.data.publicOnly, socket.id));
    socket.on('disconnect', () => connected.delete(socket.id));
  });

  app.get('/api/state', (req, res) => {
    res
      .set('Cache-Control', 'no-store')
      .json(view(tokenFrom(req), req.query.audience === 'display', req.query.connection));
  });

  app.get('/api/health', (_req, res) => res.status(healthy ? 200 : 503).json({ ready: healthy }));

  const requests = new Map();

  const validatedConnection = (req) => {
    const socket = io.sockets.sockets.get(req.headers['x-arcade-connection']);
    return socket && socket.data.token === tokenFrom(req) && !socket.data.publicOnly
      ? socket.id
      : null;
  };

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
    if (
      typeof action !== 'string' ||
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    )
      return res.status(400).json({ error: 'Invalid command.' });
    if (
      (action === 'staffLogin' ||
        action === 'hostTakeover' ||
        action === 'hostControl' ||
        action === 'hostReauthenticate' ||
        action?.startsWith('host.')) &&
      !hostAudience(req)
    )
      return res.status(403).json({ error: 'Open the host page to use host controls.' });
    if (typeof id !== 'string' || id.length > 80 || !id.length)
      return res.status(400).json({ error: 'A command ID is required.' });
    try {
      let preparedAuth = null;
      if (
        [
          'register',
          'login',
          'staffLogin',
          'hostReauthenticate',
          'verify',
          'changePassword',
          'resetPassword',
        ].includes(action)
      ) {
        const authSnapshot = storage.snapshot(),
          authSession = sessionFor(authSnapshot, tokenFrom(req), now);
        preparedAuth = await preparePasswords(
          authSnapshot,
          action,
          { ...payload, _accountId: authSession?.accountId, _tokenHash: hash(payload.linkToken) },
          hostPasswordHash,
        );
      }
      const result = await storage.transact((state) =>
        execute(
          state,
          action,
          payload,
          {
            token: tokenFrom(req),
            ip,
            commandId: id,
            now,
            connectionId: validatedConnection(req),
            epoch: payload.controlEpoch,
            connections: new Set(io.sockets.sockets.keys()),
          },
          { mail, hostPasswordHash, preparedAuth },
        ),
      );
      if (result.token)
        res.cookie(hostAudience(req) ? 'arcade_host' : 'arcade_session', result.token, {
          httpOnly: true,
          secure: production,
          sameSite: 'lax',
          path: '/',
          maxAge: 168 * 3600000,
        });
      if (result.logout)
        res.clearCookie(hostAudience(req) ? 'arcade_host' : 'arcade_session', { path: '/' });
      const { token: _token, ...safe } = result;
      res
        .status(result.status || 200)
        .json({ ...safe, sessionChanged: !!result.token || !!result.logout });
      update();
    } catch (error) {
      console.error('command failed', error.status ? 'rejected' : error.name);
      res.status(error.status || 503).json({
        error: error.status
          ? error.message
          : 'Service interrupted. Your saved results are safe; please wait.',
      });
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

  let lastPulseAt = Date.now();
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
        if (now - lastPulseAt > 3000) recoverServiceDelay(s, now);
        tick(s, now, present);
      });
      lastPulseAt = Date.now();
      healthy = true;
      for (const [ip, hits] of requests)
        if (!hits.some((t) => t > Date.now() - 60000)) requests.delete(ip);
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
        .outbox.find((m) => !m.sent && !m.cancelled && m.next <= Date.now() && m.tries < 5);
      if (job) {
        const challenge = job.challengeId && storage.snapshot().challenges[job.challengeId];
        if (challenge && (challenge.used || challenge.expires <= Date.now())) {
          await storage.transact((s) => {
            s.outbox.find((m) => m.id === job.id).sent = true;
          });
          return;
        }
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
      if (broadcastTimer) clearTimeout(broadcastTimer);
      io.disconnectSockets();
      await new Promise((resolve) => io.close(resolve));
      await storage.close();
    },
  };
}
