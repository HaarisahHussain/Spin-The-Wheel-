import { shuffle } from './random.js';
import { requireValue as assert } from '../security.js';
export function shortest(blocks, start = 0, goal = 24) {
  const seen = new Set([start]),
    queue = [[start, 0]];
  for (const [cell, steps] of queue) {
    if (cell === goal) return steps;
    for (const next of neighbours(cell))
      if (!blocks.includes(next) && !seen.has(next)) {
        seen.add(next);
        queue.push([next, steps + 1]);
      }
  }
  return Infinity;
}
export function neighbours(cell) {
  return [
    cell % 5 ? cell - 1 : -1,
    cell % 5 < 4 ? cell + 1 : -1,
    cell >= 5 ? cell - 5 : -1,
    cell < 20 ? cell + 5 : -1,
  ].filter((n) => n >= 0);
}
export function board(level) {
  let blocks;
  do {
    blocks = shuffle(Array.from({ length: 23 }, (_, i) => i + 1)).slice(0, 3 + level);
  } while (!Number.isFinite(shortest(blocks)));
  return {
    id: crypto.randomUUID(),
    blocks,
    position: 0,
    goal: 24,
    distance: shortest(blocks),
    moves: 0,
    program: [],
    cursor: 0,
    running: false,
    nextStep: 0,
    feedback: '',
  };
}
export function moveRobot(game, now) {
  const q = game.question;
  if (!q.running || now < q.nextStep || game.complete) return;
  const move = q.program[q.cursor++];
  const candidate = q.position + ({ up: -5, down: 5, left: -1, right: 1 }[move] || 0);
  q.moves++;
  if (neighbours(q.position).includes(candidate) && !q.blocks.includes(candidate)) {
    q.position = candidate;
    q.feedback = '';
  } else q.feedback = 'Blocked';
  q.nextStep = now + 250;
  if (q.position === q.goal) {
    const maximum = game.level < 3 ? 200 : 100;
    game.score += Math.round(maximum * (0.9 + 0.1 * Math.min(1, q.distance / q.moves)));
    game.history.push({ moves: q.moves, shortest: q.distance });
    game.level++;
    if (game.level === 6) game.complete = true;
    else game.question = board(game.level);
  } else if (q.cursor >= q.program.length) {
    q.running = false;
    q.program = [];
    q.cursor = 0;
  }
}

export function programRobot(game, p, now) {
  const q = game.question;
  assert(q.id === p.challengeId, 'This board has changed.', 409);
  if (p.stop) {
    q.running = false;
    q.program = [];
    q.cursor = 0;
    return true;
  }
  assert(
    !q.running &&
      Array.isArray(p.program) &&
      p.program.length > 0 &&
      p.program.length <= Math.min(100, Math.floor((game.deadline - now - 250) / 250)),
    'Program is too long or still running.',
  );
  assert(
    p.program.every((m) => ['up', 'down', 'left', 'right'].includes(m)),
    'Unknown movement.',
  );
  q.program = p.program;
  q.cursor = 0;
  q.running = true;
  q.nextStep = now;
  return true;
}
export const robotAdapter = { create: board, tick: moveRobot, program: programRobot };
