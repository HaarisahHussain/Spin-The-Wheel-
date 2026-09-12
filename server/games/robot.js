import { randomInt, randomUUID } from 'node:crypto';
import { requireValue as assert } from '../security.js';
import { maze, fits, tiers, path, neighbours } from './robot-maze.js';

export { neighbours } from './robot-maze.js';

const STEP_MS = 250;

// Verified layouts if random generation cannot satisfy a tier quickly.
const FALLBACK_SEEDS = [1, 2, 2, 21, 9, 38, 119, 1398, 1398];

export function shortest(blocks, start = 0, goal = 24, size = 5) {
  const route = path(blocks, start, goal, size);
  return route.length ? route.length - 1 : Infinity;
}

export function board(level) {
  const tier = tiers[level];
  assert(tier, 'Unknown board.');

  let blocks = maze(tier.size, FALLBACK_SEEDS[level]);

  // Bounded generation prevents an endless search blocking the server.
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = maze(tier.size, randomInt(0x100000000));

    if (fits(candidate, tier)) {
      blocks = candidate;
      break;
    }
  }

  const transpose = randomInt(2);
  const rotate = randomInt(2);

  const transform = (cell) => {
    let next = transpose ? (cell % tier.size) * tier.size + Math.floor(cell / tier.size) : cell;

    if (rotate) next = tier.size * tier.size - 1 - next;

    return next;
  };

  const start = transform(tier.start);
  const goal = transform(tier.goal);
  blocks = blocks.map(transform);

  const distance = shortest(blocks, start, goal, tier.size);
  assert(distance === tier.distance, 'Invalid maze.');

  return {
    id: randomUUID(),
    size: tier.size,
    start,
    goal,
    blocks,
    distance,
    maxMoves: distance + tier.slack,
    position: start,
    moves: 0,
    program: [],
    cursor: 0,
    running: false,
    nextStep: 0,
    feedback: '',
    failedIndex: null,
  };
}

function reset(q, feedback = '', failedIndex = null) {
  q.position = q.start;
  q.running = false;
  q.cursor = 0;
  q.feedback = feedback;
  q.failedIndex = failedIndex;

  // Preserve the program for editing and reconnection.
}

export function programRobot(game, p, now) {
  const q = game.question;

  assert(!game.complete && now < game.deadline, 'Time is up.', 409);
  assert(q.id === p.challengeId, 'This board has changed.', 409);

  if (p.stop) {
    reset(q);
    return true;
  }

  assert(!q.running, 'Program is still running.', 409);

  assert(
    Array.isArray(p.program) && p.program.length > 0 && p.program.length <= q.maxMoves,
    `Use 1–${q.maxMoves} moves.`,
  );

  assert(
    p.program.every((move) => ['up', 'down', 'left', 'right'].includes(move)),
    'Unknown movement.',
  );

  q.program = [...p.program];
  q.position = q.start;
  q.moves = 0;
  q.cursor = 0;
  q.running = true;
  q.nextStep = now;
  q.feedback = '';
  q.failedIndex = null;

  return true;
}

export function moveRobot(game, now) {
  const q = game.question;

  if (game.complete || !q.running || now < q.nextStep) return;

  if (now >= game.deadline) {
    reset(q, 'Time is up.');
    return;
  }

  const index = q.cursor++;
  const move = q.program[index];

  const candidate =
    q.position +
    ({
      up: -q.size,
      down: q.size,
      left: -1,
      right: 1,
    }[move] ?? 0);

  q.moves++;
  q.nextStep += STEP_MS;

  if (!neighbours(q.position, q.size).includes(candidate) || q.blocks.includes(candidate)) {
    reset(q, `Blocked at move ${index + 1}.`, index);
    return;
  }

  q.position = candidate;

  if (candidate === q.goal) {
    if (q.cursor !== q.program.length) {
      reset(q, 'Remove the moves after the goal.', q.cursor);
      return;
    }

    const points = Math.round(tiers[game.level].points * Math.min(1, q.distance / q.moves));

    game.score += points;
    game.history.push({
      moves: q.moves,
      shortest: q.distance,
      points,
    });

    game.level++;

    if (game.level === tiers.length) {
      game.complete = true;
      q.running = false;
    } else {
      game.question = board(game.level);
    }
  } else if (q.cursor === q.program.length) {
    reset(q, 'Program ended before the goal.', index);
  }
}

export const robotAdapter = {
  create: board,
  tick: moveRobot,
  program: programRobot,
};
