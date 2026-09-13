import { randomBytes, createHash } from 'node:crypto';
export const secret = (bytes = 32) => randomBytes(bytes).toString('hex');
export const hash = (value) => createHash('sha256').update(String(value)).digest('hex');
export { encodePassword as passwordHash, checkPassword as passwordMatches } from './passwords.js';
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
  if (session.staffId && now - session.lastActivity >= 1800000) return null;
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
    lastActivity: now,
    reauthenticated: now,
    expires: now + (identity.staffId ? 12 : 168) * 3600000,
  };
  return token;
}
export function rate(state, key, limit, period, now) {
  const entries = (state.rates[key] || []).filter((time) => time > now - period);
  requireValue(entries.length < limit, 'Too many requests. Please try again later.', 429);
  entries.push(now);
  state.rates[key] = entries;
}
