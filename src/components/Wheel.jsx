import { useEffect, useState } from 'react';
import { games } from '../../shared/catalog';

const fills = ['fill-[#E4EBE2]', 'fill-[#E7E4DA]', 'fill-[#DDE5EB]', 'fill-[#EEE0DC]'];
const point = (angle) => [200 + 188 * Math.sin(angle), 200 - 188 * Math.cos(angle)];
export function Wheel({ selected }) {
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(
    () => setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches),
    [],
  );
  const step = 360 / games.length;
  const target = 1080 - (games.findIndex((g) => g.id === selected) + 0.5) * step;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(60vh,620px)]">
      <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2">
        <svg width="28" height="36" viewBox="0 0 28 36" aria-hidden="true">
          <path d="M2 2H26L14 33Z" className="fill-[#252525]" />
        </svg>
      </div>
      <svg
        viewBox="0 0 400 400"
        role="img"
        aria-label={`Wheel selecting ${games.find((g) => g.id === selected)?.name}`}
        className="h-full w-full"
      >
        <g transform={`rotate(${target} 200 200)`}>
          {!reduceMotion && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 200 200"
              to={`${target} 200 200`}
              dur="2.4s"
              fill="freeze"
              calcMode="spline"
              keyTimes="0;1"
              keySplines="0.15 0.7 0.2 1"
            />
          )}
          {games.map((game, index) => {
            const [x1, y1] = point((index * step * Math.PI) / 180);
            const [x2, y2] = point(((index + 1) * step * Math.PI) / 180);
            const angle = (index + 0.5) * step;
            const x = 200 + 114 * Math.sin((angle * Math.PI) / 180);
            const y = 200 - 114 * Math.cos((angle * Math.PI) / 180);
            return (
              <g key={game.id}>
                <path
                  d={`M200 200 L${x1} ${y1} A188 188 0 ${step > 180 ? 1 : 0} 1 ${x2} ${y2} Z`}
                  className={`${fills[index % fills.length]} stroke-[#F7F7F2] stroke-2`}
                />
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                transform={`rotate(${angle} ${x} ${y})`}
                  className="fill-[#252525] text-[14px] font-medium"
                >
                  {game.name}
                </text>
              </g>
            );
          })}
          <circle cx="200" cy="200" r="28" className="fill-[#F7F7F2]" />
          <circle cx="200" cy="200" r="8" className="fill-[#252525]" />
        </g>
      </svg>
    </div>
  );
}
