// Offline generation: exhaustive solvers never run in a request or database transaction.
import { writeFileSync } from 'node:fs';
import { robotCandidate, evaluateRobot } from '../server/games/robot.js';
import { parcelCandidate, evaluateParcel } from '../server/games/parcel.js';
import { painterCandidate, evaluatePainter } from '../server/games/painter.js';
import { question } from '../server/games/quiz.js';
const bank = {},
  fixtures = [];
for (const [game, create, evaluate, count] of [
  ['robot', robotCandidate, evaluateRobot, 512],
  ['parcel', parcelCandidate, evaluateParcel, 512],
  ['painter', painterCandidate, evaluatePainter, 64],
]) {
  bank[game] = [];
  for (let level = 0; level < 5; level++) {
    const unique = new Map();
    for (let i = 0; i < 100000 && unique.size < count; i++) {
      const source = `v060:${game}:${level}:${i}`;
      const q = create(level, source);
      if (!q || unique.has(q.fingerprint)) continue;
      if (!evaluate(q, q.solution).correct) throw Error(`Invalid reference: ${source}`);
      q.seed = source;
      unique.set(q.fingerprint, q);
    }
    if (unique.size < count) throw Error(`Insufficient ${game}/${level}: ${unique.size}`);
    bank[game][level] = [...unique.values()];
    fixtures.push(
      ...bank[game][level].slice(0, 6).map((q) => ({
        ...q,
        review: 'Automated reference validation; human playtest pending.',
      })),
    );
    console.log(`${game} tier ${level + 1}: ${unique.size}`);
  }
}
for (const game of ['debug', 'output'])
  for (let level = 0; level < 5; level++) {
    const families = new Map();
    for (let i = 0; families.size < 6; i++) {
      const q = question(game, level, `v060:fixture:${i}`);
      delete q.id;
      families.set(q.family, {
        ...q,
        review: 'Executable reference verified in content tests; human playtest pending.',
      });
    }
    fixtures.push(...families.values());
  }
writeFileSync(
  new URL('../server/games/content-bank.json', import.meta.url),
  JSON.stringify(bank),
);
writeFileSync(
  new URL('../tests/fixtures/game-design.json', import.meta.url),
  JSON.stringify(fixtures, null, 2) + '\n',
);
