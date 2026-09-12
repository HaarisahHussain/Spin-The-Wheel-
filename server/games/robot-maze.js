export const tiers = [
  { size: 5, start: 0, goal: 24, distance: 8, traps: 0, away: false, slack: 6, points: 50 },
  { size: 5, start: 0, goal: 24, distance: 8, traps: 1, away: false, slack: 4, points: 50 },
  { size: 5, start: 2, goal: 22, distance: 8, traps: 0, away: true, slack: 4, points: 50 },
  { size: 5, start: 2, goal: 22, distance: 12, traps: 0, away: true, slack: 4, points: 100 },
  { size: 7, start: 2, goal: 44, distance: 14, traps: 1, away: true, slack: 4, points: 100 },
  { size: 7, start: 2, goal: 44, distance: 18, traps: 1, away: true, slack: 2, points: 100 },
  { size: 7, start: 2, goal: 44, distance: 22, traps: 1, away: true, slack: 2, points: 150 },
  { size: 7, start: 2, goal: 44, distance: 26, traps: 1, away: true, slack: 2, points: 150 },
  { size: 7, start: 2, goal: 44, distance: 26, traps: 1, away: true, slack: 0, points: 150 },
];

export function neighbours(cell, size = 5) {
  return [
    cell % size ? cell - 1 : -1,
    cell % size < size - 1 ? cell + 1 : -1,
    cell >= size ? cell - size : -1,
    cell < size * (size - 1) ? cell + size : -1,
  ].filter((next) => next >= 0);
}

export function path(blocks, start, goal, size) {
  const walls = new Set(blocks);
  const parents = new Map([[start, null]]);
  const queue = [start];

  if (walls.has(start) || walls.has(goal)) return [];

  for (const cell of queue) {
    if (cell === goal) {
      const route = [];

      for (let at = goal; at !== null; at = parents.get(at)) {
        route.push(at);
      }

      return route.reverse();
    }

    for (const next of neighbours(cell, size)) {
      if (!walls.has(next) && !parents.has(next)) {
        parents.set(next, cell);
        queue.push(next);
      }
    }
  }

  return [];
}

// A seeded spanning-tree maze: connected, with no shortcuts through loops.
export function maze(size, seed) {
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const rooms = (size + 1) / 2;
  const root = Math.floor(random() * rooms * rooms);
  const seen = new Set([root]);
  const stack = [root];
  const open = new Set();

  const cell = (room) => Math.floor(room / rooms) * 2 * size + (room % rooms) * 2;

  open.add(cell(root));

  while (stack.length) {
    const room = stack.at(-1);
    const options = neighbours(room, rooms).filter((next) => !seen.has(next));

    if (!options.length) {
      stack.pop();
      continue;
    }

    const next = options[Math.floor(random() * options.length)];
    const from = cell(room);
    const to = cell(next);

    open.add(to);
    open.add((from + to) / 2);
    seen.add(next);
    stack.push(next);
  }

  return Array.from({ length: size * size }, (_, index) => index).filter(
    (index) => !open.has(index),
  );
}

export function fits(blocks, tier) {
  const { size, start, goal, distance, traps, away } = tier;
  const route = path(blocks, start, goal, size);

  if (route.length !== distance + 1) return false;

  const remaining = (cell) =>
    Math.abs(Math.floor(cell / size) - Math.floor(goal / size)) +
    Math.abs((cell % size) - (goal % size));

  // Require the correct first move to lead away from the goal.
  if (away && remaining(route[1]) <= remaining(start)) return false;

  const routeSet = new Set(route);
  const walls = new Set(blocks);

  // Count wrong branches that initially appear to approach the goal.
  const tempting = route
    .slice(0, -1)
    .reduce(
      (count, cell) =>
        count +
        neighbours(cell, size).filter(
          (next) => !walls.has(next) && !routeSet.has(next) && remaining(next) < remaining(cell),
        ).length,
      0,
    );

  return tempting >= traps;
}
