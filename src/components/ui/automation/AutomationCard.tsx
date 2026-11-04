import { Play, type LucideIcon } from 'lucide-react';
import { Chip, btnGhost } from '../ui/Primitives';

interface Props {
  icon: LucideIcon;
  name: string;
  description: string;
  onRun: () => void;
}

export default function AutomationCard({ icon: Icon, name, description, onRun }: Props) {
  return (
    <article className="hud-corners flex flex-col gap-3 rounded-xl border border-line bg-panel/70 p-4 shadow-panel">
      <div className="flex items-start justify-between gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-accent/40 bg-accent/10 text-accent">
          <Icon className="h-5 w-5" />
        </div>
        <Chip tone="idle">NOT CONFIGURED</Chip>
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-medium">{name}</h3>
        <p className="mt-1 text-xs leading-relaxed text-mute">{description}</p>
      </div>
      <button type="button" onClick={onRun} className={btnGhost}>
        <Play className="h-3.5 w-3.5" /> Run
      </button>
    </article>
  );
}