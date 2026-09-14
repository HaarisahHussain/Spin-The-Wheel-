import { cloneState } from './working-state.js';
import { requireHost } from './host-control.js';
import { hash, sessionFor, rate, requireValue as assert } from './security.js';
import { publicQuestion } from './games.js';
import { authCommand } from './commands/auth.js';
import { playerCommand } from './commands/player.js';
import { hostCommand } from './commands/host.js';
export { tick, eligible } from './runtime.js';
const authActions = new Set([
  'register',
  'login',
  'staffLogin',
  'hostTakeover',
  'hostControl',
  'hostReauthenticate',
  'forgotPassword',
  'resetPassword',
  'sendVerification',
  'verify',
  'changePassword',
  'logout',
]);
export async function execute(s, action, p, ctx, services) {
  const now = ctx.now ?? Date.now();
  const actorSession = sessionFor(s, ctx.token, now);
  const commandKey = `${hash(ctx.token || ctx.ip)}:${ctx.commandId}`;
  const fingerprint = hash(JSON.stringify({ action, p }));
  // Check authority before looking up a cached host result.
  if (action?.startsWith('host.')) requireHost(s, ctx, now);
  const previous = s.commands[commandKey];
  if (previous) {
    assert(
      previous.fingerprint === fingerprint,
      'This command ID was already used for a different action.',
    );
    const cached = previous.secretResult
      ? services.mail.open(previous.secretResult)
      : previous.result;
    assert(
      !cached.token || sessionFor(s, cached.token, now),
      'This sign-in has expired. Sign in again.',
      401,
    );
    return cached;
  }
  const previousCommands = s.commands;
  const before = cloneState({ ...s, commands: {} });
  before.commands = previousCommands;
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
    result = {
      error: error.message,
      status: error.status,
      ...(error.code === 'REAUTHENTICATE' ? { code: error.code } : {}),
    };
  }
  // A lost response can be retried without issuing a second credential or account.
  if (!result.error && action !== 'host.export' && !(action === 'hostControl' && p.heartbeat))
    s.commands[commandKey] = {
      at: now,
      fingerprint,
      ...(result.token || result.takeover
        ? { secretResult: services.mail.seal(result) }
        : { result }),
    };
  const keys = Object.keys(s.commands);
  for (const key of keys.slice(0, Math.max(0, keys.length - 4000))) delete s.commands[key];
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
  const reveal = ['execution', 'reveal', 'winner'].includes(live.phase);
  return {
    id: live.id,
    gameId: live.phase === 'wheel' ? null : live.gameId,
    phase: live.phase,
    until: live.until,
    phaseAt: live.phaseAt,
    selection: live.selection,
    level: live.level,
    question: publicQuestion(live.question, ['reveal', 'winner'].includes(live.phase)),

    message: live.message,
    winners: live.winners,
    prizeRecipients: live.prizeRecipients,
    roster: Object.values(live.roster).map((e, i) => ({
      accountId: e.accountId,
      mark: i + 1,
      score: reveal ? e.score : undefined,
      submitted: e.answer !== null,
      ...(reveal ? { result: e.result, points: e.points, program: e.answer } : {}),
    })),
  };
}
