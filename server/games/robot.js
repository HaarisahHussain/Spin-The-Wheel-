import { random, fingerprint } from './generate.js';
export const moves = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
export function nextCell(cell, move, size = 5) {
  const d = moves[move];
  if (!d) return null;
  const x = (cell % size) + d[0],
    y = Math.floor(cell / size) + d[1];
  return x < 0 || y < 0 || x >= size || y >= size ? null : y * size + x;
}
function collect(q, cell, mask) {
  return (q.items || []).reduce((n, item, i) => (item.cell === cell ? n | (1 << i) : n), mask);
}
export function robotStep(q, cell, mask, move) {
  const next = nextCell(cell, move, q.size);
  if (next === null) return { cell, mask, error: 'leaves the board', failedCell: cell };
  if (q.blocks.includes(next)) return { cell, mask, error: 'hits a wall', failedCell: next };
  const gate = (q.gates || []).find((g) => g.cell === next);
  if (gate && !(mask & (1 << q.items.findIndex((item) => item.id === gate.key))))
    return { cell, mask, error: `needs key ${gate.label}`, failedCell: next };
  return { cell: next, mask: collect(q, next, mask) };
}
export function solveRobot(q) {
  const first = { cell: q.start, mask: collect(q, q.start, 0), path: [] },
    todo = [first],
    seen = new Set([`${first.cell}:${first.mask}`]);
  const all = (1 << (q.items || []).length) - 1;
  for (let i = 0; i < todo.length; i++) {
    const s = todo[i];
    if (s.cell === q.goal && s.mask === all) return s.path;
    if (s.path.length >= 18) continue;
    for (const move of Object.keys(moves)) {
      const n = robotStep(q, s.cell, s.mask, move),
        key = `${n.cell}:${n.mask}`;
      if (n.error || seen.has(key)) continue;
      seen.add(key);
      todo.push({ ...n, path: [...s.path, move] });
    }
  }
  return null;
}
export function validRobot(q, p) {
  return (
    Array.isArray(p) &&
    p.length > 0 &&
    p.length <= q.maxMoves &&
    p.length <= 18 &&
    p.every((m) => typeof m === 'string' && Object.hasOwn(moves, m))
  );
}
export function evaluateRobot(q, p) {
  if (!validRobot(q, p)) return { correct: false, efficiency: 0 };
  let cell = q.start,
    mask = collect(q, cell, 0);
  const path = [cell],
    frames = [{ cell, mask }],
    events = [];
  for (let i = 0; i < p.length; i++) {
    const n = robotStep(q, cell, mask, p[i]);
    if (n.error)
      return {
        correct: false,
        efficiency: 0,
        path,
        frames,
        events: [...events, { sourceIndex: i, cell, mask, type: 'failure', message: n.error }],
        failedIndex: i,
        failedCell: n.failedCell,
        feedback: `Step ${i + 1} ${n.error}.`,
      };
    events.push({
      sourceIndex: i,
      cell: n.cell,
      mask: n.mask,
      type: n.mask !== mask ? 'collect' : 'move',
    });
    cell = n.cell;
    mask = n.mask;
    path.push(cell);
    frames.push({ cell, mask });
  }
  const correct = cell === q.goal && mask === (1 << (q.items || []).length) - 1;
  return {
    correct,
    efficiency: Math.min(1, q.optimum / p.length),
    path,
    frames,
    events,
    feedback: correct
      ? 'All items collected. Rescued.'
      : cell === q.goal
        ? 'Collect every required item before finishing.'
        : 'Finish your program at the flag.',
  };
}
export function robotCandidate(level, source) {
  const r = random(source),
    q = { game: 'robot', kind: 'puzzle', size: 5, level, items: [], gates: [], blocks: [] };
  q.start = r.int(0, 25);
  q.goal = r.int(0, 25);
  if (q.start === q.goal) return null;
  if (level >= 2) {
    const columns = level >= 3 ? [1, 3] : [2];
    q.start = r.int(0, 5) * 5;
    q.goal = r.int(0, 5) * 5 + 4;
    columns.forEach((x, i) => {
      const door = r.int(0, 5) * 5 + x;
      for (let y = 0; y < 5; y++) if (y * 5 + x !== door) q.blocks.push(y * 5 + x);
      q.gates.push({ cell: door, key: `key-${i}`, label: String(i + 1) });
      q.items.push({
        id: `key-${i}`,
        kind: 'key',
        label: String(i + 1),
        cell: r.int(0, 5) * 5 + (i ? 2 : 0),
      });
    });
  }
  if (level === 1 || level === 4)
    q.items.push({ id: 'chip', kind: 'chip', label: 'Chip', cell: r.int(0, 25) });
  const occupied = [
    q.start,
    q.goal,
    ...q.items.map((i) => i.cell),
    ...q.gates.map((g) => g.cell),
  ];
  if (
    new Set(occupied).size !== occupied.length ||
    q.items.some((i) => q.blocks.includes(i.cell))
  )
    return null;
  for (let i = 0; i < 25; i++)
    if (!occupied.includes(i) && !q.blocks.includes(i) && r.int(0, 100) < (level < 2 ? 23 : 8))
      q.blocks.push(i);
  q.blocks.sort((a, b) => a - b);
  const solution = solveRobot(q);
  if (!solution || solution.length < 4 + level || solution.length > [7, 10, 12, 14, 14][level])
    return null;
  if (level === 1) {
    const direct = solveRobot({ ...q, items: [] });
    if (!direct || solution.length < direct.length + 2) return null;
  }
  q.solution = solution;
  q.optimum = solution.length;
  q.maxMoves = Math.min(18, solution.length + [4, 3, 2, 1, 0][level]);
  q.family = ['route', 'detour', 'key-gate', 'two-dependencies', 'tight-dependencies'][level];
  q.prompt =
    level === 0
      ? 'Finish at the flag.'
      : `Collect ${q.items.length === 1 ? 'the item' : 'all items'}, then finish at the flag. Keys open matching gates.`;
  q.fingerprint = fingerprint({
    start: q.start,
    goal: q.goal,
    blocks: q.blocks,
    items: q.items,
    gates: q.gates,
  });
  q.reasoning = {
    objective: q.family,
    decisions: q.items.length + 1,
    commonMistake: level
      ? 'Heading to the goal before satisfying dependencies.'
      : 'Following the apparent shortest route through a wall.',
  };
  return q;
}
