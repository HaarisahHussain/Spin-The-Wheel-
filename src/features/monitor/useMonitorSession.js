import { useEffect, useRef, useState } from "react";
import { createSocket } from "../../lib/socket.js";

export function useMonitorSession(sessionId) {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const audioRef = useRef(null);

  function playTone() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audioRef.current ||= new AudioContext();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 740;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {}
  }

  useEffect(() => {
    const s = createSocket();
    s.on("connect", () =>
      s.emit("monitor:join", { sessionId }, (r) => {
        if (!r?.ok) return setError(r?.error || "Session unavailable");
        setState(r.state);
        setError("");
      }),
    );
    s.on("session:state", setState);
    s.on("session:public", (msg) => {
      if (msg.type === "GAME_FINISHED") playTone();
    });
    s.on("connect_error", () =>
      setError("Monitor cannot reach the laptop server."),
    );
    s.on("disconnect", () => setError("Monitor disconnected. Reconnecting…"));
    return () => {
      s.disconnect();
      audioRef.current?.close().catch(() => {});
      audioRef.current = null;
    };
  }, [sessionId]);

  return { state, error };
}
