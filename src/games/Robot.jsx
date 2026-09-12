import { useState, useRef, useLayoutEffect } from 'react';
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

  if (![5, 7].includes(size) || !Array.isArray(blocks))
    return <p role="alert">This board needs recovery. Ask the host to end this session.</p>;
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
        display ? 'max-w-[min(62vh,600px)]' : 'max-w-[min(36svh,320px)]',
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
  const sequenceRef = useRef(null);
  const previousLength = useRef(draft.length);
  useLayoutEffect(() => {
    if (draft.length > previousLength.current && sequenceRef.current)
      sequenceRef.current.scrollTop = sequenceRef.current.scrollHeight;
    previousLength.current = draft.length;
  }, [draft.length]);

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
    <div className="space-y-3">
      <Board board={q} />

      <div className="grid grid-cols-3 gap-2">
        {['clear', 'up', 'remove', 'left', 'down', 'right'].map((name) => {
          const Icon = moves[name] || HiOutlineBackspace;
          const action = name === 'clear' || name === 'remove';
          return (
            <Button
              key={name}
              secondary
              className="min-h-11 px-2"
              aria-label={
                name === 'remove'
                  ? selected === null
                    ? 'Remove last move'
                    : 'Remove selected move'
                  : name === 'clear'
                    ? 'Clear'
                    : name
              }
              disabled={
                locked || (action ? !draft.length : selected === null && draft.length >= q.maxMoves)
              }
              onClick={() =>
                name === 'clear'
                  ? (setDraft([]), setSelected(null))
                  : name === 'remove'
                    ? remove()
                    : edit(name)
              }
            >
              {name === 'clear' ? 'Clear' : <Icon className="size-5" />}
            </Button>
          );
        })}
      </div>
      <Button
        className="w-full"
        disabled={busy || game.complete || (!q.running && !draft.length)}
        onClick={() =>
          q.running ? command('robot', { attemptId, challengeId: q.id, stop: true }) : run()
        }
      >
        {q.running ? 'Stop' : 'Run from start'}
      </Button>
      <div className="flex h-5 justify-between text-sm text-[#62625C]">
        <span>
          {shown.length} / {q.maxMoves} moves
        </span>
        <span>{selected !== null ? `Replace move ${selected + 1}` : ''}</span>
      </div>
      <div
        ref={sequenceRef}
        aria-label="Program"
        className="flex h-28 content-start flex-wrap gap-2 overflow-y-auto overscroll-contain rounded-lg border border-[#DDDDD5] bg-white p-3"
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

      <p role="status" className="min-h-10 text-sm text-[#A33030]">
        {q.feedback && unchanged ? q.feedback : ''}
      </p>
    </div>
  );
}
