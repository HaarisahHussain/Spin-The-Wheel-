import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { io as connect } from "socket.io-client";
import { attachArcade } from "../server/socket/index.js";

function nextMessage(socket, event, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(event, listener);
      reject(new Error(`Timed out: ${event}`));
    }, 7000);
    function listener(value) {
      if (!predicate(value)) return;
      clearTimeout(timeout);
      socket.off(event, listener);
      resolve(value);
    }
    socket.on(event, listener);
  });
}

test("real sockets: join, spin, start, reject malformed packets, disconnect active player", async (t) => {
  const http = createServer();
  const io = new Server(http);
  const arcade = attachArcade(io, { publicOrigin: "http://localhost" });
  await new Promise((resolve) => http.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${http.address().port}`;
  const clients = [];
  t.after(async () => {
    clients.forEach((socket) => socket.disconnect());
    arcade.dispose();
    await new Promise((resolve) => io.close(resolve));
  });
  async function client() {
    const socket = connect(url, {
      transports: ["websocket"],
      reconnection: false,
    });
    clients.push(socket);
    await nextMessage(socket, "connect");
    return socket;
  }
  const host = await client();
  const created = await host.emitWithAck("monitor:create-session", {});
  assert.ok(created.ok);
  const player = await client();
  assert.ok(
    (await player.emitWithAck("player:join", { sessionId: created.sessionId }))
      .ok,
  );
  assert.equal(
    (await player.emitWithAck("monitor:create-session", {})).ok,
    false,
  );
  player.emit("player:event", null);
  player.emit("player:event", { type: "FORM_SUBMITTED", payload: null });
  player.emit("player:event", {
    type: "FORM_SUBMITTED",
    payload: { name: "Test", study: "CS" },
  });
  player.emit("player:event", { type: "SHOW_WHEEL" });
  const finishedSpin = nextMessage(
    player,
    "session:command",
    (message) => message.type === "SPIN_COMPLETE",
  );
  player.emit("player:event", { type: "SPIN_REQUEST" });
  await finishedSpin;
  const started = nextMessage(
    player,
    "session:command",
    (message) => message.type === "START_GAME",
  );
  player.emit("player:event", {
    type: "JOINED_QUEUE",
    payload: { mode: "Single Player" },
  });
  await started;
  const session = arcade.sessions.get(created.sessionId);
  assert.equal(session.state, "PLAYING");
  const disconnected = nextMessage(
    host,
    "session:state",
    (state) => !state.activeGroup && state.publicPhase.type === "RESULTS",
  );
  player.disconnect();
  await disconnected;
  assert.equal(session.players.size, 0);
  assert.equal(session.gameTimer, null);
});
