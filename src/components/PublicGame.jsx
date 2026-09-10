import { GAME_VIEWS } from "../games/registry.js";

export default function PublicGame({ game, ...props }) {
  const Monitor = GAME_VIEWS[game]?.Monitor;
  return Monitor ? <Monitor {...props} /> : <p>Game unavailable.</p>;
}
