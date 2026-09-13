import { cx } from '../components/ui';
const shapes = ['●', '■', '▲'];
const depots = ['A', 'B', 'C'];
export function ParcelMark({ packet, display = false }) {
  return (
    <span
      className={cx(
        'inline-flex min-w-7 items-center justify-center gap-0.5 rounded border px-1',
        display ? 'text-3xl' : 'text-lg',
        packet.colour === 0
          ? 'border-[#365E53] bg-[#DDEBE0] text-[#365E53]'
          : 'border-[#754F32] bg-[#F0E6CB] text-[#754F32]',
      )}
      aria-label={`${packet.colour === 0 ? 'Green' : 'Amber'} ${['circle', 'square', 'triangle'][packet.shape]}${packet.stripe ? ', striped' : ''}`}
    >
      {shapes[packet.shape]}
      {packet.stripe && <span className="text-xs">≋</span>}
    </span>
  );
}
function Condition({ when }) {
  return (
    <span>
      {Object.entries(when)
        .map(([key, value]) =>
          key === 'shape'
            ? shapes[value]
            : key === 'colour'
              ? value === 0
                ? 'Green'
                : 'Amber'
              : value
                ? 'Striped ≋'
                : 'Plain',
        )
        .join(' + ')}
    </span>
  );
}
export function ParcelBoard({
  q,
  program = [],
  onMove,
  locked = false,
  routes = null,
  progress = 1,
  display = false,
}) {
  const order = program.length ? program : q.starter || q.rules.map((r) => r.id);
  const packetIndex = Math.min(q.packets.length - 1, Math.floor(progress * q.packets.length));
  const current = routes && progress < 1 ? routes[packetIndex] : null;
  return (
    <div className={cx('mx-auto w-full space-y-3', display ? 'max-w-3xl' : 'max-w-lg')}>
      <div
        className="flex flex-wrap justify-center gap-2"
        aria-label="Parcels and required depots"
      >
        {q.packets.map((packet, i) => {
          const routed = routes && (progress >= 1 || i < packetIndex) ? routes[i] : null;
          return (
            <div
              key={packet.id}
              className={cx(
                'flex items-center gap-1 rounded border border-[#DDDDD5] bg-white p-1',
                display ? 'text-lg' : 'text-xs',
                current?.packetId === packet.id && 'ring-2 ring-[#365E53]',
              )}
            >
              <ParcelMark packet={packet} display={display} />
              <span>→ {depots[packet.target]}</span>
              {routed && (
                <span
                  className={
                    routed.destination === packet.target ? 'text-[#365E53]' : 'text-[#A33030]'
                  }
                >
                  {routed.destination === packet.target
                    ? '✓'
                    : `× ${depots[routed.destination]}`}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className={cx('text-[#62625C]', display ? 'text-base' : 'text-xs')}>
        First matching rule wins. Reorder from top to bottom.
      </p>
      <ol className="space-y-1" aria-label="Routing rules">
        {order.map((id, index) => {
          const rule = q.rules.find((r) => r.id === id);
          if (!rule) return null;
          return (
            <li
              key={id}
              className={cx(
                'flex items-center justify-between gap-2 rounded-lg border border-[#DDDDD5] bg-white px-2',
                display ? 'min-h-14 text-xl' : 'min-h-11 text-sm',
                current?.ruleId === id && 'bg-[#DDEBE0] ring-2 ring-[#365E53]',
              )}
            >
              <span className={cx('text-[#62625C]', display ? 'text-base' : 'text-xs')}>
                {index + 1}
              </span>
              <span className="flex-1">
                <Condition when={rule.when} /> → {depots[rule.destination]}
              </span>
              {onMove && (
                <div className="flex">
                  <button
                    className="min-h-11 min-w-11 disabled:opacity-25"
                    disabled={locked || index === 0}
                    aria-label={`Move rule ${index + 1} up`}
                    onClick={() => onMove(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    className="min-h-11 min-w-11 disabled:opacity-25"
                    disabled={locked || index === order.length - 1}
                    aria-label={`Move rule ${index + 1} down`}
                    onClick={() => onMove(index, 1)}
                  >
                    ↓
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <p className={cx('text-[#62625C]', display ? 'text-base' : 'text-xs')}>
        Otherwise → {depots[q.fallback]}
      </p>
    </div>
  );
}
