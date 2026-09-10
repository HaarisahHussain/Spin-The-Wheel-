import {
  RotateCw,
  User,
  Users,
  Wifi,
  WifiOff,
  CheckCircle,
} from "lucide-react";

import Wheel from "../../components/Wheel.jsx";
import LiveGame from "../../components/LiveGame.jsx";
import { usePlayerSession } from "./usePlayerSession.js";
import { STEPS } from "./steps.js";

export default function PlayerScreen({ sessionId }) {
  const {
    step,
    conn,
    playerId,
    error,
    name,
    setName,
    study,
    setStudy,
    interests,
    selectedGame,
    mode,
    setMode,
    queue,
    spin,
    gameData,
    result,
    toggleInterest,
    submitForm,
    showWheel,
    spinWheel,
    joinQueue,
    gameEvent,
    spinAgain,
    exitToForm,
  } = usePlayerSession(sessionId);
  return (
    <div className="phone-shell">
      {error && (
        <div className="phone-error">
          <WifiOff size={14} />
          {error}
        </div>
      )}
      {conn?.connected && !error && (
        <div className="sync-pill">
          <Wifi size={12} /> Synced
        </div>
      )}

      {step === STEPS.FORM && (
        <Card>
          <div className="phone-kicker">QUICK QUESTIONS</div>
          <h2 className="phone-title">Tell us a bit about you</h2>
          <p className="phone-sub">
            It only takes a few seconds to get started.
          </p>
          <form onSubmit={submitForm} className="phone-form">
            <label className="phone-label">
              1. What's your name?
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="input"
              />
            </label>
            <label className="phone-label">
              2. What will you be studying?
              <input
                required
                value={study}
                onChange={(e) => setStudy(e.target.value)}
                placeholder="Enter your degree or field of study"
                className="input"
              />
            </label>
            <div>
              <div className="phone-label mb-3">
                3. What are you interested in? <span>(optional)</span>
              </div>
              <div className="interest-grid">
                {["Socialising", "Hobbyist", "Learning"].map((i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => toggleInterest(i)}
                    className={`interest-chip ${interests.includes(i) ? "selected" : ""}`}
                  >
                    {interests.includes(i) ? "✓ " : ""}
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <button className="primary">Continue</button>
          </form>
        </Card>
      )}
      {step === STEPS.READY && (
        <Card center>
          <CheckCircle className="success-icon" size={50} />
          <div className="phone-kicker">YOU'RE ALL SET</div>
          <h2 className="phone-title">Ready to spin?</h2>
          <p className="phone-sub mb-7">
            Your wheel is about to appear on the big screen too.
          </p>
          <button onClick={showWheel} className="primary">
            Show the Wheel
          </button>
        </Card>
      )}
      {step === STEPS.WHEEL && (
        <Card center>
          <div className="phone-kicker">YOUR TURN</div>
          <h2 className="phone-title mb-7">Spin the Wheel</h2>
          <Wheel spin={spin} size="small" />
          <button
            onClick={spinWheel}
            disabled={spin?.active}
            className="primary mt-8"
          >
            <RotateCw size={16} />
            {spin?.active ? "Spinning…" : "SPIN"}
          </button>
        </Card>
      )}
      {step === STEPS.MODE && (
        <Card>
          <div className="phone-kicker">YOUR WHEEL RESULT</div>
          <h2 className="phone-title text-center">{selectedGame}</h2>
          <p className="phone-sub text-center mb-6">
            Choose how you want to play.
          </p>
          <div className="mode-grid">
            <ModeButton
              active={mode === "Multiplayer"}
              icon={<Users size={20} />}
              onClick={() => setMode("Multiplayer")}
            >
              Multiplayer
            </ModeButton>
            <ModeButton
              active={mode === "Single Player"}
              icon={<User size={20} />}
              onClick={() => setMode("Single Player")}
            >
              Single Player
            </ModeButton>
          </div>
          <button onClick={joinQueue} className="primary mt-5">
            Join Queue
          </button>
        </Card>
      )}
      {step === STEPS.QUEUE && (
        <Card center>
          <div className="queue-orb">⌛</div>
          <div className="phone-kicker">QUEUE</div>
          <h2 className="phone-title">You're in!</h2>
          <p className="phone-sub mb-5">
            {selectedGame} · {mode}
          </p>
          <div className="queue-list">
            {queue
              .filter((p) => p.game === selectedGame && p.mode === mode)
              .map((p) => (
                <div key={p.playerId} className="queue-row">
                  <span>
                    #{p.position} {p.name}
                  </span>
                  <span>{p.playerId === playerId ? "You" : "Waiting"}</span>
                </div>
              ))}
          </div>
          <p className="phone-hint">
            We'll bring you in when the main screen is available.
          </p>
        </Card>
      )}
      {step === STEPS.GAME && (
        <Card>
          <LiveGame
            game={selectedGame}
            data={gameData}
            onEvent={gameEvent}
            playerId={playerId}
          />
        </Card>
      )}
      {step === STEPS.RESULTS && (
        <Card center>
          <div className="queue-orb result-orb">🏆</div>
          <div className="phone-kicker">GAME COMPLETE</div>
          <h2 className="phone-title">Great job!</h2>
          <p className="phone-sub score-result">
            Your score:{" "}
            <strong>{result?.scores?.[playerId] ?? result?.score ?? 0}</strong>
          </p>
          <div className="result-actions">
            <button type="button" className="primary" onClick={spinAgain}>
              ↻ Spin again
            </button>
            <button
              type="button"
              className="secondary exit-button"
              onClick={exitToForm}
            >
              Exit
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Card({ children, center }) {
  return (
    <div className={`phone-card ${center ? "text-center" : ""}`}>
      {children}
    </div>
  );
}

function ModeButton({ active, icon, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mode-button ${active ? "active" : ""}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
