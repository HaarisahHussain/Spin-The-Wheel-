import { gameById, SCORING_VERSION } from '../shared/catalog.js';
import { adapterFor } from './games/registry.js';
export { question } from './games/quiz.js';
export { board, shortest, neighbours, moveRobot } from './games/robot.js';
export { shuffle } from './games/random.js';
export function newGame(id, now) {
  return {
    id,
    version: SCORING_VERSION,
    level: 0,
    score: 0,
    started: now,
    deadline: now + gameById(id).duration * 1000,
    questionAt: now,
    question: adapterFor(id).create(0),
    history: [],
    complete: false,
  };
}
export function answerGame(game, answer, challengeId, now) {
  return adapterFor(game.id).answer?.(game, answer, challengeId, now) || false;
}
export function tickGame(game, now) {
  adapterFor(game.id).tick?.(game, now);
}
export function publicQuestion(q) {
  if (!q) return null;
  const { answer: _answer, distance: _distance, ...safe } = q;
  return safe;
}
export function publicGame(game) {
  if (!game) return null;
  const { history: _history, ...safe } = game;
  return { ...safe, question: publicQuestion(game.question) };
}
