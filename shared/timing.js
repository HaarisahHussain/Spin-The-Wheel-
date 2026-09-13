import { LEVEL_CAPS, MAX_RUNS } from './scoring.js';
const phases = {
  wheel: 3000,
  countdown: 3000,
  introduction: 20000,
  liveIntroduction: 10000,
  feedback: 4000,
  execution: 4000,
  result: 6000,
  winner: 8000,
  cancelled: 3000,
  ready: 20000,
};
export const TIMING = Object.freeze({
  ...phases,
  soloSlot:
    phases.ready +
    phases.wheel +
    phases.introduction +
    phases.countdown +
    phases.result +
    LEVEL_CAPS.reduce((sum, cap) => sum + cap + MAX_RUNS * phases.execution + phases.feedback, 0),
});
export const LIVE_ROUNDS = [30, 30, 30, 30, 30];
export const LIVE_PUZZLE_ROUNDS = [30, 35, 40];
export const liveDuration = (config) =>
  (config.lobbySeconds ?? 20) * 1000 +
  TIMING.wheel +
  TIMING.liveIntroduction +
  TIMING.countdown +
  Math.max(
    LIVE_ROUNDS.reduce((n, t) => n + Math.round(t * (config.liveTimeScale ?? 1)) * 1000, 0) +
      LIVE_ROUNDS.length * TIMING.feedback,
    LIVE_PUZZLE_ROUNDS.reduce((n, t) => n + Math.round(t * (config.liveTimeScale ?? 1)) * 1000, 0) +
      LIVE_PUZZLE_ROUNDS.length * (TIMING.execution + TIMING.feedback),
  ) +
  TIMING.winner;
