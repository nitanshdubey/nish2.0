import { useEffect, useRef, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type { AnimationIntensity, NishState } from '../../types';

const LABELS: Record<NishState, string> = {
  standby: 'NISH IS READY',
  listening: 'LISTENING...',
  processing: 'PROCESSING YOUR REQUEST...',
  responding: 'RESPONDING...',
};

const SPEED: Record<AnimationIntensity, number> = { low: 0.5, medium: 1, high: 1.6 };

// Colours per state. Numbers are RGB triplets, var() reuses the theme accent.
const COLORS: Record<NishState, [string, string]> = {
  standby: ['var(--accent)', 'var(--accent2)'],
  listening: ['34 211 238', 'var(--accent)'],
  processing: ['var(--accent2)', 'var(--accent)'],
  responding: ['var(--accent)', '34 211 238'],
};

const GLOW: Record<NishState, number> = { standby: 0.25, listening: 0.45, processing: 0.4, responding: 0.5 };
const PULSE: Record<NishState, { k: number; d: number }> = {
  standby: { k: 1.04, d: 5.5 },
  listening: { k: 1.1, d: 1.5 },
  processing: { k: 0.95, d: 1.3 },
  responding: { k: 1.08, d: 1.2 },
};
const SPIN_BOOST: Record<NishState, number> = { standby: 1, listening: 2, processing: 6, responding: 1.8 };

const RINGS = [
  { r: 190, w: 1, dash: '2 7', dur: 90, rev: false, grad: '' },
  { r: 172, w: 2, dash: '380 701', dur: 34, rev: false, grad: 'url(#nish-grad-a)' },
  { r: 154, w: 1, dash: '1 9', dur: 60, rev: true, grad: '' },
  { r: 136, w: 3, dash: '210 645', dur: 22, rev: true, grad: 'url(#nish-grad-b)' },
];

const BAR_COUNT = 64;
const BAR_INNER = 92;
const BAR_MIN = 4;
const BAR_ADD = 36;
const C = 200;

interface Props {
  state: NishState;
  intensity: AnimationIntensity;
  /** Returns 0..1 live microphone level (used while listening). */
  getLevel?: () => number;
  sizeClass?: string;
}

export default function VoiceVisualizer({
  state,
  intensity,
  getLevel,
  sizeClass = 'w-[min(40vh,78vw,440px)] lg:w-[min(42vh,440px)]',
}: Props) {
  const speed = SPEED[intensity];
  const [a, b] = COLORS[state];
  const vars = { '--viz-a': a, '--viz-b': b } as CSSProperties;
  const pulse = PULSE[state];

  const barRefs = useRef<(SVGLineElement | null)[]>([]);
  const levelRef = useRef(getLevel);
  levelRef.current = getLevel;

  // Waveform bars: only runs a rAF loop while listening/responding.
  useEffect(() => {
    const lines = barRefs.current;
    const apply = (lvl: number, t: number) => {
      for (let i = 0; i < BAR_COUNT; i++) {
        const el = lines[i];
        if (!el) continue;
        const ang = (i / BAR_COUNT) * Math.PI * 2 - Math.PI / 2;
        const wave = 0.5 + 0.5 * Math.sin(t / 240 + i * 0.6) * Math.sin(t / 910 + i * 0.23);
        const len = BAR_MIN + BAR_ADD * Math.min(1, lvl * (0.35 + 0.65 * wave));
        el.setAttribute('x2', (C + Math.cos(ang) * (BAR_INNER + len)).toFixed(2));
        el.setAttribute('y2', (C + Math.sin(ang) * (BAR_INNER + len)).toFixed(2));
      }
    };

    if (state !== 'listening' && state !== 'responding') {
      apply(0, 0);
      return;
    }
    let raf = 0;
    let last = 0;
    const gap = intensity === 'low' ? 50 : 16;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < gap) return;
      last = t;
      const lvl =
        state === 'listening'
          ? Math.max(0.08, levelRef.current?.() ?? 0)
          : 0.45 + 0.15 * Math.sin(t / 380);
      apply(lvl, t);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state, intensity]);

  return (
    <div className="viz flex flex-col items-center gap-5" data-state={state} style={vars}>
      <div className={`relative aspect-square ${sizeClass}`}>
        {/* Ambient glow (opacity-only transition) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[6%] rounded-full blur-3xl transition-opacity duration-700"
          style={{
            opacity: GLOW[state],
            background:
              'radial-gradient(circle, rgb(var(--viz-a) / 0.55), rgb(var(--viz-b) / 0.25) 55%, transparent 72%)',
          }}
        />

        {/* Rings + waveform */}
        <motion.div
          className="absolute inset-0"
          animate={{ scale: [1, 1 + (pulse.k - 1) * 0.3, 1] }}
          transition={{ duration: pulse.d / speed, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg viewBox="0 0 400 400" className="h-full w-full" aria-hidden>
            <defs>
              <linearGradient id="nish-grad-a" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="400" y2="400">
                <stop offset="0" style={{ stopColor: 'rgb(var(--viz-a))' }} />
                <stop offset="1" style={{ stopColor: 'rgb(var(--viz-b))' }} />
              </linearGradient>
              <linearGradient id="nish-grad-b" gradientUnits="userSpaceOnUse" x1="400" y1="0" x2="0" y2="400">
                <stop offset="0" style={{ stopColor: 'rgb(var(--viz-b))' }} />
                <stop offset="1" style={{ stopColor: 'rgb(var(--viz-a))' }} />
              </linearGradient>
            </defs>

            {RINGS.map((ring, i) => {
              const boost = ring.grad ? SPIN_BOOST[state] : 1;
              return (
                <g
                  key={ring.r}
                  className="viz-ring"
                  style={{
                    animationDuration: `${ring.dur / speed / boost}s`,
                    animationDirection: ring.rev ? 'reverse' : 'normal',
                  }}
                >
                  <circle
                    cx={C}
                    cy={C}
                    r={ring.r}
                    fill="none"
                    strokeWidth={ring.w}
                    strokeDasharray={ring.dash}
                    strokeLinecap="round"
                    stroke={ring.grad || undefined}
                    style={ring.grad ? undefined : { stroke: 'rgb(var(--viz-a))', opacity: i === 0 ? 0.35 : 0.5 }}
                  />
                </g>
              );
            })}

            {Array.from({ length: BAR_COUNT }, (_, i) => {
              const ang = (i / BAR_COUNT) * Math.PI * 2 - Math.PI / 2;
              return (
                <line
                  key={i}
                  ref={(el) => {
                    barRefs.current[i] = el;
                  }}
                  x1={C + Math.cos(ang) * BAR_INNER}
                  y1={C + Math.sin(ang) * BAR_INNER}
                  x2={C + Math.cos(ang) * (BAR_INNER + BAR_MIN)}
                  y2={C + Math.sin(ang) * (BAR_INNER + BAR_MIN)}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  style={{ stroke: 'rgb(var(--viz-a))', opacity: 0.9 }}
                />
              );
            })}
          </svg>
        </motion.div>

        {/* CSS particles while processing */}
        {state === 'processing' && intensity !== 'low' && (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {Array.from({ length: 8 }, (_, i) => (
              <span
                key={i}
                className="viz-orbit"
                style={{
                  inset: `${8 + i * 2.5}%`,
                  animationDuration: `${(2.4 + i * 0.5) / speed}s`,
                  animationDelay: `-${i * 0.7}s`,
                }}
              >
                <i style={{ width: 4 + (i % 3), height: 4 + (i % 3) }} />
              </span>
            ))}
          </div>
        )}

        {/* Central orb */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <motion.div
            className="aspect-square w-[36%] rounded-full"
            animate={{ scale: [1, pulse.k, 1] }}
            transition={{ duration: pulse.d / speed, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background:
                'radial-gradient(circle at 35% 30%, rgb(255 255 255 / 0.9), rgb(var(--viz-a)) 22%, rgb(var(--viz-b)) 62%, rgb(var(--base)) 100%)',
              boxShadow: '0 0 40px 6px rgb(var(--viz-a) / 0.55), inset 0 0 30px rgb(var(--viz-b) / 0.6)',
            }}
          />
        </div>
      </div>

      <p
        role="status"
        aria-live="polite"
        className="text-center font-display text-xs tracking-[0.3em] sm:text-sm"
      >
        {LABELS[state]}
      </p>
    </div>
  );
}