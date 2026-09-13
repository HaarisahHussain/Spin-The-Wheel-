import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { acquireInstance } from '../server/instance-lock.js';
import { createStorage } from '../server/storage.js';
import { initialState } from '../server/state.js';

test('instance recovery reclaims a dead owner and never removes a live or unknown owner', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arcade-lock-')),
    file = join(dir, 'test.sqlite');
  try {
    const pid = Number(
      spawnSync(process.execPath, ['-e', 'console.log(process.pid)'], {
        encoding: 'utf8',
      }).stdout.trim(),
    );
    writeFileSync(file + '.instance', JSON.stringify({ pid, token: 'dead' }));
    const release = acquireInstance(file);
    assert.throws(() => acquireInstance(file), /Another Arcade process/);
    const owned = readFileSync(file + '.instance', 'utf8');
    const reset = spawnSync(process.execPath, ['scripts/reset-dev.js'], {
      env: { ...process.env, DATABASE_URL: '', SQLITE_PATH: file },
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.notEqual(reset.status, 0);
    assert.equal(readFileSync(file + '.instance', 'utf8'), owned);
    release();
    assert(!existsSync(file + '.instance'));
    writeFileSync(file + '.instance', 'unknown owner');
    assert.throws(() => acquireInstance(file), /Unrecognised/);
    assert.equal(readFileSync(file + '.instance', 'utf8'), 'unknown owner');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test('failed SQLite initialisation and incompatible-schema startup release their own locks without deleting data', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'arcade-failure-')),
    file = join(dir, 'test.sqlite');
  try {
    writeFileSync(file, 'not a database');
    await assert.rejects(createStorage({ filename: file, initial: initialState() }));
    assert(!existsSync(file + '.instance'));
    assert.equal(readFileSync(file, 'utf8'), 'not a database');
    rmSync(file);
    const old = initialState();
    old.schemaVersion = 5;
    const store = await createStorage({ filename: file, initial: old });
    await store.close();
    const result = spawnSync(process.execPath, [resolve('server/index.js')], {
      env: {
        ...process.env,
        DATABASE_URL: '',
        SQLITE_PATH: file,
        HOST_PASSWORD: 'test startup passphrase',
        MAIL_KEY: 'a'.repeat(64),
        MAIL_MODE: 'preview',
      },
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /clean v0.5.1 database/);
    assert(!existsSync(file + '.instance'));
    const again = await createStorage({ filename: file, initial: initialState() });
    assert.equal(again.snapshot().schemaVersion, 5);
    await again.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
