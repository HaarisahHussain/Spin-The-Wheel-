// Original, short synthesised cues: no downloads, music loops or external assets.
const motifs = {
  tick: [[700, 0, 0.025]],
  selected: [
    [523, 0, 0.12],
    [784, 0.1, 0.22],
  ],
  count: [[440, 0, 0.07]],
  go: [[880, 0, 0.18]],
  success: [
    [659, 0, 0.13],
    [880, 0.12, 0.13],
    [1047, 0.24, 0.23],
  ],
  miss: [
    [294, 0, 0.14],
    [247, 0.13, 0.18],
  ],
  end: [
    [392, 0, 0.2],
    [523, 0.18, 0.3],
  ],
  finish: [
    [523, 0, 0.16],
    [659, 0.14, 0.16],
    [784, 0.28, 0.18],
    [1047, 0.48, 0.48],
    [659, 0.48, 0.48],
    [784, 0.48, 0.48],
  ],
};
export function createSound() {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) throw Error('Audio unavailable');
  const context = new Context();
  const voices = new Set();
  const stop = () => {
    for (const voice of voices) {
      voice.stop();
      voice.disconnect();
    }
    voices.clear();
  };
  return {
    resume: () => context.resume(),
    running: () => context.state === 'running',
    play(cue) {
      if (context.state !== 'running') return;
      for (const [frequency, delay, duration] of motifs[cue] || []) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + delay;
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(cue === 'tick' ? 0.045 : 0.075, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        voices.add(oscillator);
        oscillator.onended = () => {
          voices.delete(oscillator);
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(start);
        oscillator.stop(start + duration + 0.01);
      }
    },
    stop,
    close() {
      stop();
      void context.close().catch(() => {});
    },
  };
}
