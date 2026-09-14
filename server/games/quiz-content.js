import { variable as V, expression as E } from './program.js';
// Six authored reasoning families per tier. Inputs vary; the semantic objective stays explicit.
export function buildChallenge(tier, family, r) {
  let id = 0;
  const S = (name, value) => ({ type: 'set', name, value, id: `s${id++}` }),
    P = (value) => ({ type: 'print', value, id: `s${id++}` }),
    I = (test, yes, no = []) => ({ type: 'if', test, yes, no, id: `s${id++}` }),
    F = (name, values, body) => ({ type: 'for', name, values, body, id: `s${id++}` });
  const a = r.int(1, 7),
    b = r.int(1, 7),
    limit = r.int(2, 6),
    values = Array.from({ length: tier < 2 ? 3 : r.int(3, 6) }, () => r.int(1, 6)),
    A = V('a'),
    B = V('b'),
    total = V('total'),
    item = V('item'),
    count = V('count');
  const done = (program, target, replacement, goal, mistake) => ({
    program,
    faultId: target.id,
    replacement,
    goal,
    mistake,
  });
  let t;
  const key = tier * 6 + family;
  switch (key) {
    case 0:
      t = S('a', E('+', A, B));
      return done(
        [S('a', a), S('b', b), t, S('b', E('+', A, 1)), P(B)],
        t,
        S('a', E('-', A, B)),
        'Add b to a, then set b to one more than the updated a.',
        'Subtracting b instead of adding it before the second update.',
      );
    case 1:
      t = S('b', V('saved'));
      return done(
        [S('a', a), S('b', a + 2), S('saved', A), S('a', B), t, P(E('-', A, B))],
        t,
        S('b', A),
        'Swap a and b using saved, then print a minus b.',
        'Overwriting a value before preserving it.',
      );
    case 2:
      t = S('left', E('-', V('left'), 1));
      return done(
        [
          S('left', a + 2),
          S('right', b),
          t,
          S('right', E('+', V('right'), 1)),
          P(E('-', V('left'), V('right'))),
        ],
        t,
        S('left', E('+', V('left'), 1)),
        'Move one item from left to right, then print left minus right.',
        'Updating both quantities in the same direction.',
      );
    case 3:
      t = S('total', E('+', total, item));
      return done(
        [S('total', a), S('item', b), t, S('item', E('+', item, 1)), P(total)],
        t,
        S('total', item),
        'Add the current item to total, then increase item by one.',
        'Replacing an accumulated value.',
      );
    case 4:
      t = S('index', E('+', V('index'), 1));
      return done(
        [
          S('items', values),
          S('index', 0),
          t,
          S('chosen', E('index', V('items'), V('index'))),
          P(V('chosen')),
        ],
        t,
        S('index', 0),
        'Advance one position from index zero, then read that list item.',
        'Reading before advancing the position.',
      );
    case 5:
      t = S('saved', A);
      return done(
        [S('a', a), S('b', b), t, S('a', E('+', A, B)), P(E('-', A, V('saved')))],
        t,
        S('saved', 0),
        'Save the original a; increase a by b; print how much a changed.',
        'Confusing a snapshot with the updated value.',
      );
    case 6:
      t = I(E('>=', V('score'), limit), [S('bonus', 2)], [S('bonus', 0)]);
      return done(
        [S('score', limit), t, S('score', E('+', V('score'), V('bonus'))), P(V('score'))],
        t,
        I(E('>', V('score'), limit), t.yes, t.no),
        `Scores of ${limit} or more receive two bonus points. Add that bonus to score.`,
        'Excluding the boundary value.',
      );
    case 7:
      t = S('a', E('+', A, 1));
      return done(
        [S('a', limit - 1), t, I(E('>=', A, limit), [S('b', 2)], [S('b', 1)]), P(B)],
        t,
        S('a', E('-', A, 1)),
        `Increase a by one, then set b to 2 if a reaches ${limit}, otherwise 1.`,
        'Choosing a branch using the previous state.',
      );
    case 8:
      t = I(E('<', A, B), [S('chosen', A)], [S('chosen', B)]);
      return done(
        [S('a', a), S('b', a + 2), t, P(V('chosen'))],
        t,
        I(E('>', A, B), t.yes, t.no),
        'Store and print the smaller input.',
        'Reversing a comparison.',
      );
    case 9:
      t = S('remaining', E('-', V('remaining'), 1));
      return done(
        [
          S('remaining', 1),
          S('open', a),
          t,
          I(E('==', V('remaining'), 0), [S('open', 0)]),
          P(V('open')),
        ],
        t,
        S('remaining', E('+', V('remaining'), 1)),
        'Use one remaining place; set open to zero when no places remain.',
        'Checking availability without updating it correctly.',
      );
    case 10:
      t = I(E('==', A, B), [S('result', 1)], [S('result', 0)]);
      return done(
        [S('a', a), S('b', a), t, S('result', E('+', V('result'), 1)), P(V('result'))],
        t,
        I(E('!=', A, B), t.yes, t.no),
        'Start result at 1 when the inputs match, otherwise 0; then add one.',
        'Applying the final update to the wrong branch result.',
      );
    case 11:
      t = S('b', E('-', B, 1));
      return done(
        [S('a', a), S('b', a + 1), t, I(E('==', A, B), [S('a', E('+', A, 2))]), P(A)],
        t,
        S('b', E('+', B, 1)),
        'Decrease b, then increase a by two only if the values match.',
        'Ignoring how the first change affects the condition.',
      );
    case 12:
      t = S('total', E('+', total, item));
      return done(
        [S('total', 0), F('item', values, [t]), P(total)],
        t,
        S('total', item),
        'Accumulate all items in total.',
        'Keeping only the last item.',
      );
    case 13:
      t = S('count', E('+', count, 1));
      return done(
        [S('count', 0), F('item', values, [I(E('>=', item, 2), [t])]), P(count)],
        t,
        S('count', item),
        'Count how many items are at least two.',
        'Replacing the count with an item instead of increasing it.',
      );
    case 14:
      t = S('total', E('+', total, count));
      return done(
        [
          S('total', 0),
          S('count', 0),
          F('item', values, [S('count', E('+', count, 1)), t]),
          P(total),
        ],
        t,
        S('total', E('+', total, item)),
        'For each item, increase count and then add the new count to total.',
        'Confusing the item value with the iteration count.',
      );
    case 15:
      t = S('best', item);
      return done(
        [S('best', 0), F('item', values, [I(E('>', item, V('best')), [t])]), P(V('best'))],
        t,
        S('best', E('+', V('best'), item)),
        'Keep the largest item seen so far.',
        'Accumulating instead of replacing the current maximum.',
      );
    case 16:
      t = S('total', E('-', total, 1));
      return done(
        [S('total', a + 4), F('item', values, [t, S('last', total)]), P(V('last'))],
        t,
        S('total', E('+', total, 1)),
        'Remove one from total for each item and remember the updated total.',
        'Tracing the update in the wrong direction.',
      );
    case 17:
      t = S('a', B);
      return done(
        [
          S('a', a),
          S('b', a + 1),
          F(
            'item',
            Array.from({ length: r.int(2, 5) }, (_, i) => i + 1),
            [S('saved', A), t, S('b', V('saved'))],
          ),
          P(A),
        ],
        t,
        S('a', V('saved')),
        'Swap a and b once per iteration using saved.',
        'Assuming repeated swaps always restore the starting state.',
      );
    case 18:
      t = S('total', E('+', total, item));
      return done(
        [
          S('total', 0),
          S('count', 0),
          F('item', values, [I(E('>', item, 1), [t, S('count', E('+', count, 1))])]),
          P(E('-', total, count)),
        ],
        t,
        S('total', E('+', total, 1)),
        'For values above one, accumulate their sum and count; print sum minus count.',
        'Treating two accumulators as interchangeable.',
      );
    case 19:
      t = S('previous', item);
      return done(
        [
          S('previous', 0),
          S('count', 0),
          F('item', values, [I(E('>', item, V('previous')), [S('count', E('+', count, 1))]), t]),
          P(count),
        ],
        t,
        S('previous', 0),
        'Count increases compared with the previous item, starting from zero.',
        'Comparing every item to the initial value.',
      );
    case 20:
      t = S('total', E('+', total, item));
      return done(
        [
          S('total', 0),
          S('enabled', true),
          F('item', values, [
            I(E('==', V('enabled'), true), [t]),
            S('enabled', E('==', V('enabled'), false)),
          ]),
          P(total),
        ],
        t,
        S('total', item),
        'Add alternating items, starting with the first. Toggle enabled after each item.',
        'Losing earlier selected values when the flag becomes true again.',
      );
    case 21:
      t = S('count', 0);
      return done(
        [
          S('count', 0),
          S('best', 0),
          F(
            'item',
            r.shuffle([
              [1, 1, 0, 1],
              [1, 0, 1, 1],
              [1, 1, 0, 1, 1],
              [1, 0, 1, 1, 1],
            ])[0],
            [
              I(E('==', item, 1), [S('count', E('+', count, 1))], [t]),
              I(E('>', count, V('best')), [S('best', count)]),
            ],
          ),
          P(V('best')),
        ],
        t,
        S('count', count),
        'Track the longest uninterrupted run of ones.',
        'Failing to reset state between groups.',
      );
    case 22:
      t = S('used', E('+', V('used'), item));
      return done(
        [
          S('used', 0),
          S('count', 0),
          F('item', values, [
            I(E('<=', E('+', V('used'), item), 5), [t, S('count', E('+', count, 1))]),
          ]),
          P(count),
        ],
        t,
        S('used', item),
        'Accept an item only when the running total stays at most five; count accepted items.',
        'Forgetting the capacity already used.',
      );
    case 23:
      t = S('a', E('+', A, 1));
      return done(
        [
          S('a', 0),
          S('b', 0),
          F('item', values, [I(E('>', item, 2), [t], [S('b', E('+', B, 1))])]),
          P(E('-', A, B)),
        ],
        t,
        S('a', item),
        'Count items above two in a and the others in b; print a minus b.',
        'Storing an item where a count belongs.',
      );
    case 24:
      t = S('previous', item);
      return done(
        [
          S('previous', 0),
          S('total', 0),
          F('item', values, [
            I(E('>', item, V('previous')), [
              S('total', E('+', total, E('-', item, V('previous')))),
            ]),
            t,
          ]),
          P(total),
        ],
        t,
        S('previous', 0),
        'Sum only upward changes between neighbouring values, starting from zero.',
        'Comparing to the initial state instead of the preceding state.',
      );
    case 25:
      t = S('count', E('+', count, 1));
      return done(
        [
          S('count', 0),
          S('ready', false),
          F(
            'item',
            r.shuffle([
              [0, 1, 1, 0],
              [1, 0, 1, 0],
              [1, 1, 0, 0, 1],
              [0, 1, 0, 1, 1],
            ])[0],
            [I(E('==', V('ready'), true), [t]), S('ready', E('==', item, 1))],
          ),
          P(count),
        ],
        t,
        S('count', 0),
        'Count each item whose previous item was one; the first item has no predecessor.',
        'Replacing a running count or using the current item too early.',
      );
    case 26:
      t = S('total', E('+', total, count));
      return done(
        [
          S('count', 0),
          S('total', 0),
          F('item', values, [I(E('>=', item, 2), [S('count', E('+', count, 1))]), t]),
          P(total),
        ],
        t,
        S('total', count),
        'After each item, add the number of qualifying items seen so far to total. Qualifying means at least two.',
        'Keeping the final count instead of the sum of intermediate counts.',
      );
    case 27:
      t = S('a', B);
      return done(
        [
          S('a', a),
          S('b', a + 1),
          F(
            'item',
            Array.from({ length: r.int(2, 5) }, (_, i) => i + 1),
            [S('saved', A), t, S('b', E('+', V('saved'), B))],
          ),
          P(B),
        ],
        t,
        S('a', V('saved')),
        'On each iteration, replace a with old b and b with the sum of both old values.',
        'Using a value after it has been overwritten.',
      );
    case 28:
      t = S('count', 0);
      return done(
        [
          S('count', 0),
          S('total', 0),
          F(
            'item',
            r.shuffle([
              [1, 0, 1, 1],
              [1, 1, 0, 1],
              [0, 1, 0, 1, 1],
              [1, 0, 1, 1, 1],
            ])[0],
            [
              I(E('==', item, 0), [t], [S('count', E('+', count, 1))]),
              S('total', E('+', total, count)),
            ],
          ),
          P(total),
        ],
        t,
        S('count', count),
        'Reset count on zero; otherwise increase it. Add the resulting count to total each time.',
        'Carrying state across a reset boundary.',
      );
    default:
      t = S('remaining', E('-', V('remaining'), item));
      return done(
        [
          S('remaining', 5),
          S('count', 0),
          F('item', r.shuffle([r.int(2, 5), 2, 1, 1]).slice(0, r.int(3, 5)), [
            I(E('<=', item, V('remaining')), [t, S('count', E('+', count, 1))]),
          ]),
          P(count),
        ],
        t,
        S('remaining', 5),
        'Accept each item that fits, subtract its size, and count accepted items.',
        'Testing later items against the original capacity.',
      );
  }
}
