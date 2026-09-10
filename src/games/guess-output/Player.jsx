import { Code2, Zap } from "lucide-react";

import GameTimer from "../../components/GameTimer.jsx";

export default function GuessOutput({ data, onEvent, playerId }) {
  const multiplayer = data?.mode !== "Single Player";
  const buzz = () => onEvent({ action: "BUZZ" });
  const options = data?.options || [];
  const lockedForPlayer = multiplayer && data?.buzzedBy !== playerId;

  return (
    <div>
      <div className="game-top">
        <div>
          <div className="phone-kicker">LEVEL {data?.level || 1} / 4</div>
          <h2 className="phone-title">
            <Code2 size={24} /> Guess The Output
          </h2>
        </div>
        <GameTimer
          seconds={data?.timeLimit || 25}
          startedAt={data?.startedAt}
          deadlineAt={data?.deadlineAt}
        />
      </div>
      <pre className="code-challenge phone-code">
        {data?.question || "console.log(2 + '2');"}
      </pre>
      {multiplayer && !data?.buzzedBy ? (
        <button onClick={buzz} className="buzz-button">
          <Zap /> BUZZ IN
        </button>
      ) : multiplayer ? (
        <div className="buzz-lock">
          {data?.buzzedBy
            ? data.buzzedBy === playerId
              ? "You have first crack at it!"
              : "Another player has first crack at it!"
            : "You are buzzed in!"}
        </div>
      ) : (
        <div className="buzz-lock">Choose your answer</div>
      )}
      <div className="answer-list">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onEvent({ action: "ANSWER", answer: opt })}
            className={`answer-button ${data?.selected === opt ? "selected" : ""}`}
            disabled={!!lockedForPlayer}
          >
            {opt}
          </button>
        ))}
      </div>
      <p className="game-tip">
        {data?.message || "Your answer is checked instantly."} · Right answer
        scores more at higher levels · Wrong answer −50 (minimum 0)
      </p>
    </div>
  );
}
