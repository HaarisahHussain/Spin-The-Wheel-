import { randomInt } from 'node:crypto';
import { shuffle } from './random.js';
export function question(game, level) {
  const a = randomInt(2, 15),
    b = randomInt(2, 10),
    c = randomInt(1, 8);
  if (game === 'output') {
    const variants = [
      [`const a = ${a};\nconst b = ${b};\nconsole.log(a + b);`, a + b],
      [`const values = [${a}, ${b}, ${c}];\nconsole.log(values[1]);`, b],
      [`let total = ${a};\ntotal += ${b};\nconsole.log(total * 2);`, (a + b) * 2],
      [
        `const numbers = [${a}, ${b}, ${c}];\nconsole.log(numbers.filter(n => n > ${c}).length);`,
        [a, b, c].filter((n) => n > c).length,
      ],
      [
        `let total = 0;\nfor (let i = 0; i < ${c + 2}; i++) {\n  total += i;\n}\nconsole.log(total);`,
        ((c + 1) * (c + 2)) / 2,
      ],
      [
        `const values = [${a}, ${b}];\nconst copy = values.map(n => n * 2);\nconsole.log(copy[0] + values[1]);`,
        2 * a + b,
      ],
      [`let count = ${a};\nconst next = () => ++count;\nconsole.log(next() + next());`, 2 * a + 3],
      [
        `const x = { value: ${a} };\nconst y = x;\nconst z = { ...x };\ny.value += ${b};\nconsole.log(z.value + x.value);`,
        2 * a + b,
      ],
      [
        `const values = [${a}, ${b}, ${c}];\nconst result = values.reduce(\n  (total, n, i) => total + n * i, ${c}\n);\nconsole.log(result);`,
        b + 3 * c,
      ],
    ];
    const [code, answer] = variants[level % variants.length];
    return {
      id: crypto.randomUUID(),
      code,
      prompt: 'What is printed?',
      choices: shuffle([...new Set([answer, answer + c, answer - b, answer + a + b])]).map(String),
      answer: String(answer),
    };
  }
  const variants = [
    [
      [`const a = ${a};`, `const b = ${b};`, 'const sum = a - b;', 'console.log(sum);'],
      2,
      `Print ${a + b}, the sum of a and b.`,
    ],
    [
      [
        `const values = [${a}, ${b}, ${c}];`,
        'const last = values[values.length];',
        'console.log(last);',
      ],
      1,
      `Print ${c}, the final array element.`,
    ],
    [
      [`const score = ${a};`, `if (score < ${a - 1}) {`, '  console.log("PASS");', '}'],
      1,
      `Print PASS when score is greater than ${a - 1}.`,
    ],
    [
      [
        `let total = 0;`,
        `for (let i = 1; i < ${c + 2}; i++) {`,
        '  total += i;',
        '}',
        'console.log(total);',
      ],
      1,
      `Sum every integer from 1 through ${c + 2}, inclusive.`,
    ],
    [
      [`const message = "arcade";`, 'const upper = message.toLowerCase();', 'console.log(upper);'],
      1,
      'Print ARCADE in uppercase.',
    ],
    [
      [
        `const values = [${a}, ${b}];`,
        'const doubled = values.map(n => { n * 2; });',
        'console.log(doubled);',
      ],
      1,
      `Produce [${a * 2}, ${b * 2}] by doubling each element.`,
    ],
    [
      [
        `const values = [${a}, ${b}];`,
        'const original = [...values];',
        `values[0] = ${a + 2};`,
        'console.log(values[0]);',
      ],
      3,
      `Print the original first value, ${a}, after changing values.`,
    ],
    [
      [
        `const values = [${a}, ${b}, ${c}];`,
        'const total = values.reduce((sum, n) => sum + n, 1);',
        'console.log(total);',
      ],
      1,
      `Print ${a + b + c}, the sum of the array without any extra value.`,
    ],
    [
      [
        `function makeCounter() {`,
        `  let count = ${a};`,
        '  return () => count;',
        '}',
        'const next = makeCounter();',
        'console.log(next(), next());',
      ],
      2,
      `Each call must increase count before returning it; print ${a + 1} ${a + 2}.`,
    ],
  ];
  const [lines, target, prompt] = variants[level % variants.length];
  // Vary the correct line location without changing semantics or revealing a marker.
  const offset = randomInt(0, 3);
  const prefix = Array.from(
    { length: offset },
    (_, i) => `const label${i + 1} = "${['Arcade', 'Round', 'Student'][i]}";`,
  );
  return {
    id: crypto.randomUUID(),
    code: [...prefix, ...lines].join('\n'),
    prompt,
    answer: String(target + offset),
    choices: null,
  };
}
export function answerGame(game, answer, challengeId, now) {
  if (
    game.complete ||
    now >= game.deadline ||
    game.question.id !== challengeId ||
    game.id === 'robot'
  )
    return false;
  const q = game.question;
  if (game.id === 'debug' && !/^\d+$/.test(String(answer))) return false;
  if (game.id === 'debug' && Number(answer) >= q.code.split('\n').length) return false;
  if (game.id === 'output' && !q.choices.includes(String(answer))) return false;
  const correct = String(answer) === q.answer;
  const bonus = Math.max(0, 10 - 2 * Math.floor((now - game.questionAt) / 3000));
  game.score += correct ? 90 + bonus : 0;
  game.history.push({ ...q, selected: String(answer), correct, points: correct ? 90 + bonus : 0 });
  game.level++;
  game.questionAt = now;
  if (game.level === 9) game.complete = true;
  else game.question = question(game.id, game.level);
  return true;
}

export function validAnswer(id, q, value) {
  const answer = String(value);
  return id === 'debug'
    ? /^\d+$/.test(answer) && Number(answer) < q.code.split('\n').length
    : q.choices.includes(answer);
}
export const quizAdapter = (id) => ({
  create: (level) => question(id, level),
  answer: answerGame,
  live: {
    question: (level) => question(id, level),
    validAnswer: (q, value) => validAnswer(id, q, value),
  },
});
