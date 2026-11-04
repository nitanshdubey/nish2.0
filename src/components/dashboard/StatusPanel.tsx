import { useNish } from '../../context/NishContext';
import { StatusDot } from '../ui/StatusIndicator';
import type { StatusInfo } from '../../types';

export default function StatusPanel() {
  const { statuses } = useNish();
  const items: { label: string; info: StatusInfo }[] = [
    { label: 'SYSTEM', info: statuses.system },
    { label: 'AI SERVICE', info: statuses.ai },
    { label: 'MICROPHONE', info: statuses.mic },
    { label: 'LOCAL CONNECTOR', info: { label: 'NOT INSTALLED', tone: 'idle' } },
  ];
  return (
    <dl className="relative z-10 grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(({ label, info }) => (
        <div key={label} className="rounded-lg border border-line bg-base2/70 px-3 py-2">
          <dt className="font-mono text-[9px] tracking-[0.2em] text-mute">{label}</dt>
          <dd className="mt-1 flex items-center gap-2 font-mono text-[11px] tracking-wider">
            <StatusDot tone={info.tone} />
            {info.label}
          </dd>
        </div>
      ))}
    </dl>
  );
}