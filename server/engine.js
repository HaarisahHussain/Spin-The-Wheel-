import { hash, sessionFor, rate, requireValue as assert } from './security.js';
import { publicQuestion } from './games.js';
import { authCommand } from './commands/auth.js';
import { playerCommand } from './commands/player.js';
import { hostCommand } from './commands/host.js';
export { tick, eligible } from './runtime.js';
const authActions = new Set([
  'register',
  'recover',
  'claimController',
  'sendVerification',
  'verify',
  'changeEmail',
  'staffLogin',
  'logout',
]);
export async function execute(s, action, p, ctx, services) {
  const now = ctx.now ?? Date.now();
  const actorSession = sessionFor(s, ctx.token, now);
  const commandKey = `${hash(ctx.token || ctx.ip)}:${ctx.commandId}`;
  const fingerprint = hash(JSON.stringify({ action, p }));
  const previous = s.commands[commandKey];
  if (previous) {
    assert(
      previous.fingerprint === fingerprint,
      'This command ID was already used for a different action.',
    );
    return previous.secretResult ? services.mail.open(previous.secretResult) : previous.result;
  }
  const before = structuredClone(s);
  let result;
  try {
    result = await dispatch(s, action, p, ctx, services, now, actorSession);
  } catch (error) {
    if (!error.status) throw error;
    // Roll back rejected business mutations, but retain anti-abuse counters.
    const rates = s.rates,
      guesses = Object.fromEntries(
        Object.entries(s.challenges).map(([id, ch]) => [id, ch.guesses]),
      );
    for (const key of Object.keys(s)) delete s[key];
    Object.assign(s, before);
    s.rates = rates;
    for (const [id, count] of Object.entries(guesses))
      if (s.challenges[id]) s.challenges[id].guesses = count;
    result = { error: error.message, status: error.status };
  }
  // A lost response can be retried without issuing a second credential or account.
  s.commands[commandKey] = {
    at: now,
    fingerprint,
    ...(result.token || result.recovery || result.pairingCode
      ? { secretResult: services.mail.seal(result) }
      : { result }),
  };
  return result;
}

async function dispatch(s, action, p, ctx, services, now, session) {
  assert(typeof action === 'string' && p && typeof p === 'object', 'Invalid command.');
  rate(s, `commands:${hash(ctx.token || ctx.ip)}`, 180, 60000, now);
  if (session?.controller)
    assert(
      ['ready', 'answer', 'robot', 'quit', 'joinLive', 'liveAnswer', 'logout'].includes(action),
      'This device is a game controller only.',
      403,
    );
  if (authActions.has(action)) return authCommand(s, action, p, ctx, services, now, session);
  if (action.startsWith('host.')) return hostCommand(s, action.slice(5), p, ctx, now, services);
  return playerCommand(s, action, p, ctx, now);
}
export function publicLive(live) {
  if (!live) return null;
  return {
    ...live,
    question: live.phase === 'reveal' ? live.question : publicQuestion(live.question),
    roster: Object.values(live.roster).map((e) => ({
      accountId: e.accountId,
      score: live.phase === 'question' ? undefined : e.score,
      submitted: e.answer !== null,
    })),
    code: live.phase === 'lobby' ? live.code : undefined,
  };
}
