import { handleEvent as debugDash } from "./debug-dash/events.js";
import { handleEvent as robotRescue } from "./robot-rescue/events.js";
import { handleEvent as guessOutput } from "./guess-output/events.js";
export const GAME_HANDLERS = {
  "Debug Dash": debugDash,
  "Robot Rescue": robotRescue,
  "Guess The Output": guessOutput,
};
