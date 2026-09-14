export const games = [
  {
    id: 'debug',
    name: 'Debug Dash',
    duration: 150,
    live: true,
    description: 'Find the line that prevents the intended result.',
  },
  {
    id: 'output',
    name: 'Guess the Output',
    duration: 150,
    live: true,
    description: 'Read the code. Choose its output.',
  },
  {
    id: 'robot',
    name: 'Robot Rescue',
    duration: 150,
    live: true,
    description: 'Build a route. Move the robot to the goal.',
  },
  {
    id: 'parcel',
    name: 'Parcel Sorter',
    duration: 150,
    live: true,
    description: 'Send each parcel to its matching depot.',
  },
  {
    id: 'painter',
    name: 'Pattern Painter',
    duration: 150,
    live: true,
    description: 'Program a robot to paint the target pattern.',
  },
];

export const gameById = (id) => games.find((game) => game.id === id);

export const scoreText = (value) => ((value ?? 0) / 1000000).toFixed(2);

export const grade = (score) =>
  Number(scoreText(score)) === 0
    ? 'No score'
    : ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'][
        Math.min(8, Math.ceil(Number(scoreText(score))) - 1)
      ];

export const SCORING_VERSION = '0.6.0-five-challenges-1';

export const availableGames = () => games;
