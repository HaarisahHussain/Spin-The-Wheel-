import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, host, player, command, start, NOW, PASSWORD } from './helpers.js';
import { sessionFor } from '../server/security.js';
import { leaderboard } from '../server/state.js';
import { tick, publicLive } from '../server/engine.js';
import { newGame, answerGame, tickGame, publicGame } from '../server/games.js';
import { scoreChallenge, LEVEL_MAXIMA } from '../shared/scoring.js';
import { grade, scoreText } from '../shared/catalog.js';
import { liveDuration } from '../shared/timing.js';
import { selectGame } from '../server/selection.js';
import { recoverServiceDelay } from '../server/recovery.js';

test('host takeover is explicit, atomic, and old session commands and cache replay are rejected', async () => {
  const f = fixture();
  await host(f);
  const id = crypto.randomUUID();
  assert(
    !(await command(f, 'host.settings', { revision: 1, paused: false }, f.host, NOW, { id })).error,
  );
  const r = await command(
    f,
    'staffLogin',
    { username: 'host', password: PASSWORD, tabId: 'tab-b' },
    '',
    NOW,
    { connectionId: 'host-b' },
  );
  assert(r.takeover && !r.token);
  assert(sessionFor(f.s, f.host, NOW));
  const next = await command(f, 'hostTakeover', { challenge: r.takeover }, '', NOW, {
    connectionId: 'host-b',
  });
  assert(next.token);
  assert.equal(sessionFor(f.s, f.host, NOW), null);
  assert(
    (await command(f, 'host.settings', { revision: 1, paused: false }, f.host, NOW, { id })).error,
  );
  assert(
    (
      await command(f, 'hostTakeover', { challenge: r.takeover }, '', NOW, {
        connectionId: 'host-b',
      })
    ).error,
  );
});
test('a stale takeover cannot displace the newer owner', async () => {
  const f = fixture();
  await host(f);
  const a = await command(
    f,
    'staffLogin',
    { username: 'host', password: PASSWORD, tabId: 'b' },
    '',
    NOW,
    { connectionId: 'b' },
  );
  const b = await command(
    f,
    'staffLogin',
    { username: 'host', password: PASSWORD, tabId: 'c' },
    '',
    NOW,
    { connectionId: 'c' },
  );
  assert(
    (await command(f, 'hostTakeover', { challenge: a.takeover }, '', NOW, { connectionId: 'b' }))
      .token,
  );
  assert.equal(
    (await command(f, 'hostTakeover', { challenge: b.takeover }, '', NOW, { connectionId: 'c' }))
      .status,
    409,
  );
});
test('duplicate tabs are fenced, disconnected refresh reclaims, lease expires', async () => {
  const f = fixture();
  await host(f);
  assert.equal(
    (
      await command(
        f,
        'hostControl',
        { tabId: 'tab-a', expectedEpoch: f.s.controlEpoch },
        f.host,
        NOW,
        { connectionId: 'duplicate' },
      )
    ).status,
    409,
  );
  f.connections.delete(f.host);
  assert(
    !(
      await command(
        f,
        'hostControl',
        { tabId: 'tab-a', expectedEpoch: f.s.controlEpoch },
        f.host,
        NOW,
        { connectionId: 'refreshed' },
      )
    ).error,
  );
  assert(
    (
      await command(f, 'host.settings', { revision: 1, paused: true }, f.host, NOW + 31000, {
        connectionId: 'refreshed',
      })
    ).error,
  );
});
test('heartbeats extend lease but do not extend host human inactivity', async () => {
  const f = fixture();
  await host(f);
  for (let i = 1; i < 360; i++)
    assert(!(await command(f, 'hostControl', { heartbeat: true }, f.host, NOW + i * 5000)).error);
  assert.equal(sessionFor(f.s, f.host, NOW + 1800000), null);
});
test('unstarted selected game is retained and no attempt is consumed during wheel', async () => {
  const f = fixture();
  await host(f);
  const p = await player(f);
  await command(f, 'enqueue', { mode: 'ranked' }, p.token);
  await command(f, 'host.call', {}, f.host);
  await command(f, 'ready', {}, p.token);
  assert.equal(f.s.attempts.filter((a) => a.accountId === p.id).length, 0);
  assert.equal(f.s.accounts[p.id].pendingGame, f.s.active.selection.gameId);
});
test('exact score formula boundaries and displayed grade agree', () => {
  assert.equal(
    LEVEL_MAXIMA.reduce((a, b) => a + b, 0),
    9000000,
  );
  const p = { correct: true, elapsed: 0, allowance: 1000, maximum: 1000000 };
  assert.equal(scoreChallenge(p), 1000000);
  assert.equal(scoreChallenge({ ...p, elapsed: 999 }), 800200);
  assert.equal(scoreChallenge({ ...p, elapsed: 1000 }), 0);
  assert.equal(scoreChallenge({ ...p, correct: false }), 0);
  assert.equal(scoreChallenge({ ...p, puzzle: true, efficiency: 1 }), 1000000);
  assert.equal(grade(8000000), 'SS');
  assert.equal(scoreText(8006000), '8.01');
  assert.equal(grade(8006000), 'SSS');
});
test('feedback subtracts active time exactly once and timeout advances', () => {
  const g = newGame('output', NOW);
  assert(answerGame(g, g.question.answer, g.question.id, NOW + 1234));
  assert.equal(g.remainingMs, 28766);
  const score = g.score;
  assert(!answerGame(g, g.question.answer, g.question.id, NOW + 1500));
  tickGame(g, NOW + 5234);
  assert.equal(g.level, 1);
  assert.equal(g.questionAt, NOW + 5234);
  tickGame(g, g.deadline);
  assert.equal(g.feedback.points, 0);
  assert.equal(g.score, score);
});
test('all solo adapters can be completed with legal solutions and bounded timing', () => {
  for (const id of ['debug', 'output', 'robot', 'parcel', 'painter']) {
    const g = newGame(id, NOW);
    let now = NOW;
    for (let i = 0; i < 5; i++) {
      assert(answerGame(g, g.question.answer ?? g.question.solution, g.question.id, now + 1));
      now += 1;
      if (g.phase === 'execution') {
        now += 4000;
        tickGame(g, now);
      }
      assert(g.phase === 'feedback');
      now += 4000;
      tickGame(g, now);
    }
    assert(g.complete);
    assert(g.score <= 9000000 && g.score > 8900000);
  }
});
test('failed puzzle run preserves draft, scores nothing and cannot move the start', () => {
  const g = newGame('robot', NOW);
  const program = ['up'];
  g.question.start = 0;
  g.question.position = 0;
  for (let run = 0; run < 3; run++) {
    const submitted = g.questionAt + 100;
    assert(answerGame(g, program, g.question.id, submitted));
    assert.equal(g.phase, 'execution');
    assert(!answerGame(g, program, g.question.id, submitted + 1));
    tickGame(g, submitted + 4000);
    assert.equal(g.score, 0);
    assert.deepEqual(g.question.program, program);
    assert.equal(g.question.position, 0);
    assert.equal(g.remainingMs, 30000 - (run + 1) * 100);
    assert.equal(g.phase, run === 2 ? 'feedback' : 'question');
  }
});
test('public game projection never contains seeds, private optimum, solution or future history', () => {
  for (const id of ['debug', 'output', 'robot', 'parcel', 'painter']) {
    const p = publicGame(newGame(id, NOW));
    const s = JSON.stringify(p);
    for (const field of [
      '"seed"',
      '"fingerprint"',
      '"optimum"',
      '"solution"',
      '"history"',
      '"answer"',
    ])
      assert(!s.includes(field), `${id}: ${field}`);
  }
});
test('live public projection hides locked programs and correctness before closure', () => {
  const q = newGame('robot', NOW).question;
  const view = publicLive({
    id: 'l',
    phase: 'question',
    gameId: 'robot',
    question: q,
    roster: {
      p: {
        accountId: 'p',
        score: 123,
        answer: q.solution,
        result: { correct: true, path: [q.start, q.goal] },
      },
    },
  });
  assert.equal(view.roster[0].result, undefined);
  assert.equal(view.roster[0].score, undefined);
  assert.equal(view.question.solution, undefined);
});
test('full Live sessions support 50 players across all five adapters and produce isolated records', async () => {
  for (const id of ['debug', 'output', 'robot', 'parcel', 'painter']) {
    const f = fixture();
    await host(f);
    for (let i = 0; i < 50; i++)
      f.s.accounts[i] = { id: String(i), email: `p${i}@bcu.ac.uk`, verified: true };
    f.s.live = {
      id: 'live',
      phase: 'countdown',
      gameId: id,
      until: NOW,
      level: 0,
      settings: { lobbySeconds: 20, liveTimeScale: 1 },
      roster: Object.fromEntries(
        Array.from({ length: 50 }, (_, i) => [
          String(i),
          { accountId: String(i), answer: null, score: 0, responses: 0 },
        ]),
      ),
    };
    tick(f.s, NOW);
    let t = NOW;
    while (f.s.live.phase !== 'winner') {
      if (f.s.live.phase === 'question')
        for (const e of Object.values(f.s.live.roster)) {
          e.answer = f.s.live.question.answer ?? f.s.live.question.solution;
          e.result = { correct: true };
          e.score += 100;
          e.responses++;
        }
      t = f.s.live.until;
      tick(f.s, t);
    }
    assert.equal(f.s.liveResults.length, 50);
    assert.equal(f.s.attempts.length, 0);
    assert.equal(f.s.live.winners.length, 50);
  }
});
test('liveAnswer evaluates only on server and locks one submitted program', async () => {
  const f = fixture(),
    p = await player(f);
  f.s.live = {
    id: 'l',
    phase: 'countdown',
    gameId: 'parcel',
    level: 0,
    until: NOW,
    settings: { liveTimeScale: 1 },
    roster: { [p.id]: { accountId: p.id, answer: null, score: 0, responses: 0 } },
  };
  tick(f.s, NOW);
  const q = f.s.live.question;
  assert(
    !(
      await command(f, 'liveAnswer', { program: q.solution, challengeId: q.id }, p.token, NOW + 100)
    ).error,
  );
  assert(f.s.live.roster[p.id].score > 0);
  assert(
    (await command(f, 'liveAnswer', { program: q.solution, challengeId: q.id }, p.token, NOW + 101))
      .error,
  );
});
test('settings revision, overlapping windows and scoring edits reject without partial mutation', async () => {
  const f = fixture();
  await host(f);
  assert((await command(f, 'host.settings', { revision: 0, paused: true }, f.host)).error);
  assert(!f.s.config.paused);
  assert(
    (
      await command(
        f,
        'host.settings',
        {
          revision: 1,
          windows: [
            { start: 1, cutoff: 3, end: 5 },
            { start: 4, cutoff: 6, end: 7 },
          ],
        },
        f.host,
      )
    ).error,
  );
  assert((await command(f, 'host.settings', { revision: 1, scoringVersion: 'x' }, f.host)).error);
});
test('stalled game is interrupted and admissions paused without discarding prior scores', async () => {
  const f = fixture();
  await host(f);
  const p = await player(f);
  await start(f, p);
  f.s.active.game.score = 123;
  recoverServiceDelay(f.s, NOW + 9000);
  assert.equal(f.s.attempts[0].score, 123);
  assert.equal(f.s.attempts[0].status, 'interrupted');
  assert(f.s.config.paused);
  assert.equal(f.s.attempts.filter((a) => a.accountId === p.id).length, 1);
});
test('exact standings use best attempt, not sums or rounded values', () => {
  const f = fixture();
  for (const [accountId, score] of [
    ['a', 8001000],
    ['a', 1000000],
    ['b', 8002000],
  ])
    f.s.attempts.push({
      mode: 'ranked',
      status: 'completed',
      version: f.s.config.scoringVersion,
      accountId,
      score,
      ended: NOW,
    });
  f.s.accounts.a = { id: 'a', alias: 'Player-A' };
  f.s.accounts.b = { id: 'b', alias: 'Player-B' };
  const rows = leaderboard(f.s);
  assert.equal(rows[0].accountId, 'b');
  assert.equal(rows[1].score, 8001000);
});
test('selection retains a game and timing estimates bound both Live formats', () => {
  const games = [{ id: 'robot' }, { id: 'debug' }, { id: 'parcel' }];
  for (let i = 0; i < 100; i++) {
    const r = selectGame(games, NOW, 'robot');
    assert.equal(r.slots.length, 10);
    assert.equal(r.gameId, 'robot');
    assert.equal(r.slots[r.sector], 'robot');
  }
  assert.equal(liveDuration({ lobbySeconds: 20, liveTimeScale: 1 }), 214000);
});

test('private results export requires recent host authentication and escapes spreadsheet formulas', async () => {
  const f = fixture();
  await host(f);
  const p = await player(f);
  f.s.accounts[p.id].fullName = '=HYPERLINK("bad")';
  f.s.attempts.push({
    id: 'export-test',
    accountId: p.id,
    gameId: 'debug',
    mode: 'ranked',
    score: 1234567,
    status: 'completed',
  });
  const result = await command(f, 'host.export', {}, f.host);
  assert(result.csv.includes("'=HYPERLINK"));
  assert(result.csv.includes(f.s.accounts[p.id].alias));
  assert(result.csv.includes('1.23'));
  assert(!(await command(f, 'host.export', {}, p.token)).csv);
  for (const session of Object.values(f.s.sessions))
    if (session.staffId) session.reauthenticated = NOW - 900001;
  assert.equal((await command(f, 'host.export', {}, f.host)).status, 401);
});
test('first introduction requires readiness, times out without charging and retains the selected game', async () => {
  const f = fixture();
  await host(f);
  const p = await player(f);
  await command(f, 'enqueue', { mode: 'ranked' }, p.token);
  await command(f, 'host.call', {}, f.host);
  await command(f, 'ready', {}, p.token);
  const selected = f.s.active.gameId;
  tick(f.s, NOW + 3000);
  assert.equal(f.s.active.phase, 'introduction');
  assert.equal(f.s.attempts.filter((a) => a.accountId === p.id).length, 0);
  tick(f.s, NOW + 23000);
  assert.equal(f.s.active, null);
  assert.equal(f.s.attempts.filter((a) => a.accountId === p.id).length, 0);
  assert.equal(f.s.accounts[p.id].pendingGame, selected);
  assert.match(f.s.accounts[p.id].turnNotice, /timed out/);
});
test('tutorial confirmation starts one countdown and cannot be replayed', async () => {
  const f = fixture();
  await host(f);
  const p = await player(f);
  await command(f, 'enqueue', { mode: 'ranked' }, p.token);
  await command(f, 'host.call', {}, f.host);
  await command(f, 'ready', {}, p.token);
  tick(f.s, NOW + 3000);
  assert(!(await command(f, 'tutorialReady', {}, p.token, NOW + 4000)).error);
  assert.equal(f.s.attempts.filter((a) => a.accountId === p.id).length, 0);
  assert((await command(f, 'tutorialReady', {}, p.token, NOW + 4001)).error);
  tick(f.s, NOW + 7000);
  assert.equal(f.s.attempts.filter((a) => a.accountId === p.id).length, 1);
});
test('exact deadline never awards points and each next challenge gets its own 30 seconds', () => {
  const g = newGame('output', NOW);
  assert(!answerGame(g, g.question.answer, g.question.id, g.deadline));
  tickGame(g, g.deadline);
  assert.equal(g.score, 0);
  tickGame(g, g.feedbackUntil);
  assert.equal(g.remainingMs, 30000);
  assert.equal(g.deadline - g.questionAt, 30000);
});

test('Painter Repeat is bounded and errors retain expanded execution detail', async () => {
  const { adapterFor } = await import('../server/games/registry.js');
  const a = adapterFor('painter');
  const q = { ...a.create(4, 'repeat'), start: 1, target: [0], maxMoves: 24 };
  const program = [{ repeat: 2, body: ['left', 'paint'] }];
  assert(a.valid(q, program));
  const result = a.evaluate(q, program);
  assert(!result.correct);
  assert.equal(result.failedIndex, 2);
  assert.equal(result.frames.at(-1).cell, 0);
  assert(!a.valid(q, [{ repeat: 1000000, body: ['paint'] }]));
  assert(!a.valid(q, [{ repeat: 2, body: [{ repeat: 2, body: ['paint'] }] }]));
  assert(!a.valid({ ...q, allowRepeat: false }, program));
});
