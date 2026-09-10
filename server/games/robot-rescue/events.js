import { robotLevel } from "../data.js";
import { schedule } from "../../sessions/timers.js";
import {
  ROBOT_COMMAND_LABELS,
  MAX_PROGRAM_LENGTH,
} from "../../../shared/games.js";

export function handleEvent({ session, player, data, payload, engine }) {
  const { finishActiveGroup, collectScores, broadcastState } = engine;

  if (payload.action === "ROBOT_PROGRAM") {
    if (data.executing) return;
    const allowed = Object.keys(ROBOT_COMMAND_LABELS);
    data.program = Array.isArray(payload.commands)
      ? payload.commands
          .slice(0, MAX_PROGRAM_LENGTH)
          .filter((c) => allowed.includes(c))
      : [];
    data.commands = [...data.program];
    data.status = "PROGRAMMED";
  }

  if (payload.action === "ROBOT_RUN") {
    if (data.executing || data.completed || !data.program?.length) return;
    data.executing = true;
    data.status = "RUNNING";
    data.runIndex = 0;
    const activePlayer = player.id;
    const run = () => {
      if (
        !session.activeGroup ||
        !session.gameDataByPlayer?.get(activePlayer) ||
        session.gameDataByPlayer.get(activePlayer) !== data ||
        data.completed
      )
        return;
      const command = data.program[data.runIndex];
      if (!command) {
        data.executing = false;
        data.status = "READY";
        // A program is a one-shot run. Clear it after execution so the next
        // program the player builds cannot accidentally replay the previous run.
        data.program = [];
        data.commands = [];
        data.runIndex = 0;
        broadcastState(session);
        return;
      }
      data.commands = data.program.slice(0, data.runIndex + 1);
      if (command === "left") data.orientation = (data.orientation + 3) % 4;
      if (command === "right") data.orientation = (data.orientation + 1) % 4;
      if (["up", "down", "forward", "backward"].includes(command)) {
        const deltas = [
          [-1, 0],
          [0, 1],
          [1, 0],
          [0, -1],
        ];
        let direction;
        if (command === "up") direction = 0;
        else if (command === "down") direction = 2;
        else
          direction =
            command === "backward"
              ? (data.orientation + 2) % 4
              : data.orientation;
        const [dr, dc] = deltas[direction];
        const nr = data.row + dr,
          nc = data.col + dc;
        const obstacles = robotLevel(data.level, data).obstacles;
        const blocked =
          nr < 0 ||
          nr > 4 ||
          nc < 0 ||
          nc > 4 ||
          obstacles.includes(nr * 5 + nc);
        if (!blocked) {
          data.row = nr;
          data.col = nc;
          data.robot = nr * 5 + nc;
          data.path = [...new Set([...(data.path || []), data.robot])];
        }
      }
      data.runIndex += 1;

      if (data.robot === 24) {
        data.executing = false;
        data.scores[activePlayer] =
          (data.scores[activePlayer] || 0) + data.level * 125;
        if (data.level >= 4) {
          data.completed = true;
          data.status = "SUCCESS";
          finishActiveGroup(session, {
            score: data.scores[activePlayer],
            scores: data.scores,
            reason: "COMPLETED",
          });
          return;
        }
        data.level += 1;
        const next = robotLevel(data.level, data);
        if (!next) {
          data.completed = true;
          data.status = "SUCCESS";
          finishActiveGroup(session, {
            score: data.scores[activePlayer],
            scores: collectScores(session),
            reason: "COMPLETED",
          });
          return;
        }
        data.robot = 0;
        data.row = 0;
        data.col = 0;
        data.orientation = 1;
        data.path = [0];
        data.program = [];
        data.commands = [];
        data.runIndex = 0;
        data.status = "READY";
        data.obstacles = next.obstacles;
        data.message = next.message;
        broadcastState(session);
        return;
      }
      broadcastState(session);
      schedule(session, run, 450);
    };
    run();
  }
}
