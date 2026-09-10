import { Sparkles } from "lucide-react";

export function LoadingGames() {
  return (
    <div className="show-card">
      <Sparkles size={52} className="text-cyan-300 mx-auto mb-7" />
      <div className="show-eyebrow">NEXT UP</div>
      <h2>Loading game...</h2>
      <div className="loading-dots">
        <i />
        <i />
        <i />
      </div>
      <p>Get ready to play.</p>
    </div>
  );
}

export function Announcement({ game, mode, players }) {
  return (
    <div className="show-card">
      <div className="show-eyebrow">LET'S PLAY</div>
      <h2>{game}</h2>
      <div className="announcement-meta">
        {mode} · {players.length} {players.length === 1 ? "player" : "players"}
      </div>
      <div className="pulse-ring">🎮</div>
    </div>
  );
}

export function Results({ phase }) {
  return (
    <div className="show-card results-card">
      <div className="trophy-burst">🏆</div>
      <div className="show-eyebrow">GAME COMPLETE</div>
      <h2>Great job!</h2>
      {[...(phase?.finishedPlayers || [])]
        .sort(
          (a, b) =>
            (phase.scores?.[b.playerId] || 0) -
            (phase.scores?.[a.playerId] || 0),
        )
        .map((player) => (
          <p key={player.playerId}>
            {player.name}:{" "}
            <strong>{phase.scores?.[player.playerId] || 0}</strong>
          </p>
        ))}
      <div className="confetti-row">✦ ✧ ✦ ✧ ✦</div>
    </div>
  );
}

export function Idle() {
  return (
    <div className="show-card">
      <div className="text-7xl mb-8">✨</div>
      <div className="show-eyebrow">READY WHEN YOU ARE</div>
      <h2>Let's play!</h2>
      <p>Players can join from the Host Control.</p>
    </div>
  );
}
