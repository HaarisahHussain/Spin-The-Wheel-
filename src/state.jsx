import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
const Context = createContext(null);
export function ArcadeProvider({ children }) {
  const [state, setState] = useState(null),
    [connected, setConnected] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [recovery, setRecovery] = useState(''),
    [pairing, setPairing] = useState('');
  const socket = useRef(null),
    busyRef = useRef(false);
  const publicOnly = location.pathname.startsWith('/display');
  const acceptState = (value) =>
    setState((previous) =>
      !previous || previous.eventId !== value.eventId || value.revision >= previous.revision
        ? value
        : previous,
    );
  const refresh = async () => {
    const res = await fetch(`/api/state${publicOnly ? '?audience=display' : ''}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw Error('Connection interrupted.');
    const value = await res.json();
    acceptState(value);
  };
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
    const live = io({
      auth: { audience: publicOnly ? 'display' : 'account' },
      // transports: ['polling', 'websocket'],
      transports: ['websocket'],
      reconnection: true,
    });
    socket.current = live;
    live.on('state', acceptState);
    live.on('connect', () => setConnected(true));
    live.on('disconnect', () => setConnected(false));
    live.on('connect_error', () => setConnected(false));
    return () => live.disconnect();
  }, []);
  async function command(action, payload = {}) {
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusy(true);
    setError('');
    // const id = crypto.randomUUID(); #TODO Replace during production
    const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    try {
      let response;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          response = await fetch('/api/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload, id }),
            signal: AbortSignal.timeout(10000),
          });
          break;
        } catch (e) {
          if (attempt === 1) throw e;
        }
      }
      const result = await response.json();
      if (!response.ok || result.error) throw Error(result.error || 'Please try again.');
      if (result.recovery) setRecovery(result.recovery);
      if (result.pairingCode) setPairing(result.pairingCode);
      if (
        ['register', 'verify', 'recover', 'claimController', 'staffLogin', 'logout'].includes(
          action,
        )
      ) {
        socket.current?.disconnect().connect();
      }
      await refresh();
      return result;
    } catch (e) {
      setError(
        e.name === 'TimeoutError'
          ? 'Connection interrupted. Check your current state before trying again.'
          : e.message,
      );
      return null;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return (
    <Context.Provider
      value={{
        state,
        connected,
        error,
        setError,
        busy,
        command,
        recovery,
        setRecovery,
        pairing,
        setPairing,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useArcade = () => useContext(Context);
export function useClock() {
  const { state } = useArcade();
  const offset = useRef(0);
  useEffect(() => {
    if (state) offset.current = state.now - Date.now();
  }, [state?.now]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);
  return now + offset.current;
}
