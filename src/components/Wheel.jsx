import { useEffect, useRef, useState } from 'react';
import { games, gameById } from '../../shared/catalog';
import { wheelSlots } from '../../shared/wheel';
import { useArcade } from '../state';
const fills = ['fill-[#E4EBE2]', 'fill-[#E7E4DA]', 'fill-[#DDE5EB]', 'fill-[#EEE0DC]'];
const point = (angle) => [200 + 188 * Math.sin(angle), 200 - 188 * Math.cos(angle)];
export function Wheel({ selection, idle = false, animate = true }) {
  const { state } = useArcade();
  const rotor = useRef(null);
  const clock = useRef({ server: state?.now ?? Date.now(), local: performance.now() });
  useEffect(() => {
    clock.current = { server: state?.now ?? Date.now(), local: performance.now() };
  }, [state?.now]);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const slots = selection?.slots || wheelSlots(games.map((g) => g.id));
  const startedAt = selection?.startedAt;
  const until = selection?.until;
  const sector = selection?.sector ?? 0;
  useEffect(() => {
    let frame;
    const draw = () => {
      const now = clock.current.server + performance.now() - clock.current.local;
      const progress = Math.min(1, Math.max(0, (now - startedAt) / (until - startedAt)));
      // Absolute elapsed time survives background tabs, StrictMode and reconnects.
      // Reduced motion never points at the winning sector during selection.
      const angle =
        reduced || !animate
          ? 0
          : idle
            ? ((now % 24000) / 24000) * 360
            : (1080 - (sector + 0.5) * 36) * (1 - (1 - progress) ** 3);
      rotor.current?.setAttribute('transform', `rotate(${angle} 200 200)`);
      if (!reduced && animate && (idle || progress < 1)) frame = requestAnimationFrame(draw);
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      draw();
    };
    resume();
    document.addEventListener('visibilitychange', resume);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [idle, animate, reduced, startedAt, until, sector]);
  return (
    <div className="mx-auto w-full max-w-[min(49vh,480px)] text-center">
      <div className="relative aspect-square">
        {!idle && (
          <svg
            className="absolute -top-2 left-1/2 z-10 -translate-x-1/2"
            width="22"
            height="28"
            viewBox="0 0 28 36"
            aria-hidden="true"
          >
            <path d="M2 2H26L14 33Z" className="fill-[#252525]" />
          </svg>
        )}
        <svg
          viewBox="0 0 400 400"
          role="img"
          aria-label={idle ? 'Arcade games' : 'Selecting game'}
          className="h-full w-full"
        >
          <g ref={rotor} data-wheel-rotor="true">
            {slots.map((id, index) => {
              const [x1, y1] = point((index * Math.PI) / 5),
                [x2, y2] = point(((index + 1) * Math.PI) / 5);
              const angle = (index + 0.5) * 36;
              const x = 200 + 125 * Math.sin((angle * Math.PI) / 180),
                y = 200 - 125 * Math.cos((angle * Math.PI) / 180);
              const words = (gameById(id)?.name || id).split(' ');
              return (
                <g key={index} data-wheel-slot={id}>
                  <path
                    d={`M200 200 L${x1} ${y1} A188 188 0 0 1 ${x2} ${y2} Z`}
                    className={`${fills[games.findIndex((g) => g.id === id) % fills.length]} stroke-[#F7F7F2] stroke-2`}
                  />
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    transform={`rotate(${angle} ${x} ${y})`}
                    className="fill-[#252525] text-[10px] font-medium"
                  >
                    {words.map((word, i) => (
                      <tspan key={i} x={x} dy={i ? 12 : -(words.length - 1) * 6}>
                        {word}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
            <circle cx="200" cy="200" r="24" className="fill-[#F7F7F2]" />
          </g>
        </svg>
      </div>
      {!idle && (
        <>
          <p className="mt-3 text-xl font-medium">Selecting game…</p>
          <p className="mt-1 text-sm text-[#62625C]">Equal chance per game</p>
        </>
      )}
    </div>
  );
}
