import { useEffect, useState } from 'react';
import { Menu, Settings as SettingsIcon } from 'lucide-react';
import type { PageId } from '../../types';
import { useNish } from '../../context/NishContext';
import { useSettings } from '../../context/SettingsContext';
import StatusIndicator from '../ui/StatusIndicator';
import { formatClock, formatDateLong } from '../../lib/format';

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="hidden text-right leading-tight md:block">
      <div className="font-mono text-sm tabular-nums">{formatClock(now)}</div>
      <div className="font-mono text-[10px] tracking-wider text-mute">{formatDateLong(now).toUpperCase()}</div>
    </div>
  );
}

interface Props {
  onMenu: () => void;
  onNavigate: (p: PageId) => void;
}

export default function TopBar({ onMenu, onNavigate }: Props) {
  const { statuses } = useNish();
  const { settings, update } = useSettings();

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-base2/80 px-3 backdrop-blur sm:px-4">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        className="grid h-9 w-9 place-items-center rounded-lg border border-line text-mute hover:text-ink lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent2 font-display text-sm font-bold text-white shadow-glow">
          N
        </div>
        <span className="font-display text-base font-bold tracking-[0.35em] text-ink">NISH</span>
      </div>

      <div className="ml-2 hidden items-center gap-2 sm:flex">
        <StatusIndicator label="SYSTEM" info={statuses.system} />
        <StatusIndicator label="AI SERVICE" info={statuses.ai} />
        <StatusIndicator label="MIC" info={statuses.mic} />
      </div>

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => update('demoMode', !settings.demoMode)}
        aria-pressed={settings.demoMode}
        title="Click to switch between demo mode and backend mode"
        className={`rounded-md border px-2.5 py-1.5 font-mono text-[10px] font-medium tracking-wider transition-colors ${
          settings.demoMode
            ? 'border-amber-400/50 bg-amber-400/10 text-amber-400'
            : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400'
        }`}
      >
        {settings.demoMode ? 'DEMO MODE' : 'BACKEND MODE'}
      </button>

      <Clock />

      <button
        type="button"
        onClick={() => onNavigate('settings')}
        aria-label="Open settings"
        className="grid h-9 w-9 place-items-center rounded-lg border border-line text-mute transition-colors hover:border-accent/50 hover:text-ink"
      >
        <SettingsIcon className="h-[18px] w-[18px]" />
      </button>
      <button
        type="button"
        onClick={() => onNavigate('settings')}
        aria-label="Profile (opens settings)"
        title="Profile — account features arrive with the backend"
        className="grid h-9 w-9 place-items-center rounded-full border border-accent/50 bg-accent/10 font-mono text-[11px] font-medium"
      >
        YOU
      </button>
    </header>
  );
}