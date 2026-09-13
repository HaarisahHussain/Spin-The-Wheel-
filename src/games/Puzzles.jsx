import { useState, useEffect, useRef } from 'react';
import {
  HiOutlineArrowUp,
  HiOutlineArrowDown,
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineBackspace,
  HiOutlinePaintBrush,
} from 'react-icons/hi2';
import { useArcade } from '../state';
import { Button, cx } from '../components/ui';
import { Board, ItemSymbol } from './Robot';
import { ParcelBoard } from './Parcel';
import { Canvas, RepeatEditor, programCost, actionCount, instructionLabel } from './Painter';
export { ParcelBoard } from './Parcel';
const icons = {
  up: HiOutlineArrowUp,
  down: HiOutlineArrowDown,
  left: HiOutlineArrowLeft,
  right: HiOutlineArrowRight,
  paint: HiOutlinePaintBrush,
};
const palettes = [
  'bg-[#DDEBE0]',
  'bg-[#E7E4DA]',
  'bg-[#DDE5EB]',
  'bg-[#EEE0DC]',
  'bg-[#E8DFF0]',
  'bg-[#F0E6CB]',
];
export const markerClass = (mark) => palettes[(mark - 1) % palettes.length];
export function useProgress(start, until) {
  const { state } = useArcade(),
    offset = useRef(0),
    [now, setNow] = useState(Date.now()),
    [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (state) offset.current = state.now - Date.now();
  }, [state?.now]);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)'),
      update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    let frame;
    const tick = () => {
      setNow(Date.now());
      if (start && until && Date.now() + offset.current < until)
        frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      query.removeEventListener('change', update);
    };
  }, [start, until]);
  return {
    ratio:
      !start || !until
        ? 1
        : Math.max(0, Math.min(1, (now + offset.current - start) / (until - start))),
    reduced,
  };
}
export function PuzzleView({ q, display = false }) {
  if (q.game === 'robot')
    return (
      <div className="space-y-3">
        {display && (
          <p className="text-center text-lg">
            {q.prompt} · {q.maxMoves} steps
          </p>
        )}
        <Board board={q} display={display} />
      </div>
    );
  if (q.game === 'parcel')
    return <ParcelBoard q={q} program={q.program || []} display={display} />;
  return (
    <div className={cx('mx-auto space-y-3', display ? 'max-w-lg' : 'max-w-sm')}>
      {display && (
        <p className="text-center text-lg">
          {q.prompt} · {q.maxTiles} tiles
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Canvas q={q} painted={q.target} target />
        <Canvas
          q={q}
          painted={q.lastResult?.painted || q.lastResult?.frames?.at(-1)?.painted || []}
          cell={q.lastResult?.frames?.at(-1)?.cell ?? q.start}
        />
      </div>
      {display && q.starter?.length > 0 && <Sequence program={q.starter} locked />}
    </div>
  );
}
function stepLabel(v) {
  return typeof v === 'string' ? v : `Repeat ${v.repeat}: ${v.body.join(', ')}`;
}
export function Sequence({ program, selected, onSelect, locked, active, failed, event }) {
  return (
    <div
      aria-label="Program"
      className="flex min-h-14 flex-wrap content-start gap-1 rounded-lg border border-[#DDDDD5] bg-white p-2"
    >
      {program.map((v, i) => {
        const Icon = icons[v];
        return (
          <button
            key={i}
            aria-label={`Step ${i + 1}: ${stepLabel(v)}`}
            aria-pressed={selected === i}
            disabled={locked || !onSelect}
            onClick={() => onSelect(i)}
            className={cx(
              'flex min-h-11 min-w-11 items-center justify-center gap-1 rounded px-2 text-xs',
              selected === i && 'bg-[#E9EDE6]',
              active === i && 'bg-[#DDEBE0] ring-2 ring-inset ring-[#365E53]',
              failed === i && 'bg-[#FAEEEE] ring-2 ring-inset ring-[#A33030]',
            )}
          >
            <span>{i + 1}</span>
            {Icon ? (
              <Icon className="size-4" />
            ) : (
              <span>
                {typeof v === 'object' ? (
                  <span className="inline-flex flex-wrap items-center gap-1">
                    <span>Repeat ×{v.repeat}</span>
                    {v.body.map((m, j) => (
                      <span
                        key={j}
                        className={cx(
                          'rounded border border-[#DDDDD5] p-1',
                          active === i && event?.bodyIndex === j && 'bg-[#365E53] text-white',
                        )}
                      >
                        {instructionLabel[m]}
                      </span>
                    ))}
                    {active === i && event?.iteration !== undefined && (
                      <span>
                        ({event.iteration + 1}/{v.repeat})
                      </span>
                    )}
                  </span>
                ) : (
                  stepLabel(v)
                )}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
function sourceStep(program, index) {
  if (index === undefined) return null;
  let expanded = 0;
  for (let i = 0; i < program.length; i++) {
    expanded += typeof program[i] === 'object' ? program[i].repeat * program[i].body.length : 1;
    if (index < expanded) return i;
  }
  return null;
}
export function PuzzleEditor({
  q,
  onSubmit,
  locked = false,
  live = false,
  runs = 0,
  maxRuns = 3,
}) {
  const { busy } = useArcade(),
    [program, setProgram] = useState(q.program?.length ? q.program : q.starter || []),
    [selected, setSelected] = useState(sourceStep(q.program || [], q.failedIndex)),
    [undo, setUndo] = useState(null),
    [repeatEditing, setRepeatEditing] = useState(false);
  const disabled = busy || locked;
  const expandedLength = program.reduce(
    (n, v) => n + (typeof v === 'object' ? v.repeat * v.body.length : 1),
    0,
  );
  const change = (next) => {
    setUndo(program);
    setProgram(next);
  };
  const edit = (v) => {
    change(
      selected === null ? [...program, v] : program.map((m, i) => (i === selected ? v : m)),
    );
    setSelected(null);
  };
  return (
    <div className="space-y-3">
      {q.prompt && q.game !== 'parcel' && <h2 className="text-sm font-medium">{q.prompt}</h2>}
      {q.game === 'parcel' ? (
        <ParcelBoard
          q={q}
          program={program}
          locked={disabled}
          onMove={(i, direction) => {
            const next = [...program];
            [next[i], next[i + direction]] = [next[i + direction], next[i]];
            change(next);
          }}
        />
      ) : (
        <>
          <PuzzleView q={q} />
          <div className="grid grid-cols-3 gap-2">
            {[
              'clear',
              'up',
              'remove',
              'left',
              'down',
              'right',
              ...(q.game === 'painter' ? ['paint'] : []),
            ].map((name) => {
              const Icon = icons[name] || HiOutlineBackspace;
              return (
                <Button
                  key={name}
                  secondary
                  className="min-h-11 px-2 py-2"
                  aria-label={
                    name === 'remove'
                      ? selected === null
                        ? 'Remove last step'
                        : `Remove step ${selected + 1}`
                      : name
                  }
                  disabled={
                    disabled ||
                    (!['clear', 'remove'].includes(name) &&
                      selected === null &&
                      expandedLength >= q.maxMoves)
                  }
                  onClick={() =>
                    name === 'clear'
                      ? (change([]), setSelected(null))
                      : name === 'remove'
                        ? (change(
                            program.filter((_, i) => i !== (selected ?? program.length - 1)),
                          ),
                          setSelected(null))
                        : edit(name)
                  }
                >
                  {name === 'clear' ? 'Clear' : <Icon className="size-5" />}
                </Button>
              );
            })}
          </div>
          <div className="flex justify-between gap-2 text-xs">
            <span>
              {q.game === 'painter'
                ? `${programCost(program)}/${q.maxTiles} tiles · ${actionCount(program)}/18 actions`
                : `${expandedLength}/${q.maxMoves} steps`}
            </span>
            {undo && (
              <button
                className="min-h-8 underline"
                disabled={disabled}
                onClick={() => {
                  setProgram(undo);
                  setUndo(null);
                }}
              >
                Undo
              </button>
            )}
          </div>
          {q.allowRepeat &&
            (repeatEditing ? (
              <RepeatEditor
                key={selected ?? 'new'}
                value={typeof program[selected] === 'object' ? program[selected] : null}
                disabled={disabled}
                onCancel={() => setRepeatEditing(false)}
                onSave={(v) => {
                  edit(v);
                  setRepeatEditing(false);
                }}
              />
            ) : (
              <button
                className="min-h-11 text-sm underline"
                disabled={
                  disabled ||
                  (program.some((v) => typeof v === 'object') &&
                    typeof program[selected] !== 'object')
                }
                onClick={() => setRepeatEditing(true)}
              >
                {typeof program[selected] === 'object'
                  ? 'Edit repeat block'
                  : 'Add repeat block'}
              </button>
            ))}
          <Sequence
            program={program}
            selected={selected}
            onSelect={(i) => setSelected(selected === i ? null : i)}
            locked={disabled}
            failed={sourceStep(program, q.failedIndex)}
          />
        </>
      )}
      <Button
        className="w-full"
        disabled={
          disabled ||
          !program.length ||
          repeatEditing ||
          expandedLength > q.maxMoves ||
          (q.game === 'painter' && programCost(program) > q.maxTiles)
        }
        onClick={() => onSubmit(program)}
      >
        {locked ? 'Locked' : live ? 'Lock program' : 'Run'}
      </Button>
      {!live && (
        <p className="text-xs text-[#62625C]">
          {maxRuns - runs} runs left · next success worth {Math.max(80, 100 - runs * 10)}% ·
          playback pauses time
        </p>
      )}
      {q.feedback && (
        <p role="status" className="rounded-lg bg-[#FAEEEE] p-3 text-sm text-[#A33030]">
          {q.feedback}
        </p>
      )}
    </div>
  );
}
export function PuzzleExecution({ q, execution, display = false, finished = false }) {
  const { ratio, reduced } = useProgress(
      finished ? null : execution.started,
      finished ? null : execution.until,
    ),
    r = execution.result || {},
    program = execution.selected || [];
  const path = r.path || [q.start];
  const progress = ratio * Math.max(0, path.length - 1),
    index = Math.min(path.length - 1, Math.floor(progress)),
    from = path[index],
    to = path[Math.min(index + 1, path.length - 1)],
    fraction = reduced ? 0 : progress - index;
  const frames = r.frames || [{ cell: q.start, painted: [] }],
    frame = frames[Math.min(frames.length - 1, Math.floor(ratio * (frames.length - 1)))];
  const expandedIndices = program.flatMap((v, i) =>
    Array(typeof v === 'object' ? v.repeat * v.body.length : 1).fill(i),
  );
  const playedSteps = q.game === 'robot' ? path.length - 1 : frames.length - 1;
  const activeStep = Math.min(
    expandedIndices.length - 1,
    Math.floor(ratio * Math.max(1, playedSteps)),
  );
  return (
    <div
      className={cx(
        display && q.game === 'robot'
          ? 'grid grid-cols-[minmax(0,1fr)_minmax(220px,.8fr)] items-center gap-6'
          : 'space-y-3',
      )}
      data-run-id={execution.id}
    >
      {!finished && !display && <p className="text-sm text-[#62625C]">Running…</p>}
      {q.game === 'robot' ? (
        <Board
          display={display}
          board={{
            ...q,
            position: from,
            mask: frame.mask || 0,
            robotPoint: {
              x: (from % q.size) + ((to % q.size) - (from % q.size)) * fraction,
              y:
                Math.floor(from / q.size) +
                (Math.floor(to / q.size) - Math.floor(from / q.size)) * fraction,
            },
            failedCell: ratio >= 1 ? r.failedCell : undefined,
          }}
        />
      ) : q.game === 'parcel' ? (
        <ParcelBoard
          q={q}
          program={program}
          display={display}
          routes={r.routes}
          progress={ratio}
        />
      ) : (
        <div className="mx-auto grid max-w-sm grid-cols-2 gap-4">
          <Canvas q={q} target painted={q.target} />
          <Canvas q={q} cell={frame.cell} painted={frame.painted} />
        </div>
      )}
      {q.game !== 'parcel' && (
        <Sequence
          program={program}
          locked
          active={
            finished
              ? null
              : (r.events?.[activeStep]?.sourceIndex ?? expandedIndices[activeStep])
          }
          event={r.events?.[activeStep]}
          failed={finished ? expandedIndices[r.failedIndex] : undefined}
        />
      )}
    </div>
  );
}
export function PuzzleReveal({ q, result, display = false }) {
  return (
    <div className="space-y-3">
      <p
        role="status"
        className={cx(
          'rounded-lg border p-4 text-xl font-medium',
          result?.correct ? 'border-[#365E53] bg-[#DDEBE0]' : 'border-[#A33030] bg-[#FAEEEE]',
        )}
      >
        {result?.correct ? 'Solved' : result?.timedOut ? 'Time up' : 'Not solved'}
      </p>
      <PuzzleExecution
        q={q}
        execution={{ result, selected: result?.selected || [] }}
        display={display}
        finished
      />
      {result?.feedback && (!display || !result.correct) && (
        <p className="text-sm">{result.feedback}</p>
      )}
      {q.solution && !display && (
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer">One possible solution</summary>
          {q.game === 'parcel' ? (
            <ParcelBoard q={q} program={q.solution} />
          ) : (
            <Sequence program={q.solution} locked />
          )}
        </details>
      )}
    </div>
  );
}
export function RobotRace({ live }) {
  const { ratio } = useProgress(live.phase === 'execution' ? live.phaseAt : null, live.until),
    q = live.question;
  return (
    <div className="space-y-4">
      <div
        role="img"
        aria-label="Shared robot execution"
        className={cx(
          'mx-auto grid aspect-square w-full max-w-[min(52vh,500px)] gap-1 rounded-lg bg-[#E9E9E1] p-2',
          q.size === 7 ? 'grid-cols-7' : 'grid-cols-5',
        )}
      >
        {Array.from({ length: q.size * q.size }, (_, cell) => {
          const robots = live.roster.filter((e) => {
            const path = e.result?.path || [q.start];
            return (
              path[Math.min(path.length - 1, Math.floor(ratio * (path.length - 1)))] === cell
            );
          });
          return (
            <div
              key={cell}
              className={cx(
                'grid place-items-center rounded text-xs',
                q.blocks.includes(cell) ? 'bg-[#62625C]' : 'bg-white',
              )}
            >
              {cell === q.goal && <span>⚑</span>}
              {q.items
                ?.filter((v) => v.cell === cell)
                .map((v) => (
                  <svg key={v.id} viewBox="0 0 50 50" className="size-8">
                    <ItemSymbol item={v} />
                  </svg>
                ))}
              {q.gates
                ?.filter((v) => v.cell === cell)
                .map((v) => (
                  <span
                    key={v.key}
                    className="rounded border-2 border-[#754F32] px-1 text-[#754F32]"
                  >
                    {v.label}
                  </span>
                ))}
              {robots.length > 0 && (
                <span className={cx('rounded-full px-1', markerClass(robots[0].mark))}>
                  {robots.length === 1 ? robots[0].mark : `${robots.length} robots`}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-center text-sm">Follow your own robot on your phone.</p>
    </div>
  );
}
export function LivePuzzleExecution({ live }) {
  return (
    <div className="space-y-4">
      <p className="text-sm">Featured players · your full result is on your phone</p>
      <div className="grid grid-cols-2 gap-6">
        {live.roster.slice(0, 2).map((e) => (
          <div key={e.accountId}>
            <p className="mb-2">
              {e.mark} · {e.alias}
            </p>
            <PuzzleExecution
              q={live.question}
              execution={{
                started: live.phaseAt,
                until: live.until,
                selected: e.program,
                result: e.result,
              }}
              finished={live.phase !== 'execution'}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
