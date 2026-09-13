import { cx } from '../components/ui';
export function Board({ board, display = false }) {
  const { size, position = board.start, goal, start, blocks = [], robotPoint, failedCell } = board;
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
