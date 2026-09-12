import { randomInt } from 'node:crypto';
import { TIMING } from '../../shared/timing.js';
import { shuffle } from './random.js';
export function question(game, level) {
  const a = randomInt(2, 15);
  const b = randomInt(3, 10);
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
      `Print ${c}, the last item in the list.`,
    ],
    [
      [`score = ${a}`, `if score < ${a - 1}:`, '    print("PASS")'],
      1,
      `Print PASS when score is greater than ${a - 1}.`,
    ],
    [
      ['total = 0', `for number in range(1, ${c + 2}):`, '    total += number', 'print(total)'],
      1,
      `Add the numbers from 1 to ${c + 2}, including ${c + 2}, and print the total.`,
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
      `The double function should return the input multiplied by 2. This should print ${2 * a}.`,
    ],
    [
      [`values = [${a}, ${b}]`, 'doubled = [number + 2 for number in values]', 'print(doubled)'],
      1,
      `Double every value to produce [${2 * a}, ${2 * b}].`,
    ],
    [
      [`values = [${a}, ${b}]`, 'original = values', `values[0] = ${a + 2}`, 'print(original[0])'],
      1,
      `Copy the list before changing it. Changing values must leave original unchanged, so this prints ${a}.`,
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
      `Add all three numbers before returning the total. This should print ${a + b + c}.`,
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
      'Factorial multiplies a number by all the whole numbers below it down to 1. Each call should use a number one smaller, until it reaches 0.',
    ],
  ];

  const [lines, target, prompt] = variants[level % variants.length];

  return {
    id: crypto.randomUUID(),
    code: lines.join('\n'),
    prompt: `${prompt} Which line needs changing?`,
    answer: String(target),
    choices: null,
  };
}

export function answerGame(game, answer, challengeId, now) {
  if (
    game.complete ||
    game.phase !== 'question' ||
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
  game.remainingMs = Math.max(0, game.deadline - now);
  game.feedback = {
    ...q,
    selected: String(answer),
    correct,
    points: correct ? 90 + bonus : 0,
    timedOut: false,
  };
  game.history.push(game.feedback);
  game.phase = 'feedback';
  game.feedbackUntil = now + TIMING.feedback;
  return true;
}

export function tickQuiz(game, now) {
  if (game.complete) return;
  if (game.phase === 'question' && now >= game.deadline) {
    game.remainingMs = 0;
    game.feedback = { ...game.question, selected: null, correct: false, points: 0, timedOut: true };
    game.history.push(game.feedback);
    game.phase = 'feedback';
    game.feedbackUntil = now + TIMING.feedback;
  } else if (game.phase === 'feedback' && now >= game.feedbackUntil) {
    game.level++;
    if (game.level >= 9 || game.remainingMs <= 0) {
      game.complete = true;
      game.completionStatus = game.remainingMs <= 0 ? 'timed_out' : 'completed';
    } else {
      game.phase = 'question';
      game.feedback = null;
      game.question = question(game.id, game.level);
      game.questionAt = now;
      game.deadline = now + game.remainingMs;
    }
  }
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
  tick: tickQuiz,
  live: {
    question: (level) => question(id, level),
    validAnswer: (q, value) => validAnswer(id, q, value),
  },
});
