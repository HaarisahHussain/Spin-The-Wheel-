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
    goal: 3,
    blocks: [5, 6, 7, 8, 9],
    items: [{ id: 'key', kind: 'key', label: '1', cell: 1 }],
    gates: [{ cell: 2, key: 'key', label: '1' }],
    solution: ['right', 'right', 'right'],
  },
  parcel: {
    game: 'parcel',
    rules: [
      { id: 'green', when: { colour: 0 }, destination: 0 },
      { id: 'circle', when: { shape: 0 }, destination: 1 },
    ],
    packets: [
      { id: 'a', shape: 0, colour: 0, stripe: false, target: 0 },
      { id: 'b', shape: 0, colour: 1, stripe: false, target: 1 },
    ],
    fallback: 2,
    starter: ['circle', 'green'],
    solution: ['green', 'circle'],
  },
  painter: {
    game: 'painter',
    size: 5,
    start: 0,
    target: [1, 2, 3],
    solution: [{ repeat: 3, body: ['right', 'paint'] }],
  },
};
const instructions = {
  robot:
    'Write arrows, then Run. Collect every item and finish at the flag. Numbered keys open matching gates. Each run starts over.',
  parcel:
    'Reorder the rules. Each parcel follows only the first rule it matches. The letter beside a parcel is its required depot.',
  painter:
    'Move changes position; Paint marks it. Repeat runs its 2–4 instructions 2–4 times. One block is allowed. Match the target within the tile budget.',
  debug: 'Tap the faulty statement, then Submit. Keep the given inputs and final print unchanged.',
  output: 'Read the code from top to bottom. Choose what it prints, then Submit.',
};
const sampleResults = {
  robot: {
    path: [0, 1, 2, 3],
    frames: [
      { cell: 0, mask: 0 },
      { cell: 1, mask: 1 },
      { cell: 2, mask: 1 },
      { cell: 3, mask: 1 },
    ],
    events: [{ sourceIndex: 0 }, { sourceIndex: 1 }, { sourceIndex: 2 }],
  },
  parcel: {
    routes: [
      { packetId: 'a', ruleId: 'green', destination: 0 },
      { packetId: 'b', ruleId: 'circle', destination: 1 },
    ],
  },
  painter: {
    frames: [
      { cell: 0, painted: [] },
      { cell: 1, painted: [] },
      { cell: 1, painted: [1] },
      { cell: 2, painted: [1] },
      { cell: 2, painted: [1, 2] },
      { cell: 3, painted: [1, 2] },
      { cell: 3, painted: [1, 2, 3] },
    ],
    events: Array.from({ length: 6 }, (_, i) => ({
      sourceIndex: 0,
      bodyIndex: i % 2,
      iteration: Math.floor(i / 2),
    })),
  },
};
export function Tutorial({ gameId, display = false }) {
  const [run, setRun] = useState(null),
    now = useClock(),
    q = samples[gameId],
    running = run && now < run + 2400;
  useEffect(() => {
    if (display) setRun(now);
  }, [gameId, display]);
  const result = sampleResults[gameId];
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
