import { shuffle } from "../random.js";

export function hasRobotPath(obstacles) {
  const blocked = new Set(obstacles);
  const q = [0],
    seen = new Set([0]);
  while (q.length) {
    const n = q.shift();
    if (n === 24) return true;
    const r = Math.floor(n / 5),
      c = n % 5;
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nr = r + dr,
        nc = c + dc,
        nn = nr * 5 + nc;
      if (
        nr >= 0 &&
        nr < 5 &&
        nc >= 0 &&
        nc < 5 &&
        !blocked.has(nn) &&
        !seen.has(nn)
      ) {
        seen.add(nn);
        q.push(nn);
      }
    }
  }
  return false;
}

export function generateRobotLevels() {
  const levels = [];
  for (let level = 1; level <= 4; level++) {
    let obstacles;
    do {
      const count = 3 + level * 2;
      obstacles = shuffle([...Array(23).keys()].slice(1)).slice(0, count);
    } while (!hasRobotPath(obstacles));
    levels.push({
      obstacles,
      message:
        level === 4
          ? "Boss level. Build a clean route to the finish."
          : "New layout! Plan your blocks and reach the finish.",
    });
  }
  return levels;
}
