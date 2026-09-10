import { createPlayer } from "../sessions/player.js";
import { randomBytes } from "node:crypto";
import { publicState } from "../sessions/selectors.js";

export function registerJoinHandlers(
  socket,
  { sessions, getSession, engine, publicOrigin },
) {
  const { broadcastState } = engine;
  socket.on("monitor:create-session", (_, ack) => {
    if (socket.data.sessionId)
      return ack?.({ ok: false, error: "Already joined a session." });
    let sessionId = randomBytes(4).toString("hex").toUpperCase();
    while (sessions.has(sessionId))
      sessionId = randomBytes(4).toString("hex").toUpperCase();
    const session = {
      sessionId,
      hostSocketId: socket.id,
      players: new Map(),
      queue: [],
      activeGroup: null,
      state: "WAITING",
      wheel: null,
      wheelByPlayer: new Map(),
      gameData: null,
      gameDataByPlayer: null,
      publicPhase: { type: "FILLING_FORMS", startedAt: Date.now() },
      gameTimer: null,
      timers: new Set(),
      touchedAt: Date.now(),
      wheelBag: [],
      lastWheelGame: null,
    };
    sessions.set(sessionId, session);
    socket.join(sessionId);
    socket.data.role = "host";
    socket.data.sessionId = sessionId;
    ack?.({
      ok: true,
      sessionId,
      mobileUrl: `${publicOrigin}/?view=mobile&session=${sessionId}`,
      monitorUrl: `${publicOrigin}/?view=monitor&session=${sessionId}`,
    });
    broadcastState(session);
  });

  socket.on("monitor:join", ({ sessionId } = {}, ack) => {
    if (socket.data.sessionId)
      return ack?.({ ok: false, error: "Already joined a session." });
    const session = getSession(sessionId);
    if (!session) return ack?.({ ok: false, error: "Session not found." });
    socket.join(session.sessionId);
    socket.data.role = "monitor";
    socket.data.sessionId = session.sessionId;
    ack?.({ ok: true, state: publicState(session) });
  });

  socket.on("player:join", ({ sessionId } = {}, ack) => {
    if (socket.data.sessionId)
      return ack?.({ ok: false, error: "Already joined a session." });
    const session = getSession(sessionId);
    if (!session)
      return ack?.({
        ok: false,
        error: "Session not found. Please scan a fresh QR code.",
      });
    socket.join(session.sessionId);
    socket.data.role = "player";
    socket.data.sessionId = session.sessionId;
    socket.data.playerId = socket.id;
    session.players.set(socket.id, createPlayer(socket.id));
    ack?.({ ok: true, sessionId: session.sessionId, playerId: socket.id });
    broadcastState(session);
  });
}
