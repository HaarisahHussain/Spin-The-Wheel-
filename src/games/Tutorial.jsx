import { useState, useEffect } from 'react';
import { gameById, availableGames } from '../../shared/catalog';
import { useClock, useArcade } from '../state';
import { Button } from '../components/ui';
import { Code } from '../components/Code';
import { PuzzleExecution, PuzzleView } from './Puzzles';
const samples = {
  robot: {
    game: 'robot',
    size: 5,
    start: 0,
    position: 0,
    goal: 2,
    blocks: [5, 6, 7, 8, 9],
    solution: ['right', 'right'],
  },
  parcel: {
    game: 'parcel',
    depth: 1,
    groups: [[0]],
    packets: [0, 1],
    depots: [0, 1],
    solution: [0],
  },
  painter: {
    game: 'painter',
    size: 4,
    start: 0,
    target: [0, 1],
    solution: ['paint', 'right', 'paint'],
  },
};
const instructions = {
  robot:
    'Use arrows to write a route to the flag. Run plays your steps. If blocked, edit the highlighted step.',
  parcel:
    'Each junction shows which shapes go left and right. Tap to swap the exits, then Run. Match every parcel to its depot.',
  painter:
    'Move changes position. Paint marks that square. Match the small target. Later, Repeat runs a group of steps twice.',
  debug: 'Tap the faulty statement, then Submit. Keep the given inputs and final print unchanged.',
  output: 'Read the code from top to bottom. Choose what it prints, then Submit.',
};
export function Tutorial({ gameId, display = false }) {
  const [run, setRun] = useState(null),
    now = useClock(),
    q = samples[gameId],
    running = run && now < run + 2400;
  useEffect(() => {
    if (display) setRun(now);
  }, [gameId, display]);
  const result =
    gameId === 'robot'
      ? { path: [0, 1, 2] }
      : gameId === 'parcel'
        ? {
            routes: [
              { type: 0, destination: 0 },
              { type: 1, destination: 1 },
            ],
          }
        : {
            frames: [
              { cell: 0, painted: [] },
              { cell: 0, painted: [0] },
              { cell: 1, painted: [0] },
              { cell: 1, painted: [0, 1] },
            ],
          };
  return (
    <section className="mx-auto max-w-lg space-y-4">
      <h2 className="text-2xl font-medium">{gameById(gameId)?.name}</h2>
      <p className="text-sm">{instructions[gameId]}</p>
      <p className="text-xs text-[#62625C]">Example only · no score</p>
      {q ? (
        run ? (
          <PuzzleExecution
            q={q}
            execution={{
              id: 'sample',
              started: run,
              until: run + 2400,
              selected: q.solution,
              result,
            }}
            display={display}
          />
        ) : (
          <PuzzleView q={q} display={display} />
        )
      ) : (
        <>
          <Code
            code={
              gameId === 'debug'
                ? 'a = 2\nb = 3\ntotal = a - b\nprint(total)'
                : 'values = [2, 5, 3]\nprint(values[1])'
            }
          />
          {run && (
            <p role="status" className="rounded-lg bg-[#DDEBE0] p-3 text-sm">
              {gameId === 'debug'
                ? 'Line 3: use + to add. The total becomes 5.'
                : 'The answer is 5. List positions begin at zero.'}
            </p>
          )}
        </>
      )}
      {!display && (
        <Button secondary disabled={running} onClick={() => setRun(now)}>
          {q ? 'Play example' : 'Show answer'}
        </Button>
      )}
    </section>
  );
}
export function GameHelp() {
  const [id, setId] = useState('robot');
  const { state } = useArcade();
  return (
    <details className="rounded-lg border border-[#DDDDD5] p-4">
      <summary className="cursor-pointer text-sm">How to play</summary>
      <label className="my-4 block text-sm">
        Game
        <select
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="mt-2 min-h-11 w-full rounded border border-[#C5C5BC] bg-white p-2"
        >
          {availableGames(state?.config).map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      <Tutorial key={id} gameId={id} />
    </details>
  );
}
