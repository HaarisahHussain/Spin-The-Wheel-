import { useEffect, useRef, useState } from "react";
import { createSocket } from "../../lib/socket.js";
import { STEPS } from "./steps.js";

export function usePlayerSession(sessionId) {
  const [step, setStep] = useState(STEPS.FORM);
  const [conn, setConn] = useState(null);
  const [playerId, setPlayerId] = useState("");
  const playerIdRef = useRef("");
  const lastResultsRef = useRef(null);
  const [error, setError] = useState(
    sessionId ? "" : "Missing session. Scan the host QR code.",
  );

  const [name, setName] = useState("");
  const [study, setStudy] = useState("");
  const [interests, setInterests] = useState([]);
  const [selectedGame, setSelectedGame] = useState("");
  const [mode, setMode] = useState("Multiplayer");
  const [queue, setQueue] = useState([]);
  const [spin, setSpin] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    const s = createSocket();

    s.on("connect", () =>
      s.emit("player:join", { sessionId }, (r) => {
        if (!r?.ok) setError(r?.error || "Could not join session.");
        else {
          lastResultsRef.current = null;
          setConn(s);
          setStep(STEPS.FORM);
          setSpin(null);
          setGameData(null);
          setResult(null);
          setSelectedGame("");
          setPlayerId(r.playerId);
          playerIdRef.current = r.playerId;
          setError("");
        }
      }),
    );

    s.on("connect_error", () =>
      setError(
        "Cannot reach the laptop. Make sure the phone is on the same Wi-Fi.",
      ),
    );

    s.on("disconnect", () => setError("Connection lost. Trying to reconnect…"));

    s.on("session:state", (state) => {
      setQueue(state.queue || []);
      const currentPlayerId = playerIdRef.current;
      // Each phone only receives/animates its own wheel state. This prevents
      // another player's simultaneous spin from overwriting this screen.
      const ownWheel =
        state.wheelByPlayer?.[currentPlayerId] ||
        (state.wheel?.playerId === currentPlayerId ? state.wheel : null);
      if (ownWheel) setSpin(ownWheel);
      const ownData = state.gameDataByPlayer?.[currentPlayerId];
      if (ownData?.game) {
        setGameData(ownData);
      }
      if (
        state.activeGroup?.players?.some(
          (p) => p.playerId === currentPlayerId,
        ) &&
        state.publicPhase?.game
      )
        setSelectedGame(state.publicPhase.game);
      const iAmActive = state.activeGroup?.players?.some(
        (p) => p.playerId === currentPlayerId,
      );
      const iAmFinished = state.publicPhase?.finishedPlayers?.some(
        (p) => p.playerId === currentPlayerId,
      );
      if (iAmActive && state.publicPhase?.type === "GAME") setStep(STEPS.GAME);
      if (
        iAmFinished &&
        state.publicPhase?.type === "RESULTS" &&
        lastResultsRef.current !== state.publicPhase.startedAt
      ) {
        lastResultsRef.current = state.publicPhase.startedAt;
        setResult(state.publicPhase);
        setGameData(null);
        setStep(STEPS.RESULTS);
      }
    });

    s.on("session:command", (msg) => {
      if (msg.type === "SPIN_STARTED") {
        setSpin(msg.payload);
        setStep(STEPS.WHEEL);
      }
      if (msg.type === "SPIN_COMPLETE") {
        setSpin((prev) => ({
          ...prev,
          ...msg.payload,
          active: false,
          finishedAt: Date.now(),
        }));
        setSelectedGame(msg.payload.game);
        setStep(STEPS.MODE);
      }
      if (msg.type === "GAME_ANNOUNCEMENT") {
        setSelectedGame(msg.payload.game);
      }
      if (msg.type === "START_GAME") {
        setSelectedGame(msg.payload.game);
        setStep(STEPS.GAME);
      }
      if (msg.type === "SERVER_RESET") {
        setResult(null);
        setSpin(null);
        setName("");
        setStudy("");
        setGameData(null);
        setSelectedGame("");
        setMode("Multiplayer");
        setInterests([]);
        setStep(STEPS.FORM);
      }
    });
    return () => s.disconnect();
  }, [sessionId]);

  const emit = (type, payload = {}) => {
    if (!conn?.connected) {
      setError("Not connected to the laptop.");
      return false;
    }
    conn.emit("player:event", { type, payload });
    return true;
  };

  const toggleInterest = (interest) =>
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );

  const submitForm = (e) => {
    e.preventDefault();
    if (!name.trim() || !study.trim()) return;
    if (
      emit("FORM_SUBMITTED", {
        name: name.trim(),
        study: study.trim(),
        interests,
      })
    )
      setStep(STEPS.READY);
  };

  const showWheel = () => {
    if (emit("SHOW_WHEEL")) setStep(STEPS.WHEEL);
  };

  const spinWheel = () => {
    if (spin?.active) return;
    emit("SPIN_REQUEST");
  };

  const joinQueue = () => {
    if (emit("JOINED_QUEUE", { mode })) setStep(STEPS.QUEUE);
  };

  const gameEvent = (payload) => emit("GAME_EVENT", payload);

  const spinAgain = () => {
    setResult(null);
    setSelectedGame("");
    setStep(STEPS.WHEEL);
    emit("SHOW_WHEEL");
  };

  const exitToForm = () => {
    setResult(null);
    setSpin(null);
    setName("");
    setStudy("");
    setGameData(null);
    setSelectedGame("");
    setMode("Multiplayer");
    setInterests([]);
    setStep(STEPS.FORM);
    emit("RESET_PLAYER");
  };

  return {
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
  };
}
