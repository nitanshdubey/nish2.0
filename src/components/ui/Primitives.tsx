import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X, type LucideIcon } from 'lucide-react';
import type { StatusTone } from '../../types';

/* ---------- Button style tokens ---------- */
const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40';
export const btnPrimary = `${btnBase} border-accent/50 bg-accent/15 text-ink hover:bg-accent/25`;
export const btnGhost = `${btnBase} border-line bg-panel/60 text-mute hover:border-accent/40 hover:text-ink`;
export const btnDanger = `${btnBase} border-rose-400/40 bg-rose-400/10 text-rose-400 hover:bg-rose-400/20`;

/* ---------- Chip ---------- */
const chipTone: Record<StatusTone, string> = {
  ok: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400',
  warn: 'border-amber-400/40 bg-amber-400/10 text-amber-400',
  bad: 'border-rose-400/40 bg-rose-400/10 text-rose-400',
  idle: 'border-line bg-panel/60 text-mute',
  busy: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-400',
};

export function Chip({ tone = 'idle', children }: { tone?: StatusTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wider ${chipTone[tone]}`}
    >
      {children}
    </span>
  );
}

/* ---------- Layout ---------- */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-accent/40 bg-accent/10 text-accent">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-lg font-medium tracking-wide">{title}</h1>
          <p className="mt-0.5 max-w-2xl text-sm text-mute">{subtitle}</p>
        </div>
      </div>
      {actions}
    </div>
  );
}

export function Panel({
  title,
  icon: Icon,
  action,
  className = '',
  children,
}: {
  title?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`hud-corners rounded-xl border border-line bg-panel/70 p-4 shadow-panel ${className}`}>
      {title && (
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-3">
          <h2 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] text-mute">
            {Icon && <Icon className="h-4 w-4 text-accent" />}
            {title.toUpperCase()}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const bannerTone: Record<StatusTone, string> = {
  ok: 'border-emerald-400/30 bg-emerald-400/5',
  warn: 'border-amber-400/30 bg-amber-400/5',
  bad: 'border-rose-400/30 bg-rose-400/5',
  idle: 'border-line bg-panel/60',
  busy: 'border-cyan-400/30 bg-cyan-400/5',
};
const bannerIcon: Record<StatusTone, string> = {
  ok: 'text-emerald-400',
  warn: 'text-amber-400',
  bad: 'text-rose-400',
  idle: 'text-mute',
  busy: 'text-cyan-400',
};

export function Banner({
  tone = 'warn',
  icon: Icon,
  children,
  onDismiss,
}: {
  tone?: StatusTone;
  icon: LucideIcon;
  children: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div role={tone === 'bad' ? 'alert' : 'note'} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${bannerTone[tone]}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${bannerIcon[tone]}`} />
      <div className="min-w-0 flex-1 text-ink/90">{children}</div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="text-mute hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ---------- Form controls ---------- */
export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        {description && <p className="mt-0.5 text-xs text-mute">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-40 ${
          checked ? 'border-accent bg-accent/30' : 'border-line bg-base2'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-ink transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="py-2.5">
      <p className="mb-2 text-sm">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-base2/70 p-1"
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onChange(o.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              o.value === value ? 'bg-accent/20 text-ink shadow-glow' : 'text-mute hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ConfirmButton({
  label,
  confirmLabel,
  icon: Icon,
  onConfirm,
  disabled,
}: {
  label: string;
  confirmLabel: string;
  icon: LucideIcon;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const click = () => {
    if (armed) {
      window.clearTimeout(timer.current);
      setArmed(false);
      onConfirm();
      return;
    }
    setArmed(true);
    timer.current = window.setTimeout(() => setArmed(false), 4000);
  };

  return (
    <button type="button" disabled={disabled} onClick={click} className={armed ? btnDanger : btnGhost}>
      <Icon className="h-4 w-4" />
      {armed ? confirmLabel : label}
    </button>
  );
}