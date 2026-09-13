import { scrypt, scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
// About 32 MiB per derivation. Concurrency is bounded independently of DB writes.
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
export function encodePassword(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64, options).toString('hex')}`;
}
export function checkPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 256 || !encoded) return false;
  const [salt, hex] = encoded.split(':');
  const actual = scryptSync(password, salt, 64, options),
    target = Buffer.from(hex || '', 'hex');
  return actual.length === target.length && timingSafeEqual(actual, target);
}
let running = 0;
const waiters = [];
async function limited(fn) {
  if (running >= 2) {
    if (waiters.length >= 32)
      throw Object.assign(Error('Sign-in is busy. Try again shortly.'), { status: 429 });
    await new Promise((resolve) => waiters.push(resolve));
  } else running++;
  try {
    return await fn();
  } finally {
    const next = waiters.shift();
    if (next) next();
    else running--;
  }
}
export async function preparePasswords(state, action, p, hostHash) {
  const relevant = [
    'register',
    'login',
    'staffLogin',
    'hostReauthenticate',
    'verify',
    'changePassword',
    'resetPassword',
  ];
  if (!relevant.includes(action)) return null;
  const prepared = { checks: [], newPassword: null };
  const inputs = (
    ['register', 'resetPassword'].includes(action)
      ? []
      : action === 'changePassword'
        ? [p.currentPassword]
        : [p.password]
  ).filter((v) => typeof v === 'string' && v.length <= 256);
  if (!inputs.length && !['register', 'changePassword', 'resetPassword'].includes(action))
    return prepared;
  // Derive only the account being authenticated, never all registered passwords.
  let target = hostHash;
  if (action === 'login')
    target =
      Object.values(state.accounts).find(
        (a) =>
          a.email ===
          String(p.email || '')
            .trim()
            .toLowerCase(),
      )?.password || hostHash;
  if (['verify', 'changePassword'].includes(action)) {
    const ch =
      action === 'verify' &&
      Object.values(state.challenges).find((c) => c.tokenHash === p._tokenHash);
    target = state.accounts[ch?.accountId || p._accountId]?.password || hostHash;
  }
  for (const value of inputs) {
    if (!target) continue;
    const [salt, hex] = target.split(':');
    const bytes = await limited(() => derive(value, salt, 64, options));
    const expected = Buffer.from(hex, 'hex');
    prepared.checks.push({
      value,
      encoded: target,
      matches: bytes.length === expected.length && timingSafeEqual(bytes, expected),
    });
  }
  if (
    ['register', 'changePassword', 'resetPassword'].includes(action) &&
    typeof p.password === 'string' &&
    p.password.length >= 15 &&
    p.password.length <= 256
  ) {
    const salt = randomBytes(16).toString('hex');
    const bytes = await limited(() => derive(p.password, salt, 64, options));
    prepared.newPassword = { value: p.password, encoded: `${salt}:${bytes.toString('hex')}` };
  }
  return prepared;
}
