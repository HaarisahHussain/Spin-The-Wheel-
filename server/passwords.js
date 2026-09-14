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
    await new Promise((resolve, reject) => {
      const grant = () => {
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(() => {
        const index = waiters.indexOf(grant);
        if (index >= 0) waiters.splice(index, 1);
        reject(Object.assign(Error('Sign-in is busy. Try again shortly.'), { status: 429 }));
      }, 7000);
      waiters.push(grant);
    });
  } else running++;
  try {
    return await fn();
  } finally {
    const next = waiters.shift();
    if (next) next();
    else running--;
  }
}
export async function preparePasswords(_state, action, p, hostHash) {
  if (!['staffLogin', 'hostReauthenticate'].includes(action)) return null;
  const prepared = { checks: [] };
  if (typeof p.password !== 'string' || p.password.length > 256) return prepared;
  const [salt, hex] = hostHash.split(':');
  const bytes = await limited(() => derive(p.password, salt, 64, options));
  const expected = Buffer.from(hex, 'hex');
  prepared.checks.push({
    value: p.password,
    encoded: hostHash,
    matches: bytes.length === expected.length && timingSafeEqual(bytes, expected),
  });
  return prepared;
}
