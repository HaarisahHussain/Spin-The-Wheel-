import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// One event aggregate is deliberately serialized. Run one application process;
// PostgreSQL's row lock also fences overlapping processes during restarts.
export async function createStorage({ url, filename = './data/arcade.sqlite', initial }) {
  let db, pool;
  if (url) {
    const { Pool } = await import('pg');
    pool = new Pool({ connectionString: url, max: 4 });
    await pool.query(
      'CREATE TABLE IF NOT EXISTS arcade_state (id integer PRIMARY KEY CHECK (id = 1), body jsonb NOT NULL)',
    );
    await pool.query('INSERT INTO arcade_state VALUES (1, $1) ON CONFLICT DO NOTHING', [
      JSON.stringify(initial),
    ]);
  } else {
    const { DatabaseSync } = await import('node:sqlite');
    mkdirSync(dirname(filename), { recursive: true });
    db = new DatabaseSync(filename);
    db.exec(
      'PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS arcade_state (id INTEGER PRIMARY KEY CHECK (id=1), body TEXT NOT NULL)',
    );
    db.prepare('INSERT OR IGNORE INTO arcade_state VALUES (1, ?)').run(JSON.stringify(initial));
  }
  let cached = pool
    ? (await pool.query('SELECT body FROM arcade_state WHERE id=1')).rows[0].body
    : JSON.parse(db.prepare('SELECT body FROM arcade_state WHERE id=1').get().body);
  let tail = Promise.resolve();
  return {
    snapshot: () => structuredClone(cached),
    transact(fn) {
      const job = tail.then(async () => {
        const client = pool ? await pool.connect() : null;
        try {
          if (client) await client.query('BEGIN');
          else db.exec('BEGIN IMMEDIATE');
          const state = client
            ? (await client.query('SELECT body FROM arcade_state WHERE id=1 FOR UPDATE')).rows[0]
                .body
            : JSON.parse(db.prepare('SELECT body FROM arcade_state WHERE id=1').get().body);
          const result = await fn(state);
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
      if (pool) await pool.end();
      else db.close();
    },
  };
}
