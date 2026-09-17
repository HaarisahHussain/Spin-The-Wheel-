import { requireValue as assert } from './security.js';
import { TIMING } from '../shared/timing.js';

// The selected session ID prevents delayed clicks starting somebody else's game.
export function beginSolo(s, selectionId, now) {
  const a = s.active;
  assert(
    a?.phase === 'introduction' && a.selection?.id === selectionId,
    'This game is no longer waiting to start.',
    409,
  );
  Object.assign(a, { phase: 'countdown', until: now + TIMING.countdown });
}
export function beginLive(s, liveId, now) {
  const live = s.live;
  assert(
    live?.phase === 'introduction' && live.id === liveId,
    'This Live game is no longer waiting to start.',
    409,
  );
  assert(Object.keys(live.roster).length >= 2, 'At least two players are needed.');
  Object.assign(live, { phase: 'countdown', until: now + TIMING.countdown });
}
