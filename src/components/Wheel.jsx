import { useEffect, useMemo, useRef } from "react";

import { GAME_CATALOG, WHEEL_SEGMENT_CENTERS } from "../../shared/games.js";

export default function Wheel({ spin, size = "normal" }) {
  const wheelRef = useRef(null);
  const start = spin?.startRotation || 0;
  const target = start + (spin?.delta || 0);
  const active = Boolean(spin?.active);
  const duration = spin?.duration || 3500;
  const startedAt = spin?.startedAt;

  useEffect(() => {
    if (!active) return;
    const animation = wheelRef.current.animate(
      [
        { transform: `rotate(${start}deg)` },
        { transform: `rotate(${target}deg)` },
      ],
      { duration, easing: "cubic-bezier(.12,.72,.15,1)", fill: "both" },
    );
    animation.currentTime = Math.min(
      duration,
      Math.max(0, Date.now() - startedAt),
    );
    return () => animation.cancel();
  }, [active, start, target, duration, startedAt]);

  const labels = useMemo(
    () =>
      GAME_CATALOG.map((s, i) => ({ ...s, angle: WHEEL_SEGMENT_CENTERS[i] })),
    [],
  );
  const dimension = size === "large" ? 560 : size === "small" ? 280 : 360;

  return (
    <div
      className="wheel-stage"
      style={{
        "--wheel-size": `${dimension}px`,
        "--wheel-angle": `${360 / GAME_CATALOG.length}deg`,
      }}
    >
      <div className="wheel-pointer" aria-hidden="true">
        <span />
      </div>
      <div className="wheel-glow" />
      <div
        ref={wheelRef}
        className={`arcade-wheel ${active ? "is-spinning" : ""}`}
        style={{ transform: `rotate(${target}deg)` }}
      >
        <div className="wheel-face">
          <div
            className="wheel-segments"
            style={{
              background: `conic-gradient(${GAME_CATALOG.map((game, i) => `${game.color} ${(i * 360) / GAME_CATALOG.length}deg ${((i + 1) * 360) / GAME_CATALOG.length}deg`).join(",")})`,
            }}
          />
          <div className="wheel-shine" />
          {labels.map((segment) => (
            <div
              key={segment.short}
              className="wheel-label"
              style={{
                transform: `rotate(${segment.angle}deg) translateY(calc(var(--wheel-size) * -0.34)) rotate(${-segment.angle}deg)`,
              }}
            >
              {segment.short}
            </div>
          ))}
          <div className="wheel-hub">
            <div className="wheel-hub-dot" />
          </div>
        </div>
      </div>
      {active && (
        <div className="wheel-status">
          SPINNING<span>•••</span>
        </div>
      )}
    </div>
  );
}
