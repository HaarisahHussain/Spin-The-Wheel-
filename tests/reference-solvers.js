// Independent test oracles: no production movement, evaluators, expansion or solver imports.
const directions = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function neighbour(c, d, size) {
  const x = (c % size) + d[0],
    y = Math.floor(c / size) + d[1];
  return x < 0 || x >= size || y < 0 || y >= size ? -1 : y * size + x;
}
export function robotMinimum(q) {
  const initial = q.items.reduce((m, v, i) => (v.cell === q.start ? m | (2 ** i) : m), 0),
    todo = [[q.start, initial, 0]],
    seen = new Set();
  for (let i = 0; i < todo.length; i++) {
    const [c, m, n] = todo[i],
      key = `${c}/${m}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (c === q.goal && m === 2 ** q.items.length - 1) return n;
    for (const d of Object.values(directions)) {
      const next = neighbour(c, d, q.size);
      if (next < 0 || q.blocks.includes(next)) continue;
      const gate = q.gates.find((g) => g.cell === next);
      if (gate && !(m & (2 ** q.items.findIndex((v) => v.id === gate.key)))) continue;
      const mask = q.items.reduce(
        (bits, v, k) => (v.cell === next ? bits | (2 ** k) : bits),
        m,
      );
      todo.push([next, mask, n + 1]);
    }
  }
  return null;
}
export function orders(values) {
  return values.length
    ? values.flatMap((v, i) =>
        orders(values.filter((_, j) => i !== j)).map((rest) => [v, ...rest]),
      )
    : [[]];
}
export function parcelDestinations(q, order) {
  return q.packets.map((p) => {
    for (const id of order) {
      const r = q.rules.find((v) => v.id === id);
      let match = true;
      for (const field of Object.keys(r.when)) if (p[field] !== r.when[field]) match = false;
      if (match) return r.destination;
    }
    return q.fallback;
  });
}
export function painterMinimum(q) {
  const actions = [...Object.keys(directions), 'paint'],
    target = q.target.reduce((n, c) => n | (2 ** c), 0);
  const blocks = [];
  if (q.allowRepeat)
    for (let length = 2; length <= 4; length++) {
      const visit = (p) => {
        if (p.length === length) {
          if (p.includes('paint'))
            for (let n = 2; n <= 4; n++)
              blocks.push({ steps: Array(n).fill(p).flat(), cost: 1 + length });
          return;
        }
        for (const a of actions) visit([...p, a]);
      };
      visit([]);
    }
  const cache = new Map();
  const transitions = (c) => {
    if (cache.has(c)) return cache.get(c);
    const result = [];
    for (const block of blocks) {
      let at = c,
        mask = 0,
        valid = true;
      for (const action of block.steps) {
        if (action === 'paint') {
          mask |= 2 ** at;
          if (mask & ~target) {
            valid = false;
            break;
          }
        } else {
          at = neighbour(at, directions[action], q.size);
          if (at < 0) {
            valid = false;
            break;
          }
        }
      }
      if (valid) result.push({ at, mask, steps: block.steps.length, cost: block.cost });
    }
    cache.set(c, result);
    return result;
  };
  // Exhaust all costs up to the claimed optimum; catches any cheaper valid program too.
  const buckets = Array.from({ length: q.optimum + 1 }, () => []),
    seen = new Set();
  buckets[0].push([q.start, 0, 0, 0]);
  for (let cost = 0; cost <= q.optimum; cost++)
    for (const [at, mask, steps, used] of buckets[cost]) {
      const key = `${at}/${mask}/${steps}/${used}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (mask === target) return cost;
      const add = (c, m, s, u, extra) => {
        if (c >= 0 && s <= 18 && cost + extra <= q.optimum)
          buckets[cost + extra].push([c, m, s, u]);
      };
      for (const d of Object.values(directions))
        add(neighbour(at, d, q.size), mask, steps + 1, used, 1);
      if (target & (2 ** at)) add(at, mask | (2 ** at), steps + 1, used, 1);
      if (!used)
        for (const t of transitions(at)) add(t.at, mask | t.mask, steps + t.steps, 1, t.cost);
    }
  return null;
}
