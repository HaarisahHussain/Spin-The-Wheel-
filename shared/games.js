// Browser-safe catalogue. The wheel and server use the same ordering.
export const GAME_CATALOG = [
  { name: "Debug Dash", short: "DEBUG", color: "#5b2cff" },
  { name: "Robot Rescue", short: "ROBOT", color: "#10b7c9" },
  { name: "Guess The Output", short: "GUESS", color: "#ffcc33" },
];

export const GAMES = GAME_CATALOG.map((game) => game.name);

export const WHEEL_SEGMENT_CENTERS = GAMES.map(
  (_, i) => ((i + 0.5) * 360) / GAMES.length,
);

export const ROBOT_COMMAND_LABELS = {
  up: "MOVE UP",
  down: "MOVE DOWN",
  forward: "MOVE FORWARD",
  backward: "MOVE BACKWARD",
  left: "TURN LEFT",
  right: "TURN RIGHT",
};

export const MAX_PROGRAM_LENGTH = 100;
