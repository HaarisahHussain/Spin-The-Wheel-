import { useEffect, useRef, useState } from 'react';
import { useArcade } from '../state';
import { soundScene, transitionCue } from '../audio/cues';
import { createSound } from '../audio/synth';

export function DisplaySound() {
  const { state, connected } = useArcade();
  const current = useRef(null);
  const sound = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    current.current = { state, connected, received: performance.now() };
  }, [state, connected]);
  useEffect(
    () => () => {
      sound.current?.close();
      sound.current = null;
    },
    [],
  );
  useEffect(() => {
    if (!enabled) return;
    let previous = null;
    const tick = () => {
      const latest = current.current;
      if (!latest?.state || !latest.connected || document.hidden || !sound.current?.running()) {
        previous = null;
        sound.current?.stop();
        return;
      }
      const scene = soundScene(
        latest.state,
        latest.state.now + performance.now() - latest.received,
      );
      const cue = transitionCue(previous, scene);
      previous = scene;
      if (cue) sound.current.play(cue);
    };
    tick();
    const timer = setInterval(tick, 40);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
      sound.current?.stop();
    };
  }, [enabled]);
  const toggle = async () => {
    if (enabled) {
      sound.current?.stop();
      setEnabled(false);
      return;
    }
    setBusy(true);
    try {
      sound.current ||= createSound();
      await sound.current.resume();
      if (!sound.current.running()) throw Error('Audio suspended');
      setFailed(false);
      setEnabled(true);
      sound.current.play('selected');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      aria-pressed={enabled}
      disabled={busy}
      onClick={toggle}
      title={
        failed
          ? 'Audio could not start. Check your browser sound settings and try again.'
          : undefined
      }
      className="min-h-11 shrink-0 rounded-lg border border-[#C5C5BC] px-4 text-sm text-[#62625C] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#365E53]"
    >
      {enabled ? 'Mute sound' : failed ? 'Retry sound' : 'Enable sound'}
    </button>
  );
}
