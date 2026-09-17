import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { upgradeGuestEvent } from './upgrade.js';
import { acquireInstance } from './instance-lock.js';
import { cloneState, freezeReviews } from './working-state.js';

const maps = new Set(['accounts', 'sessions', 'staff', 'challenges', 'commands']);
const lists = new Set([
  'attempts',
  'outbox',
  'audit',
  'liveResults',
  'notifications',
  'awards',
  'incidents',
  'updates',
]);
const transient = new Set(['rates', 'hostLease', 'takeovers', 'revision']);
function records(s, previous = null, serialized = new Map()) {
  const priorAttempts = new Map((previous?.attempts || []).map((a) => [a.id, a]));
  const rows = new Map();
  for (const [group, value] of Object.entries(s)) {
    if (transient.has(group)) continue;
    if (maps.has(group)) {
      for (const [id, body] of Object.entries(value))
        rows.set(`${group}/${id}`, JSON.stringify(body));
    } else if (lists.has(group)) {
      value.forEach((body, order) => {
        const key = `${group}/${body.id}`,
          old = group === 'attempts' ? priorAttempts.get(body.id) : null;
        const same =
          old &&
          previous.attempts[order]?.id === body.id &&
          Object.keys(old).length === Object.keys(body).length &&
          Object.keys(body).every((k) => body[k] === old[k]);
        rows.set(
          key,
          same && serialized.has(key) ? serialized.get(key) : JSON.stringify({ order, body }),
        );
      });
    } else rows.set(`core/${group}`, JSON.stringify(value));
  }
  return rows;
}
function assemble(rows, initial) {
  const s = { ...initial };
  for (const group of [...maps, ...lists]) s[group] = lists.has(group) ? [] : {};
  for (const { key, body } of rows) {
    const slash = key.indexOf('/'),
      group = key.slice(0, slash),
      id = key.slice(slash + 1);
    const value = typeof body === 'string' ? JSON.parse(body) : body;
    if (group === 'core') s[id] = value;
    else if (lists.has(group)) s[group].push(value);
    else if (maps.has(group)) s[group][id] = value;
  }
  for (const group of lists)
    s[group] = s[group].sort((a, b) => a.order - b.order).map((v) => v.body);
  return s;
}
const unavailable = (message) => Object.assign(Error(message), { status: 503 });
export async function createStorage({
  url,
  filename = './data/arcade.sqlite',
  initial,
  maxPending = 128,
  maxWaitMs = 5000,
}) {
  let db,
    pool,
    guard,
    releaseFile = () => {},
    owned = false,
    healthy = true;
  try {
    if (url) {
      const { Pool } = await import('pg');
      pool = new Pool({
        connectionString: url,
        max: 3,
        connectionTimeoutMillis: 3000,
        statement_timeout: 4000,
        query_timeout: 5000,
        idle_in_transaction_session_timeout: 5000,
      });
      pool.on('error', () => {
        healthy = false;
      });
      guard = await pool.connect();
      guard.on('error', () => {
        healthy = false;
      });
      guard.on('end', () => {
        healthy = false;
      });
      owned = (await guard.query('SELECT pg_try_advisory_lock(741050) AS owned')).rows[0].owned;
      if (!owned) throw Error('Another Arcade server already owns this database. Stop it first.');
      await pool.query(
        'CREATE TABLE IF NOT EXISTS arcade_records (key text PRIMARY KEY, body jsonb NOT NULL)',
      );
      await pool.query('DROP INDEX IF EXISTS arcade_records_email');
    } else {
      const { DatabaseSync } = await import('node:sqlite');
      mkdirSync(dirname(filename), { recursive: true });
      if (filename !== ':memory:') releaseFile = acquireInstance(filename);
      db = new DatabaseSync(filename);
      db.exec(
        'PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS arcade_records (key TEXT PRIMARY KEY, body TEXT NOT NULL)',
      );
      db.exec('DROP INDEX IF EXISTS arcade_records_email');
    }
    const loaded = pool
      ? (await pool.query('SELECT key,body FROM arcade_records')).rows
      : db.prepare('SELECT key,body FROM arcade_records').all();
    let cached;
    if (loaded.length) cached = assemble(loaded, initial);
    else {
      // Import the existing aggregate once; never erase an unrecognised schema.
      const legacy = pool
        ? (await pool.query("SELECT to_regclass('public.arcade_state') AS name")).rows[0].name
        : db.prepare("SELECT name FROM sqlite_master WHERE name='arcade_state'").get();
      const row = legacy
        ? pool
          ? (await pool.query('SELECT body FROM arcade_state WHERE id=1')).rows[0]
          : db.prepare('SELECT body FROM arcade_state WHERE id=1').get()
        : null;
      cached = row ? (typeof row.body === 'string' ? JSON.parse(row.body) : row.body) : initial;
      if (cached.schemaVersion !== initial.schemaVersion)
        throw Error(
          'Unrecognised database schema. Select a compatible database; no data was deleted.',
        );
    }
    upgradeGuestEvent(cached);
    // One immutable recovery copy, outside the hot application state. A crash
    // before migration commits leaves the source and this copy recoverable.
    if (pool)
      await pool.query(
        'CREATE TABLE IF NOT EXISTS arcade_backups (id text PRIMARY KEY, created bigint NOT NULL, body jsonb NOT NULL)',
      );
    else
      db.exec(
        'CREATE TABLE IF NOT EXISTS arcade_backups (id TEXT PRIMARY KEY, created INTEGER NOT NULL, body TEXT NOT NULL)',
      );
    if (loaded.length && cached.config.interfaceVersion !== '1.3.0') {
      const id = `pre-v1.3.0:${cached.eventId}`;
      const body = JSON.stringify(cached);
      if (pool)
        await pool.query(
          'INSERT INTO arcade_backups(id,created,body) VALUES($1,$2,$3::jsonb) ON CONFLICT(id) DO NOTHING',
          [id, Date.now(), body],
        );
      else
        db.prepare('INSERT OR IGNORE INTO arcade_backups(id,created,body) VALUES(?,?,?)').run(
          id,
          Date.now(),
          body,
        );
    }
    // Reviews are the canonical completed-question representation from this release.
    for (const attempt of cached.attempts) if (attempt.review) delete attempt.history;
    freezeReviews(cached);
    let serialized = new Map(
      loaded.map((r) => [r.key, typeof r.body === 'string' ? r.body : JSON.stringify(r.body)]),
    );
    let tail = Promise.resolve(),
      pending = 0,
      closing = false;
    const metrics = { commits: 0, changedRecords: 0, writtenBytes: 0, stateReads: 1 };
    const versions = { data: 0 };
    async function persist(next) {
      const current = records(next, cached, serialized),
        changed = [...current].filter(([k, v]) => serialized.get(k) !== v),
        removed = [...serialized.keys()].filter((k) => !current.has(k));
      if (!changed.length && !removed.length) return false;
      const client = pool ? await pool.connect() : null;
      try {
        if (!healthy) throw unavailable('Database ownership lost. Restart after recovery.');
        if (client) {
          await client.query('BEGIN');
          if (changed.length)
            await client.query(
              'INSERT INTO arcade_records(key,body) SELECT key,body::jsonb FROM unnest($1::text[], $2::text[]) AS rows(key,body) ON CONFLICT(key) DO UPDATE SET body=excluded.body',
              [changed.map((v) => v[0]), changed.map((v) => v[1])],
            );
          if (removed.length)
            await client.query('DELETE FROM arcade_records WHERE key=ANY($1::text[])', [removed]);
          if (next.purgedAt && next.purgedAt !== cached.purgedAt)
            await client.query('DELETE FROM arcade_backups');
          await client.query('COMMIT');
        } else {
          db.exec('BEGIN IMMEDIATE');
          const put = db.prepare(
            'INSERT INTO arcade_records VALUES (?,?) ON CONFLICT(key) DO UPDATE SET body=excluded.body',
          );
          for (const [key, body] of changed) put.run(key, body);
          const del = db.prepare('DELETE FROM arcade_records WHERE key=?');
          for (const key of removed) del.run(key);
          if (next.purgedAt && next.purgedAt !== cached.purgedAt)
            db.exec('DELETE FROM arcade_backups');
          db.exec('COMMIT');
        }
      } catch (error) {
        if (client) {
          await client.query('ROLLBACK').catch(() => {});
          // A failed COMMIT response can have an ambiguous outcome. Stop all writes
          // until restart reloads the database; never overwrite it from stale RAM.
          healthy = false;
        } else db.exec('ROLLBACK');
        throw error;
      } finally {
        client?.release();
      }
      serialized = current;
      metrics.commits++;
      metrics.changedRecords += changed.length + removed.length;
      metrics.writtenBytes += changed.reduce((n, [, v]) => n + Buffer.byteLength(v), 0);
      if (
        [...changed.map((v) => v[0]), ...removed].some((k) =>
          /^(accounts|attempts|outbox|awards|updates|incidents|audit|liveResults)\//.test(k),
        )
      )
        versions.data++;
      return true;
    }
    await persist(cached);

    return {
      snapshot: () => structuredClone(cached),
      read: (fn) => fn(cached), // Internal read-only selector; never expose its references to mutators.
      metrics,
      versions,
      healthy: () => healthy && !closing && pending < maxPending,
      transact(fn, { transientOnly = false } = {}) {
        if (closing || !healthy || pending >= maxPending)
          return Promise.reject(unavailable('Service busy. Please retry shortly.'));
        pending++;
        const admitted = Date.now();
        const job = tail
          .then(async () => {
            if (!healthy || Date.now() - admitted > maxWaitMs)
              throw unavailable('Service busy. Please retry shortly.');
            const state = transientOnly
                ? { ...cached, hostLease: structuredClone(cached.hostLease) }
                : cloneState(cached),
              result = await fn(state);
            const changed = transientOnly ? false : await persist(state);
            state.revision = cached.revision + (changed ? 1 : 0);
            freezeReviews(state);
            cached = state;
            return result;
          })
          .finally(() => {
            pending--;
          });
        tail = job.catch(() => {});
        return job;
      },
      async close() {
        closing = true;
        await tail;
        if (pool) {
          if (owned) await guard.query('SELECT pg_advisory_unlock(741050)').catch(() => {});
          guard.release();
          await pool.end();
        } else {
          try {
            db.close();
          } finally {
            releaseFile();
          }
        }
      },
    };
  } catch (error) {
    db?.close();
    releaseFile();
    if (guard) {
      if (owned) await guard.query('SELECT pg_advisory_unlock(741050)').catch(() => {});
      guard.release();
    }
    await pool?.end();
    throw error;
  }
}
