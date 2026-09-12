import { HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineClock } from 'react-icons/hi2';
import { cx } from './ui';
import { scoreText } from '../../shared/catalog';
export function AnswerFeedback({
  question,
  gameId,
  selected,
  display = false,
  points,
  timedOut = false,
  shared = false,
}) {
  const correct =
    selected !== null && selected !== undefined && String(selected) === question.answer;
  const Icon =
    shared || correct ? HiOutlineCheckCircle : timedOut ? HiOutlineClock : HiOutlineXCircle;
  const choice = (value) => (gameId === 'debug' ? `Line ${Number(value) + 1}` : value);
  return (
    <section
      role="status"
      aria-live="polite"
      className={cx(
        'flex items-center gap-4 rounded-xl border px-4 py-3',
        shared || correct ? 'border-[#365E53] bg-[#E9EDE6]' : 'border-[#A33030] bg-[#FAEEEE]',
      )}
    >
      <Icon
        aria-hidden="true"
        className={cx(
          'shrink-0',
          display ? 'size-10' : 'size-9',
          shared || correct ? 'text-[#365E53]' : 'text-[#A33030]',
        )}
      />
      <div className="min-w-0">
        <p className={cx('font-semibold', display ? 'text-2xl' : 'text-xl')}>
          {shared ? 'Correct answer' : timedOut ? 'Time up' : correct ? 'Correct' : 'Incorrect'}
          {correct && points !== undefined ? ` · +${scoreText(points)}` : ''}
        </p>
        <p className={cx('break-words', display ? 'text-lg' : 'text-sm')}>
          {!shared && selected != null && !correct && <>Selected: {choice(selected)} · </>}
          {gameId === 'debug'
            ? `Correct line: ${Number(question.answer) + 1}`
            : `Answer: ${question.answer}`}
        </p>
      </div>
    </section>
  );
}
