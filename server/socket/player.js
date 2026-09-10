import { resetPlayer } from "../sessions/player.js";
import { spinWheel } from "../sessions/wheel.js";
import { GAMES } from "../../shared/games.js";
import { GAME_HANDLERS } from "../games/registry.js";

export function registerPlayerHandlers(socket, { getSession, engine }) {
  const { broadcastState, startNextGroup } = engine;
  socket.on("player:event", ({ type, payload = {} } = {}) => {
    const session = getSession(socket.data.sessionId);
    const player = session?.players.get(socket.data.playerId);
    if (!session || !player || socket.data.role !== "player") return;
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
      return;

    if (type === "FORM_SUBMITTED") {
      if (player.status !== "CONNECTED") return;
      if (typeof payload.name !== "string" || typeof payload.study !== "string")
        return;
      player.name = payload.name.trim().slice(0, 80);
      player.study = payload.study.trim().slice(0, 120);
      if (!player.name || !player.study) return;
      player.interests = Array.isArray(payload.interests)
        ? payload.interests.filter((i) =>
            ["Socialising", "Hobbyist", "Learning"].includes(i),
          )
        : [];
      player.status = "FORM_FILLED";
      // Once a player has submitted the form, the public flow moves to the wheel.
      // Never return the monitor to the form-filling screen for this player.
      if (!session.activeGroup && session.publicPhase?.type !== "RESULTS")
        session.publicPhase = {
          type: "WHEEL_READY",
          playerId: player.id,
          playerName: player.name,
          startedAt: Date.now(),
        };
      broadcastState(session);
      return;
    }

    if (type === "SHOW_WHEEL") {
      if (!["FORM_FILLED", "FINISHED"].includes(player.status)) return;
      if (!session.activeGroup && session.publicPhase?.type !== "RESULTS")
        session.publicPhase = {
          type: "WHEEL_READY",
          playerId: player.id,
          playerName: player.name || "Player",
          startedAt: Date.now(),
        };
      player.status = "READY_TO_SPIN";
      broadcastState(session);
      return;
    }

    if (type === "SPIN_REQUEST") {
      spinWheel(session, player, socket, broadcastState);
      return;
    }

    if (type === "JOINED_QUEUE") {
      if (player.status !== "GAME_SELECTED" || !GAMES.includes(player.game))
        return;
      if (!["Single Player", "Multiplayer"].includes(payload.mode)) return;
      player.mode = payload.mode || "Single Player";
      player.status = "QUEUED";
      if (!session.queue.includes(player.id)) session.queue.push(player.id);
      broadcastState(session);
      // Single-player can begin automatically. Multiplayer is host-controlled.
      if (player.mode === "Single Player") startNextGroup(session);
      return;
    }

    if (type === "GAME_EVENT") {
      if (!session.activeGroup?.players.some((p) => p.id === player.id)) return;
      const data = session.gameDataByPlayer?.get(player.id);
      if (
        !data ||
        data.completed ||
        session.state !== "PLAYING" ||
        Date.now() >= data.deadlineAt
      )
        return;

      GAME_HANDLERS[data.game]?.({ session, player, data, payload, engine });
      if (!session.activeGroup && session.publicPhase?.type !== "RESULTS")
        return;
      broadcastState(session);
      return;
    }

    if (type === "RESET_PLAYER") {
      if (session.activeGroup?.players.some((p) => p.id === player.id)) return;
      session.queue = session.queue.filter((id) => id !== player.id);
      session.wheelByPlayer.delete(player.id);
      if (session.wheel?.playerId === player.id) session.wheel = null;
      resetPlayer(player);
      if (!session.activeGroup && session.publicPhase?.type !== "RESULTS")
        session.publicPhase = { type: "FILLING_FORMS", startedAt: Date.now() };
      broadcastState(session);
      return;
    }
  });
}
