import { randomUUID } from 'node:crypto';
import { hash, issueSession, passwordMatches, rate, requireValue as assert } from '../security.js';
import { beginHostLogin, takeover, hostControl, requireHost } from '../host-control.js';
export async function authCommand(
  s,
  action,
  p,
  ctx,
  { hostPasswordHash, preparedAuth },
  now,
  session,
) {
  const matches = (value, encoded) =>
    preparedAuth
      ? preparedAuth.checks.some((c) => c.value === value && c.encoded === encoded && c.matches)
      : passwordMatches(value, encoded);
  if (action === 'guest') {
    assert(!s.purgedAt, 'This event has ended.');
    if (session?.accountId && s.accounts[session.accountId]) return {};
    rate(s, `guest:${ctx.ip}`, 1000, 3600000, now);
    const id = randomUUID();
    let alias;
    do {
      alias = `Player-${randomUUID().slice(0, 8)}`;
    } while (Object.values(s.accounts).some((a) => a.alias.toLowerCase() === alias.toLowerCase()));
    s.accounts[id] = { id, alias, fullName: '', created: now, recent: [] };
    return { token: issueSession(s, { accountId: id }, now) };
  }
  if (action === 'staffLogin') {
    rate(s, `login-ip:${ctx.ip}`, 300, 900000, now);
    const key = `login:host:${ctx.ip}`;
    assert(
      (s.rates[key] || []).filter((t) => t > now - 900000).length < 12,
      'Too many requests. Please try again later.',
      429,
    );
    const valid = p.username === 'host' && matches(p.password, hostPasswordHash);
    if (!valid) rate(s, key, 12, 900000, now);
    assert(valid, 'Username or password is incorrect.', 401);
    delete s.rates[key];
    return beginHostLogin(s, ctx, p, now);
  }
  if (action === 'hostTakeover') return takeover(s, ctx, p, now);
  if (action === 'hostControl') return hostControl(s, ctx, p, now);
  if (action === 'hostReauthenticate') {
    const sess = requireHost(s, ctx, now);
    rate(s, `reauth:${ctx.ip}`, 10, 900000, now);
    assert(matches(p.password, hostPasswordHash), 'Password is incorrect.', 401);
    sess.reauthenticated = now;
    sess.lastActivity = now;
    return {};
  }
  if (action === 'logout') {
    assert(session?.staffId, 'Guest accounts stay on this browser.', 403);
    if (s.hostLease?.session === hash(ctx.token)) {
      s.hostLease = null;
      s.controlEpoch++;
    }
    delete s.sessions[hash(ctx.token)];
    return { logout: true };
  }
  assert(false, 'Unknown account action.');
}
