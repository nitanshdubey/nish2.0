import type { StatusInfo, StatusTone } from '../../types';

const dot: Record<StatusTone, string> = {
  ok: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
  warn: 'bg-amber-400',
  bad: 'bg-rose-400',
  idle: 'bg-slate-500',
  busy: 'bg-cyan-400 animate-pulse',
};

export function StatusDot({ tone }: { tone: StatusTone }) {
  return <span aria-hidden className={`inline-block h-2 w-2 shrink-0 rounded-full ${dot[tone]}`} />;
}

export default function StatusIndicator({ label, info }: { label: string; info: StatusInfo }) {
  return (
    <div
      className="flex items-center gap-2 rounded-md border border-line bg-panel/60 px-2.5 py-1.5"
      title={`${label}: ${info.label}`}
    >
      <StatusDot tone={info.tone} />
      <span className="sr-only xl:not-sr-only xl:flex xl:flex-col xl:leading-none">
        <span className="font-mono text-[9px] tracking-[0.2em] text-mute">{label}</span>
        <span className="mt-0.5 font-mono text-[11px] tracking-wider">{info.label}</span>
      </span>
    </div>
  );
}