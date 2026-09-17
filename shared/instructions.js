// Short steps, concrete goals and an example: no assumed programming vocabulary.
export const instructions = {
  robot: {
    goal: 'Help the robot collect every item and reach the flag.',
    steps: [
      'Tap the arrow buttons to build a route. Each arrow moves the robot one square. The arrows run from left to right.',
      'Avoid walls. Pick up numbered keys before crossing gates with the same number. Finish on the flag after collecting every item.',
      'Use Remove previous or Clear to fix your route. Press Run when it is ready. Every run starts from the original square.',
    ],
    example: 'Here, three Right arrows collect key 1, open gate 1 and reach the flag.',
  },
  parcel: {
    goal: 'Put the sorting rules in an order that sends every parcel to its required depot.',
    steps: [
      'Look at each parcel’s colour, shape and stripes. Its letter tells you the depot it must reach.',
      'Move rules up or down. A parcel checks the rules from top to bottom and follows the FIRST rule that matches. It ignores all later rules.',
      'If no rule matches, the parcel goes to the fallback depot shown. Press Run to test the order. You arrange the rules, not the parcels.',
    ],
    example:
      'Put Green before Circle. A green circle then goes to A; a circle of another colour goes to B.',
  },
  painter: {
    goal: 'Move the painter and colour exactly the target squares.',
    steps: [
      'Arrow instructions move one square. Moving does not paint: add Paint to colour the square you are standing on.',
      'Build the instructions in order. Stay inside the board and paint every target square without painting extra squares.',
      'A Repeat block runs its small list several times. You may use one block, with 2–4 instructions repeated 2–4 times. Stay within the instruction-tile limit shown, then press Run.',
    ],
    example: 'Repeat [Right, Paint] three times to paint three squares in a row.',
  },
  debug: {
    goal: 'Find the one line of Python that makes the program do the wrong thing.',
    steps: [
      'Read the sentence above the code. It tells you what the program should do.',
      'Follow the code from top to bottom. Keep track of values as they change, and check what happens each time a loop repeats.',
      'Tap the faulty line, then Submit. You choose a line; you do not type a repair. The given starting values and final print line stay unchanged.',
    ],
    example:
      'This program should add 2 and 3. The minus sign on line 3 is the mistake: it should be a plus.',
  },
  output: {
    goal: 'Work out what the Python program displays.',
    steps: [
      'Read the code from top to bottom. A variable is a name holding a value; an assignment replaces that value.',
      'Follow each repeated step in a loop. List positions start at 0, so position 1 means the second item.',
      'Choose the answer that matches the final print output, then Submit. You can change your choice before submitting.',
    ],
    example: 'In [2, 5, 3], position 0 is 2 and position 1 is 5. This example prints 5.',
  },
};
