import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, answerGame, tickGame, publicGame, publicQuestion } from '../server/games.js';
import { adapterFor } from '../server/games/registry.js';
import { scoreChallenge } from '../shared/scoring.js';
import { evaluateRobot } from '../server/games/robot.js';
import { evaluatePainter } from '../server/games/painter.js';
const now = 1700000000000;
test('retry multiplier applies once after raw puzzle score and rounds at the end', () => {
  const values = {
    correct: true,
    puzzle: true,
    efficiency: 0.83,
    elapsed: 4371,
    allowance: 30000,
    maximum: 1800000,
  };
  const base = values.maximum * (0.8 + 0.15 * 0.83 + 0.05 * (1 - 4371 / 30000));
  for (const runs of [1, 2, 3])
    assert.equal(scoreChallenge({ ...values, runs }), Math.round(base * (1 - (runs - 1) * 0.1)));
  assert.equal(
    scoreChallenge({ ...values, puzzle: false, runs: 3 }),
    scoreChallenge({ ...values, puzzle: false, runs: 1 }),
  );
});
test('invalid and duplicate submissions do not consume runs; first, second and third run close once', () => {
  for (const failures of [0, 1, 2]) {
    const g = newGame('robot', now);
    Object.assign(g.question, {
      start: 0,
      goal: 1,
      blocks: [],
      items: [],
      gates: [],
      maxMoves: 6,
      optimum: 1,
    });
    assert(!answerGame(g, ['teleport'], g.question.id, now + 1));
    assert.equal(g.runs, 0);
    let time = now + 100;
    for (let i = 0; i < failures; i++) {
      assert(answerGame(g, ['up'], g.question.id, time));
      assert(!answerGame(g, ['up'], g.question.id, time));
      time = g.execution.until;
      tickGame(g, time);
      assert.equal(g.runs, i + 1);
      assert.equal(g.phase, 'question');
      time += 100;
    }
    assert(answerGame(g, ['right'], g.question.id, time));
    const end = g.execution.until;
    tickGame(g, end);
    assert.equal(
      g.score,
      scoreChallenge({
        correct: true,
        puzzle: true,
        efficiency: 1,
        elapsed: 100 * (failures + 1),
        allowance: 30000,
        maximum: 800000,
        runs: failures + 1,
      }),
    );
    const score = g.score;
    tickGame(g, end);
    assert.equal(g.score, score);
    assert.equal(g.history.length, 1);
    assert.equal(g.history[0].runs, failures + 1);
  }
});
test('Robot dependencies require all items; a failed run cannot retain collected keys', () => {
  const q = {
    size: 5,
    start: 0,
    goal: 3,
    blocks: [],
    items: [{ id: 'k', cell: 5, kind: 'key' }],
    gates: [{ cell: 2, key: 'k', label: '1' }],
    maxMoves: 10,
    optimum: 5,
  };
  assert(!evaluateRobot(q, ['right', 'right', 'right']).correct);
  const result = evaluateRobot(q, ['down', 'right', 'up', 'right', 'right']);
  assert(result.correct);
  assert.equal(result.events[0].type, 'collect');
  assert(!evaluateRobot(q, ['right', 'right', 'right']).correct);
  assert(!evaluateRobot({ ...q, gates: [] }, ['right', 'right', 'right']).correct);
});
test('Repeat events identify source, body and iteration; painting twice is idempotent', () => {
  const q = { size: 5, start: 0, target: [1, 2], allowRepeat: true, maxTiles: 5, optimum: 3 };
  const result = evaluatePainter(q, [{ repeat: 2, body: ['right', 'paint'] }]);
  assert(result.correct);
  assert.deepEqual(
    result.events.map((e) => [e.sourceIndex, e.bodyIndex, e.iteration]),
    [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [0, 1, 1],
    ],
  );
  assert(evaluatePainter({ ...q, start: 1, target: [1], optimum: 1 }, ['paint', 'paint']).correct);
});
test('puzzle validators reject malformed, nested, excessive and unknown instructions without throwing', () => {
  for (const id of ['robot', 'parcel', 'painter']) {
    const a = adapterFor(id),
      q = a.create(4, 'malformed');
    for (const value of [
      null,
      {},
      '',
      [],
      [null],
      [{}],
      ['constructor'],
      ['__proto__'],
      Array(1000).fill('paint'),
      [{ repeat: 2, body: [{ repeat: 2, body: ['paint', 'paint'] }] }],
      [
        { repeat: 4, body: ['up', 'paint', 'up', 'paint'] },
        { repeat: 2, body: ['up', 'paint'] },
      ],
    ])
      assert.equal(a.valid(q, value), false, `${id}: ${JSON.stringify(value).slice(0, 80)}`);
  }
});
test('new public fields do not leak reference programs, valid orders or scoring metadata', () => {
  for (const id of ['debug', 'output', 'robot', 'parcel', 'painter']) {
    const q = adapterFor(id).create(4, 'private');
    const p = publicQuestion(q);
    for (const key of [
      'program',
      'faultyProgram',
      'referenceCode',
      'solution',
      'optimum',
      'validOrders',
      'seed',
      'reasoning',
      'fingerprint',
      'answer',
    ])
      assert.equal(p[key], undefined, `${id}/${key}`);
    const g = newGame(id, now);
    assert.equal(publicGame(g).question.solution, undefined);
  }
});
