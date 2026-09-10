import { Terminal } from "lucide-react";

import GameTimer from "../../components/GameTimer.jsx";

export default function DebugDash({ data, onEvent }) {
  const left = data?.timeLimit || 25;
  const lines = (data?.code || "").split("\n");

  return (
    <div>
      <div className="game-top">
        <div>
          <div className="phone-kicker">LEVEL {data?.level || 1} / 4</div>
          <h2 className="phone-title">
            <Terminal size={24} /> Debug Dash
          </h2>
        </div>
        <GameTimer
          seconds={left}
          startedAt={data?.startedAt}
          deadlineAt={data?.deadlineAt}
        />
      </div>
      <p className="phone-sub">Tap the line you think contains the bug.</p>
      <div className="mobile-code">
        {lines.map((line, i) => (
          <button
            key={i}
            onClick={() => onEvent({ action: "DEBUG_LINE", line: i })}
            className="mobile-code-line"
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            <code>{line || " "}</code>
          </button>
        ))}
      </div>
      <p className="game-tip">
        A miss costs 50 points. A correct line unlocks a harder level.
      </p>
    </div>
  );
}
