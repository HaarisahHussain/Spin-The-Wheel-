import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, host, player, command, NOW } from './helpers.js';
import { tick, transitionDue } from '../server/runtime.js';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initialState } from '../server/state.js';
import { createStorage } from '../server/storage.js';

test('returning solo players still get unlimited reading time; host starts the selected session once', async () => {
  const f = fixture();
  await host(f);
  const p = await player(f);
  await command(f, 'enqueue', {}, p.token);
  await command(f, 'host.call', {}, f.host);
  tick(f.s, NOW + 60000);
  assert.equal(f.s.active.phase, 'called');
  await command(f, 'ready', {}, p.token);
  tick(f.s, NOW + 3000);
  const selectionId = f.s.active.selection.id;
  tick(f.s, NOW + 600000);
  assert.equal(f.s.active.phase, 'introduction');
  assert.equal(transitionDue(f.s, NOW + 600001), false);
  assert.equal(f.s.attempts.length, 0);
  assert((await command(f, 'host.startGame', { selectionId: 'stale' }, f.host)).error);
  assert(!(await command(f, 'host.startGame', { selectionId }, f.host)).error);
  assert.equal(f.s.active.phase, 'countdown');
  assert((await command(f, 'tutorialReady', { selectionId }, p.token)).error);
  tick(f.s, NOW + 3000);
  assert.equal(f.s.attempts.length, 1);
});
test('Live waits for all participants or an explicit host start, excluding strangers and stale clicks', async () => {
  const f = fixture();
  await host(f);
  const a = await player(f),
    b = await player(f),
    stranger = await player(f);
  f.s.live = {
    id: 'live',
    phase: 'introduction',
    until: null,
    gameId: 'robot',
    level: 0,
    roster: Object.fromEntries(
      [a, b].map((p) => [p.id, { accountId: p.id, answer: null, score: 0 }]),
    ),
  };
  tick(f.s, NOW + 600000);
  assert.equal(f.s.live.phase, 'introduction');
  assert.equal(transitionDue(f.s, NOW + 600001), false);
  assert((await command(f, 'liveReady', { liveId: 'live' }, stranger.token)).error);
  assert((await command(f, 'liveReady', { liveId: 'old' }, a.token)).error);
  assert(!(await command(f, 'liveReady', { liveId: 'live' }, a.token)).error);
  assert.equal(f.s.live.phase, 'introduction');
  assert(!(await command(f, 'liveReady', { liveId: 'live' }, b.token)).error);
  assert.equal(f.s.live.phase, 'countdown');
  f.s.live.phase = 'introduction';
  f.s.live.until = null;
  assert(!(await command(f, 'host.startGame', { liveId: 'live' }, f.host)).error);
  assert.equal(f.s.live.phase, 'countdown');
});
test('v1.1 database snapshot retains records exactly, survives repeated upgrades and explicit cleanup removes it', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'arcade-preserve-'));
  const filename = join(dir, 'arcade.sqlite');
  let store;
  try {
    store = await createStorage({ filename, initial: initialState() });
    await store.transact((s) => {
      s.accounts.a = { id: 'a', alias: 'SamePlayer', fullName: 'Name' };
      s.attempts.push({ id: 'solo', accountId: 'a', score: 3212345, review: [{ answer: 'x' }] });
      s.liveResults.push({ id: 'live', accountId: 'a', score: 7654321, scoreVersion: '1.1.0' });
      s.updates.push({ id: 'update', title: 'Original' });
      s.audit.push({ id: 'audit', action: 'original' });
      s.sessions.token = { accountId: 'a', expires: Date.now() + 600000 };
    });
    const before = store.snapshot();
    await store.close();
    store = await createStorage({ filename, initial: initialState() });
    const db = new DatabaseSync(filename);
    const backup = JSON.parse(db.prepare('SELECT body FROM arcade_backups').get().body);
    for (const key of ['accounts', 'attempts', 'liveResults', 'updates', 'audit', 'sessions']) {
      assert.deepEqual(backup[key], before[key]);
      assert.deepEqual(store.snapshot()[key], before[key]);
    }
    await store.transact((s) => {
      s.config.interfaceVersion = '1.3.0';
    });
    await store.close();
    store = await createStorage({ filename, initial: initialState() });
    assert.equal(db.prepare('SELECT count(*) AS n FROM arcade_backups').get().n, 1);
    assert.deepEqual(JSON.parse(db.prepare('SELECT body FROM arcade_backups').get().body), backup);
    await store.transact((s) => {
      s.purgedAt = Date.now();
    });
    assert.equal(db.prepare('SELECT count(*) AS n FROM arcade_backups').get().n, 0);
    db.close();
  } finally {
    await store?.close();
    await rm(dir, { recursive: true, force: true });
  }
});
