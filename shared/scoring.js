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
}) {
  if (!correct || elapsed < 0 || elapsed >= allowance) return 0;
  const speed = Math.max(0, Math.min(1, 1 - elapsed / allowance));
  return Math.round(
    maximum *
      (puzzle
        ? 0.8 + 0.15 * Math.max(0, Math.min(1, efficiency)) + 0.05 * speed
        : 0.8 + 0.2 * speed),
  );
}
