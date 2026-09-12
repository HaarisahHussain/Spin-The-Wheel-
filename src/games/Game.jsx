import { useState } from 'react';
import { useArcade } from '../state';
import { Button, Timer, cx } from '../components/ui';
import { Code } from '../components/Code';
import { AnswerFeedback } from '../components/AnswerFeedback';
import { Board, RobotController } from './Robot';

export function Question({
  question: questionValue,
  gameId,
  display = false,
  locked = false,
  onSubmit,
  reveal = false,
  submitted = undefined,
  points,
  timedOut = false,
}) {
  const [selected, setSelected] = useState(null);
  const { busy } = useArcade();
  const q = questionValue;
  const choice = submitted !== undefined ? submitted : selected;
  return (
    <div className="min-w-0 space-y-3">
      <h2 className={cx('font-medium leading-snug', display ? 'text-xl lg:text-2xl' : 'text-lg')}>
        {q.prompt}
      </h2>
      {reveal && (
        <AnswerFeedback
          question={q}
          gameId={gameId}
          selected={choice}
          points={points}
          timedOut={timedOut}
          display={display}
          shared={display && submitted === undefined}
        />
      )}
      <Code
        code={q.code}
        display={display}
        selectable={!display && !reveal && gameId === 'debug'}
        selected={choice}
        onSelect={setSelected}
        locked={locked}
        correctLine={reveal && gameId === 'debug' ? q.answer : null}
      />
      {gameId === 'output' && (
        <div className={cx('grid gap-3', display ? 'grid-cols-4' : 'grid-cols-2')}>
          {q.choices.map((answer, i) => (
            <button
              key={answer}
              disabled={display || locked || reveal}
              onClick={() => setSelected(answer)}
              aria-pressed={choice === answer}
              className={cx(
                'min-h-12 min-w-0 break-words rounded-lg border px-4 py-2 text-left font-mono',
                display ? 'text-lg lg:text-xl' : 'text-base',
                reveal && q.answer === answer
                  ? 'border-[#365E53] bg-[#DDEBE0]'
                  : choice === answer
                    ? reveal
                      ? 'border-[#A33030] bg-[#FAEEEE]'
                      : 'border-[#365E53] bg-[#E9EDE6]'
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
        !reveal &&
        (locked ? (
          <p role="status" className="py-2 text-center text-[#365E53]">
            Answer locked
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
          {game.id === 'robot'
            ? `Board ${Math.min(game.level + 1, 9)} / 9`
            : `Question ${Math.min(game.level + 1, 9)} / 9`}
        </span>
        {game.phase === 'feedback' ? (
          <span>{Math.ceil(game.remainingMs / 1000)}s answering time left</span>
        ) : (
          <Timer until={game.deadline} />
        )}
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
          reveal={game.phase === 'feedback'}
          locked={game.phase === 'feedback'}
          submitted={game.phase === 'feedback' ? game.feedback.selected : undefined}
          points={game.feedback?.points}
          timedOut={game.feedback?.timedOut}
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
