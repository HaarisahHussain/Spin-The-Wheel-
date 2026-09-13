import { random, seed, fingerprint } from './generate.js';
const directions = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export function parcelRoute(q, program, type) {
  let node = 0,
    path = [];
  for (let i = 0; i < q.depth; i++) {
    path.push(node);
    const left = q.groups[node].includes(type) !== Boolean(program[node]);
    node = node * 2 + (left ? 1 : 2);
  }
  return { path, destination: node - q.groups.length };
}
export function makeParcel(level, source = seed()) {
  const r = random(source),
    depth = level < 2 ? 1 : 2,
    n = 2 ** depth,
    types = r.shuffle(Array.from({ length: n }, (_, i) => i));
  const groups =
    depth === 1
      ? [[types[0]]]
      : [
          [types[0], types[1]],
          [types[0], types[2]],
          [types[0], types[2]],
        ];
  const solution = groups.map(() => r.int(0, 2)),
    q = { depth, groups };
  const depots = Array(n);
  for (const t of types) depots[parcelRoute(q, solution, t).destination] = t;
  return {
    ...q,
    id: crypto.randomUUID(),
    kind: 'puzzle',
    game: 'parcel',
    seed: source,
    family: `conveyor-${depth}`,
    level,
    packets: r.shuffle(types),
    depots,
    solution,
    maxMoves: groups.length,
    optimum: depth * n,
    prompt: 'Send each shape to its matching depot. Tap a junction to swap its exits.',
    fingerprint: fingerprint({ groups, depots, types }),
  };
}
export function makePainter(level, source = seed()) {
  const r = random(source),
    size = 4,
    start = r.int(0, 16),
    target = new Set([start]);
  function walk(cell, seen, moves) {
    if (moves.length === 2 + level) return moves;
    for (const move of r.shuffle(Object.keys(directions))) {
      const next = step(cell, move, size);
      if (next === null || seen.has(next)) continue;
      const result = walk(next, new Set([...seen, next]), [...moves, move]);
      if (result) return result;
    }
    return null;
  }
  let cell = start;
  const solution = ['paint'];
  for (const move of walk(start, new Set([start]), [])) {
    cell = step(cell, move, size);
    solution.push(move, 'paint');
    target.add(cell);
  }
  return {
    id: crypto.randomUUID(),
    kind: 'puzzle',
    game: 'painter',
    seed: source,
    family: 'walk-and-paint',
    level,
    size,
    start,
    target: [...target].sort((a, b) => a - b),
    solution,
    maxMoves: 24,
    allowRepeat: level >= 3,
    optimum: null,
    prompt: 'Match the target. Move changes position; Paint marks the current square.',
    fingerprint: fingerprint({ size, start, target: [...target].sort((a, b) => a - b) }),
  };
}
function step(cell, move, size) {
  const d = directions[move];
  if (!d) return null;
  const x = (cell % size) + d[0],
    y = Math.floor(cell / size) + d[1];
  return x < 0 || y < 0 || x >= size || y >= size ? null : y * size + x;
}
export function expand(program) {
  return program.flatMap((m) =>
    typeof m === 'string' ? [m] : Array.from({ length: m.repeat }, () => m.body).flat(),
  );
}
export function validNewPuzzle(q, p) {
  if (!Array.isArray(p)) return false;
  if (q.game === 'parcel')
    return p.length === q.groups.length && p.every((v) => v === 0 || v === 1);
  return (
    p.length > 0 &&
    p.length <= q.maxMoves &&
    p.filter((v) => typeof v === 'object').length <= 1 &&
    p.every((v) =>
      typeof v === 'string'
        ? v === 'paint' || Object.hasOwn(directions, v)
        : q.allowRepeat &&
          v &&
          v.repeat === 2 &&
          Array.isArray(v.body) &&
          v.body.length > 0 &&
          v.body.length <= 4 &&
          v.body.every((m) => m === 'paint' || Object.hasOwn(directions, m)),
    ) &&
    expand(p).length <= 24
  );
}
export function evaluateNewPuzzle(q, p) {
  if (!validNewPuzzle(q, p)) return { correct: false, efficiency: 0 };
  if (q.game === 'parcel') {
    const routes = q.packets.map((type) => ({ type, ...parcelRoute(q, p, type) }));
    const correct = routes.every((r) => q.depots[r.destination] === r.type);
    return {
      correct,
      efficiency: 1,
      routes,
      feedback: correct
        ? 'Delivered'
        : 'A parcel reached the wrong depot. Swap an exit and try again.',
    };
  }
  let cell = q.start,
    painted = new Set(),
    frames = [{ cell, painted: [] }];
  const commands = expand(p);
  for (let i = 0; i < commands.length; i++) {
    const m = commands[i];
    if (m === 'paint') painted.add(cell);
    else {
      const next = step(cell, m, q.size);
      if (next === null)
        return {
          correct: false,
          efficiency: 0,
          frames,
          failedIndex: i,
          feedback: `Step ${i + 1} leaves the board.`,
        };
      cell = next;
    }
    frames.push({ cell, painted: [...painted] });
  }
  const correct = q.target.length === painted.size && q.target.every((c) => painted.has(c));
  return {
    correct,
    efficiency: 1,
    frames,
    painted: [...painted],
    feedback: correct ? 'Matched' : 'Compare missing and extra painted squares with the target.',
  };
}
