import { Code2, Zap } from "lucide-react";

import GameShell from "../../components/GameShell.jsx";
import ScoreBoard from "../../components/ScoreBoard.jsx";
import GameTimer from "../../components/GameTimer.jsx";
import { PANEL_CLASS } from "../../lib/styles.js";

export default function GuessOutputPublic({ gameData, players }) {
  const options = gameData?.options || ["A) 2", "B) 22", "C) 4", "D) Error"];
  const selected = gameData?.selected;

  return (
    <GameShell
      icon={Code2}
      title="Guess The Output"
      eyebrow="Buzz in · Solve your challenge"
      players={players}
      accent="yellow"
    >
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div className={PANEL_CLASS + " p-7"}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-3 items-center text-yellow-300 font-black">
              <Zap size={22} /> BUZZER LIVE
            </div>
            <GameTimer
              variant="monitor"
              seconds={gameData?.timeLimit ?? 25}
              startedAt={gameData?.startedAt}
              deadlineAt={gameData?.deadlineAt}
            />
          </div>
          <pre className="code-challenge">
            {gameData?.question || "console.log(2 + '2');"}
          </pre>
          <div className="grid grid-cols-2 gap-4 mt-5">
            {options.map((opt) => (
              <div
                key={opt}
                className={`answer-card ${selected === opt ? "answer-card-selected" : ""}`}
              >
                {opt}
              </div>
            ))}
          </div>
          {gameData?.buzzedBy && (
            <div className="mt-5 rounded-2xl bg-yellow-400/10 border border-yellow-300/20 px-5 py-4 text-yellow-200 font-bold">
              ⚡{" "}
              {players.find((p) => p.playerId === gameData.buzzedBy)?.name ||
                "Player"}{" "}
              is buzzed in!
            </div>
          )}
        </div>
        <ScoreBoard players={players} scores={gameData?.scores} />
      </div>
    </GameShell>
  );
}
