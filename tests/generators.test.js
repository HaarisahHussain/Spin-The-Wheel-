import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { adapterFor } from '../server/games/registry.js';
import { question } from '../server/games/quiz.js';
import bank from '../server/games/content-bank.json' with { type: 'json' };
import fixtures from './fixtures/game-design.json' with { type: 'json' };
import { robotMinimum, painterMinimum, orders, parcelDestinations } from './reference-solvers.js';
for (const id of ['output', 'debug', 'robot', 'parcel', 'painter'])
  test(`${id}: 10,000 seeded selections have legal solutions and bounded content`, () => {
    const fingerprints = new Set(),
      families = new Set(),
      a = adapterFor(id);
    for (let i = 0; i < 10000; i++) {
      const q = a.create(i % 5, `v060-check-${i}`);
      fingerprints.add(q.fingerprint);
      families.add(q.family);
      assert(a.valid(q, q.answer ?? q.solution));
      assert(a.evaluate(q, q.answer ?? q.solution).correct);
      if (i < 10) assert.equal(q.fingerprint, a.create(i % 5, `v060-check-${i}`).fingerprint);
      if (['output', 'debug'].includes(id)) {
        assert([...q.code.matchAll(/\b\d+\b/g)].every((m) => Number(m[0]) <= 10));
        assert(q.code.split('\n').length <= 10);
        if (id === 'output') {
          assert.equal(new Set(q.choices).size, 4);
          assert(q.choices.includes(q.answer));
          assert(Number(q.answer) <= 60);
        }
      }
    }
    console.log(
      `${id}: ${fingerprints.size}/10000 unique content fingerprints; ${families.size} tier/family combinations`,
    );
    if (['debug', 'output'].includes(id)) assert.equal(families.size, 30);
    else assert(fingerprints.size > (id === 'painter' ? 290 : 2400));
  });
test('independent Python executes 1,200 questions and validates single-statement Debug repairs', () => {
  const samples = [];
  for (let i = 0; i < 600; i++)
    for (const game of ['debug', 'output']) samples.push(question(game, i % 5, `python060-${i}`));
  const result = execFileSync(
    'python3',
    [
      '-I',
      '-c',
      `
import json,sys,ast
samples=json.load(sys.stdin)
def run(code):
 out=[]
 env={'print':lambda *v:out.append(' '.join(map(str,v)))}
 exec(code,{'__builtins__':env},env)
 return '\\n'.join(out)
for q in samples:
 ast.parse(q['code'])
 actual=run(q['code'])
 if q['game']=='output': assert actual==q['answer'],q
 else:
  reference=run(q['referenceCode'])
  assert actual!=reference,q
  lines=q['code'].splitlines(); index=int(q['answer'])
  assert index in q['editableLines']
  lines[index]=q['correctedLine']
  assert run('\\n'.join(lines))==reference,q
  assert [i for i,(a,b) in enumerate(zip(q['code'].splitlines(),q['referenceCode'].splitlines())) if a!=b]==[index],q
print(len(samples))
`,
    ],
    { input: JSON.stringify(samples), encoding: 'utf8', timeout: 30000, maxBuffer: 1000000 },
  );
  assert.equal(Number(result.trim()), 1200);
});
test('all prepared Robot boards have independent shortest legal routes, including collected state', () => {
  for (const tier of bank.robot)
    for (const q of tier) {
      assert.equal(robotMinimum(q), q.optimum);
      assert(q.optimum <= 14);
      assert(q.maxMoves <= 18);
    }
});
test('all Parcel permutations agree with independent first-match routing', () => {
  for (const tier of bank.parcel)
    for (const q of tier) {
      const a = adapterFor('parcel');
      let valid = 0;
      for (const order of orders(q.rules.map((r) => r.id))) {
        const result = parcelDestinations(q, order).every((v, i) => v === q.packets[i].target);
        assert.equal(a.evaluate(q, order).correct, result);
        if (result) valid++;
      }
      assert.equal(valid, q.validOrders);
      assert(valid > 0);
      assert(!a.evaluate(q, q.starter).correct);
    }
});
test('independent exact grammar search verifies every prepared Painter optimum', () => {
  for (const tier of bank.painter)
    for (const q of tier) assert.equal(painterMinimum(q), q.optimum, q.seed);
});
test('150 annotated fixtures cover six examples per game and tier', () => {
  assert.equal(fixtures.length, 150);
  for (const game of ['debug', 'output', 'robot', 'parcel', 'painter'])
    for (let level = 0; level < 5; level++) {
      const group = fixtures.filter((q) => q.game === game && q.level === level);
      assert.equal(group.length, 6);
      for (const q of group) {
        assert(q.reasoning.objective);
        assert(q.reasoning.commonMistake);
        assert(adapterFor(game).evaluate(q, q.answer ?? q.solution).correct);
      }
    }
});
