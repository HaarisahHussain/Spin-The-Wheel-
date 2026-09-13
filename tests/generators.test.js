import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { adapterFor } from '../server/games/registry.js';
import { route } from '../server/games/puzzles.js';
import { question } from '../server/games/quiz.js';
for (const id of ['output', 'debug', 'robot', 'parcel', 'painter'])
  test(`${id}: 10,000 deterministic seeds, valid solutions and structural uniqueness`, () => {
    const fingerprints = new Set(),
      families = new Set();
    for (let i = 0; i < 10000; i++) {
      const adapter = adapterFor(id),
        q = adapter.create(i % 5, `benchmark-v051-${i}`);
      fingerprints.add(q.fingerprint);
      families.add(q.family);
      assert(adapter.valid(q, q.answer ?? q.solution));
      assert(adapter.evaluate(q, q.answer ?? q.solution).correct);
      if (id === 'robot') assert.equal(route(q).length, q.optimum);
      if (i < 10) {
        const again = adapter.create(i % 5, `benchmark-v051-${i}`);
        assert.equal(q.fingerprint, again.fingerprint);
      }
    }
    console.log(
      `${id}: ${fingerprints.size}/10000 canonical fingerprints; ${families.size} families`,
    );
    if (id === 'robot') assert(fingerprints.size > 9900);
    // Small-input teaching puzzles intentionally reuse structures; report variety honestly.
    if (['output', 'debug'].includes(id)) assert.equal(families.size, 12);
  });
test('Python reference execution validates answers and every Debug family has a visible fault', () => {
  const samples = [];
  for (let i = 0; i < 360; i++)
    for (const id of ['output', 'debug']) samples.push(question(id, i % 5, `python-${i}`));
  const result = execFileSync(
    'python3',
    [
      '-I',
      '-c',
      `
import json,sys,re
samples=json.load(sys.stdin)
def run(code):
 out=[]
 env={'print':lambda *v:out.append(' '.join(map(str,v))), 'range':range,'sum':sum,'enumerate':enumerate,'len':len}
 try:
  exec(code,{'__builtins__':env},env)
  return '\\n'.join(out)
 except Exception as e:return type(e).__name__
for q in samples:
 code=q['code']
 if q['game']=='output':
  assert run(code)==q['answer'],(code,run(code),q['answer'])
 else:
  f=q['family'];fixed=q['referenceCode']
  # Family 10 contains an intentionally non-terminating loop; validate its corrected program only.
  if f!=10:assert run(code)!=run(fixed),(q,run(fixed))
  assert run(fixed) not in ['NameError','TypeError','IndexError','SyntaxError'],(q,fixed)
print(len(samples))
`,
    ],
    { input: JSON.stringify(samples), encoding: 'utf8', timeout: 30000, maxBuffer: 1000000 },
  );
  assert.equal(Number(result.trim()), 720);
});

test('independent grid search verifies Robot optimum and small numeric inputs stay bounded', () => {
  for (let i = 0; i < 1000; i++) {
    const q = adapterFor('robot').create(i % 5, `independent-${i}`);
    const distances = new Map([[q.start, 0]]),
      todo = [q.start];
    for (let n = 0; n < todo.length; n++) {
      const cell = todo[n],
        x = cell % q.size,
        y = Math.floor(cell / q.size);
      for (const [dx, dy] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          next = ny * q.size + nx;
        if (
          nx < 0 ||
          ny < 0 ||
          nx >= q.size ||
          ny >= q.size ||
          q.blocks.includes(next) ||
          distances.has(next)
        )
          continue;
        distances.set(next, distances.get(cell) + 1);
        todo.push(next);
      }
    }
    assert.equal(distances.get(q.goal), q.optimum);
    assert(q.optimum <= 16 && q.optimum >= Math.min(3 + (i % 5), 7));
    const code = question('output', i % 5, `small-${i}`);
    assert([...code.code.matchAll(/\b\d+\b/g)].every((m) => Number(m[0]) <= 10));
    assert(Number(code.answer) <= (i % 5 < 2 ? 20 : 50));
    assert.equal(new Set(code.choices).size, 4);
    assert(code.choices.includes(code.answer));
  }
});
test('Parcel solutions route every shape to its own depot under independent tree traversal', () => {
  for (let i = 0; i < 1000; i++) {
    const q = adapterFor('parcel').create(i % 5, `parcel-independent-${i}`);
    for (const type of q.packets) {
      let position = 0;
      for (let depth = 0; depth < q.depth; depth++) {
        let side = q.groups[position].includes(type) ? 0 : 1;
        side ^= q.solution[position];
        position = 2 * position + 1 + side;
      }
      assert.equal(q.depots[position - q.groups.length], type);
    }
  }
});
