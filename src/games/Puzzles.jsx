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
import { Board } from './Robot';
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
export const shapes = ['●', '■', '▲', '◆'];
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
function Canvas({ q, painted = [], cell = q.start, target = false }) {
  return (
    <div>
      <p className="mb-2 text-xs text-[#62625C]">{target ? 'Target' : 'Your canvas'}</p>
      <div
        className="grid aspect-square grid-cols-4 gap-1 rounded-lg bg-[#E9E9E1] p-1"
        role="img"
        aria-label={target ? 'Target pattern' : 'Painted canvas'}
      >
        {Array.from({ length: 16 }, (_, i) => (
          <div
            key={i}
            className={cx(
              'grid aspect-square place-items-center rounded-sm text-sm',
              painted.includes(i) ? 'bg-[#365E53] text-white' : 'bg-white text-[#365E53]',
              !target &&
                painted.includes(i) &&
                !q.target.includes(i) &&
                'ring-2 ring-inset ring-[#A33030]',
            )}
          >
            {target
              ? painted.includes(i)
                ? '●'
                : ''
              : i === cell
                ? '▣'
                : painted.includes(i)
                  ? q.target.includes(i)
                    ? '●'
                    : '×'
                  : q.target.includes(i)
                    ? '·'
                    : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
export function ParcelBoard({
  q,
  program = [],
  onToggle,
  locked = false,
  activeType = null,
  routes = null,
  progress = 1,
}) {
  const position = (index) => {
    const depth = Math.floor(Math.log2(index + 1));
    return { x: ((index - (2 ** depth - 1) + 0.5) * 400) / 2 ** depth, y: 60 + depth * 105 };
  };
  const activeRoute = routes?.find((r) => r.type === activeType);
  const path = activeRoute
    ? [...(activeRoute.path || [0]), q.groups.length + activeRoute.destination].map(position)
    : [];
  const part = (progress * q.packets.length) % 1;
  const travel = part * Math.max(0, path.length - 1),
    segment = Math.floor(travel);
  const from = path[segment],
    to = path[Math.min(segment + 1, path.length - 1)];
  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-2 flex justify-center gap-4" aria-label="Parcels">
        {q.packets.map((t) => (
          <span
            key={t}
            className={cx(
              'text-2xl',
              activeType === t && 'rounded bg-[#DDEBE0] ring-2 ring-[#365E53]',
            )}
          >
            {shapes[t]}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 400 ${q.depth * 105 + 145}`}
        className="w-full"
        aria-label="Parcel conveyor routes"
      >
        {q.groups.flatMap((_, i) =>
          [i * 2 + 1, i * 2 + 2].map((child) => {
            const a = position(i),
              b = position(child);
            return (
              <line
                key={child}
                x1={a.x}
                y1={a.y + 22}
                x2={b.x}
                y2={b.y - 22}
                className="stroke-[#B6B6AD]"
                strokeWidth="7"
              />
            );
          }),
        )}
        {q.groups.map((group, i) => {
          const { x, y } = position(i),
            other = q.packets.filter((t) => !group.includes(t));
          return (
            <foreignObject key={i} x={x - 80} y={y - 30} width="160" height="64">
              <button
                aria-label={`Swap junction ${i + 1}`}
                disabled={locked || !onToggle}
                onClick={() => onToggle(i)}
                className="h-full w-full rounded-lg border border-[#62625C] bg-white text-sm disabled:cursor-default"
              >
                <span className="block text-[10px] text-[#62625C]">
                  {onToggle ? 'Tap to swap' : 'Junction'}
                </span>
                <span className="block text-lg">
                  ↙ {(program[i] ? other : group).map((t) => shapes[t]).join('')}　
                  {(program[i] ? group : other).map((t) => shapes[t]).join('')} ↘
                </span>
              </button>
            </foreignObject>
          );
        })}
        {q.depots.map((t, i) => {
          const { x, y } = position(q.groups.length + i);
          return (
            <g key={i}>
              <rect
                x={x - 32}
                y={y - 25}
                width="64"
                height="50"
                rx="8"
                className="fill-[#DDEBE0] stroke-[#365E53]"
              />
              <text x={x} y={y + 8} textAnchor="middle" className="fill-[#252525] text-2xl">
                {shapes[t]}
              </text>
              <text x={x} y={y + 43} textAnchor="middle" className="fill-[#62625C] text-[11px]">
                Depot
              </text>
              {progress >= 1 &&
                routes
                  ?.filter((r) => r.destination === i)
                  .map((r, n) => (
                    <text
                      key={r.type}
                      x={x}
                      y={y + 60 + n * 16}
                      textAnchor="middle"
                      className="fill-[#252525] text-xs"
                    >
                      {shapes[r.type]} {r.type === t ? '✓' : '×'}
                    </text>
                  ))}
            </g>
          );
        })}
        {from && to && progress < 1 && (
          <g
            transform={`translate(${from.x + (to.x - from.x) * (travel - segment)} ${from.y + (to.y - from.y) * (travel - segment)})`}
          >
            <circle r="17" className="fill-white stroke-[#365E53]" strokeWidth="2" />
            <text y="7" textAnchor="middle" className="fill-[#252525] text-xl">
              {shapes[activeType]}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
export function PuzzleView({ q, display = false }) {
  if (q.game === 'robot') return <Board board={q} display={display} />;
  if (q.game === 'parcel') return <ParcelBoard q={q} program={q.program || []} />;
  return (
    <div className={cx('mx-auto grid grid-cols-2 gap-4', display ? 'max-w-lg' : 'max-w-sm')}>
      <Canvas q={q} painted={q.target} target />
      <Canvas
        q={q}
        painted={q.lastResult?.painted || q.lastResult?.frames?.at(-1)?.painted || []}
        cell={q.lastResult?.frames?.at(-1)?.cell ?? q.start}
      />
    </div>
  );
}
function stepLabel(v) {
  return typeof v === 'number'
    ? v
      ? 'Swap exits'
      : 'Keep exits'
    : typeof v === 'string'
      ? v
      : `Repeat ${v.repeat}: ${v.body.join(', ')}`;
}
export function Sequence({ program, selected, onSelect, locked, active, failed }) {
  return (
    <div
      aria-label="Program"
      className="flex min-h-14 max-h-28 flex-wrap content-start gap-1 overflow-y-auto rounded-lg border border-[#DDDDD5] bg-white p-2"
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
            {Icon ? <Icon className="size-4" /> : <span>{stepLabel(v)}</span>}
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
export function PuzzleEditor({ q, onSubmit, locked = false, live = false, runs = 0, maxRuns = 3 }) {
  const { busy } = useArcade(),
    [program, setProgram] = useState(
      q.program?.length ? q.program : q.game === 'parcel' ? q.groups.map(() => 0) : [],
    ),
    [selected, setSelected] = useState(sourceStep(q.program || [], q.failedIndex)),
    [undo, setUndo] = useState(null);
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
    change(selected === null ? [...program, v] : program.map((m, i) => (i === selected ? v : m)));
    setSelected(null);
  };
  return (
    <div className="space-y-3">
      {q.prompt && <h2 className="text-sm font-medium">{q.prompt}</h2>}
      {q.game === 'parcel' ? (
        <ParcelBoard
          q={q}
          program={program}
          locked={disabled}
          onToggle={(i) => change(program.map((v, n) => (n === i ? 1 - v : v)))}
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
                        ? (change(program.filter((_, i) => i !== (selected ?? program.length - 1))),
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
              {expandedLength}/{q.maxMoves} steps
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
          {q.allowRepeat && (
            <div>
              <p className="text-xs text-[#62625C]">
                Repeat example: (→ Paint) ×2 runs → Paint → Paint.
              </p>
              <button
                className="min-h-11 text-sm underline"
                disabled={
                  disabled ||
                  program.length < 2 ||
                  expandedLength + 2 > q.maxMoves ||
                  program.some((v) => typeof v === 'object')
                }
                onClick={() =>
                  change([...program.slice(0, -2), { repeat: 2, body: program.slice(-2) }])
                }
              >
                Repeat last two steps ×2
              </button>
            </div>
          )}
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
        disabled={disabled || !program.length}
        onClick={() => onSubmit(program)}
      >
        {locked ? 'Locked' : live ? 'Lock program' : 'Run'}
      </Button>
      {!live && (
        <p className="text-xs text-[#62625C]">
          {maxRuns - runs} runs left · playback does not use thinking time
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
          activeType={
            q.packets[Math.min(q.packets.length - 1, Math.floor(ratio * q.packets.length))]
          }
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
          active={finished ? null : expandedIndices[activeStep]}
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
          <p>{q.solution.map(stepLabel).join(' · ')}</p>
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
            return path[Math.min(path.length - 1, Math.floor(ratio * (path.length - 1)))] === cell;
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
