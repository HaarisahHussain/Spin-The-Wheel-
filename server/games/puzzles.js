import { random, seed, fingerprint } from './generate.js';
export function neighbours(cell, size) {
  return [
    [-size, 'up'],
    [size, 'down'],
    [-1, 'left'],
    [1, 'right'],
  ]
    .filter(
      ([d]) =>
        cell + d >= 0 &&
        cell + d < size * size &&
        (Math.abs(d) !== 1 || Math.floor(cell / size) === Math.floor((cell + d) / size)),
    )
    .map(([d, move]) => ({ cell: cell + d, move }));
}
export function route(q) {
  const todo = [[q.start, []]],
    seen = new Set([q.start]),
    walls = new Set(q.blocks);
  for (let i = 0; i < todo.length; i++) {
    const [cell, path] = todo[i];
    if (cell === q.goal) return path;
    for (const n of neighbours(cell, q.size))
      if (!walls.has(n.cell) && !seen.has(n.cell)) {
        seen.add(n.cell);
        todo.push([n.cell, [...path, n.move]]);
      }
  }
  return null;
}
export function makeRobot(level, source = seed()) {
  const r = random(source),
    size = level < 3 ? 5 : 7;
  let q;
  for (let tries = 0; tries < 100; tries++) {
    const start = r.int(0, size * size),
      goal = r.int(0, size * size);
    if (start === goal) continue;
    const blocks = Array.from({ length: size * size }, (_, i) => i).filter(
      (i) => i !== start && i !== goal && r.int(0, 100) < 20 + level * 2,
    );
    q = { size, start, goal, blocks };
    const path = route(q);
    if (path && path.length >= Math.min(3 + level, 7) && path.length <= 16) {
      q.solution = path;
      break;
    }
    q = null;
  }
  if (!q) {
    q = {
      size,
      start: 0,
      goal: size * size - 1,
      blocks: Array.from({ length: size * size }, (_, i) => i).filter(
        (i) => i >= size && i % size !== size - 1 && i % size !== 1,
      ),
    };
    q.solution = route(q);
  }
  return {
    ...q,
    id: crypto.randomUUID(),
    kind: 'puzzle',
    game: 'robot',
    level,
    seed: source,
    family: `maze-${size}`,
    optimum: q.solution.length,
    maxMoves: q.solution.length + Math.max(1, 6 - level),
    position: q.start,
    program: [],
    running: false,
    feedback: '',
    fingerprint: fingerprint({ size: q.size, start: q.start, goal: q.goal, blocks: q.blocks }),
  };
}
export function validProgram(q, p) {
  if (!Array.isArray(p)) return false;
  if (q.game === 'robot')
    return (
      p.length > 0 &&
      p.length <= q.maxMoves &&
      p.every((m) => ['up', 'down', 'left', 'right'].includes(m))
    );
  return false;
}
export function evaluatePuzzle(q, program) {
  if (!validProgram(q, program)) return { correct: false, efficiency: 0, path: [] };
  if (q.game === 'robot') {
    let cell = q.start;
    const path = [cell];
    for (let i = 0; i < program.length; i++) {
      const next = neighbours(cell, q.size).find((n) => n.move === program[i]);
      if (!next || q.blocks.includes(next.cell))
        return {
          correct: false,
          efficiency: 0,
          path,
          feedback: `Blocked at move ${i + 1}.`,
          failedIndex: i,
          failedCell: next?.cell ?? cell,
        };
      cell = next.cell;
      path.push(cell);
    }
    return {
      correct: cell === q.goal,
      efficiency: Math.min(1, q.optimum / program.length),
      path,
      feedback: cell === q.goal ? 'Rescued.' : 'Program ended before the goal.',
    };
  }
  return { correct: false, efficiency: 0 };
}
