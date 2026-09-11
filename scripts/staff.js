import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import * as OTPAuth from 'otpauth';
import { createStorage } from '../server/storage.js';
import { initialState } from '../server/state.js';
import { passwordHash, totp } from '../server/security.js';
const input = createInterface({ input: stdin, output: stdout });
const username = process.env.STAFF_USERNAME || (await input.question('Username: '));
const password =
  process.env.STAFF_PASSWORD ||
  (await input.question('Password (visible here; prefer STAFF_PASSWORD environment variable): '));
if (password.length < 15) throw Error('Use at least 15 characters.');
const role = process.env.STAFF_ROLE || 'admin';
if (!['admin', 'host', 'adjudicator'].includes(role)) throw Error('Invalid role.');
const seed = new OTPAuth.Secret({ size: 20 }).base32;
const store = await createStorage({
  url: process.env.DATABASE_URL,
  filename: process.env.SQLITE_PATH || 'data/arcade.sqlite',
  initial: initialState(),
});
await store.transact((s) => {
  if (Object.values(s.staff).some((u) => u.username === username)) throw Error('Username exists.');
  const id = crypto.randomUUID();
  s.staff[id] = { id, username, role, password: passwordHash(password), totpSecret: seed };
});
console.log('Add this account to your authenticator app. Store the secret securely.');
console.log(totp(seed).toString());
await store.close();
input.close();
