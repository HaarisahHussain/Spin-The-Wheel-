import { useEffect, useRef, useState } from "react";

import { createSocket } from "../../lib/socket.js";

export function useHostSession() {
  const socketRef = useRef(null);
  const [session, setSession] = useState(null);
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = createSocket();
    socketRef.current = s;
    s.on("connect", () => {
      setSession(null);
      setState(null);
      setError("");
      s.timeout(5000).emit("monitor:create-session", {}, (timeout, result) => {
        if (timeout) {
          setSession(null);
          return setError("Session creation timed out. Check the connection.");
        }
        if (result?.ok) setError("");
        if (!result?.ok) {
          setSession(null);
          return setError(result?.error || "Could not create session.");
        }
        setError("");
        setBusy(false);
        setSession(result);
      });
    });
    s.on("session:state", setState);
    s.on("disconnect", () => {
      setBusy(false);
      setSession(null);
      setState(null);
      setError(
        "Connection lost. Reconnecting creates a new session; players must scan the new QR.",
      );
    });
    s.on("connect_error", () => setError("Cannot connect to local server."));
    return () => {
      if (socketRef.current === s) socketRef.current = null;
      s.disconnect();
    };
  }, []);

  const openMonitor = () => {
    if (session?.monitorUrl)
      window.open(session.monitorUrl, "_blank", "noopener,noreferrer");
  };

  const hostEvent = (type, payload = {}) => {
    if (!session?.sessionId) return;
    setBusy(true);
    // The host socket is held in the session creator connection.
    if (!socketRef.current?.connected) {
      setBusy(false);
      setError("Host is disconnected.");
      return;
    }
    socketRef.current
      .timeout(5000)
      .emit("host:event", { type, payload }, (timeout, result) => {
        setBusy(false);
        if (timeout)
          return setError("Host action timed out. Check the connection.");
        if (result?.ok) setError("");
        if (!result?.ok)
          setError(result?.error || "Host action could not be completed.");
      });
  };

  return { session, state, error, busy, openMonitor, hostEvent };
}
