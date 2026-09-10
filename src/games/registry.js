import DebugPlayer from "./debug-dash/Player.jsx";
import DebugMonitor from "./debug-dash/Monitor.jsx";
import RobotPlayer from "./robot-rescue/Player.jsx";
import RobotMonitor from "./robot-rescue/Monitor.jsx";
import GuessPlayer from "./guess-output/Player.jsx";
import GuessMonitor from "./guess-output/Monitor.jsx";

export const GAME_VIEWS = {
  "Debug Dash": { Player: DebugPlayer, Monitor: DebugMonitor },
  "Robot Rescue": { Player: RobotPlayer, Monitor: RobotMonitor },
  "Guess The Output": { Player: GuessPlayer, Monitor: GuessMonitor },
};
