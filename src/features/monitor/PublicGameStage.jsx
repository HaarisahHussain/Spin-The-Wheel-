import PublicGame from "../../components/PublicGame.jsx";

export default function PublicGameStage({
  active,
  gameDataByPlayer,
  fallback,
}) {
  const players = active?.players || [];
  const multiplayer = active?.mode === "Multiplayer" && players.length > 1;

  if (!multiplayer) {
    const data = gameDataByPlayer?.[players[0]?.playerId] || fallback;
    return <PublicGame game={active?.game} gameData={data} players={players} />;
  }

  return (
    <div className="w-full max-w-[1500px]">
      <div className="multiplayer-monitor-title">
        <span>MULTIPLAYER</span>
        <strong>Head-to-head</strong>
        <small>Each player has their own challenge</small>
      </div>
      <div className="multiplayer-monitor-grid">
        {players.slice(0, 4).map((p, index) => (
          <div className="multiplayer-player-panel" key={p.playerId}>
            <div className="multiplayer-player-header">
              <span>PLAYER {index + 1}</span>
              <strong>{p.name}</strong>
            </div>
            <PublicGame
              game={active.game}
              gameData={gameDataByPlayer?.[p.playerId] || fallback}
              players={[p]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
