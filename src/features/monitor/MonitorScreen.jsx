import { Wifi, Users } from "lucide-react";

import Wheel from "../../components/Wheel.jsx";
import AmbientMusic from "../../components/AmbientMusic.jsx";
import { useMonitorSession } from "./useMonitorSession.js";
import PublicGameStage from "./PublicGameStage.jsx";
import { LoadingGames, Announcement, Results, Idle } from "./phases.jsx";

export default function MonitorScreen({ sessionId }) {
  const { state, error } = useMonitorSession(sessionId);
  const phase = state?.publicPhase?.type;
  const active = state?.activeGroup;
  const showWheel = !active && (phase === "WHEEL_READY" || phase === "WHEEL");
  const showLoadingGames = phase === "LOADING_GAMES";
  const showAnnouncement = phase === "GAME_ANNOUNCEMENT" && !!active;
  const showGame = phase === "GAME" && !!active;
  const showResults = phase === "RESULTS";
  const waitingPlayers = state?.queue?.length || 0;

  return (
    <div className="monitor-shell">
      <header className="monitor-header">
        <div>
          <div className="brand-kicker">SPIN THE WHEEL</div>
          <h1>
            {showGame
              ? active.game
              : showWheel
                ? "Spin the Wheel"
                : showLoadingGames
                  ? "Loading games..."
                  : showAnnouncement
                    ? `Let's play ${active.game}`
                    : showResults
                      ? "Great job!"
                      : "Get ready"}
          </h1>
        </div>
        <div className="monitor-live">
          <AmbientMusic compact />
          <span>
            <Wifi size={16} /> Live
          </span>
          <span>
            <Users size={16} /> {waitingPlayers} waiting
          </span>
        </div>
      </header>
      <main className="monitor-main">
        {showWheel && (
          <div className="monitor-wheel-wrap">
            <div className="show-eyebrow">YOUR GAME IS BEING CHOSEN</div>
            <Wheel spin={state.wheel} size="large" />
            <div className="show-caption">
              {state.wheel?.active
                ? "And the winner is..."
                : "Get ready to spin!"}
            </div>
          </div>
        )}
        {showLoadingGames && <LoadingGames />}
        {showAnnouncement && (
          <Announcement
            game={active.game}
            mode={active.mode}
            players={active.players || []}
          />
        )}
        {showGame && (
          <PublicGameStage
            active={active}
            gameDataByPlayer={state.gameDataByPlayer || {}}
            fallback={state.gameData}
          />
        )}
        {showResults && <Results phase={state.publicPhase} />}
        {!showWheel &&
          !showLoadingGames &&
          !showAnnouncement &&
          !showGame &&
          !showResults && <Idle />}
      </main>
      <footer className="monitor-footer">
        <span>Scan to join anytime from the Host Control</span>
        <span>
          {state?.groups?.length || 0} game group
          {(state?.groups?.length || 0) === 1 ? "" : "s"} waiting
        </span>
      </footer>
      {error && (
        <div className="fixed bottom-5 left-5 bg-amber-500/15 border border-amber-500/40 px-4 py-3 rounded-xl text-amber-200 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
