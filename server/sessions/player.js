export function createPlayer(id) {
  return {
    id,
    name: "",
    study: "",
    interests: [],
    mode: "Single Player",
    game: "",
    status: "CONNECTED",
  };
}
export function resetPlayer(player) {
  Object.assign(player, createPlayer(player.id));
}
