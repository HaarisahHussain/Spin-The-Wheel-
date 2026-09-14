import { allowedEmail } from '../shared/catalog.js';
import { hash, requireValue as assert, sessionFor } from './security.js';
export function createLimits(maxKeys = 5000) {
  const buckets = new Map();
  return {
    check(key, maximum, period, now = Date.now()) {
      let b = buckets.get(key);
      if (b && now >= b.until) {
        buckets.delete(key);
        b = null;
      }
      if (!b) {
        if (buckets.size >= maxKeys)
          for (const [k, v] of buckets) if (v.until <= now) buckets.delete(k);
        assert(buckets.size < maxKeys, 'Service busy. Please retry shortly.', 503);
        b = { count: 0, until: now + period };
        buckets.set(key, b);
      }
      assert(b.count < maximum, 'Too many requests. Please try again shortly.', 429);
      b.count++;
    },
  };
}
export function authPreflight(s, action, p, token, now) {
  if (['register', 'login', 'forgotPassword'].includes(action))
    assert(
      typeof p.email === 'string' && p.email.length <= 254 && allowedEmail(p.email),
      'Use a BCU email address.',
    );
  if (['register', 'resetPassword', 'changePassword'].includes(action))
    assert(
      typeof p.password === 'string' && p.password.length >= 15 && p.password.length <= 256,
      'Use a password of 15–256 characters.',
    );
  if (['login', 'staffLogin', 'hostReauthenticate'].includes(action))
    assert(typeof p.password === 'string' && p.password.length <= 256, 'Enter your password.');
  if (action === 'register')
    assert(
      ['fullName', 'course', 'level'].every((k) => typeof p[k] === 'string' && p[k].trim()),
      'Enter your name, course and academic year.',
    );
  if (action === 'resetPassword')
    assert(
      typeof p.linkToken === 'string' &&
        Object.values(s.challenges).some(
          (c) =>
            c.kind === 'reset' && !c.used && c.expires > now && c.tokenHash === hash(p.linkToken),
        ),
      'This reset link has expired. Request another.',
    );
  if (action === 'changePassword')
    assert(sessionFor(s, token, now)?.accountId, 'Please sign in.', 401);
  if (action === 'hostReauthenticate')
    assert(sessionFor(s, token, now)?.staffId === 'host', 'Please sign in as host.', 401);
  if (action === 'verify' && !p.linkToken)
    assert(sessionFor(s, token, now)?.accountId, 'Please sign in.', 401);
  if (action === 'verify' && p.linkToken)
    assert(
      typeof p.linkToken === 'string' &&
        Object.values(s.challenges).some(
          (c) =>
            c.kind === 'verify' && !c.used && c.expires > now && c.tokenHash === hash(p.linkToken),
        ),
      'This verification link has expired. Request another.',
    );
}
