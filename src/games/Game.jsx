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
import { Button, Timer, cx } from '../components/ui';
import { Code } from '../components/Code';
const moves = {
  up: HiOutlineArrowUp,
  down: HiOutlineArrowDown,
  left: HiOutlineArrowLeft,
  right: HiOutlineArrowRight,
};
export function Board({ board, display = false }) {
  return (
    <div
      role="img"
      aria-label={`Robot at row ${Math.floor(board.position / 5) + 1}, column ${(board.position % 5) + 1}; goal at bottom right`}
      className={cx(
        'mx-auto grid aspect-square w-full grid-cols-5 gap-2 rounded-xl bg-[#E9E9E1] p-2',
        display ? 'max-w-[min(62vh,600px)]' : 'max-w-sm',
      )}
    >
      {Array.from({ length: 25 }, (_, i) => (
        <div
          key={i}
          className={cx(
            'grid aspect-square place-items-center rounded-md',
            board.blocks.includes(i) ? 'bg-[#62625C]' : 'bg-white',
            i === board.position && 'bg-[#DDEBE0]',
          )}
        >
          {i === board.position ? (
            <HiOutlineCpuChip className="h-3/5 w-3/5 text-[#365E53]" />
          ) : i === 24 ? (
            <HiOutlineFlag className="h-1/2 w-1/2 text-[#365E53]" />
          ) : null}
        </div>
      ))}
    </div>
  );
}
function RobotController({ game, attemptId }) {
  const { command, busy } = useArcade(),
    [draft, setDraft] = useState([]);
  const q = game.question;
  const run = async () => {
    const accepted = await command('robot', { attemptId, challengeId: q.id, program: draft });
    if (accepted) setDraft([]);
  };
  return (
    <div className="space-y-5">
      <Board board={q} />
      <div
        className="flex min-h-12 flex-wrap items-center gap-2 rounded-lg border border-[#DDDDD5] bg-white p-3"
        aria-label="Program"
      >
        {(q.running ? q.program : draft).length ? (
          (q.running ? q.program : draft).map((m, i) => {
            const Icon = moves[m];
            return (
              <span
                key={i}
                className={cx('rounded p-1', q.running && i === q.cursor && 'bg-[#DDEBE0]')}
              >
                <Icon aria-label={m} className="size-5" />
              </span>
            );
          })
        ) : (
          <span className="text-sm text-[#62625C]">Add moves below</span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(moves).map(([name, Icon]) => (
          <Button
            key={name}
            secondary
            aria-label={name}
            disabled={q.running || draft.length >= 100}
            onClick={() => setDraft([...draft, name])}
          >
            <Icon className="size-6" />
          </Button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={busy || (!q.running && !draft.length)}
          onClick={() =>
            q.running ? command('robot', { attemptId, challengeId: q.id, stop: true }) : run()
          }
        >
          {q.running ? 'Stop' : 'Run'}
        </Button>
        <Button
          secondary
          aria-label="Remove last move"
          disabled={q.running || !draft.length}
          onClick={() => setDraft(draft.slice(0, -1))}
        >
          <HiOutlineBackspace className="size-5" />
        </Button>
      </div>
      {q.feedback && (
        <p role="status" className="text-sm text-[#A33030]">
          {q.feedback}
        </p>
      )}
    </div>
  );
}
export function Question({
  question: questionValue,
  gameId,
  display = false,
  locked = false,
  onSubmit,
  reveal = false,
}) {
  const [selected, setSelected] = useState(null);
  const { busy } = useArcade();
  const q = questionValue;
  return (
    <div className="space-y-5">
      <h2 className={cx('font-medium leading-snug', display ? 'text-2xl lg:text-3xl' : 'text-lg')}>
        {q.prompt}
      </h2>
      <Code
        code={q.code}
        display={display}
        selectable={!display && gameId === 'debug'}
        selected={selected}
        onSelect={setSelected}
        locked={locked}
        correctLine={reveal && gameId === 'debug' ? q.answer : null}
      />
      {gameId === 'output' && (
        <div className={cx('grid gap-3', display ? 'grid-cols-4' : 'grid-cols-2')}>
          {q.choices.map((answer, i) => (
            <button
              key={answer}
              disabled={display || locked}
              onClick={() => setSelected(answer)}
              aria-pressed={selected === answer}
              className={cx(
                'min-h-14 rounded-lg border px-4 py-3 text-left font-mono',
                display ? 'text-xl lg:text-2xl' : 'text-base',
                reveal && q.answer === answer
                  ? 'border-[#365E53] bg-[#DDEBE0]'
                  : selected === answer
                    ? 'border-[#365E53] bg-[#E9EDE6]'
                    : 'border-[#C5C5BC] bg-white',
              )}
            >
              <span className="mr-3 font-sans text-sm text-[#62625C]">
                {String.fromCharCode(65 + i)}
              </span>
              {answer}
            </button>
          ))}
        </div>
      )}
      {!display &&
        (locked ? (
          <p role="status" className="py-2 text-center text-[#365E53]">
            Answer submitted
          </p>
        ) : (
          <Button
            className="w-full"
            disabled={selected === null || busy}
            onClick={() => onSubmit(selected)}
          >
            Submit
          </Button>
        ))}
    </div>
  );
}
export function Game({ active, display = false }) {
  const { command } = useArcade();
  const game = active.game;
  return (
    <div className={cx('mx-auto w-full', display ? 'max-w-5xl' : 'max-w-lg')}>
      <div
        className={cx('mb-6 flex justify-between text-[#62625C]', display ? 'text-xl' : 'text-sm')}
      >
        <span>
          {game.id === 'robot' ? `Board ${game.level + 1} / 6` : `Question ${game.level + 1} / 9`}
        </span>
        <Timer until={game.deadline} />
      </div>
      {game.id === 'robot' ? (
        display ? (
          <Board board={game.question} display />
        ) : (
          <RobotController key={game.question.id} game={game} attemptId={active.attemptId} />
        )
      ) : (
        <Question
          key={game.question.id}
          question={game.question}
          gameId={game.id}
          display={display}
          onSubmit={(answer) =>
            command('answer', {
              answer,
              attemptId: active.attemptId,
              challengeId: game.question.id,
            })
          }
        />
      )}
    </div>
  );
}
