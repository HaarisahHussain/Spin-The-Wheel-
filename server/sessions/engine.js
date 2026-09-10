import { randomUUID } from "node:crypto";
import {
  MAX_GROUP_SIZE,
  GAME_ANNOUNCEMENT_DURATION,
  RESULTS_DURATION,
} from "../config.js";
import { makeGameData } from "../games/data.js";
import { findNextReadyGroup, publicPlayer, publicState } from "./selectors.js";
import { schedule } from "./timers.js";

export function createSessionEngine(io) {
  function broadcastState(session) {
    io.to(session.sessionId).emit("session:state", publicState(session));
  }
  function clearGameTimer(session) {
    if (session.gameTimer) {
      clearTimeout(session.gameTimer);
      session.timers.delete(session.gameTimer);
      session.gameTimer = null;
    }
  }

  function startGameTimer(session, active) {
    clearGameTimer(session);
    const firstData = session.gameDataByPlayer?.get(active.players[0]?.id);
    const limit = Number(
      firstData?.timeLimit || session.gameData?.timeLimit || 30,
    );
    session.gameTimer = schedule(
      session,
      () => {
        if (!session.activeGroup || session.activeGroup.id !== active.id)
          return;
        const scores = {};
        for (const p of session.activeGroup.players) {
          const d = session.gameDataByPlayer?.get(p.id);
          if (d) {
            d.status = "TIME_UP";
            d.completed = true;
            d.timeExpired = true;
            scores[p.id] = Math.max(0, Number(d.scores?.[p.id] || 0));
          }
        }
        finishActiveGroup(session, { score: 0, scores, reason: "TIME_UP" });
      },
      limit * 1000 + 100,
    );
  }

  function startNextGroup(session, afterGame = false, requestedKey = null) {
    if (session.activeGroup) return;
    if (session.publicPhase?.type === "RESULTS" && !afterGame && !requestedKey)
      return;
    const group = findNextReadyGroup(session, requestedKey);
    if (!group) {
      session.state = session.queue.length ? "QUEUED" : "WAITING";
      // Keep the public display on the current waiting/loading phase.
      // In particular, never jump back to the form message after a wheel spin.
      if (
        afterGame ||
        !session.publicPhase ||
        session.publicPhase.type === "GAME_ANNOUNCEMENT" ||
        session.publicPhase.type === "GAME"
      ) {
        session.publicPhase = { type: "FILLING_FORMS", startedAt: Date.now() };
      }
      broadcastState(session);
      return;
    }

    const ids = group.players
      .slice(0, group.mode === "Single Player" ? 1 : MAX_GROUP_SIZE)
      .map((p) => p.playerId);
    const active = {
      id: randomUUID(),
      game: group.game,
      mode: group.mode,
      players: ids.map((id) => session.players.get(id)).filter(Boolean),
    };
    session.activeGroup = active;
    session.state = "ANNOUNCING";
    active.players.forEach((p) => {
      p.status = "STARTING";
    });
    session.queue = session.queue.filter((id) => !ids.includes(id));
    session.gameDataByPlayer = new Map(
      active.players.map((p) => {
        const d = makeGameData(active.game, [p]);
        d.mode = active.mode;
        return [p.id, d];
      }),
    );
    session.gameData =
      session.gameDataByPlayer.get(active.players[0]?.id) || null;
    session.publicPhase = {
      type: "GAME_ANNOUNCEMENT",
      game: active.game,
      mode: active.mode,
      players: active.players.map(publicPlayer),
      startedAt: Date.now(),
    };

    for (const p of active.players) {
      io.to(p.id).emit("session:command", {
        type: "GAME_ANNOUNCEMENT",
        payload: { game: active.game, mode: active.mode, groupId: active.id },
      });
    }
    broadcastState(session);

    schedule(
      session,
      () => {
        if (session.activeGroup?.id !== active.id) return;
        session.state = "PLAYING";
        active.players.forEach((p) => {
          p.status = "PLAYING";
        });
        const gameStartedAt = Date.now();
        for (const p of active.players) {
          const d = session.gameDataByPlayer.get(p.id);
          if (d) {
            d.mode = active.mode;
            d.startedAt = gameStartedAt;
            d.deadlineAt = gameStartedAt + Number(d.timeLimit || 30) * 1000;
            d.status = "PLAYING";
            d.timeLeft = d.timeLimit;
          }
        }
        session.gameData =
          session.gameDataByPlayer.get(active.players[0]?.id) || null;
        session.publicPhase = {
          type: "GAME",
          game: active.game,
          mode: active.mode,
          startedAt: gameStartedAt,
        };
        for (const p of active.players) {
          io.to(p.id).emit("session:command", {
            type: "START_GAME",
            payload: {
              game: active.game,
              mode: active.mode,
              groupId: active.id,
            },
          });
        }
        broadcastState(session);
        startGameTimer(session, active);
      },
      GAME_ANNOUNCEMENT_DURATION,
    );
  }

  function collectScores(session) {
    const scores = {};
    for (const p of session.activeGroup?.players || []) {
      const d = session.gameDataByPlayer?.get(p.id);
      scores[p.id] = Math.max(0, Number(d?.scores?.[p.id] || 0));
    }
    return scores;
  }

  function finishActiveGroup(session, scorePayload = {}) {
    if (!session.activeGroup) return;
    clearGameTimer(session);
    const finished = session.activeGroup;
    scorePayload = { ...scorePayload, scores: collectScores(session) };
    finished.players.forEach((p) => {
      p.status = "FINISHED";
    });
    const finishedPlayers = finished.players.map(publicPlayer);
    io.to(session.sessionId).emit("session:public", {
      type: "GAME_FINISHED",
      payload: {
        game: finished.game,
        mode: finished.mode,
        players: finishedPlayers,
        ...scorePayload,
      },
    });
    session.activeGroup = null;
    session.gameData = null;
    session.gameDataByPlayer = null;
    session.state = "WAITING";
    session.publicPhase = {
      type: "RESULTS",
      startedAt: Date.now(),
      finishedPlayers,
      game: finished.game,
      mode: finished.mode,
      ...scorePayload,
    };
    broadcastState(session);
    schedule(session, () => startNextGroup(session, true), RESULTS_DURATION);
  }

  return {
    broadcastState,
    clearGameTimer,
    startNextGroup,
    collectScores,
    finishActiveGroup,
  };
}
