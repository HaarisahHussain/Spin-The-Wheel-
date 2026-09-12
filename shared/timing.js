export const TIMING = Object.freeze({
  wheel: 3000,
  countdown: 3000,
  feedback: 3000,
  result: 6000,
  winner: 8000,
  cancelled: 3000,
  ready: 20000,
  soloSlot: 145000,
});
export const LIVE_ROUNDS = [15, 15, 20, 20, 25, 25];
export const liveDuration = (config) =>
  (config.lobbySeconds ?? 20) * 1000 +
  TIMING.wheel +
  TIMING.countdown +
  LIVE_ROUNDS.reduce(
    (sum, seconds) => sum + Math.round(seconds * (config.liveTimeScale ?? 1)) * 1000,
    0,
  ) +
  LIVE_ROUNDS.length * TIMING.feedback +
  TIMING.winner;
