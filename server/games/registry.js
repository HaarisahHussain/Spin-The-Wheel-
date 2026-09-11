import { games } from '../../shared/catalog.js';
import { quizAdapter } from './quiz.js';
import { robotAdapter } from './robot.js';
// Server-only adapters. Answer keys must never be imported into the client.
const adapters = {
  debug: quizAdapter('debug'),
  output: quizAdapter('output'),
  robot: robotAdapter,
};
export function adapterFor(id) {
  const adapter = adapters[id];
  if (!adapter) throw new Error('Unknown game: ' + id);
  return adapter;
}
for (const game of games) {
  const adapter = adapterFor(game.id);
  if (game.live && !adapter.live) throw new Error('Missing live adapter: ' + game.id);
}
export const liveGames = () => games.filter((game) => game.live && adapterFor(game.id).live);
