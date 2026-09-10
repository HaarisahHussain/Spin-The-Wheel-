import { Terminal } from "lucide-react";

import GameShell from "../../components/GameShell.jsx";
import ScoreBoard from "../../components/ScoreBoard.jsx";
import GameTimer from "../../components/GameTimer.jsx";
import { PANEL_CLASS } from "../../lib/styles.js";

export default function DebugDashPublic({ gameData, players }) {
  const code = gameData?.code || "function add(a, b) {\n  return a + 1;\n}";
  const lines = code.split("\n");
  const level = gameData?.level || 1;

  return (
    <GameShell
      icon={Terminal}
      title="Debug Dash"
      eyebrow={`Level ${level} · Find the bug`}
      players={players}
    >
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div className={PANEL_CLASS + " p-6"}>
          <div className="flex justify-between items-center mb-5">
            <span className="text-slate-300 font-bold">
              Spot the broken line
            </span>
            <GameTimer
              variant="monitor"
              seconds={gameData?.timeLimit ?? 25}
              startedAt={gameData?.startedAt}
              deadlineAt={gameData?.deadlineAt}
            />
          </div>
          <div className="code-editor-public">
            {lines.map((line, i) => (
              <div key={i} className="code-line">
                <span>{String(i + 1).padStart(2, "0")}</span>
                <code>{line || " "}</code>
              </div>
            ))}
          </div>
          <div className="mt-5 text-center text-slate-400">
            Choose the line on your phone. Correct answers unlock the next
            level.
          </div>
        </div>
        <ScoreBoard players={players} scores={gameData?.scores} />
      </div>
    </GameShell>
  );
}
