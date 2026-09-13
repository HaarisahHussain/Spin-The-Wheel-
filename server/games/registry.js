import { availableGames } from '../../shared/catalog.js';
import { question } from './quiz.js';
import { makeRobot, evaluatePuzzle, validProgram } from './puzzles.js';
import { makeParcel, makePainter, validNewPuzzle, evaluateNewPuzzle } from './new-puzzles.js';
const quiz = (id) => ({
  kind: 'quiz',
  create: (level, seed, family) => question(id, level, seed, family),
  valid: (q, a) =>
    typeof a === 'string' &&
    (id === 'debug'
      ? /^\d+$/.test(a) && q.editableLines.includes(Number(a))
      : q.choices.includes(a)),
  evaluate: (q, a) => ({ correct: q.answer === a, efficiency: 1 }),
});
const puzzle = (create) => ({
  kind: 'puzzle',
  create,
  valid: validProgram,
  evaluate: evaluatePuzzle,
});
const adapters = {
  debug: quiz('debug'),
  output: quiz('output'),
  robot: puzzle(makeRobot),
  parcel: {
    kind: 'puzzle',
    create: makeParcel,
    valid: validNewPuzzle,
    evaluate: evaluateNewPuzzle,
  },
  painter: {
    kind: 'puzzle',
    create: makePainter,
    valid: validNewPuzzle,
    evaluate: evaluateNewPuzzle,
  },
};
export function adapterFor(id) {
  const a = adapters[id];
  if (!a) throw Error('Unknown game');
  return a;
}
export const liveGames = (config) => availableGames(config).filter((g) => g.live);
