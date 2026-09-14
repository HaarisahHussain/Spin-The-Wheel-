import { createReceiptCodec } from './receipts.js';
import { secret } from './security.js';
import { transitionDue } from './runtime.js';
import { hostControl } from './host-control.js';
import { details } from './details.js';
import { createLimits, authPreflight } from './limits.js';
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
  receipts = createReceiptCodec(secret()),
  origin,
  production = false,
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
      referrerPolicy: { policy: production ? 'no-referrer' : 'same-origin' },
    }),
  );

  app.use(express.json({ limit: '16kb' }));
  const limits = createLimits();
  const socketIps = new Map();
  const peerIp = (req) =>
    production
      ? String(req.headers['x-forwarded-for'] || req.socket.remoteAddress)
          .split(',')
          .at(-1)
          .trim()
      : req.socket.remoteAddress;
  const io = new Server(http, {
    maxHttpBufferSize: 16384,
    cors: { origin, credentials: true },
    allowRequest: (req, callback) => {
      try {
        const expected = new URL(origin);
        let refererOrigin = null;
        try {
          if (req.headers.referer) refererOrigin = new URL(req.headers.referer).origin;
        } catch {
          /* Invalid referrers do not qualify. */
        }
        const allowed =
          req.headers.origin === expected.origin ||
          (!req.headers.origin &&
            req.headers.host === expected.host &&
            (req.headers['sec-fetch-site'] === 'same-origin' ||
              (!production &&
                !req.headers['sec-fetch-site'] &&
                refererOrigin === expected.origin)));

        if (
          !allowed ||
          socketIps.size >= 600 ||
          [...socketIps.values()].filter((ip) => ip === peerIp(req)).length >= 550
        )
          return callback(null, false);
        limits.check(`connect:${peerIp(req)}`, 1200, 60000);
        callback(null, true);
      } catch {
        callback(null, false);
      }
    },
  });

  let healthy = true,
    running = false;

  const instanceId = crypto.randomUUID();
  io.use((socket, next) => {
    if (io.sockets.sockets.size >= 600) next(Error('Event connection limit reached.'));
    else next();
  });
  const view = (
    token,
    publicOnly = false,
    connectionId = null,
    snapshot = storage.read((s) => s),
  ) => ({
    staff: null,
    host: null,
    ...project(snapshot, publicOnly ? '' : token, Date.now(), origin, connectionId, { lean: true }),
    instanceId,
    dataVersion: storage.versions.data,
    serviceHealthy: healthy && storage.healthy(),
  });
  function sendState(socket, initial = false) {
    const value = view(socket.data.token, socket.data.publicOnly, socket.id);
    const encoded = Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, JSON.stringify(v)]),
    );
    const patch = Object.fromEntries(
      Object.entries(value).filter(
        ([k]) => !['now', 'revision'].includes(k) && encoded[k] !== socket.data.lastState?.[k],
      ),
    );
    if (!initial && !Object.keys(patch).length) return;
    // A slow socket keeps only a dirty flag, not an ever-growing packet queue.
    if (!initial && !socket.conn.transport.writable) {
      socket.data.dirty = true;
      return;
    }
    socket.data.lastState = encoded;
    socket.data.dirty = false;
    socket.emit(
      initial ? 'state' : 'statePatch',
      initial ? value : { ...patch, now: value.now, revision: value.revision },
    );
  }
  let broadcastTimer = null;
  const update = () => {
    if (broadcastTimer) return;
    broadcastTimer = setTimeout(() => {
      broadcastTimer = null;
      for (const socket of io.sockets.sockets.values()) sendState(socket);
    }, 100);
  };
  io.on('connection', (socket) => {
    socketIps.set(socket.id, peerIp(socket.request));
    socket.use((packet, next) => {
      try {
        limits.check(`socket:${socket.id}`, 60, 60000);
        next();
      } catch {
        socket.disconnect(true);
      }
    });
    socket.data.token = tokenFrom(socket.request);
    socket.data.publicOnly = socket.handshake.auth?.audience === 'display';
    sendState(socket, true);
    socket.conn.on('drain', () => {
      if (socket.data.dirty) update();
    });
    socket.on('clock', (ack) => {
      if (typeof ack === 'function') {
        try {
          limits.check(`clock:${socket.id}`, 10, 60000);
          ack(Date.now());
        } catch {
          /* drop excessive clock requests */
        }
      }
    });
    socket.on('disconnect', () => socketIps.delete(socket.id));
  });
  const limitedGet = (req, res, next) => {
    try {
      limits.check(`read:${req.ip}`, 2400, 60000);
      next();
    } catch (e) {
      res.status(e.status).json({ error: e.message });
    }
  };
  app.get('/api/state', limitedGet, (req, res) =>
    res
      .set('Cache-Control', 'no-store')
      .json(view(tokenFrom(req), req.query.audience === 'display', req.query.connection)),
  );
  app.get('/api/details', limitedGet, (req, res) => {
    try {
      res
        .set('Cache-Control', 'no-store')
        .json(storage.read((s) => details(s, tokenFrom(req), Date.now(), req.query)));
    } catch (e) {
      res.status(e.status || 503).json({ error: e.status ? e.message : 'Service unavailable.' });
    }
  });

  app.get('/api/health', (_req, res) =>
    res
      .status(healthy && storage.healthy() ? 200 : 503)
      .json({ ready: healthy && storage.healthy() }),
  );

  const preparedInFlight = new Map();
  const publicCommands = new Set(['guest', 'staffLogin', 'hostTakeover']);

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
      now = Date.now();
    try {
      limits.check(`request:${ip}`, 3000, 60000, now);
    } catch (e) {
      return res.status(e.status).json({ error: e.message });
    }
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
      const token = tokenFrom(req);
      const commandKey = `${hash(token || ip)}:${id}`;
      const cachedCommand = storage.read((s) => s.commands[commandKey]);
      if (!publicCommands.has(action) && !storage.read((s) => sessionFor(s, token, Date.now())))
        return res.status(401).json({ error: 'Please sign in.' });
      if (action === 'hostControl' && payload.heartbeat) {
        const result = await storage.transact(
          (s) =>
            hostControl(
              s,
              { token, connectionId: validatedConnection(req), epoch: payload.controlEpoch },
              payload,
              Date.now(),
            ),
          { transientOnly: true },
        );
        return res.json(result);
      }
      if (['staffLogin', 'hostReauthenticate'].includes(action) && !cachedCommand) {
        storage.read((s) => authPreflight(s, action, payload, token, now));
        const identity =
          action === 'staffLogin' || action === 'hostReauthenticate'
            ? 'host'
            : String(payload.email || token).toLowerCase();
        limits.check(`auth:${ip}:${hash(identity)}`, 20, 60000, now);
        limits.check(`auth-source:${ip}`, 600, 60000, now);
        const authSnapshot = storage.read((s) => s),
          authSession = sessionFor(authSnapshot, tokenFrom(req), now);
        const prepKey = hash(JSON.stringify({ commandKey, action, payload }));
        let work = preparedInFlight.get(prepKey);
        if (!work) {
          if (preparedInFlight.size >= 64)
            return res.status(429).json({ error: 'Sign-in is busy. Try again shortly.' });
          work = preparePasswords(
            authSnapshot,
            action,
            { ...payload, _accountId: authSession?.accountId, _tokenHash: hash(payload.linkToken) },
            hostPasswordHash,
          );
          preparedInFlight.set(prepKey, work);
        }
        try {
          preparedAuth = await work;
        } finally {
          preparedInFlight.delete(prepKey);
        }
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
            now: Date.now(),
            receivedAt: now,
            connectionId: validatedConnection(req),
            epoch: payload.controlEpoch,
            connections: new Set(io.sockets.sockets.keys()),
          },
          { receipts, hostPasswordHash, preparedAuth },
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
      res.status(result.status || 200).json({
        ...safe,
        sessionChanged: !!result.token || !!result.logout,
        state: view(result.token || token, false, validatedConnection(req)),
      });
      update();
    } catch (error) {
      if (!error.status) console.error('command failed', error.name);
      res.status(error.status || 503).json({
        error: error.status
          ? error.message
          : 'Service interrupted. Your saved results are safe; please wait.',
      });
    }
  });

  app.use((error, _req, res, _next) =>
    res.status(error.status || 400).json({ error: 'The request could not be read.' }),
  );

  let lastPulseAt = Date.now(),
    maintenanceAt = 0,
    stopping = false;
  async function pulse() {
    if (running || stopping) return;
    const now = Date.now();
    const due = storage.read(
      (s) =>
        transitionDue(s, now) ||
        s.config.windows.some((w) =>
          [w.start, w.cutoff, w.end].some((t) => t > lastPulseAt && t <= now),
        ),
    );
    const delayed = now - lastPulseAt > 3000;
    lastPulseAt = now;
    if (!due && !delayed && now < maintenanceAt) return;
    running = true;
    try {
      await storage.transact((s) => {
        if (delayed && (s.active || s.live)) recoverServiceDelay(s, Date.now());
        tick(s, Date.now());
      });
      maintenanceAt = Date.now() + 30000;
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
  const timers = [];

  return {
    app,
    http,
    io,
    view,
    startTimers() {
      timers.push(setInterval(pulse, 250));
    },
    async close() {
      stopping = true;
      timers.forEach(clearInterval);
      if (broadcastTimer) clearTimeout(broadcastTimer);
      io.disconnectSockets();
      await new Promise((resolve) => io.close(resolve));
      await storage.close();
    },
  };
}
