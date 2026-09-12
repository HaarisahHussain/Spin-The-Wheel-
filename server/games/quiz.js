import { randomInt } from 'node:crypto';
import { shuffle } from './random.js';
// export function question(game, level) {
//   const a = randomInt(2, 15),
//     b = randomInt(2, 10),
//     c = randomInt(1, 8);
//   if (game === 'output') {
//     const variants = [
//       [`const a = ${a};\nconst b = ${b};\nconsole.log(a + b);`, a + b],
//       [`const values = [${a}, ${b}, ${c}];\nconsole.log(values[1]);`, b],
//       [`let total = ${a};\ntotal += ${b};\nconsole.log(total * 2);`, (a + b) * 2],
//       [
//         `const numbers = [${a}, ${b}, ${c}];\nconsole.log(numbers.filter(n => n > ${c}).length);`,
//         [a, b, c].filter((n) => n > c).length,
//       ],
//       [
//         `let total = 0;\nfor (let i = 0; i < ${c + 2}; i++) {\n  total += i;\n}\nconsole.log(total);`,
//         ((c + 1) * (c + 2)) / 2,
//       ],
//       [
//         `const values = [${a}, ${b}];\nconst copy = values.map(n => n * 2);\nconsole.log(copy[0] + values[1]);`,
//         2 * a + b,
//       ],
//       [`let count = ${a};\nconst next = () => ++count;\nconsole.log(next() + next());`, 2 * a + 3],
//       [
//         `const x = { value: ${a} };\nconst y = x;\nconst z = { ...x };\ny.value += ${b};\nconsole.log(z.value + x.value);`,
//         2 * a + b,
//       ],
//       [
//         `const values = [${a}, ${b}, ${c}];\nconst result = values.reduce(\n  (total, n, i) => total + n * i, ${c}\n);\nconsole.log(result);`,
//         b + 3 * c,
//       ],
//     ];
//     const [code, answer] = variants[level % variants.length];
//     return {
//       id: crypto.randomUUID(),
//       code,
//       prompt: 'What is printed?',
//       choices: shuffle([...new Set([answer, answer + c, answer - b, answer + a + b])]).map(String),
//       answer: String(answer),
//     };
//   }
//   const variants = [
//     [
//       [`const a = ${a};`, `const b = ${b};`, 'const sum = a - b;', 'console.log(sum);'],
//       2,
//       `Print ${a + b}, the sum of a and b.`,
//     ],
//     [
//       [
//         `const values = [${a}, ${b}, ${c}];`,
//         'const last = values[values.length];',
//         'console.log(last);',
//       ],
//       1,
//       `Print ${c}, the final array element.`,
//     ],
//     [
//       [`const score = ${a};`, `if (score < ${a - 1}) {`, '  console.log("PASS");', '}'],
//       1,
//       `Print PASS when score is greater than ${a - 1}.`,
//     ],
//     [
//       [
//         `let total = 0;`,
//         `for (let i = 1; i < ${c + 2}; i++) {`,
//         '  total += i;',
//         '}',
//         'console.log(total);',
//       ],
//       1,
//       `Sum every integer from 1 through ${c + 2}, inclusive.`,
//     ],
//     [
//       [`const message = "arcade";`, 'const upper = message.toLowerCase();', 'console.log(upper);'],
//       1,
//       'Print ARCADE in uppercase.',
//     ],
//     [
//       [
//         `const values = [${a}, ${b}];`,
//         'const doubled = values.map(n => { n * 2; });',
//         'console.log(doubled);',
//       ],
//       1,
//       `Produce [${a * 2}, ${b * 2}] by doubling each element.`,
//     ],
//     [
//       [
//         `const values = [${a}, ${b}];`,
//         'const original = [...values];',
//         `values[0] = ${a + 2};`,
//         'console.log(values[0]);',
//       ],
//       3,
//       `Print the original first value, ${a}, after changing values.`,
//     ],
//     [
//       [
//         `const values = [${a}, ${b}, ${c}];`,
//         'const total = values.reduce((sum, n) => sum + n, 1);',
//         'console.log(total);',
//       ],
//       1,
//       `Print ${a + b + c}, the sum of the array without any extra value.`,
//     ],
//     [
//       [
//         `function makeCounter() {`,
//         `  let count = ${a};`,
//         '  return () => count;',
//         '}',
//         'const next = makeCounter();',
//         'console.log(next(), next());',
//       ],
//       2,
//       `Each call must increase count before returning it; print ${a + 1} ${a + 2}.`,
//     ],
//   ];
//   const [lines, target, prompt] = variants[level % variants.length];
//   // Vary the correct line location without changing semantics or revealing a marker.
//   const offset = randomInt(0, 3);
//   const prefix = Array.from(
//     { length: offset },
//     (_, i) => `const label${i + 1} = "${['Arcade', 'Round', 'Student'][i]}";`,
//   );
//   return {
//     id: crypto.randomUUID(),
//     code: [...prefix, ...lines].join('\n'),
//     prompt,
//     answer: String(target + offset),
//     choices: null,
//   };
// }

export function question(game, level) {
  const a = randomInt(2, 15);
  const b = randomInt(2, 10);
  const c = randomInt(1, 8);

  if (game === 'output') {
    const variants = [
      [`a = ${a}\nb = ${b}\nprint(a + b)`, a + b],
      [`values = [${a}, ${b}, ${c}]\nprint(values[1])`, b],
      [`total = ${a}\ntotal += ${b}\nprint(total * 2)`, (a + b) * 2],
      [
        `numbers = [${a}, ${b}, ${c}]
count = 0
for number in numbers:
    if number > ${c}:
        count += 1
print(count)`,
        [a, b, c].filter((number) => number > c).length,
      ],
      [
        `total = 0
for i in range(${c + 2}):
    total += i
print(total)`,
        ((c + 1) * (c + 2)) / 2,
      ],
      [
        `values = [${a}, ${b}]
doubled = [number * 2 for number in values]
print(doubled[0] + values[1])`,
        2 * a + b,
      ],
      [
        `def calculate(value):
    if value % 2 == 0:
        return value // 2
    return value * 3 + 1

print(calculate(calculate(${2 * c})))`,
        c % 2 === 0 ? c / 2 : c * 3 + 1,
      ],
      [
        `values = [${a}, ${b}]
alias = values
copy = values[:]
alias[0] += ${c}
print(copy[0] + values[0])`,
        2 * a + c,
      ],
      [
        `values = [${a}, ${b}, ${c}]
total = ${c}
for index, value in enumerate(values):
    total += index * value
print(total)`,
        b + 3 * c,
      ],
    ];

    const [code, answer] = variants[level % variants.length];

    return {
      id: crypto.randomUUID(),
      code,
      prompt: 'What is printed?',
      choices: shuffle([answer, answer + c, answer - b, answer + a + b]).map(String),
      answer: String(answer),
    };
  }

  const variants = [
    [
      [`a = ${a}`, `b = ${b}`, 'total = a - b', 'print(total)'],
      2,
      `Print ${a + b}, the sum of a and b.`,
    ],
    [
      [`values = [${a}, ${b}, ${c}]`, 'last = values[len(values)]', 'print(last)'],
      1,
      `Print ${c}, the final list element.`,
    ],
    [
      [`score = ${a}`, `if score < ${a - 1}:`, '    print("PASS")'],
      1,
      `Print PASS when score is greater than ${a - 1}.`,
    ],
    [
      ['total = 0', `for number in range(1, ${c + 2}):`, '    total += number', 'print(total)'],
      1,
      `Sum every integer from 1 through ${c + 2}, inclusive.`,
    ],
    [
      [
        'def double(number):',
        '    result = number * 2',
        '    return number',
        '',
        `print(double(${a}))`,
      ],
      2,
      `Print ${2 * a} by returning twice the supplied number.`,
    ],
    [
      [`values = [${a}, ${b}]`, 'doubled = [number + 2 for number in values]', 'print(doubled)'],
      1,
      `Double every value to produce [${2 * a}, ${2 * b}].`,
    ],
    [
      [`values = [${a}, ${b}]`, 'original = values', `values[0] = ${a + 2}`, 'print(original[0])'],
      1,
      `Keep an independent copy so this prints the original value, ${a}.`,
    ],
    [
      [
        'def total(values):',
        '    result = 0',
        '    for value in values:',
        '        result += value',
        '        return result',
        '',
        `print(total([${a}, ${b}, ${c}]))`,
      ],
      4,
      `Sum all three values and print ${a + b + c}.`,
    ],
    [
      [
        'def factorial(number):',
        '    if number == 0:',
        '        return 1',
        '    return number * factorial(number)',
        '',
        `print(factorial(${c + 2}))`,
      ],
      3,
      'Calculate the factorial; each recursive call must approach the base case.',
    ],
  ];

  const [lines, target, prompt] = variants[level % variants.length];

  return {
    id: crypto.randomUUID(),
    code: lines.join('\n'),
    prompt,
    answer: String(target),
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
