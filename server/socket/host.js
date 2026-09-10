import { resetPlayer } from "../sessions/player.js";
import { findNextReadyGroup } from "../sessions/selectors.js";
import { clearTimers } from "../sessions/timers.js";

export function registerHostHandlers(socket, { io, getSession, engine }) {
  const { broadcastState, startNextGroup, collectScores, finishActiveGroup } =
    engine;
  socket.on("host:event", ({ type, payload = {} } = {}, ack) => {
    const session = getSession(socket.data.sessionId);
    if (
      !session ||
      socket.data.role !== "host" ||
      session.hostSocketId !== socket.id
    ) {
      return ack?.({
        ok: false,
        error: "Host controls are only available on the Host Control screen.",
      });
    }

    if (type === "START_MULTIPLAYER") {
      if (session.activeGroup)
        return ack?.({ ok: false, error: "A game is already running." });
      const key = payload.key;
      const group = findNextReadyGroup(session, key);
      if (!group || group.mode !== "Multiplayer")
        return ack?.({
          ok: false,
          error:
            "That multiplayer group is not ready. You need at least 2 players.",
        });
      startNextGroup(session, false, key);
      ack?.({ ok: true });
      return;
    }

    if (type === "END_MULTIPLAYER") {
      if (!session.activeGroup || session.activeGroup.mode !== "Multiplayer")
        return ack?.({
          ok: false,
          error: "No multiplayer game is currently running.",
        });
      finishActiveGroup(session, {
        scores: collectScores(session),
        reason: "HOST_ENDED",
      });
      ack?.({ ok: true });
      return;
    }

    if (type === "RESET_SERVER") {
      clearTimers(session);
      session.wheelByPlayer.clear();
      const oldPlayers = [...session.players.values()];
      session.queue = [];
      session.activeGroup = null;
      session.gameData = null;
      session.gameDataByPlayer = null;
      session.wheel = null;
      session.wheelBag = [];
      session.lastWheelGame = null;
      session.state = "WAITING";
      session.publicPhase = { type: "FILLING_FORMS", startedAt: Date.now() };
      for (const p of oldPlayers) {
        resetPlayer(p);
        io.to(p.id).emit("session:command", { type: "SERVER_RESET" });
      }
      broadcastState(session);
      ack?.({ ok: true });
      return;
    }
    ack?.({ ok: false, error: "Unknown host action." });
  });
}
