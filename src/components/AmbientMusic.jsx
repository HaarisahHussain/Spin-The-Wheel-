import React, { useEffect, useRef, useState } from 'react';
import { Music, Volume2, VolumeX } from 'lucide-react';

// Small, generated arcade ambience so the build needs no external audio files.
// Browsers require a user gesture before audio can start, so music is opt-in.
export default function AmbientMusic({ compact = false }) {
  const [on, setOn] = useState(false);
  const ctxRef = useRef(null);
  const timerRef = useRef(null);

  const stop = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    const ctx = ctxRef.current;
    if (ctx && ctx.state !== 'closed') ctx.suspend().catch(() => {});
  };

  const start = async () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = ctxRef.current || new Ctx();
      ctxRef.current = ctx;
      await ctx.resume();
      clearInterval(timerRef.current);
      const notes = [261.63, 329.63, 392, 523.25, 392, 329.63];
      let step = 0;
      const play = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = notes[step++ % notes.length];
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.035, ctx.currentTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.42);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.45);
      };
      play();
      timerRef.current = setInterval(play, 520);
      setOn(true);
    } catch {}
  };

  const toggle = () => on ? (stop(), setOn(false)) : start();
  useEffect(() => () => stop(), []);

  return <button type="button" onClick={toggle} className={`music-toggle ${compact ? 'compact' : ''}`} title={on ? 'Turn music off' : 'Turn music on'}>
    {on ? <Volume2 size={compact ? 14 : 16}/> : <VolumeX size={compact ? 14 : 16}/>}<Music size={compact ? 13 : 15}/><span>{on ? 'Music on' : 'Music'}</span>
  </button>;
}
