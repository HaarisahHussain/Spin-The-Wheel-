export const games = [
  {
    id: 'debug',
    name: 'Debug Dash',
    duration: 75,
    live: true,
    description: 'Find the line that prevents the intended result.',
  },
  {
    id: 'output',
    name: 'Guess the Output',
    duration: 75,
    live: true,
    description: 'Read the code. Choose its output.',
  },
  {
    id: 'robot',
    name: 'Robot Rescue',
    duration: 100,
    live: false,
    description: 'Build a route. Move the robot to the goal.',
  },
];
export const gameById = (id) => games.find((game) => game.id === id);
export const scoreText = (value) => ((value ?? 0) / 100).toFixed(2);
export const grade = (score) =>
  score === 0
    ? 'No score'
    : ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'][Math.min(8, Math.ceil(score / 100) - 1)];
export const allowedEmail = (input) =>
  typeof input === 'string' &&
  input.length <= 254 &&
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(mail\.bcu\.ac\.uk|bcu\.ac\.uk)$/i.test(input.trim()) &&
  !input.trim().split('@')[0].startsWith('.') &&
  !input.trim().split('@')[0].endsWith('.') &&
  !input.trim().split('@')[0].includes('..');
export const normalizeEmail = (email) => email.trim().toLowerCase();
export const SCORING_VERSION = '0.3-pilot-1';
