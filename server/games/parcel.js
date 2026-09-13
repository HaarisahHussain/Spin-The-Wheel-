import { random, fingerprint } from './generate.js';
export function matches(packet, when) {
  return Object.entries(when).every(([k, v]) => packet[k] === v);
}
export function routeParcel(q, order, packet) {
  const rule = order
    .map((id) => q.rules.find((r) => r.id === id))
    .find((r) => matches(packet, r.when));
  return { ruleId: rule?.id ?? null, destination: rule?.destination ?? q.fallback };
}
export function permutations(a) {
  if (a.length <= 1) return [a];
  return a.flatMap((v, i) => permutations(a.filter((_, n) => n !== i)).map((t) => [v, ...t]));
}
export function validParcel(q, p) {
  return (
    Array.isArray(p) &&
    p.length === q.rules.length &&
    new Set(p).size === p.length &&
    p.every((id) => typeof id === 'string' && q.rules.some((r) => r.id === id))
  );
}
export function evaluateParcel(q, p) {
  if (!validParcel(q, p)) return { correct: false, efficiency: 0 };
  const routes = q.packets.map((packet) => ({
    packetId: packet.id,
    ...routeParcel(q, p, packet),
  }));
  const failed = routes.findIndex((v, i) => v.destination !== q.packets[i].target);
  return {
    correct: failed < 0,
    efficiency: 1,
    routes,
    events: routes.map((v, i) => ({
      ...v,
      sourceIndex: p.indexOf(v.ruleId),
      type: 'route',
      packetIndex: i,
    })),
    feedback:
      failed < 0
        ? 'Every parcel reached its destination.'
        : `Parcel ${failed + 1} follows its first matching rule. Check which rule runs too early.`,
  };
}
export function parcelCandidate(level, source) {
  const r = random(source),
    n = [3, 3, 4, 4, 5][level];
  const predicates = [
    { shape: 0 },
    { shape: 1 },
    { shape: 2 },
    { colour: 0 },
    { colour: 1 },
    { stripe: true },
    { stripe: false },
  ];
  if (level >= 2)
    for (let shape = 0; shape < 3; shape++)
      for (let colour = 0; colour < 2; colour++) predicates.push({ shape, colour });
  const rules = r
    .shuffle(predicates)
    .slice(0, n)
    .map((when, i) => ({
      id: `rule-${fingerprint({ source, i }).slice(0, 12)}`,
      when,
      destination: r.int(0, 3),
    }));
  const q = {
    kind: 'puzzle',
    game: 'parcel',
    level,
    rules,
    fallback: 2,
    family: `priority-${n}-${level}`,
    maxMoves: n,
  };
  const all = [];
  for (let shape = 0; shape < 3; shape++)
    for (let colour = 0; colour < 2; colour++)
      for (const stripe of [false, true]) all.push({ shape, colour, stripe });
  const solution = rules.map((v) => v.id),
    packets = r.shuffle(all).slice(0, [6, 6, 7, 8, 8][level]);
  q.packets = packets.map((p, i) => ({
    ...p,
    id: `parcel-${i}`,
    target: routeParcel(q, solution, p).destination,
  }));
  if (new Set(q.packets.map((p) => p.target)).size < 2) return null;
  const exercised = new Set(q.packets.map((p) => routeParcel(q, solution, p).ruleId));
  if (rules.some((rule) => !exercised.has(rule.id))) return null;
  const orders = permutations(solution),
    valid = orders.filter((p) => evaluateParcel(q, p).correct);
  if (valid.length / orders.length > [0.34, 0.34, 0.17, 0.09, 0.045][level]) return null;
  const incorrect = orders.filter((p) => !evaluateParcel(q, p).correct);
  if (!incorrect.length) return null;
  q.rules = r.shuffle(q.rules);
  q.solution = solution;
  q.starter = incorrect[r.int(0, incorrect.length)];
  q.validOrders = valid.length;
  q.prompt = 'Reorder the rules. Each parcel follows the first match; otherwise it goes to C.';
  q.fingerprint = fingerprint({ rules, packets: q.packets });
  q.reasoning = {
    objective: 'Order overlapping conditions',
    validOrders: valid.length,
    possibleOrders: orders.length,
    commonMistake: 'A broad rule captures a parcel before its exception.',
  };
  return q;
}
