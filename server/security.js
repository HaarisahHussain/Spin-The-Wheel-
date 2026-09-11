import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import * as OTPAuth from 'otpauth';
export const secret = (bytes = 32) => randomBytes(bytes).toString('hex');
export const hash = (value) => createHash('sha256').update(String(value)).digest('hex');
export function passwordHash(password, salt = secret(16)) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function passwordMatches(password, encoded) {
  if (!encoded || typeof password !== 'string' || password.length > 256) return false;
  const [salt, expected] = encoded.split(':');
  const actual = Buffer.from(passwordHash(password, salt).split(':')[1], 'hex');
  const target = Buffer.from(expected, 'hex');
  return actual.length === target.length && timingSafeEqual(actual, target);
}
export const totp = (seed) =>
  new OTPAuth.TOTP({
    issuer: 'BCUSCA Arcade',
    label: 'Host',
    secret: OTPAuth.Secret.fromBase32(seed),
    digits: 6,
    period: 30,
  });
export function requireValue(condition, message, status = 400) {
  if (!condition) {
    const e = new Error(message);
    e.status = status;
    throw e;
  }
}
export const textValue = (value, length = 120) =>
  typeof value === 'string' ? value.trim().slice(0, length) : '';
export function sessionFor(state, token, now) {
  const session = state.sessions[hash(token || '')];
  if (!session || session.expires <= now) return null;
  if (session.staffId && state.staff[session.staffId]?.disabled) return null;
  if (
    session.controller &&
    !state.queue.some(
      (q) => q.accountId === session.accountId && q.sequence === session.controllerSequence,
    ) &&
    !(
      state.active?.accountId === session.accountId &&
      state.active.sequence === session.controllerSequence
    )
  )
    return null;
  return session;
}
export function revokeAccountCredentials(state, accountId) {
  for (const [key, value] of Object.entries(state.sessions))
    if (value.accountId === accountId) delete state.sessions[key];
  for (const grant of Object.values(state.controllerGrants || {}))
    if (grant.accountId === accountId) grant.used = true;
}
export function issueSession(state, identity, now) {
  const token = secret();
  state.sessions[hash(token)] = {
    ...identity,
    created: now,
    expires: now + (identity.staffId ? 8 : 96) * 3600000,
  };
  return token;
}
export function rate(state, key, limit, period, now) {
  const entries = (state.rates[key] || []).filter((time) => time > now - period);
  requireValue(entries.length < limit, 'Too many requests. Please try again later.', 429);
  entries.push(now);
  state.rates[key] = entries;
}
