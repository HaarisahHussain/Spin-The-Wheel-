import { hash, secret, sessionFor, issueSession, requireValue as assert } from './security.js';
export const LEASE_MS = 30000;
export function requireHost(s, ctx, now, control = true) {
  const session = sessionFor(s, ctx.token, now);
  assert(session?.staffId === 'host', 'Please sign in as host.', 401);
  if (control)
    assert(
      s.hostLease?.session === hash(ctx.token) &&
        s.hostLease.connection === ctx.connectionId &&
        s.hostLease.epoch === ctx.epoch &&
        s.hostLease.expires > now,
      'Host control moved or expired. Take control here to continue.',
      409,
    );
  return session;
}
export function grantControl(s, token, ctx, now, tabId) {
  assert(ctx.connectionId, 'Connect to the event before taking control.', 409);
  s.controlEpoch++;
  s.hostLease = {
    session: hash(token),
    connection: ctx.connectionId,
    tabId,
    epoch: s.controlEpoch,
    expires: now + LEASE_MS,
  };
  return { epoch: s.controlEpoch };
}
export function beginHostLogin(s, ctx, p, now) {
  assert(
    typeof p.tabId === 'string' && p.tabId.length <= 80 && ctx.connectionId,
    'Connect to the event before signing in.',
  );
  if (s.hostLease?.expires > now && sessionFor(s, ctx.token, now)?.staffId !== 'host') {
    const challenge = secret();
    s.takeovers[hash(challenge)] = {
      epoch: s.controlEpoch,
      connection: ctx.connectionId,
      tabId: p.tabId,
      expires: now + 120000,
    };
    return { takeover: challenge };
  }
  if (s.hostLease?.expires > now) return { needsControl: true };
  const token = issueSession(s, { staffId: 'host', role: 'host' }, now);
  return { token, ...grantControl(s, token, ctx, now, p.tabId) };
}
export function takeover(s, ctx, p, now) {
  const challenge = s.takeovers[hash(p.challenge)];
  assert(
    challenge && challenge.expires > now && challenge.connection === ctx.connectionId,
    'Sign in again to take over.',
    401,
  );
  assert(
    challenge.epoch === s.controlEpoch,
    'Host ownership changed. Sign in and confirm again.',
    409,
  );
  if (s.hostLease) delete s.sessions[s.hostLease.session];
  delete s.takeovers[hash(p.challenge)];
  const token = issueSession(s, { staffId: 'host', role: 'host' }, now);
  return { token, ...grantControl(s, token, ctx, now, challenge.tabId) };
}
export function hostControl(s, ctx, p, now) {
  const session = requireHost(s, ctx, now, false);
  const owns =
    s.hostLease?.session === hash(ctx.token) && s.hostLease.connection === ctx.connectionId;
  if (p.heartbeat) {
    requireHost(s, ctx, now);
    s.hostLease.expires = now + LEASE_MS;
    return {};
  }
  assert(p.expectedEpoch === s.controlEpoch, 'Host control changed. Review and try again.', 409);
  if (s.hostLease?.expires > now && !owns) {
    const reconnect =
      s.hostLease.session === hash(ctx.token) &&
      s.hostLease.tabId === p.tabId &&
      !ctx.connections?.has(s.hostLease.connection);
    assert(
      p.confirm === true || reconnect,
      'Host controls are open elsewhere. Take control here?',
      409,
    );
    if (s.hostLease.session !== hash(ctx.token)) delete s.sessions[s.hostLease.session];
  }
  session.lastActivity = now;
  return grantControl(s, ctx.token, ctx, now, p.tabId);
}
