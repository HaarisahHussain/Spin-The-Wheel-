import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io as connect } from 'socket.io-client';
import { initialState } from '../server/state.js';
import { createStorage } from '../server/storage.js';
import { createApp } from '../server/app.js';
import { createMail } from '../server/mail.js';
import { secret, issueSession } from '../server/security.js';
test('HTTP cookies, public display isolation, hostile origins and 50 real sockets', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'arcade-http-'));
  const origin = 'http://localhost:3199',
    state = initialState();
  state.config.requireVerification = false;
  state.staff.h = { id: 'h', role: 'admin', username: 'host' };
  const hostToken = issueSession(state, { staffId: 'h' }, Date.now());
  const storage = await createStorage({
    filename: join(directory, 'state.sqlite'),
    initial: state,
  });
  const server = createApp({
    storage,
    mail: createMail({ key: secret(), origin, preview: true }),
    origin,
  });
  await new Promise((resolve) => server.http.listen(3199, '127.0.0.1', resolve));
  const sockets = [];
  try {
    const hostile = await fetch(`${origin}/api/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.invalid' },
      body: JSON.stringify({
        action: 'register',
        id: crypto.randomUUID(),
        payload: { email: 'x@bcu.ac.uk' },
      }),
    });
    assert.equal(hostile.status, 403);
    const response = await fetch(`${origin}/api/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({
        action: 'register',
        id: crypto.randomUUID(),
        payload: { email: 'x@bcu.ac.uk', course: 'Computing', level: 'Year 1' },
      }),
    });
    assert.equal(response.status, 200);
    assert(response.headers.get('set-cookie').includes('HttpOnly'));
    const cookie = response.headers.get('set-cookie').split(';')[0];
    const account = await (
      await fetch(`${origin}/api/state`, { headers: { Cookie: cookie } })
    ).json();
    assert.equal(account.me.email, 'x@bcu.ac.uk');
    const display = await (
      await fetch(`${origin}/api/state?audience=display`, {
        headers: { Cookie: `arcade_session=${hostToken}` },
      })
    ).json();
    assert.equal(display.host, undefined);
    assert.equal(display.staff, undefined);
    const states = await Promise.all(
      Array.from(
        { length: 50 },
        () =>
          new Promise((resolve, reject) => {
            const socket = connect(origin, {
              transports: ['websocket'],
              extraHeaders: { Origin: origin, Cookie: `arcade_session=${hostToken}` },
              auth: { audience: 'display' },
              timeout: 5000,
            });
            sockets.push(socket);
            socket.once('state', resolve);
            socket.once('connect_error', reject);
          }),
      ),
    );
    assert.equal(states.length, 50);
    assert(states.every((s) => !s.host && !s.staff));
  } finally {
    sockets.forEach((socket) => socket.disconnect());
    await server.close();
    await rm(directory, { recursive: true });
  }
});
