import { randomInt } from "node:crypto";

import { shuffle } from "../random.js";

export function generateGuessLevels() {
  const levels = [];
  const add = (question, options, correctAnswer) => {
    const answer = correctAnswer.slice(3);
    const values = [...new Set(options.map((option) => option.slice(3)))];
    for (const fallback of ["Error", "undefined", "NaN", "0", "-1"]) {
      if (values.length >= 4) break;
      if (!values.includes(fallback)) values.push(fallback);
    }
    const shuffled = shuffle(values).map(
      (value, index) => `${String.fromCharCode(65 + index)}) ${value}`,
    );
    levels.push({
      question,
      options: shuffled,
      correctAnswer: shuffled.find((option) => option.slice(3) === answer),
    });
  };
  const a = randomInt(2, 10),
    b = randomInt(2, 10);
  const sum = a + b;
  add(
    `console.log(${a} + ${b});`,
    [`A) ${sum - 1}`, `B) ${sum}`, `C) ${sum + 1}`, "D) Error"],
    `B) ${sum}`,
  );

  const x = randomInt(2, 9),
    y = randomInt(2, 9);
  const product = x * y;
  add(
    `console.log(${x} * ${y} + 1);`,
    [`A) ${product}`, `B) ${product + 1}`, `C) ${x + y + 1}`, "D) Error"],
    `B) ${product + 1}`,
  );

  const str = ["cat", "code", "game", "robot", "hello"][randomInt(5)];
  add(
    `console.log('${str}'.length);`,
    [
      `A) ${str.length - 1}`,
      `B) ${str.length}`,
      `C) ${str.length + 1}`,
      "D) undefined",
    ],
    `B) ${str.length}`,
  );

  const m = randomInt(2, 9),
    n = randomInt(2, 9);
  const truth = m > n;
  add(
    `console.log(${m} > ${n} && ${n} > 1);`,
    ["A) true", "B) false", "C) 1", "D) Error"],
    truth && n > 1 ? "A) true" : "B) false",
  );

  const modA = randomInt(5, 20),
    modB = randomInt(2, 5),
    rem = modA % modB;
  add(
    `console.log(${modA} % ${modB});`,
    [`A) ${rem}`, `B) ${rem + 1}`, `C) ${modB}`, `D) Error`],
    `A) ${rem}`,
  );

  const divA = randomInt(4, 30),
    divB = randomInt(2, 6),
    div = divA / divB;
  if (Number.isInteger(div))
    add(
      `console.log(${divA} / ${divB} === ${div});`,
      ["A) true", "B) false", "C) Error", "D) undefined"],
      "A) true",
    );
  else
    add(
      `console.log(${divA} / ${divB} > 1);`,
      ["A) true", "B) false", "C) Error", "D) undefined"],
      divA / divB > 1 ? "A) true" : "B) false",
    );

  const boolNum = randomInt(1, 9);
  add(
    `console.log(Boolean(${boolNum}));`,
    ["A) true", "B) false", "C) 0", "D) Error"],
    "A) true",
  );

  const q = randomInt(3, 12),
    r = randomInt(1, q - 1);
  add(
    `console.log(${q} > ${r} && ${r} < ${q});`,
    ["A) true", "B) false", "C) 1", "D) Error"],
    "A) true",
  );

  return shuffle(levels)
    .slice(0, 4)
    .map((x, i) => ({ ...x, level: i + 1 }));
}
