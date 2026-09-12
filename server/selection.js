import { randomInt, randomUUID } from 'node:crypto';
import { wheelSlots } from '../shared/wheel.js';
import { TIMING } from '../shared/timing.js';
import { shuffle } from './games/random.js';
export function selectGame(available, now, retained = null, draw = randomInt) {
  const ids = available.map((game) => game.id);
  const slots = wheelSlots(shuffle(ids));
  if (retained && !ids.includes(retained))
    throw Object.assign(
      Error('The retained game is unavailable. Ask the host to resolve this turn.'),
      { status: 409 },
    );
  const gameId = retained || ids[draw(ids.length)];
  const matching = slots.flatMap((id, index) => (id === gameId ? [index] : []));
  return {
    id: randomUUID(),
    gameId,
    slots,
    sector: matching[draw(matching.length)],
    startedAt: now,
    until: now + TIMING.wheel,
  };
}
