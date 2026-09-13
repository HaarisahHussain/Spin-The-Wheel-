import { availableGames } from '../../shared/catalog.js';
import { question } from './quiz.js';
import { validRobot, evaluateRobot } from './robot.js';
import { validParcel, evaluateParcel } from './parcel.js';
import { validPainter, evaluatePainter } from './painter.js';
import { preparedPuzzle } from './content.js';
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
const puzzle = (id, valid, evaluate) => ({
  kind: 'puzzle',
  create: (level, source) => preparedPuzzle(id, level, source),
  valid,
  evaluate,
});
const adapters = {
  debug: quiz('debug'),
  output: quiz('output'),
  robot: puzzle('robot', validRobot, evaluateRobot),
  parcel: puzzle('parcel', validParcel, evaluateParcel),
  painter: puzzle('painter', validPainter, evaluatePainter),
};
export function adapterFor(id) {
  const a = adapters[id];
  if (!a) throw Error('Unknown game');
  return a;
}
export const liveGames = (config) => availableGames(config).filter((g) => g.live);
