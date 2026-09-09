import React, { useEffect, useMemo, useState } from 'react';

export const WHEEL_SEGMENTS = [
  { label: 'Debug Dash', short: 'DEBUG', color: '#5b2cff' },
  { label: 'Robot Rescue', short: 'ROBOT', color: '#10b7c9' },
  { label: 'Guess The Output', short: 'GUESS', color: '#ffcc33' },
];

export default function Wheel({ spin, onFinished, size = 'normal' }) {
  const [rotation, setRotation] = useState(spin?.startRotation || 0);
  const [spinning, setSpinning] = useState(Boolean(spin?.active));

  useEffect(() => {
    if (!spin) return;
    const start = spin.startRotation || 0;
    setRotation(start);
    setSpinning(false);
    if (!spin.active) return;
    const target = start + (spin.delta || 0);
    requestAnimationFrame(() => {
      setRotation(target);
      setSpinning(true);
    });
    const timer = setTimeout(() => {
      setSpinning(false);
      onFinished?.();
    }, spin.duration || 3500);
    return () => clearTimeout(timer);
  }, [spin?.startedAt, spin?.active]);

  const labels = useMemo(() => WHEEL_SEGMENTS.map((s, i) => ({ ...s, angle: i * 120 + 60 })), []);
  const dimension = size === 'large' ? 560 : size === 'small' ? 280 : 360;

  return (
    <div className="wheel-stage" style={{ '--wheel-size': `${dimension}px` }}>
      <div className="wheel-pointer" aria-hidden="true"><span /></div>
      <div className="wheel-glow" />
      <div
        className={`arcade-wheel ${spinning ? 'is-spinning' : ''}`}
        style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? `transform ${spin?.duration || 3500}ms cubic-bezier(.12,.72,.15,1)` : 'none' }}
      >
        <div className="wheel-face">
          <div className="wheel-segments" />
          <div className="wheel-shine" />
          {labels.map((segment) => (
            <div key={segment.short} className="wheel-label" style={{ transform: `rotate(${segment.angle}deg) translateY(calc(var(--wheel-size) * -0.34)) rotate(${-segment.angle}deg)` }}>
              {segment.short}
            </div>
          ))}
          <div className="wheel-hub"><div className="wheel-hub-dot" /></div>
        </div>
      </div>
      {spinning && <div className="wheel-status">SPINNING<span>•••</span></div>}
    </div>
  );
}
