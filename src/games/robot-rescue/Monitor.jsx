import { Bot } from "lucide-react";

import GameShell from "../../components/GameShell.jsx";
import ScoreBoard from "../../components/ScoreBoard.jsx";
import GameTimer from "../../components/GameTimer.jsx";
import { PANEL_CLASS } from "../../lib/styles.js";
import { ROBOT_COMMAND_LABELS } from "../../../shared/games.js";

export default function RobotRescuePublic({ gameData, players }) {
  const robot = gameData?.robot || 0;
  const path = gameData?.path || [];
  const program = gameData?.program || [];
  const obstacles = gameData?.obstacles || [];
  const labels = ROBOT_COMMAND_LABELS;
  const facing = ["NORTH", "EAST", "SOUTH", "WEST"][gameData?.orientation ?? 1];

  return (
    <GameShell
      icon={Bot}
      title="Robot Rescue"
      eyebrow={`Level ${gameData?.level || 1} · Program the robot · 35 seconds`}
      players={players}
      accent="cyan"
    >
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div className={PANEL_CLASS + " p-7"}>
          <div className="robot-heading mb-5">
            <span className="text-slate-300 font-bold">START → FINISH</span>
            <div className="flex gap-3 items-center">
              <span className="robot-orientation">Facing {facing}</span>
              <GameTimer
                variant="monitor"
                seconds={gameData?.timeLimit ?? 35}
                startedAt={gameData?.startedAt}
                deadlineAt={gameData?.deadlineAt}
              />
            </div>
          </div>
          <div className="robot-grid">
            {Array.from({ length: 25 }).map((_, i) => (
              <div
                key={i}
                className={`robot-cell ${path.includes(i) ? "visited" : ""} ${i === robot ? "robot-cell-active" : ""} ${i === 24 ? "finish-cell" : ""} ${obstacles.includes(i) ? "robot-obstacle" : ""}`}
              >
                {i === robot ? (
                  <Bot size={42} className="text-cyan-300 robot-bob" />
                ) : i === 24 ? (
                  "🏁"
                ) : obstacles.includes(i) ? (
                  "✦"
                ) : (
                  ""
                )}
              </div>
            ))}
          </div>
          <div className="robot-program">
            {program.length ? (
              program.map((cmd, i) => (
                <span className="command-block run" key={`${cmd}-${i}`}>
                  {i + 1}. {labels[cmd]}
                </span>
              ))
            ) : (
              <span className="text-slate-500 text-sm">
                Waiting for the player's command blocks…
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-5 justify-center text-sm font-bold text-slate-300">
            <span>✦ Obstacles</span>
            <span>
              {gameData?.executing ? "🤖 Robot running!" : "Build → Run"}
            </span>
          </div>
        </div>
        <ScoreBoard players={players} scores={gameData?.scores} />
      </div>
    </GameShell>
  );
}
