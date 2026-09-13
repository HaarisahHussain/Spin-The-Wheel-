import { useState } from 'react';
import { cx } from '../components/ui';
export const instructionLabel = { up: '↑', right: '→', down: '↓', left: '←', paint: 'Paint' };
export const programCost = (p) =>
  p.reduce((n, v) => n + (typeof v === 'string' ? 1 : 1 + v.body.length), 0);
export const actionCount = (p) =>
  p.reduce((n, v) => n + (typeof v === 'string' ? 1 : v.repeat * v.body.length), 0);
export function Canvas({ q, painted = [], cell = q.start, target = false }) {
  return (
    <div>
      <p className="mb-2 text-xs text-[#62625C]">{target ? 'Target' : 'Your canvas'}</p>
      <div
        className={cx(
          'grid aspect-square gap-1 rounded-lg bg-[#E9E9E1] p-1',
          q.size === 4 ? 'grid-cols-4' : 'grid-cols-5',
        )}
        role="img"
        aria-label={target ? 'Target pattern' : 'Painted canvas'}
      >
        {Array.from({ length: q.size * q.size }, (_, i) => (
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
export function RepeatEditor({ value, onSave, onCancel, disabled }) {
  const [body, setBody] = useState(value?.body || ['right', 'paint']),
    [count, setCount] = useState(value?.repeat || 2);
  return (
    <div
      className="space-y-2 rounded-lg border border-[#365E53] bg-white p-3"
      aria-label="Repeat block editor"
    >
      <div className="flex items-center justify-between gap-2 text-sm">
        <span>Repeat</span>
        <select
          aria-label="Repeat count"
          className="min-h-11 rounded border border-[#DDDDD5] px-3"
          value={count}
          disabled={disabled}
          onChange={(e) => setCount(Number(e.target.value))}
        >
          {[2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n} times
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-1">
        {body.map((v, i) => (
          <button
            key={i}
            aria-label={`Remove repeat instruction ${i + 1}`}
            disabled={disabled}
            className="min-h-11 min-w-11 rounded bg-[#E9EDE6] px-2 text-xs"
            onClick={() => setBody(body.filter((_, j) => i !== j))}
          >
            {instructionLabel[v]} ×
          </button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1">
        {Object.entries(instructionLabel).map(([v, label]) => (
          <button
            key={v}
            disabled={disabled || body.length >= 4}
            className="min-h-11 rounded border border-[#DDDDD5] text-sm disabled:opacity-30"
            onClick={() => setBody([...body, v])}
            aria-label={`Add ${v} to repeat`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-xs text-[#62625C]">
        2–4 instructions · {1 + body.length} tiles · {body.length * count} actions
      </p>
      <div className="flex gap-4">
        <button
          disabled={disabled || body.length < 2}
          className="min-h-11 text-sm font-medium underline disabled:opacity-30"
          onClick={() => onSave({ repeat: count, body })}
        >
          Save block
        </button>
        <button className="min-h-11 text-sm underline" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
