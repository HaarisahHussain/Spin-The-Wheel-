import { mkdirSync } from 'node:fs';
import { acquireInstance } from './instance-lock.js';
import { dirname } from 'node:path';

// One event aggregate is deliberately serialized. Run one application process;
// PostgreSQL's row lock also fences overlapping processes during restarts.
export async function createStorage({ url, filename = './data/arcade.sqlite', initial }) {
  let db, pool, guard;
  let ownershipHealthy = true,
    releaseFile = () => {},
    guardOwned = false;
  try {
    if (url) {
      const { Pool } = await import('pg');
      pool = new Pool({ connectionString: url, max: 4 });
      guard = await pool.connect();
      guard.on('error', () => {
        ownershipHealthy = false;
      });
      guard.on('end', () => {
        ownershipHealthy = false;
      });
      const claim = await guard.query('SELECT pg_try_advisory_lock(741050) AS owned');
      if (!claim.rows[0].owned) {
        throw Error('Another Arcade server already owns this database. Stop it first.');
      }
      guardOwned = true;
      await pool.query(
        'CREATE TABLE IF NOT EXISTS arcade_state (id integer PRIMARY KEY CHECK (id = 1), body jsonb NOT NULL)',
      );
      await pool.query('INSERT INTO arcade_state VALUES (1, $1) ON CONFLICT DO NOTHING', [
        JSON.stringify(initial),
      ]);
    } else {
      const { DatabaseSync } = await import('node:sqlite');
      mkdirSync(dirname(filename), { recursive: true });
      if (filename !== ':memory:') releaseFile = acquireInstance(filename);
      db = new DatabaseSync(filename);
      db.exec(
        'PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS arcade_state (id INTEGER PRIMARY KEY CHECK (id=1), body TEXT NOT NULL)',
      );
      db.prepare('INSERT OR IGNORE INTO arcade_state VALUES (1, ?)').run(JSON.stringify(initial));
    }
    let cached = pool
      ? (await pool.query('SELECT body FROM arcade_state WHERE id=1')).rows[0].body
      : JSON.parse(db.prepare('SELECT body FROM arcade_state WHERE id=1').get().body);
    if (pool)
      await pool.query(
        'CREATE TABLE IF NOT EXISTS arcade_emails (email text PRIMARY KEY, account_id text UNIQUE NOT NULL)',
      );
    else
      db.exec(
        'CREATE TABLE IF NOT EXISTS arcade_emails (email TEXT PRIMARY KEY, account_id TEXT UNIQUE NOT NULL)',
      );
    for (const a of Object.values(cached.accounts)) {
      if (pool)
        await pool.query(
          'INSERT INTO arcade_emails(email,account_id) VALUES ($1,$2) ON CONFLICT (account_id) DO NOTHING',
          [a.email, a.id],
        );
      else
        db.prepare(
          'INSERT INTO arcade_emails(email,account_id) VALUES (?,?) ON CONFLICT(account_id) DO NOTHING',
        ).run(a.email, a.id);
    }
    let tail = Promise.resolve();
    return {
      snapshot: () => structuredClone(cached),
      transact(fn) {
        const job = tail.then(async () => {
          if (!ownershipHealthy) throw Error('Database ownership lost. Restart after recovery.');
          const client = pool ? await pool.connect() : null;
          try {
            if (client) await client.query('BEGIN');
            else db.exec('BEGIN IMMEDIATE');
            const state = client
              ? (await client.query('SELECT body FROM arcade_state WHERE id=1 FOR UPDATE')).rows[0]
                  .body
              : JSON.parse(db.prepare('SELECT body FROM arcade_state WHERE id=1').get().body);
            const previousEmails = new Map(
              Object.values(state.accounts).map((a) => [a.id, a.email]),
            );
            const result = await fn(state);
            const currentEmails = new Map(
              Object.values(state.accounts).map((a) => [a.id, a.email]),
            );
            for (const [id, email] of previousEmails)
              if (currentEmails.get(id) !== email) {
                if (client)
                  await client.query('DELETE FROM arcade_emails WHERE account_id=$1', [id]);
                else db.prepare('DELETE FROM arcade_emails WHERE account_id=?').run(id);
              }
            for (const [id, email] of currentEmails)
              if (previousEmails.get(id) !== email) {
                if (client)
                  await client.query('INSERT INTO arcade_emails(email,account_id) VALUES ($1,$2)', [
                    email,
                    id,
                  ]);
                else
                  db.prepare('INSERT INTO arcade_emails(email,account_id) VALUES (?,?)').run(
                    email,
                    id,
                  );
              }
            state.revision++;
            if (client) {
              await client.query('UPDATE arcade_state SET body=$1 WHERE id=1', [
                JSON.stringify(state),
              ]);
              await client.query('COMMIT');
            } else {
              db.prepare('UPDATE arcade_state SET body=? WHERE id=1').run(JSON.stringify(state));
              db.exec('COMMIT');
            }
            cached = state;
            return result;
          } catch (error) {
            if (client) await client.query('ROLLBACK').catch(() => {});
            else db.exec('ROLLBACK');
            throw error;
          } finally {
            client?.release();
          }
        });
        tail = job.catch(() => {});
        return job;
      },
      async close() {
        await tail;
        if (pool) {
          if (guardOwned) await guard.query('SELECT pg_advisory_unlock(741050)').catch(() => {});
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
    try {
      db?.close();
    } finally {
      releaseFile();
      if (guard) {
        if (guardOwned) await guard.query('SELECT pg_advisory_unlock(741050)').catch(() => {});
        guard.release();
      }
      await pool?.end();
    }
    throw error;
  }
}
