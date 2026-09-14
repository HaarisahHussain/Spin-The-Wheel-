import { requireValue as assert, sessionFor } from './security.js';
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
  if (['staffLogin', 'hostReauthenticate'].includes(action))
    assert(typeof p.password === 'string' && p.password.length <= 256, 'Enter your password.');
  if (action === 'hostReauthenticate')
    assert(sessionFor(s, token, now)?.staffId === 'host', 'Please sign in as host.', 401);
}
