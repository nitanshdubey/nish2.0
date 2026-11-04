import { Loader2, type LucideIcon } from 'lucide-react';
import type { IntegrationStatus, StatusTone } from '../../types';
import { Chip, btnGhost } from '../ui/Primitives';

const STATUS: Record<IntegrationStatus, { label: string; tone: StatusTone }> = {
  connected: { label: 'CONNECTED', tone: 'ok' },
  'not-connected': { label: 'NOT CONNECTED', tone: 'idle' },
  'configuration-required': { label: 'CONFIGURATION REQUIRED', tone: 'warn' },
  'coming-soon': { label: 'COMING SOON', tone: 'idle' },
};

interface Props {
  icon: LucideIcon;
  name: string;
  description: string;
  status: IntegrationStatus;
  detail?: string;
  action?: { label: string; onClick: () => void; busy?: boolean };
}

export default function IntegrationCard({ icon: Icon, name, description, status, detail, action }: Props) {
  const s = STATUS[status];
  return (
    <article className="hud-corners flex flex-col gap-3 rounded-xl border border-line bg-panel/70 p-4 shadow-panel">
      <div className="flex items-start justify-between gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-accent/40 bg-accent/10 text-accent">
          <Icon className="h-5 w-5" />
        </div>
        <Chip tone={s.tone}>{s.label}</Chip>
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-medium">{name}</h3>
        <p className="mt-1 text-xs leading-relaxed text-mute">{description}</p>
        {detail && <p className="mt-2 text-[11px] leading-relaxed text-amber-400/90">{detail}</p>}
      </div>
      {action && (
        <button type="button" onClick={action.onClick} disabled={action.busy} className={btnGhost}>
          {action.busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {action.label}
        </button>
      )}
    </article>
  );
}