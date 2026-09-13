import { cx } from '../components/ui';
export function ItemSymbol({ item }) {
  return (
    <g aria-label={item.kind === 'key' ? `Key ${item.label}` : 'Required chip'}>
      {item.kind === 'key' ? (
        <g fill="none" stroke="#754F32" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="17" cy="19" r="6" />
          <path d="M21 23L34 36M28 30L32 26M32 34L36 30" />
        </g>
      ) : (
        <path d="M25 13L37 25L25 37L13 25Z" fill="#754F32" />
      )}
      {item.kind === 'key' && (
        <text x="39" y="15" textAnchor="middle" fontSize="12" fill="#754F32">
          {item.label}
        </text>
      )}
    </g>
  );
}
export function Board({ board, display = false }) {
  const {
    size,
    position = board.start,
    goal,
    start,
    blocks = [],
    robotPoint,
    failedCell,
  } = board;
  if (![4, 5, 7].includes(size))
    return <p role="alert">Board unavailable. Please speak to the host.</p>;
  const point = robotPoint || { x: position % size, y: Math.floor(position / size) };
  return (
    <svg
      viewBox={`0 0 ${size * 50} ${size * 50}`}
      role="img"
      aria-label={`Robot maze. Robot at row ${Math.floor(position / size) + 1}, column ${(position % size) + 1}.`}
      data-robot-cell={position}
      className={cx(
        'mx-auto aspect-square w-full rounded-xl bg-[#E9E9E1] p-2',
        display ? 'max-w-[min(56vh,560px)]' : 'max-w-[min(34svh,300px)]',
      )}
    >
      {Array.from({ length: size * size }, (_, cell) => (
        <g
          key={cell}
          transform={`translate(${(cell % size) * 50} ${Math.floor(cell / size) * 50})`}
        >
          <rect
            x="2"
            y="2"
            width="46"
            height="46"
            rx="3"
            fill={blocks.includes(cell) ? '#62625C' : '#FFFFFF'}
            stroke={cell === failedCell ? '#A33030' : 'none'}
            strokeWidth="3"
          />
          {cell === goal && (
            <g stroke="#365E53" fill="none" strokeWidth="2">
              <path d="M10 39V10L32 14V27L10 23" />
            </g>
          )}
          {(board.items || []).map(
            (item, i) =>
              item.cell === cell &&
              !((board.mask || 0) & (1 << i)) && <ItemSymbol key={item.id} item={item} />,
          )}
          {(board.gates || [])
            .filter((g) => g.cell === cell)
            .map((g) => {
              const open =
                (board.mask || 0) & (1 << board.items.findIndex((i) => i.id === g.key));
              return (
                <g
                  key={g.key}
                  opacity={open ? 0.25 : 1}
                  stroke="#754F32"
                  fill="none"
                  strokeWidth="2"
                >
                  <rect x="8" y="8" width="34" height="34" rx="3" />
                  <path d="M15 8V42M35 8V42" />
                  <text
                    x="25"
                    y="30"
                    textAnchor="middle"
                    stroke="none"
                    fill="#754F32"
                    fontSize="13"
                  >
                    {g.label}
                  </text>
                </g>
              );
            })}
          {cell === start && <circle cx="8" cy="8" r="2" fill="#365E53" />}
        </g>
      ))}
      <g transform={`translate(${point.x * 50 + 25} ${point.y * 50 + 25})`}>
        <rect
          x="-12"
          y="-12"
          width="24"
          height="24"
          rx="5"
          fill="#DDEBE0"
          stroke="#365E53"
          strokeWidth="2"
        />
        <circle cx="-5" cy="-2" r="2" fill="#365E53" />
        <circle cx="5" cy="-2" r="2" fill="#365E53" />
        <path d="M-5 6H5" stroke="#365E53" strokeWidth="2" />
      </g>
    </svg>
  );
}
