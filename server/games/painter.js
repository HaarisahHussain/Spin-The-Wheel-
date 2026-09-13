import { random, fingerprint } from './generate.js';
import { moves, nextCell } from './robot.js';
const primitives = [...Object.keys(moves), 'paint'];
export const tileCost = (p) =>
  p.reduce((n, v) => n + (typeof v === 'string' ? 1 : 1 + v.body.length), 0);
export function expandPainter(p) {
  return p.flatMap((v, sourceIndex) =>
    typeof v === 'string'
      ? [{ action: v, sourceIndex }]
      : Array.from({ length: v.repeat }, (_, iteration) =>
          v.body.map((action, bodyIndex) => ({ action, sourceIndex, bodyIndex, iteration })),
        ).flat(),
  );
}
export function validPainter(q, p) {
  return (
    Array.isArray(p) &&
    p.length > 0 &&
    p.length <= 18 &&
    p.filter((v) => v && typeof v === 'object').length <= 1 &&
    p.every((v) =>
      typeof v === 'string'
        ? primitives.includes(v)
        : q.allowRepeat &&
          v &&
          Number.isInteger(v.repeat) &&
          v.repeat >= 2 &&
          v.repeat <= 4 &&
          Array.isArray(v.body) &&
          v.body.length >= 2 &&
          v.body.length <= 4 &&
          v.body.every((m) => typeof m === 'string' && primitives.includes(m)),
    ) &&
    tileCost(p) <= q.maxTiles &&
    expandPainter(p).length <= 18
  );
}
export function evaluatePainter(q, p) {
  if (!validPainter(q, p)) return { correct: false, efficiency: 0 };
  let cell = q.start;
  const painted = new Set(),
    frames = [{ cell, painted: [] }],
    events = [];
  for (const [index, step] of expandPainter(p).entries()) {
    if (step.action === 'paint') painted.add(cell);
    else {
      const next = nextCell(cell, step.action, q.size);
      if (next === null)
        return {
          correct: false,
          efficiency: 0,
          frames,
          events: [...events, { ...step, cell, type: 'failure' }],
          failedIndex: index,
          failedSource: step.sourceIndex,
          feedback: `Instruction ${step.sourceIndex + 1} leaves the board${step.iteration !== undefined ? ` on repetition ${step.iteration + 1}` : ''}.`,
        };
      cell = next;
    }
    events.push({ ...step, cell, type: step.action, painted: [...painted] });
    frames.push({ cell, painted: [...painted] });
  }
  const correct = painted.size === q.target.length && q.target.every((v) => painted.has(v));
  return {
    correct,
    efficiency: Math.min(1, q.optimum / tileCost(p)),
    frames,
    events,
    painted: [...painted],
    feedback: correct
      ? 'Pattern matched.'
      : 'Compare missing dots and extra crosses with the target.',
  };
}
const bodies = [];
function enumerate(prefix) {
  if (prefix.length >= 2 && prefix.includes('paint') && prefix.some((v) => v !== 'paint'))
    bodies.push(prefix);
  if (prefix.length === 4) return;
  for (const m of primitives) enumerate([...prefix, m]);
}
enumerate([]);
// Offline bounded Dijkstra over the exact grammar, not used by the live request path.
export function solvePainter(q, { nodeLimit = 60000 } = {}) {
  const target = q.target.reduce((n, c) => n | (1 << c), 0),
    macros = new Map(),
    buckets = Array.from({ length: 19 }, () => []),
    seen = new Map();
  let visited = 0;
  const compile = (cell) => {
    if (macros.has(cell)) return macros.get(cell);
    const list = [],
      dedup = new Map();
    for (const body of bodies)
      for (let count = 2; count <= 4; count++) {
        let at = cell,
          mask = 0,
          ok = true;
        for (let i = 0; i < count && ok; i++)
          for (const action of body) {
            if (action === 'paint') {
              mask |= 1 << at;
              if (mask & ~target) {
                ok = false;
                break;
              }
            } else {
              at = nextCell(at, action, q.size);
              if (at === null) {
                ok = false;
                break;
              }
            }
          }
        if (!ok || !mask) continue;
        const steps = body.length * count,
          key = `${at}:${mask}:${steps}`,
          cost = 1 + body.length;
        if (!dedup.has(key) || dedup.get(key).cost > cost)
          dedup.set(key, { cell: at, mask, steps, cost, instruction: { repeat: count, body } });
      }
    list.push(...dedup.values());
    macros.set(cell, list);
    return list;
  };
  buckets[0].push({ cell: q.start, mask: 0, used: 0, steps: 0, program: [] });
  for (let cost = 0; cost <= 18; cost++)
    for (let i = 0; i < buckets[cost].length; i++) {
      const s = buckets[cost][i],
        key = `${s.cell}:${s.mask}:${s.used}:${s.steps}`;
      if (seen.has(key) && seen.get(key) < cost) continue;
      if (s.mask === target) return { program: s.program, cost, nodes: visited };
      if (++visited > nodeLimit) return null;
      const add = (cell, mask, used, steps, instruction, extra) => {
        const nextCost = cost + extra,
          k = `${cell}:${mask}:${used}:${steps}`;
        if (steps > 18 || nextCost > 18 || (seen.has(k) && seen.get(k) <= nextCost)) return;
        seen.set(k, nextCost);
        buckets[nextCost].push({
          cell,
          mask,
          used,
          steps,
          program: [...s.program, instruction],
        });
      };
      for (const move of Object.keys(moves)) {
        const next = nextCell(s.cell, move, q.size);
        if (next !== null) add(next, s.mask, s.used, s.steps + 1, move, 1);
      }
      if (target & (1 << s.cell) && !(s.mask & (1 << s.cell)))
        add(s.cell, s.mask | (1 << s.cell), s.used, s.steps + 1, 'paint', 1);
      if (q.allowRepeat && !s.used)
        for (const m of compile(s.cell))
          add(m.cell, s.mask | m.mask, 1, s.steps + m.steps, m.instruction, m.cost);
    }
  return null;
}
export function painterCandidate(level, source) {
  const r = random(source),
    size = 5,
    start = r.int(0, 25),
    dirs = Object.keys(moves);
  let program;
  if (level === 0) program = [dirs[r.int(0, 4)], 'paint', dirs[r.int(0, 4)], 'paint'];
  else {
    const a = dirs[r.int(0, 4)],
      b = dirs[r.int(0, 4)],
      body = level < 3 ? [a, 'paint'] : [a, 'paint', b, 'paint'];
    program = [
      ...(level >= 4 ? [dirs[r.int(0, 4)], 'paint'] : []),
      { repeat: r.int(2, level < 3 ? 5 : 4), body },
      ...(level >= 4 ? ['paint'] : []),
    ];
  }
  const q = {
    kind: 'puzzle',
    game: 'painter',
    level,
    size,
    start,
    allowRepeat: level >= 1,
    maxTiles: 18,
    maxMoves: 18,
    target: [],
    optimum: 1,
  };
  let cell = start;
  const target = new Set();
  for (const { action } of expandPainter(program)) {
    if (action === 'paint') target.add(cell);
    else {
      cell = nextCell(cell, action, size);
      if (cell === null) return null;
    }
  }
  q.target = [...target].sort((a, b) => a - b);
  if (q.target.length < (level >= 3 ? 4 : 2) || q.target.length > 7) return null;
  const solved = solvePainter(q);
  if (!solved) return null;
  if (level >= 1 && !solved.program.some((v) => typeof v === 'object')) return null;
  if (level >= 4 && solved.program.length < 2) return null;
  q.optimum = solved.cost;
  q.solution = solved.program;
  q.maxTiles = solved.cost + (level === 0 ? 2 : level === 1 ? 1 : 0);
  q.starter =
    level === 2
      ? solved.program.map((v) =>
          typeof v === 'string' ? v : { ...v, repeat: v.repeat === 2 ? 3 : 2 },
        )
      : [];
  q.family = ['move-paint', 'repeat-unit', 'repair-repeat', 'build-repeat', 'prefix-repeat'][
    level
  ];
  q.prompt =
    level === 2
      ? 'Repair the repeated block to match the target.'
      : 'Match the target. Move changes position; Paint marks the square.';
  q.reasoning = {
    objective: q.family,
    commonMistake: 'Counting a Repeat container as one executed action, or forgetting Paint.',
    minimumTiles: q.optimum,
  };
  q.fingerprint = fingerprint({
    start,
    target: q.target,
    allowRepeat: q.allowRepeat,
    maxTiles: q.maxTiles,
  });
  return q;
}
