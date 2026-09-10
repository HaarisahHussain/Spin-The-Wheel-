export function publicPlayer(p) {
  return {
    playerId: p.id,
    name: p.name || "Player",
    mode: p.mode,
    game: p.game,
    status: p.status,
  };
}
export function queueFor(session) {
  return session.queue
    .map((id) => session.players.get(id))
    .filter(Boolean)
    .map((p, i) => ({ ...publicPlayer(p), position: i + 1 }));
}
export function groupsFor(session) {
  const groups = new Map();
  for (const item of queueFor(session)) {
    const key = `${item.game}::${item.mode}`;
    if (!groups.has(key))
      groups.set(key, {
        key,
        game: item.game,
        mode: item.mode,
        players: [],
        firstPosition: item.position,
      });
    groups.get(key).players.push(item);
  }
  return [...groups.values()]
    .sort((a, b) => a.firstPosition - b.firstPosition)
    .map((g) => ({
      ...g,
      ready:
        g.mode === "Single Player"
          ? g.players.length >= 1
          : g.players.length >= 2,
    }));
}
export function publicState(session) {
  return {
    sessionId: session.sessionId,
    playersCount: session.players.size,
    queue: queueFor(session),
    groups: groupsFor(session),
    activeGroup: session.activeGroup
      ? {
          id: session.activeGroup.id,
          game: session.activeGroup.game,
          mode: session.activeGroup.mode,
          players: session.activeGroup.players.map(publicPlayer),
        }
      : null,
    state: session.state,
    publicPhase: session.publicPhase,
    wheel: session.wheel,
    wheelByPlayer: session.wheelByPlayer
      ? Object.fromEntries([...session.wheelByPlayer.entries()])
      : {},
    gameData: publicGameData(session.gameData),
    gameDataByPlayer: session.gameDataByPlayer
      ? Object.fromEntries(
          [...session.gameDataByPlayer.entries()].map(([id, data]) => [
            id,
            publicGameData(data),
          ]),
        )
      : {},
  };
}

// Never send answer keys or future levels over the wire.
export function publicGameData(data) {
  if (!data) return null;
  const privateKeys = new Set([
    "targetLine",
    "correctAnswer",
    "debugLevels",
    "guessLevels",
    "robotLevels",
  ]);
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => !privateKeys.has(key)),
  );
}
export function findNextReadyGroup(session, requestedKey = null) {
  if (session.activeGroup) return null;
  const groups = groupsFor(session);
  if (requestedKey)
    return groups.find((g) => g.ready && g.key === requestedKey) || null;
  // Single-player games can start automatically. Multiplayer groups wait for the host.
  return groups.find((g) => g.ready && g.mode === "Single Player") || null;
}
