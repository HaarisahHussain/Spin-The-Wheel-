import { createSessionEngine } from "../sessions/engine.js";
import { clearTimers } from "../sessions/timers.js";
import { SESSION_IDLE_MS } from "../config.js";
import { registerJoinHandlers } from "./join.js";
import { registerHostHandlers } from "./host.js";
import { registerPlayerHandlers } from "./player.js";

export function attachArcade(io, { publicOrigin }) {
  const sessions = new Map();
  const engine = createSessionEngine(io);
  const getSession = (id) => {
    const session = sessions.get(String(id || "").toUpperCase());
    if (session) session.touchedAt = Date.now();
    return session;
  };
  const sweep = setInterval(() => {
    for (const [id, session] of sessions) {
      if (
        !io.sockets.adapter.rooms.get(id)?.size &&
        Date.now() - session.touchedAt > SESSION_IDLE_MS
      ) {
        clearTimers(session);
        sessions.delete(id);
      }
    }
  }, 60_000);
  sweep.unref();

  io.on("connection", (socket) => {
    // Ignore malformed packets before destructuring in individual handlers.
    socket.use(([event, message, ack], next) => {
      if (ack !== undefined && typeof ack !== "function") return;
      if (
        message?.sessionId !== undefined &&
        typeof message.sessionId !== "string"
      )
        return;
      if (
        event !== "disconnect" &&
        (message === null ||
          typeof message !== "object" ||
          Array.isArray(message))
      )
        return;
      if (
        message?.payload != null &&
        (typeof message.payload !== "object" || Array.isArray(message.payload))
      )
        return;
      if (message?.payload === null) return;
      next();
    });
    const context = { io, sessions, getSession, engine, publicOrigin };
    registerJoinHandlers(socket, context);
    registerHostHandlers(socket, context);
    registerPlayerHandlers(socket, context);
    socket.on("disconnect", () => {
      const session = getSession(socket.data.sessionId);
      if (!session || socket.data.role !== "player") return;
      const id = socket.data.playerId;
      session.players.delete(id);
      session.queue = session.queue.filter((playerId) => playerId !== id);
      session.wheelByPlayer.delete(id);
      if (session.wheel?.playerId === id) session.wheel = null;
      if (session.activeGroup) {
        session.activeGroup.players = session.activeGroup.players.filter(
          (p) => p.id !== id,
        );
        session.gameDataByPlayer?.delete(id);
        if (!session.activeGroup.players.length)
          engine.finishActiveGroup(session, { reason: "DISCONNECTED" });
      }
      engine.broadcastState(session);
    });
  });
  return {
    sessions,
    dispose() {
      clearInterval(sweep);
      for (const session of sessions.values()) clearTimers(session);
      sessions.clear();
    },
  };
}
