import { GAME_VIEWS } from "../games/registry.js";

export default function LiveGame({ game, ...props }) {
  const Player = GAME_VIEWS[game]?.Player;
  if (!props.data) return <p>Waiting for game…</p>;
  return Player ? <Player {...props} /> : <p>Game unavailable.</p>;
}
