import { useState } from 'react';
import {
  HiOutlineArrowUp,
  HiOutlineArrowDown,
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineBackspace,
  HiOutlineFlag,
  HiOutlineCpuChip,
} from 'react-icons/hi2';
import { useArcade } from '../state';
import { Button, cx } from '../components/ui';

const moves = {
  up: HiOutlineArrowUp,
  down: HiOutlineArrowDown,
  left: HiOutlineArrowLeft,
  right: HiOutlineArrowRight,
};

export function Board({ board, display = false }) {
  const { size, position, goal, start, blocks } = board;

  return (
    <div
      role="img"
      aria-label={`Robot maze, ${size} by ${size}. Robot at row ${
        Math.floor(position / size) + 1
      }, column ${(position % size) + 1}. Goal at row ${
        Math.floor(goal / size) + 1
      }, column ${(goal % size) + 1}.`}
      className={cx(
        'mx-auto grid aspect-square w-full gap-1 rounded-xl bg-[#E9E9E1] p-2',
        size === 7 ? 'grid-cols-7' : 'grid-cols-5',
        display ? 'max-w-[min(62vh,600px)]' : 'max-w-sm',
      )}
    >
      {Array.from({ length: size * size }, (_, cell) => (
        <div
          key={cell}
          className={cx(
            'grid aspect-square place-items-center rounded-sm',
            blocks.includes(cell) ? 'bg-[#62625C]' : 'bg-white',
            cell === position && 'bg-[#DDEBE0]',
          )}
        >
          {cell === position ? (
            <HiOutlineCpuChip className="h-3/5 w-3/5 text-[#365E53]" />
          ) : cell === goal ? (
            <HiOutlineFlag className="h-3/5 w-3/5 text-[#365E53]" />
          ) : cell === start ? (
            <span className="size-2 rounded-full bg-[#365E53]" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function RobotController({ game, attemptId }) {
  const { command, busy } = useArcade();
  const q = game.question;

  const [draft, setDraft] = useState(() => [...q.program]);
  const [selected, setSelected] = useState(null);

  const locked = busy || q.running || game.complete;
  const shown = q.running ? q.program : draft;

  // Only highlight an old failure while viewing that same program.
  const unchanged =
    draft.length === q.program.length && draft.every((move, index) => move === q.program[index]);

  const edit = (move) => {
    setDraft((current) => {
      if (selected !== null) {
        return current.map((value, index) => (index === selected ? move : value));
      }

      return current.length < q.maxMoves ? [...current, move] : current;
    });

    setSelected(null);
  };

  const remove = () => {
    setDraft((current) => {
      const index = selected ?? current.length - 1;
      return current.filter((_, position) => position !== index);
    });

    setSelected(null);
  };

  const run = async () => {
    setSelected(null);

    await command('robot', {
      attemptId,
      challengeId: q.id,
      program: draft,
    });
  };

  return (
    <div className="space-y-4">
      <Board board={q} />

      <div className="flex items-center justify-between text-sm text-[#62625C]">
        <span>
          {shown.length} / {q.maxMoves} moves
        </span>

        <button
          type="button"
          disabled={locked || !draft.length}
          className="min-h-11 px-2 underline underline-offset-4 disabled:opacity-40"
          onClick={() => {
            setDraft([]);
            setSelected(null);
          }}
        >
          Clear
        </button>
      </div>

      <div
        aria-label="Program"
        className="flex min-h-16 flex-wrap gap-2 rounded-lg border border-[#DDDDD5] bg-white p-3"
      >
        {shown.length ? (
          shown.map((move, index) => {
            const Icon = moves[move];

            return (
              <button
                key={index}
                type="button"
                disabled={locked}
                aria-label={`Move ${index + 1}: ${move}. Select to replace.`}
                aria-pressed={selected === index}
                onClick={() => setSelected((current) => (current === index ? null : index))}
                className={cx(
                  'flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md border px-2',
                  selected === index ? 'border-[#365E53] bg-[#E9EDE6]' : 'border-transparent',
                  q.running && index === Math.max(0, q.cursor - 1) && 'bg-[#DDEBE0]',
                  !q.running &&
                    unchanged &&
                    q.failedIndex === index &&
                    'border-[#A33030] bg-[#FAEEEE]',
                )}
              >
                <span className="text-xs text-[#62625C]">{index + 1}</span>
                <Icon className="size-5" />
              </button>
            );
          })
        ) : (
          <span className="self-center text-sm text-[#62625C]">Build your route</span>
        )}
      </div>

      {selected !== null && <p className="text-sm text-[#62625C]">Replace move {selected + 1}</p>}

      <div className="grid grid-cols-4 gap-2">
        {Object.entries(moves).map(([name, Icon]) => (
          <Button
            key={name}
            secondary
            aria-label={name}
            disabled={locked || (selected === null && draft.length >= q.maxMoves)}
            onClick={() => edit(name)}
          >
            <Icon className="size-6" />
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={busy || game.complete || (!q.running && !draft.length)}
          onClick={() =>
            q.running
              ? command('robot', {
                  attemptId,
                  challengeId: q.id,
                  stop: true,
                })
              : run()
          }
        >
          {q.running ? 'Stop' : 'Run from start'}
        </Button>

        <Button
          secondary
          aria-label={selected === null ? 'Remove last move' : 'Remove selected move'}
          disabled={locked || !draft.length}
          onClick={remove}
        >
          <HiOutlineBackspace className="size-5" />
        </Button>
      </div>

      {q.feedback && unchanged && (
        <p role="status" className="text-sm text-[#A33030]">
          {q.feedback}
        </p>
      )}
    </div>
  );
}
