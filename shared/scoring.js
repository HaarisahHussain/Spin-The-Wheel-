export const SCORE_SCALE = 1000000;
export const LEVEL_MAXIMA = [800000, 1200000, 1800000, 2300000, 2900000];
export const LEVEL_CAPS = Array(5).fill(30000);
export const MAX_RUNS = 3;
export function scoreChallenge({
  correct,
  efficiency = 1,
  elapsed,
  allowance,
  maximum,
  puzzle = false,
  runs = 1,
}) {
  if (!correct || elapsed < 0 || elapsed >= allowance) return 0;
  const speed = Math.max(0, Math.min(1, 1 - elapsed / allowance));
  return Math.round(
    maximum *
      (puzzle ? Math.max(0.8, 1 - 0.1 * (Math.max(1, runs) - 1)) : 1) *
      (puzzle
        ? 0.8 + 0.15 * Math.max(0, Math.min(1, efficiency)) + 0.05 * speed
        : 0.8 + 0.2 * speed),
  );
}

// Weight the three puzzle tiers (0,2,4) to the same 9-point session maximum.
export function liveMaximum(round, puzzle) {
  if (!puzzle) return LEVEL_MAXIMA[round];
  const weights = [LEVEL_MAXIMA[0], LEVEL_MAXIMA[2], LEVEL_MAXIMA[4]];
  const sum = weights.reduce((a, b) => a + b, 0);
  const first = Math.round((9000000 * weights[0]) / sum),
    second = Math.round((9000000 * weights[1]) / sum);
  return [first, second, 9000000 - first - second][round];
}
