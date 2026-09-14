import { SCORING_VERSION } from '../shared/catalog.js';
import assert from 'node:assert/strict';
import { initialState } from '../server/state.js';
import { execute } from '../server/engine.js';
import { createReceiptCodec } from '../server/receipts.js';
import { secret, passwordHash, hash } from '../server/security.js';
export const NOW = 1800000000000,
  PASSWORD = 'this is a test password';
const hostPasswordHash = passwordHash(PASSWORD);
export function fixture() {
  const s = initialState(NOW);
  s.config.windows = [{ start: NOW - 1000, cutoff: NOW + 18000000, end: NOW + 21600000 }];
  return {
    s,
    services: {
      receipts: createReceiptCodec(secret()),
      hostPasswordHash,
    },
    connections: new Map(),
  };
}
export async function command(f, action, p = {}, token = '', time = NOW, options = {}) {
  const connectionId = options.connectionId || f.connections.get(token) || 'anonymous';
  try {
    return await execute(
      f.s,
      action,
      p,
      {
        token,
        ip: options.ip || 'test',
        now: time,
        commandId: options.id || crypto.randomUUID(),
        connectionId,
        epoch: options.epoch ?? f.s.controlEpoch,
        connections: new Set(f.connections.values()),
      },
      f.services,
    );
  } catch (e) {
    if (!e.status) throw e;
    return { error: e.message, status: e.status };
  }
}
export async function host(f) {
  const r = await command(
    f,
    'staffLogin',
    { username: 'host', password: PASSWORD, tabId: 'tab-a' },
    '',
    NOW,
    { connectionId: 'host-a' },
  );
  assert(!r.error, r.error);
  f.host = r.token;
  f.connections.set(r.token, 'host-a');
  return r.token;
}
export async function player(f) {
  const r = await command(f, 'guest');
  assert(!r.error, r.error);
  const id = f.s.sessions[hash(r.token)].accountId;
  f.connections.set(r.token, `player-${id}`);
  assert(!(await command(f, 'claimPlayerControl', {}, r.token)).error);
  return { id, token: r.token };
}
export async function start(f, p, gameId = 'debug', mode = 'solo') {
  const { tick } = await import('../server/engine.js');
  f.s.accounts[p.id].tutorials = { [gameId]: SCORING_VERSION };
  assert(!(await command(f, 'enqueue', { mode }, p.token)).error);
  assert(!(await command(f, 'host.call', {}, f.host)).error);
  f.s.accounts[p.id].pendingGame = gameId;
  assert(!(await command(f, 'ready', {}, p.token)).error);
  tick(f.s, NOW + 3000);
  tick(f.s, NOW + 6000);
  return f.s.active;
}
