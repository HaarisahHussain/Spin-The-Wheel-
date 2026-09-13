import { acquireInstance } from '../server/instance-lock.js';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { resolve } from 'node:path';
import { unlinkSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL)
  throw Error(
    'Development reset accepts a local SQLite test database only. No PostgreSQL or production resets.',
  );
const target = resolve(process.env.SQLITE_PATH || 'data/arcade.sqlite');
mkdirSync(dirname(target), { recursive: true });
const release = acquireInstance(target);
try {
  const input = createInterface({ input: process.stdin, output: process.stdout });
  const reply = await input.question(
    `This deletes test accounts and results in ${target}. Type RESET TEST DATA: `,
  );
  input.close();
  if (reply !== 'RESET TEST DATA') throw Error('Cancelled.');
  for (const suffix of ['', '-wal', '-shm'])
    if (existsSync(target + suffix)) unlinkSync(target + suffix);
  console.log('Test database removed. Restart Arcade to initialise a clean event.');
} finally {
  release();
}
