import { random, seed, fingerprint } from './generate.js';
export function question(game, level, source = seed(), previousFamily = null) {
  const r = random(source),
    a = r.int(1, 6),
    b = r.int(1, 6),
    c = r.int(2, 4),
    values = [r.int(3, 6), r.int(1, 3), [0, 6, 7][r.int(0, 3)]],
    list = JSON.stringify(values),
    index = r.int(0, 3);
  const entries = [
    [
      `a = ${a}\nb = ${b}\ntotal = a + b\nprint(total)`,
      a + b,
      2,
      'total = a - b',
      'Add a and b.',
      'Use + to add the two inputs.',
    ],
    [
      `values = ${list}\nitem = values[${index}]\nprint(item)`,
      values[index],
      1,
      `item = values[${(index + 1) % 3}]`,
      `Read list position ${index}. Positions begin at 0.`,
      'Use the requested index inside square brackets.',
    ],
    [
      `total = ${a}\nextra = ${b}\ntotal += extra\nprint(total)`,
      a + b,
      2,
      'total = extra',
      'Add extra to the existing total.',
      '+= keeps the old total and adds the extra value.',
    ],
    [
      `score = ${a}\nif score >= 3:\n    result = 1\nelse:\n    result = 0\nprint(result)`,
      a >= 3 ? 1 : 0,
      1,
      'if score < 3:',
      'Set result to 1 for scores of 3 or more, otherwise 0.',
      '>= includes the boundary value.',
    ],
    [
      `total = 0\nfor number in range(1, ${c + 1}):\n    total += number\nprint(total)`,
      (c * (c + 1)) / 2,
      1,
      `for number in range(1, ${c}):`,
      `Add numbers 1 to ${c}, including ${c}.`,
      'The end of range is excluded.',
    ],
    [
      `values = ${list}\ntotal = 0\nfor value in values:\n    total += value\nprint(total)`,
      values.reduce((n, v) => n + v, 0),
      3,
      '    total = value',
      'Add all three list items.',
      'Accumulate with += rather than replacing the total.',
    ],
    [
      `values = ${list}\ncount = 0\nfor value in values:\n    if value >= 3:\n        count += 1\nprint(count)`,
      values.filter((v) => v >= 3).length,
      4,
      '        count += 2',
      'Count each list item of 3 or more once.',
      'Add one for each matching item.',
    ],
    [
      `def double(number):\n    result = number * 2\n    return result\nanswer = double(${a})\nprint(answer)`,
      a * 2,
      2,
      '    return number',
      'Return twice the input from double.',
      'Return the calculated result.',
    ],
    [
      `values = ${list}\noriginal = values[:]\nvalues[0] += 1\nprint(original[0])`,
      values[0],
      1,
      'original = values',
      'Keep a separate copy before changing values.',
      '[:] copies the list; assignment alone shares it.',
    ],
    [
      `values = ${list}\ntotal = 0\nfor value in values:\n    total += value * 2\nprint(total)`,
      values.reduce((n, v) => n + v * 2, 0),
      3,
      '    total += value',
      'Double every item, then add the results.',
      'Multiply each item before adding it.',
    ],
    [
      `value = ${a}\ncount = 0\nwhile value > 0:\n    value -= 1\n    count += 1\nprint(count)`,
      a,
      3,
      '    value += 1',
      'Count down to zero, decreasing value by 1 each time.',
      'Decrease value so the loop eventually stops.',
    ],
    [
      `values = ${list}\ntotal = 0\nfor value in values:\n    if value > 2:\n        total += value\nprint(total)`,
      values.filter((v) => v > 2).reduce((n, v) => n + v, 0),
      4,
      '        total += 1',
      'Add the values greater than 2.',
      'Add the value, not one per matching item.',
    ],
  ];
  const pools = [
      [0, 1],
      [2, 3],
      [4, 5],
      [6, 7, 10],
      [8, 9, 11],
    ],
    pool = pools[Math.min(4, level)];
  let family = pool[r.int(0, pool.length)];
  if (family === previousFamily) family = pool[(pool.indexOf(family) + 1) % pool.length];
  let [referenceCode, answer, line, broken, prompt, explanation] = entries[family];
  const lines = referenceCode.split('\n');
  const editableLines = lines
    .map((s, i) => i)
    .filter(
      (i) =>
        !lines[i].startsWith('print(') &&
        !/^\s*\w+\s*=\s*\d+\s*$/.test(lines[i]) &&
        !/^\s*(else:|def )/.test(lines[i]) &&
        !/^values =|^score =|^extra =|^a =|^b =|^value =/.test(lines[i]),
    );
  if (game === 'debug') lines[line] = broken;
  const total = values.reduce((n, v) => n + v, 0);
  const misconceptions = [
    [a, b, a * b, a - b],
    values,
    [a, b, a * b],
    [0, 1, a, 3],
    [c, answer - c, answer + c + 1],
    [values[2], total - values[0], values.length],
    [values.length, values.filter((v) => v > 3).length, 0],
    [a, a + 2, 2],
    [values[0] + 1, values[1], values[2]],
    [total, total + 2, values[2] * 2],
    [0, a - 1, a + 1],
    [total, values.filter((v) => v > 2).length, values[2]],
  ][family];
  const choices = r
    .shuffle([...new Set([answer, ...misconceptions, 0, 1, 2, 3, 4])].slice(0, 4))
    .map(String);
  return {
    id: crypto.randomUUID(),
    kind: 'quiz',
    game,
    level,
    family,
    seed: source,
    code: lines.join('\n'),
    referenceCode,
    prompt:
      game === 'debug'
        ? `${prompt} Keep the inputs and final print unchanged. Find the faulty line.`
        : 'What is printed?',
    answer: game === 'debug' ? String(line) : String(answer),
    choices: game === 'output' ? choices : null,
    editableLines,
    correctedLine: referenceCode.split('\n')[line],
    explanation:
      game === 'debug'
        ? explanation
        : 'Trace the statements in order, following only the branch or loop shown.',
    fingerprint: fingerprint({ game, code: lines.join('\n'), prompt }),
  };
}
