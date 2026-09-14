import { randomInt } from 'node:crypto';
import { allowedEmail, normalizeEmail } from '../../shared/catalog.js';
import {
  hash,
  secret,
  issueSession,
  revokeAccountCredentials,
  passwordHash,
  passwordMatches,
  rate,
  requireValue as assert,
  textValue,
} from '../security.js';
import { beginHostLogin, takeover, hostControl, requireHost } from '../host-control.js';
const uuid = () => crypto.randomUUID();
const passwordValid = (p) => typeof p === 'string' && p.length >= 15 && p.length <= 256;
const identity = (s, email) =>
  Object.values(s.accounts).find((a) => a.email === normalizeEmail(email || ''));
function challenge(s, account, kind, ctx, mail, now) {
  assert(mail.available, 'Email delivery is unavailable. Please try again shortly.', 503);
  rate(s, `mail:${account.email}`, 5, 3600000, now);
  rate(s, `resend:${account.email}`, 1, 60000, now);
  for (const c of Object.values(s.challenges))
    if (c.accountId === account.id && c.kind === kind) c.used = true;
  const token = secret(),
    code = String(randomInt(100000, 1000000)),
    id = uuid();
  s.challenges[id] = {
    id,
    kind,
    accountId: account.id,
    flow: hash(ctx.token),
    tokenHash: hash(token),
    codeHash: hash(code),
    guesses: 0,
    expires: now + 900000,
    used: false,
  };
  s.outbox.push({
    id: uuid(),
    challengeId: id,
    payload: mail.seal({ email: account.email, kind, token, code }),
    sent: false,
    next: now,
    tries: 0,
  });
}
export async function authCommand(
  s,
  action,
  p,
  ctx,
  { mail, hostPasswordHash, preparedAuth },
  now,
  session,
) {
  const matches = (value, encoded) => {
    if (!preparedAuth) return passwordMatches(value, encoded);
    const check = preparedAuth.checks.find((c) => c.value === value && c.encoded === encoded);
    return check?.matches === true;
  };
  const encode = (value) => {
    if (!preparedAuth) return passwordHash(value);
    assert(preparedAuth.newPassword?.value === value, 'Retry password setup.', 409);
    return preparedAuth.newPassword.encoded;
  };
  if (action === 'register') {
    assert(!s.purgedAt, 'This event has ended.');
    assert(allowedEmail(p.email), 'Use @mail.bcu.ac.uk or @bcu.ac.uk.');
    rate(s, `register:${ctx.ip}`, 1000, 3600000, now);
    assert(passwordValid(p.password), 'Use a password of 15–256 characters.');
    assert(!identity(s, p.email), 'Please sign in or use Forgot password for this address.');
    const account = {
      id: uuid(),
      email: normalizeEmail(p.email),
      fullName: textValue(p.fullName),
      course: textValue(p.course),
      level: textValue(p.level),
      consent: p.consent === true || p.consent === 'true',
      verified: false,
      created: now,
      password: encode(p.password),
      recent: [],
    };
    assert(
      account.fullName && account.course && account.level,
      'Enter your name, course and academic year.',
    );
    do {
      account.alias = `${['Cedar', 'Pixel', 'Maple', 'Orbit'][randomInt(4)]}${['Otter', 'Fox', 'Finch', 'Panda'][randomInt(4)]}-${randomInt(1000, 100000)}`;
    } while (Object.values(s.accounts).some((a) => a.alias === account.alias));
    s.accounts[account.id] = account;
    const token = issueSession(s, { accountId: account.id }, now);
    // Registration remains usable during an SMTP fault; verification can be resent.
    if (s.config.requireVerification && mail.available)
      challenge(s, account, 'verify', { ...ctx, token }, mail, now);
    return { token };
  }
  if (action === 'login' || action === 'staffLogin') {
    rate(s, `login-ip:${ctx.ip}`, 300, 900000, now);
    const key =
      action === 'staffLogin' ? `host:${ctx.ip}` : `${ctx.ip}:${normalizeEmail(p.email || '')}`;
    assert(
      (s.rates[`login:${key}`] || []).filter((t) => t > now - 900000).length < 12,
      'Too many requests. Please try again later.',
      429,
    );
    const account = identity(s, p.email);
    const valid =
      action === 'staffLogin'
        ? p.username === 'host' && matches(p.password, hostPasswordHash)
        : matches(p.password, account?.password || hostPasswordHash) &&
          account &&
          !account.disabled;
    if (!valid) rate(s, `login:${key}`, 12, 900000, now);
    assert(valid, 'Email/username or password is incorrect.', 401);
    delete s.rates[`login:${key}`];
    if (action === 'staffLogin') return beginHostLogin(s, ctx, p, now);
    return { token: issueSession(s, { accountId: account.id }, now) };
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
  if (action === 'forgotPassword') {
    assert(allowedEmail(p.email), 'Use a BCU email address.');
    rate(s, `reset-ip:${ctx.ip}`, 30, 3600000, now);
    const account = identity(s, p.email);
    if (account) {
      try {
        challenge(s, account, 'reset', ctx, mail, now);
      } catch (e) {
        if (!e.status) throw e;
      }
    }
    return { message: 'If this address is registered, a reset email will arrive shortly.' };
  }
  if (action === 'resetPassword') {
    rate(s, `reset:${ctx.ip}`, 20, 900000, now);
    assert(passwordValid(p.password), 'Use a password of 15–256 characters.');
    const ch = Object.values(s.challenges).find(
      (c) => c.kind === 'reset' && !c.used && c.expires > now && c.tokenHash === hash(p.linkToken),
    );
    assert(ch, 'This reset link has expired. Request another.');
    const a = s.accounts[ch.accountId];
    a.password = encode(p.password);
    revokeAccountCredentials(s, a.id);
    for (const c of Object.values(s.challenges)) if (c.accountId === a.id) c.used = true;
    s.outbox.push({
      id: uuid(),
      payload: mail.seal({
        email: a.email,
        subject: 'Arcade password changed',
        text: 'Your password was changed. If this was not you, reset it immediately.',
      }),
      sent: false,
      next: now,
      tries: 0,
    });
    return { logout: true, message: 'Password changed. Sign in to continue.' };
  }
  if (action === 'sendVerification') {
    assert(session?.accountId, 'Sign in first.', 401);
    challenge(s, s.accounts[session.accountId], 'verify', ctx, mail, now);
    return { message: 'Verification email queued.' };
  }
  if (action === 'verify') {
    rate(s, `verify-ip:${ctx.ip}`, 300, 900000, now);
    const ch = Object.values(s.challenges).find(
      (c) =>
        c.kind === 'verify' &&
        !c.used &&
        c.expires > now &&
        (p.linkToken
          ? c.tokenHash === hash(p.linkToken)
          : c.flow === hash(ctx.token) && c.accountId === session?.accountId),
    );
    assert(ch, 'Verification expired. Request a new email.');
    assert(ch.guesses < 5, 'Too many guesses. Request a new email.');
    ch.guesses++;
    const a = s.accounts[ch.accountId];
    assert(
      session?.accountId === a.id || matches(p.password, a.password),
      'Enter the password used to register this account.',
      401,
    );
    assert(p.linkToken || ch.codeHash === hash(p.code), 'Incorrect code.');
    ch.used = true;
    a.verified = true;
    return { message: 'Email verified. You can now play.' };
  }
  if (action === 'changePassword') {
    assert(session?.accountId, 'Sign in first.', 401);
    rate(s, `password:${session.accountId}`, 10, 900000, now);
    const a = s.accounts[session.accountId];
    assert(matches(p.currentPassword, a.password), 'Current password is incorrect.', 401);
    assert(passwordValid(p.password), 'Use a password of 15–256 characters.');
    a.password = encode(p.password);
    revokeAccountCredentials(s, a.id);
    return { token: issueSession(s, { accountId: a.id }, now), message: 'Password changed.' };
  }
  if (action === 'logout') {
    if (s.hostLease?.session === hash(ctx.token)) {
      s.hostLease = null;
      s.controlEpoch++;
    }
    delete s.sessions[hash(ctx.token)];
    return { logout: true };
  }
  assert(false, 'Unknown account action.');
}
