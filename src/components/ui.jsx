import { useEffect, useRef } from 'react';
import { useArcade, useClock } from '../state';
import { scoreText, grade } from '../../shared/catalog';
export const cx = (...classes) => classes.filter(Boolean).join(' ');
export function Button({ children, secondary = false, danger = false, className = '', ...props }) {
  return (
    <button
      {...props}
      className={cx(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#365E53] disabled:cursor-not-allowed disabled:opacity-40',
        secondary
          ? 'border border-[#C5C5BC] bg-transparent text-[#252525] hover:bg-white'
          : danger
            ? 'bg-[#A33030] text-white hover:bg-[#882525]'
            : 'bg-[#252525] text-white hover:bg-[#414139]',
        className,
      )}
    >
      {children}
    </button>
  );
}
export function Field({ label, className = '', ...props }) {
  return (
    <label className={cx('block min-w-0 space-y-2 text-sm font-medium', className)}>
      <span>{label}</span>
      <input
        {...props}
        className="min-h-12 w-full min-w-0 max-w-full rounded-lg border border-[#C5C5BC] bg-white px-4 py-3 text-base font-normal outline-none focus:border-[#365E53] focus:ring-2 focus:ring-[#365E53]/15"
      />
    </label>
  );
}
export function Select({ label, children, ...props }) {
  return (
    <label className="block min-w-0 space-y-2 text-sm font-medium">
      <span>{label}</span>
      <select
        {...props}
        className="min-h-12 w-full min-w-0 max-w-full rounded-lg border border-[#C5C5BC] bg-white px-3 text-base font-normal outline-none focus:ring-2 focus:ring-[#365E53]"
      >
        {children}
      </select>
    </label>
  );
}
export function Textarea({ label, ...props }) {
  return (
    <label className="block min-w-0 space-y-2 text-sm font-medium">
      <span>{label}</span>
      <textarea
        {...props}
        className="min-h-24 w-full rounded-lg border border-[#C5C5BC] bg-white px-4 py-3 text-base font-normal outline-none focus:ring-2 focus:ring-[#365E53]"
      />
    </label>
  );
}
export function Timer({ until, large = false }) {
  const now = useClock();
  const remaining = Math.max(0, Math.ceil((until - now) / 1000));
  return (
    <span
      className={cx('tabular-nums', large ? 'text-7xl font-medium sm:text-9xl' : 'font-medium')}
      aria-label={`${remaining} seconds remaining`}
    >
      {large
        ? remaining
        : `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`}
    </span>
  );
}
export function Score({ value = 0, large = false }) {
  return (
    <div>
      <div
        className={cx(
          'font-medium leading-none tracking-tight tabular-nums',
          large ? 'text-8xl lg:text-[112px]' : 'text-6xl',
        )}
      >
        {scoreText(value)}
      </div>
      <div className="mt-3 text-lg text-[#62625C]">{grade(value)}</div>
    </div>
  );
}
export function Wordmark({ display = false }) {
  return (
    <a
      href="/"
      className={cx(
        'inline-flex items-baseline gap-3 font-semibold tracking-tight',
        display ? 'text-2xl' : 'text-lg',
      )}
    >
      <span>
        BCUSCA<span className="text-[#365E53]">.</span>
      </span>
      <span className="font-normal text-[#62625C]">Arcade</span>
    </a>
  );
}
export function Notice() {
  const { state, error, setError, connected } = useArcade();
  if (error)
    return (
      <div
        role="alert"
        className="my-4 flex items-start justify-between gap-4 rounded-lg border border-[#A33030]/30 bg-[#FAEEEE] p-4 text-sm text-[#A33030]"
      >
        <span>{error}</span>
        <button onClick={() => setError('')} className="underline">
          Dismiss
        </button>
      </div>
    );
  if (state && !state.serviceHealthy)
    return (
      <p role="alert" className="my-4 rounded-lg bg-[#FAEEEE] p-4 text-sm text-[#A33030]">
        Service interrupted. Please wait for the host.
      </p>
    );
  if (state && !connected)
    return (
      <p role="status" className="my-3 text-sm text-[#62625C]">
        Reconnecting… showing the last update.
      </p>
    );
  return null;
}
export function Empty({ title, children }) {
  return (
    <div className="py-12">
      <h2 className="text-2xl font-medium tracking-tight">{title}</h2>
      {children && <p className="mt-3 max-w-md text-[#62625C]">{children}</p>}
    </div>
  );
}
export function Modal({ title, children, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => {
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="fixed inset-0 z-50 m-auto max-h-[90svh] w-[calc(100%_-_2.5rem)] max-w-lg overflow-y-auto rounded-xl bg-[#F7F7F2] p-6 text-[#252525] shadow-lg backdrop:bg-[#252525]/25"
    >
      <div className="mb-6 flex items-start justify-between gap-5">
        <h2 className="text-xl font-medium">{title}</h2>
        <button autoFocus onClick={onClose} className="min-h-11 px-2 text-sm underline">
          Close
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Leaderboard({ rows, ownId, display = false, limit }) {
  const shown = limit ? rows.slice(0, limit) : rows;
  return (
    <div className="w-full">
      <div
        className={cx(
          'mb-4 grid grid-cols-[3rem_1fr_auto] gap-3 border-b border-[#DDDDD5] pb-3 text-[#62625C]',
          display ? 'text-base' : 'text-xs',
        )}
      >
        <span>Rank</span>
        <span>Player</span>
        <span>Score</span>
      </div>
      {!rows.length ? (
        <p className="py-8 text-[#62625C]">No ranked scores yet.</p>
      ) : (
        shown.map((row) => (
          <div
            key={row.accountId}
            className={cx(
              'grid grid-cols-[3rem_1fr_auto] items-center gap-3 border-b border-[#DDDDD5] py-4',
              display ? 'text-[clamp(18px,2.1vw,32px)]' : 'text-sm',
              row.accountId === ownId && 'bg-[#E9EDE6]',
              row.rank <= 3 ? 'font-medium' : 'text-[#62625C]',
            )}
          >
            <span className="tabular-nums">{row.rank}</span>
            <span className="truncate">{row.alias}</span>
            <span className="tabular-nums">{scoreText(row.score)}</span>
          </div>
        ))
      )}
      {limit && rows.length > limit && rows[limit - 1]?.score === rows[limit]?.score && (
        <p className="mt-3 text-sm text-[#62625C]">
          More players share this rank. Full standings on your phone.
        </p>
      )}
    </div>
  );
}
