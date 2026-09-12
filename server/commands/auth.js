import { randomInt } from 'node:crypto';
import { allowedEmail, normalizeEmail } from '../../shared/catalog.js';
import {
  hash,
  secret,
  issueSession,
  revokeAccountCredentials,
  passwordMatches,
  totp,
  rate,
  requireValue as assert,
  textValue,
} from '../security.js';
import { usedAttempts } from '../state.js';
import { accountFor, requireEligible } from '../runtime.js';
const uuid = () => crypto.randomUUID();
const alias = () =>
  `${['Orbit', 'Pixel', 'Maple', 'Copper', 'Lunar', 'Cedar'][randomInt(6)]}${['Otter', 'Finch', 'Fox', 'Panda', 'Robin', 'Badger'][randomInt(6)]}-${randomInt(1000, 10000)}`;
export async function authCommand(s, action, p, ctx, services, now, session) {
  if (action === 'register') {
    assert(!s.purgedAt, 'This event has ended and registration is closed.');
    assert(allowedEmail(p.email), 'Use @mail.bcu.ac.uk or @bcu.ac.uk.');
    rate(s, `register:${ctx.ip}`, 3000, 3600000, now);
    rate(s, `register-email:${normalizeEmail(p.email)}`, 10, 3600000, now);
    const email = normalizeEmail(p.email);
    let account = Object.values(s.accounts).find((a) => a.email === email);
    const existing = !!account;
    if (!account) {
      let name;
      do {
        name = alias();
      } while (Object.values(s.accounts).some((a) => a.alias === name));
      account = {
        id: uuid(),
        email,
        alias: name,
        course: textValue(p.course),
        level: textValue(p.level),
        consent: p.consent === true,
        verified: false,
        created: now,
      };
      assert(account.course && account.level, 'Choose your course and academic level.');
      s.accounts[account.id] = account;
    }
    const token = issueSession(s, { accountId: account.id, pending: existing }, now);
    let recovery;
    if (!existing && !s.config.requireVerification) {
      recovery = secret(20);
      account.recoveryHash = hash(recovery);
    }
    return { token, recovery, existing };
  }
  if (action === 'recover') {
    rate(s, `recover:${ctx.ip}`, 300, 3600000, now);
    const account = Object.values(s.accounts).find((a) => a.recoveryHash === hash(p.code));
    assert(account, 'Recovery code not recognised.', 401);
    revokeAccountCredentials(s, account.id);
    const recovery = secret(20);
    account.recoveryHash = hash(recovery);
    return { token: issueSession(s, { accountId: account.id, pending: false }, now), recovery };
  }
  if (action === 'claimController') {
    rate(s, `pair:${ctx.ip}`, 10, 60000, now);
    const grant = s.controllerGrants?.[hash(p.code)];
    assert(grant && grant.expires > now && !grant.used, 'Pairing code expired or incorrect.');
    requireEligible(s, s.accounts[grant.accountId]);
    assert(
      s.queue.some((q) => q.accountId === grant.accountId && q.sequence === grant.sequence) ||
        (s.active?.accountId === grant.accountId && s.active.sequence === grant.sequence),
      'This controller turn has ended.',
    );
    grant.used = true;
    const token = issueSession(
      s,
      {
        accountId: grant.accountId,
        controller: true,
        controllerSequence: grant.sequence,
        pending: false,
      },
      now,
    );
    s.sessions[hash(token)].expires = now + 1800000;
    return { token };
  }
  if (session?.controller)
    assert(
      ['ready', 'answer', 'robot', 'quit', 'joinLive', 'liveAnswer', 'logout'].includes(action),
      'This device is a game controller only.',
      403,
    );
  if (action === 'sendVerification') {
    assert(session?.accountId, 'Register or sign in first.', 401);
    const account = s.accounts[session.accountId];
    rate(s, `mail:${account.email}`, 5, 3600000, now);
    rate(s, `flow:${hash(ctx.token)}`, 1, 60000, now);
    assert(
      services.mail.available,
      'Email delivery is not configured. Ask the host for help.',
      503,
    );
    const flow = hash(ctx.token);
    const old = Object.values(s.challenges).find(
      (c) => c.flow === flow && !c.used && c.expires > now,
    );
    if (old && old.guesses < 5) {
      const message = s.outbox.find((m) => m.challengeId === old.id);
      if (message) {
        message.sent = false;
        message.next = now;
        message.tries = 0;
        return { message: 'Verification email queued again.' };
      }
    }
    if (old) old.used = true;
    const id = uuid(),
      token = secret(),
      code = String(randomInt(100000, 1000000));
    s.challenges[id] = {
      id,
      accountId: account.id,
      email: account.email,
      flow,
      tokenHash: hash(token),
      codeHash: hash(code),
      expires: now + 900000,
      guesses: 0,
      used: false,
    };
    s.outbox.push({
      id: uuid(),
      challengeId: id,
      payload: services.mail.seal({ email: account.email, token, code }),
      sent: false,
      next: now,
      tries: 0,
    });
    return { message: 'Verification email queued.' };
  }
  if (action === 'verify') {
    assert(session?.accountId, 'Open Arcade on the device where you requested verification.', 401);
    const flow = hash(ctx.token),
      account = s.accounts[session.accountId];
    const challenge = Object.values(s.challenges).find(
      (c) =>
        c.flow === flow &&
        c.accountId === account.id &&
        !c.used &&
        c.expires > now &&
        (p.linkToken ? c.tokenHash === hash(p.linkToken) : true),
    );
    assert(
      challenge,
      'This verification link has expired or belongs to another browser. Enter the emailed code on the original device.',
    );
    rate(s, `verify:${account.email}`, 15, 3600000, now);
    assert(challenge.guesses < 5, 'Too many incorrect codes. Request a new verification email.');
    challenge.guesses++;
    assert(
      challenge.email === account.email &&
        (p.linkToken
          ? challenge.tokenHash === hash(p.linkToken)
          : challenge.codeHash === hash(p.code)),
      'Incorrect code.',
    );
    challenge.used = true;
    account.verified = true;
    revokeAccountCredentials(s, account.id);
    const recovery = secret(20);
    account.recoveryHash = hash(recovery);
    return {
      token: issueSession(s, { accountId: account.id, pending: false }, now),
      recovery,
      message: 'Email verified.',
    };
  }
  if (action === 'changeEmail') {
    const account = accountFor(s, ctx, now);
    assert(
      !account.verified &&
        usedAttempts(s, account.id) === 0 &&
        !s.queue.some((q) => q.accountId === account.id) &&
        s.active?.accountId !== account.id,
      'Ask the host to resolve this identity change.',
    );
    assert(allowedEmail(p.email), 'Use a BCU email address.');
    const email = normalizeEmail(p.email);
    assert(
      !Object.values(s.accounts).some((a) => a.id !== account.id && a.email === email),
      'That address is associated with another registration. Sign in or ask the host.',
    );
    account.email = email;
    for (const ch of Object.values(s.challenges)) if (ch.accountId === account.id) ch.used = true;
    return { message: 'Email updated.' };
  }
  if (action === 'staffLogin') {
    rate(s, `staff:${ctx.ip}`, 10, 900000, now);
    const staff = Object.values(s.staff).find((a) => a.username === p.username && !a.disabled);
    assert(staff && passwordMatches(p.password, staff.password), 'Sign-in failed.', 401);
    const step = totp(staff.totpSecret).validate({
      token: String(p.otp || ''),
      timestamp: now,
      window: 1,
    });
    assert(step !== null, 'Sign-in failed.', 401);

    const counter = Math.floor(now / 30000) + step;
    assert(counter > (staff.lastOtp ?? -1), 'Wait for the next authenticator code.', 401);
    staff.lastOtp = counter;
    return { token: issueSession(s, { staffId: staff.id, role: staff.role }, now) };
  }
  if (action === 'logout') {
    delete s.sessions[hash(ctx.token)];
    return { logout: true };
  }
}
