// Deterministic layout only. Outcome randomness belongs to the server.
export function wheelSlots(ids) {
  if (!ids.length || ids.length > 10 || new Set(ids).size !== ids.length)
    throw Error('The wheel needs 1–10 unique games.');
  const counts = ids.map((_, i) => Math.floor(10 / ids.length) + (i < 10 % ids.length ? 1 : 0));
  const layout = [];
  function arrange() {
    if (layout.length === 10) return ids.length === 1 || layout[0] !== layout[9];
    for (const i of counts.map((_, i) => i).sort((a, b) => counts[b] - counts[a])) {
      if (!counts[i] || (ids.length > 1 && layout.at(-1) === ids[i])) continue;
      counts[i]--;
      layout.push(ids[i]);
      if (arrange()) return true;
      layout.pop();
      counts[i]++;
    }
    return false;
  }
  if (!arrange()) throw Error('Cannot arrange wheel.');
  return layout;
}
