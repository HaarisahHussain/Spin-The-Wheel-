import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
const Context = createContext(null);
export function ArcadeProvider({ children }) {
  const [state, setState] = useState(null),
    [connected, setConnected] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [connectionId, setConnectionId] = useState(null);
  const stateRef = useRef(null);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const tabId = useRef(
    sessionStorage.getItem('arcade-tab') ||
      Array.from(crypto.getRandomValues(new Uint8Array(16)), (v) =>
        v.toString(16).padStart(2, '0'),
      ).join(''),
  );
  sessionStorage.setItem('arcade-tab', tabId.current);
  const socket = useRef(null),
    busyRef = useRef(false);
  const publicOnly = location.pathname.startsWith('/display');
  const audience = location.pathname === '/host' ? 'host' : publicOnly ? 'display' : 'account';
  const acceptState = (value) =>
    setState((previous) =>
      !previous ||
      previous.eventId !== value.eventId ||
      previous.instanceId !== value.instanceId ||
      value.revision >= previous.revision
        ? value
        : previous,
    );
  const refresh = async () => {
    const res = await fetch(
      `/api/state?connection=${encodeURIComponent(socket.current?.id || '')}&audience=${audience}`,
      {
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) throw Error('Connection interrupted.');
    const value = await res.json();
    acceptState(value);
  };
  useEffect(() => {
    const live = io({
      auth: { audience },
      query: { audience },
      transports: ['polling', 'websocket'],
      reconnection: true,
    });
    socket.current = live;
    live.on('state', acceptState);
    live.on('statePatch', (patch) =>
      setState((old) => (old && patch.revision >= old.revision ? { ...old, ...patch } : old)),
    );
    live.on('connect', () => {
      setConnected(true);
      setConnectionId(live.id);
    });
    live.on('disconnect', () => {
      setConnected(false);
      setConnectionId(null);
    });
    live.on('connect_error', () => setConnected(false));
    const resume = () => {
      if (document.visibilityState !== 'visible') return;
      refresh().catch((e) => setError(e.message));
      if (!live.connected) live.connect();
    };
    document.addEventListener('visibilitychange', resume);
    return () => {
      document.removeEventListener('visibilitychange', resume);
      live.disconnect();
    };
  }, []);
  async function command(action, payload = {}, { throwOnError = false } = {}) {
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusy(true);
    setError('');
    // const id = Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join(''); // In production
    const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join(''); // In development (anyhow, it is fine in production too o.o)
    try {
      let response;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          response = await fetch('/api/command', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Arcade-Audience': audience,
              'X-Arcade-Connection': socket.current?.id || '',
            },
            body: JSON.stringify({
              action,
              payload: {
                ...payload,
                tabId: tabId.current,
                controlEpoch: stateRef.current?.staff?.epoch,
              },
              id,
            }),
            signal: AbortSignal.timeout(10000),
          });
          break;
        } catch (e) {
          if (attempt === 1) throw e;
        }
      }
      const result = await response.json();
      if (!response.ok || result.error)
        throw Object.assign(Error(result.error || 'Please try again.'), {
          status: response.status,
          code: result.code,
        });
      if (result.sessionChanged) socket.current?.disconnect().connect();
      if (result.state) acceptState(result.state);
      return result;
    } catch (e) {
      if (throwOnError) throw e;
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
  useEffect(() => {
    if (!connectionId || !location.pathname.startsWith('/host')) return;
    let pending = false;
    const heartbeat = async () => {
      const current = stateRef.current;
      if (!current?.staff?.ownsControl || pending) return;
      pending = true;
      try {
        await fetch('/api/command', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Arcade-Audience': audience,
            'X-Arcade-Connection': socket.current?.id || '',
          },
          body: JSON.stringify({
            id: Array.from(crypto.getRandomValues(new Uint8Array(16)), (v) =>
              v.toString(16).padStart(2, '0'),
            ).join(''),
            action: 'hostControl',
            payload: { heartbeat: true, controlEpoch: current.staff.epoch },
          }),
          signal: AbortSignal.timeout(8000),
        });
      } catch {
        /* reconnect refreshes authoritative ownership */
      } finally {
        pending = false;
      }
    };
    const timer = setInterval(heartbeat, 5000);
    return () => clearInterval(timer);
  }, [connectionId]);
  return (
    <Context.Provider
      value={{
        state,
        connected,
        connectionId,
        tabId: tabId.current,
        error,
        setError,
        busy,
        command,
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
