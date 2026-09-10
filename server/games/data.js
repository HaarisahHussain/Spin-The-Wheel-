import { generateDebugLevels } from "./debug-dash/levels.js";
import { generateGuessLevels } from "./guess-output/levels.js";
import { generateRobotLevels } from "./robot-rescue/levels.js";
export function makeGameData(game, players) {
  const scores = Object.fromEntries(players.map((p) => [p.id, 0]));
  if (game === "Debug Dash") {
    const levels = generateDebugLevels();
    return {
      game,
      mode: "",
      startedAt: null,
      status: "READY",
      level: 1,
      timeLimit: 25,
      targetLine: levels[0].targetLine,
      code: levels[0].code,
      message: levels[0].message,
      debugLevels: levels,
      scores,
      completed: false,
    };
  }
  if (game === "Robot Rescue") {
    const levels = generateRobotLevels();
    return {
      game,
      mode: "",
      startedAt: null,
      status: "READY",
      level: 1,
      timeLimit: 35,
      robot: 0,
      row: 0,
      col: 0,
      orientation: 1,
      path: [0],
      commands: [],
      program: [],
      robotLevels: levels,
      obstacles: levels[0].obstacles,
      message: levels[0].message,
      executing: false,
      runIndex: 0,
      scores,
      completed: false,
    };
  }
  if (game !== "Guess The Output") throw new Error(`Unknown game: ${game}`);
  const levels = generateGuessLevels();
  return {
    game,
    mode: "",
    startedAt: null,
    status: "READY",
    level: 1,
    timeLimit: 25,
    question: levels[0].question,
    options: levels[0].options,
    correctAnswer: levels[0].correctAnswer,
    guessLevels: levels,
    selected: null,
    buzzedBy: null,
    scores,
    message: "Buzz first, then answer",
    completed: false,
  };
}

export function robotLevel(level, data = null) {
  if (data?.robotLevels?.[level - 1]) return data.robotLevels[level - 1];
  return { obstacles: [], message: "Reach the finish." };
}
export function guessLevel(level, data = null) {
  if (data?.guessLevels?.[level - 1]) return data.guessLevels[level - 1];
  return null;
}
export function debugLevel(level, data = null) {
  if (data?.debugLevels?.[level - 1]) return data.debugLevels[level - 1];
  return null;
}
