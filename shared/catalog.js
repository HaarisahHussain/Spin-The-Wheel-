export const games = [
  {
    id: 'debug',
    ranked: true,
    name: 'Debug Dash',
    duration: 150,
    live: true,
    description: 'Find the line that prevents the intended result.',
  },
  {
    id: 'output',
    ranked: true,
    name: 'Guess the Output',
    duration: 150,
    live: true,
    description: 'Read the code. Choose its output.',
  },
  {
    id: 'robot',
    ranked: true,
    name: 'Robot Rescue',
    duration: 150,
    live: true,
    description: 'Build a route. Move the robot to the goal.',
  },
  {
    id: 'parcel',
    ranked: true,
    name: 'Parcel Sorter',
    duration: 150,
    live: true,
    description: 'Send each parcel to its matching depot.',
  },
  {
    id: 'painter',
    ranked: true,
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

export const allowedEmail = (input) =>
  typeof input === 'string' &&
  input.length <= 254 &&
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(mail\.bcu\.ac\.uk|bcu\.ac\.uk)$/i.test(input.trim()) &&
  !input.trim().split('@')[0].startsWith('.') &&
  !input.trim().split('@')[0].endsWith('.') &&
  !input.trim().split('@')[0].includes('..');

export const normalizeEmail = (email) => email.trim().toLowerCase();

export const SCORING_VERSION = '0.6.0-five-challenges-1';

export const availableGames = () => games;
