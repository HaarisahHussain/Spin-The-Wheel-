import { randomInt } from "node:crypto";

import { shuffle } from "../random.js";

export function generateDebugLevels() {
  // Generate a fresh set of four challenges for each game session. The random
  // values mean a new session does not simply replay the same questions.
  const levels = [];
  const make = (code, targetLine, message) => ({
    code: code.join("\n"),
    targetLine: targetLine - 1,
    message,
  });
  const n1 = randomInt(2, 10);
  levels.push(
    make(
      [`function add(a, b) {`, `  return a + ${n1};`, `}`],
      2,
      "The function should use both inputs. Spot the bug.",
    ),
  );

  const threshold = randomInt(12, 25),
    value = randomInt(3, 10);
  levels.push(
    make(
      [
        `const score = ${value};`,
        `if (score > ${threshold}) {`,
        `  console.log("WIN");`,
        `}`,
      ],
      2,
      "The condition can never be true. Find the bug.",
    ),
  );

  const limit = randomInt(4, 8);
  levels.push(
    make(
      [`for (let i = 0; i < ${limit}; i--) {`, `  console.log(i);`, `}`],
      1,
      "The loop is moving in the wrong direction. Find it.",
    ),
  );

  const names = ["Ada", "Sam", "Maya", "Alex", "Leo"];
  const person = names[randomInt(names.length)];
  levels.push(
    make(
      [
        `const name = "${person}";`,
        `const greeting = \`Hi ${"${name}"}\`;`,
        `console.log(greeting.toUppercase());`,
      ],
      3,
      "Boss level: the method name is subtly wrong.",
    ),
  );

  // Extra variants make the pool effectively much larger between sessions.
  const scoreValue = randomInt(1, 20);
  levels.push(
    make(
      [
        `let score = ${scoreValue};`,
        `if (score = ${randomInt(21, 40)}) {`,
        `  console.log("Great!");`,
        `}`,
      ],
      2,
      "Assignment or comparison? Spot the bug.",
    ),
  );

  const arr = shuffle([1, 2, 3, 4, 5]).slice(0, 3);
  levels.push(
    make(
      [
        `const nums = [${arr.join(", ")}];`,
        `console.log(nums[${arr.length}]);`,
        `console.log("done");`,
      ],
      2,
      "The index points past the end of the array.",
    ),
  );

  const chosen = shuffle(levels).slice(0, 4);
  return chosen.map((x, i) => ({ ...x, level: i + 1 }));
}
