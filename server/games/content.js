import bank from './content-bank.json' with { type: 'json' };
import { random, seed } from './generate.js';
export function preparedPuzzle(game, level, source = seed()) {
  const entries = bank[game][level];
  const q = structuredClone(entries[random(source).int(0, entries.length)]);
  return { ...q, id: crypto.randomUUID() };
}
