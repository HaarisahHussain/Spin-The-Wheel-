import { random, seed, fingerprint } from './generate.js';
import { buildChallenge } from './quiz-content.js';
import { executeProgram, render, replaceStatement, python } from './program.js';
export function question(game, level, source = seed(), previousFamily = null) {
  const r = random(source);
  let family = r.int(0, 6);
  if (previousFamily === `${game}-${level}-${family}`) family = (family + 1) % 6;
  let spec, reference, broken, correct, faulty;
  for (let attempt = 0; attempt < 64; attempt++) {
    spec = buildChallenge(level, family, r);
    reference = render(spec.program);
    broken = replaceStatement(spec.program, spec.faultId, spec.replacement);
    correct = executeProgram(spec.program);
    faulty = executeProgram(broken);
    if (correct.output !== faulty.output) break;
    if (attempt === 63) throw Error(`Unobservable fault ${level}/${family}`);
  }
  const code = game === 'debug' ? render(broken) : reference,
    line = reference.lineIds.indexOf(spec.faultId);
  const distractors = [
    faulty.output,
    ...correct.trace
      .slice(-5)
      .reverse()
      .filter((v) => typeof v.value === 'number')
      .map((v) => python(v.value)),
    '0',
    '1',
    '2',
    '3',
    '4',
  ];
  const choices = r.shuffle([...new Set([correct.output, ...distractors])].slice(0, 4));
  const finalTrace = correct.trace
    .slice(-3)
    .map((t) => `${t.name} becomes ${python(t.value)}`)
    .join('; ');
  const fixedInputs = new Set();
  for (const statement of spec.program) {
    if (
      statement.type !== 'set' ||
      (typeof statement.value === 'object' && !Array.isArray(statement.value))
    )
      break;
    fixedInputs.add(statement.id);
  }
  return {
    id: crypto.randomUUID(),
    kind: 'quiz',
    game,
    level,
    seed: source,
    family: `${game}-${level}-${family}`,
    code: code.code,
    referenceCode: reference.code,
    program: spec.program,
    faultyProgram: broken,
    prompt: game === 'debug' ? `${spec.goal} Find the faulty statement.` : 'What is printed?',
    answer: game === 'debug' ? String(line) : correct.output,
    choices: game === 'output' ? choices : null,
    editableLines: code.lineIds.flatMap((id, i) =>
      id !== null && !fixedInputs.has(id) && !code.code.split('\n')[i].trim().startsWith('print(')
        ? [i]
        : [],
    ),
    correctedLine: reference.code.split('\n')[line],
    explanation:
      game === 'debug' ? spec.mistake : `${finalTrace}. The output is ${correct.output}.`,
    reasoning: { objective: spec.goal, commonMistake: spec.mistake },
    fingerprint: fingerprint({ game, code: code.code, goal: spec.goal }),
  };
}
