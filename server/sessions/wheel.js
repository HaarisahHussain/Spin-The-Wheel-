import { GAMES, WHEEL_SEGMENT_CENTERS } from "../../shared/games.js";
import { SPIN_DURATION } from "../config.js";
import { shuffle } from "../games/random.js";
import { schedule } from "./timers.js";

export function spinWheel(session, player, socket, broadcastState) {
  if (player.status !== "READY_TO_SPIN") return;
  // Each player owns their own wheel. Multiple players can therefore spin
  // at the same time without one player's animation/result cancelling or
  // replacing another player's spin.
  const currentWheel = session.wheelByPlayer?.get(player.id);
  if (currentWheel?.active) return;

  // Use the shared shuffled bag for fair game distribution, but keep the
  // animation/rotation/state completely independent per player.
  if (!Array.isArray(session.wheelBag) || session.wheelBag.length === 0) {
    session.wheelBag = shuffle(GAMES);
    if (
      session.lastWheelGame &&
      session.wheelBag.length > 1 &&
      session.wheelBag[0] === session.lastWheelGame
    ) {
      [session.wheelBag[0], session.wheelBag[1]] = [
        session.wheelBag[1],
        session.wheelBag[0],
      ];
    }
  }
  const chosen = session.wheelBag.shift();
  session.lastWheelGame = chosen;
  const chosenIndex = GAMES.indexOf(chosen);
  const startRotation = currentWheel
    ? currentWheel.startRotation + (currentWheel.delta || 0)
    : 0;
  const centre = WHEEL_SEGMENT_CENTERS[chosenIndex];

  // CSS conic-gradient starts at 12 o'clock and the pointer is at 12.
  const landing = (360 - centre - (startRotation % 360) + 360) % 360;
  const delta = 5 * 360 + landing;
  const wheel = {
    active: true,
    playerId: player.id,
    playerName: player.name || "Player",
    result: chosen,
    startRotation,
    delta,
    duration: SPIN_DURATION,
    startedAt: Date.now(),
  };

  session.wheelByPlayer.set(player.id, wheel);
  // Keep the legacy public wheel as the most recently started spin for
  // the public monitor, while the phone always reads its own wheel.
  session.wheel = wheel;
  if (!session.activeGroup && session.publicPhase?.type !== "RESULTS")
    session.state = "SPINNING";
  if (!session.activeGroup && session.publicPhase?.type !== "RESULTS")
    session.publicPhase = {
      type: "WHEEL",
      playerId: player.id,
      playerName: player.name || "Player",
      startedAt: wheel.startedAt,
    };
  player.status = "SPINNING";
  socket.emit("session:command", { type: "SPIN_STARTED", payload: wheel });
  broadcastState(session);

  schedule(
    session,
    () => {
      const ownWheel = session.wheelByPlayer?.get(player.id);
      if (!ownWheel || ownWheel.startedAt !== wheel.startedAt) return;

      player.game = chosen;
      player.status = "GAME_SELECTED";

      const finishedWheel = {
        ...ownWheel,
        active: false,
        finishedAt: Date.now(),
      };
      session.wheelByPlayer.set(player.id, finishedWheel);
      if (session.wheel?.playerId === player.id) session.wheel = finishedWheel;

      if (!session.activeGroup && session.publicPhase?.type !== "RESULTS")
        session.state = "LOADING_GAMES";
      if (!session.activeGroup && session.publicPhase?.type !== "RESULTS")
        session.publicPhase = {
          type: "LOADING_GAMES",
          game: chosen,
          playerId: player.id,
          playerName: player.name || "Player",
          startedAt: Date.now(),
        };
      socket.emit("session:command", {
        type: "SPIN_COMPLETE",
        payload: {
          game: chosen,
          rotation: finishedWheel.startRotation + finishedWheel.delta,
        },
      });
      broadcastState(session);
    },
    SPIN_DURATION,
  );
  return;
}
