import { useState } from "react";
import { Bot } from "lucide-react";
import GameTimer from "../../components/GameTimer.jsx";
import {
  ROBOT_COMMAND_LABELS,
  MAX_PROGRAM_LENGTH,
} from "../../../shared/games.js";
export default function RobotRescue({ data, onEvent }) {
  const serverKey = `${data?.level}:${data?.executing}:${JSON.stringify(data?.program || [])}`;
  const [draft, setDraft] = useState({
    key: serverKey,
    commands: data?.program || [],
  });
  const program =
    draft.key === serverKey ? draft.commands : data?.program || [];
  const setProgram = (update) =>
    setDraft({
      key: serverKey,
      commands: typeof update === "function" ? update(program) : update,
    });
  const labels = ROBOT_COMMAND_LABELS;
  const obstacles = data?.obstacles || [];

  const add = (command) => {
    if (!data?.executing)
      setProgram((prev) =>
        prev.length < MAX_PROGRAM_LENGTH ? [...prev, command] : prev,
      );
  };
  const removeLast = () => setProgram((prev) => prev.slice(0, -1));
  const clearProgram = () => setProgram([]);
  const run = () => {
    if (!program.length || data?.executing) return;
    onEvent({ action: "ROBOT_PROGRAM", commands: program });
    onEvent({ action: "ROBOT_RUN" });
  };
  return (
    <div>
      <div className="game-top">
        <div>
          <div className="phone-kicker">LEVEL {data?.level || 1} / 4</div>
          <h2 className="phone-title">
            <Bot size={24} /> Robot Rescue
          </h2>
        </div>
        <GameTimer
          seconds={data?.timeLimit || 35}
          startedAt={data?.startedAt}
          deadlineAt={data?.deadlineAt}
        />
      </div>
      <p className="phone-sub">
        Build a Scratch-style command sequence and guide the robot to the
        finish. Up to 100 blocks per program — plan, run, learn and try again.
      </p>
      <div className="robot-preview">
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={i}
            className={`robot-cell ${data?.path?.includes(i) ? "visited" : ""} ${i === data?.robot ? "robot-cell-active" : ""} ${obstacles.includes(i) ? "robot-obstacle" : ""}`}
          >
            {i === data?.robot ? (
              <Bot size={22} />
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
      <div className="robot-command-list">
        {program.length ? (
          program.map((cmd, i) => (
            <span className="command-block" key={`${cmd}-${i}`}>
              {i + 1}. {labels[cmd]}
            </span>
          ))
        ) : (
          <span className="phone-hint">Add blocks below…</span>
        )}
      </div>
      <div className="robot-command-builder">
        <button type="button" onClick={() => add("up")}>
          ↑ Move up
        </button>
        <button type="button" onClick={() => add("down")}>
          ↓ Move down
        </button>
        <button type="button" onClick={() => add("left")}>
          ↶ Turn left
        </button>
        <button type="button" onClick={() => add("forward")}>
          ➜ Move forward
        </button>
        <button type="button" onClick={() => add("backward")}>
          ← Move backward
        </button>
        <button type="button" onClick={() => add("right")}>
          ↷ Turn right
        </button>
      </div>
      <div className="robot-program-actions">
        <button
          type="button"
          className="secondary"
          onClick={removeLast}
          disabled={!program.length || data?.executing}
        >
          ↩ Remove last
        </button>
        <button
          type="button"
          className="secondary"
          onClick={clearProgram}
          disabled={!program.length || data?.executing}
        >
          ✕ Clear
        </button>
      </div>
      <button
        type="button"
        className="robot-run-button"
        onClick={run}
        disabled={!program.length || data?.executing}
      >
        {data?.executing ? "Robot running…" : "▶ Run program"}
      </button>
      <div className="moves-count">
        Level {data?.level || 1} ·{" "}
        {data?.executing ? "Executing your program" : "Build your program"}
      </div>
    </div>
  );
}
