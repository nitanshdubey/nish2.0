import { Loader2, Pause, Play, Volume2 } from 'lucide-react';
import type { PlaybackStatus } from '../../types';

const LABEL: Record<PlaybackStatus, string> = {
  idle: 'NO AUDIO LOADED',
  loading: 'GENERATING VOICE…',
  ready: 'PLAYBACK COMPLETE',
  playing: 'PLAYING',
  paused: 'PAUSED',
  error: 'VOICE ERROR',
};

interface Props {
  status: PlaybackStatus;
  error: string | null;
  disabled: boolean;
  disabledReason?: string;
  onToggle: () => void;
}

export default function AudioPlayer({ status, error, disabled, disabledReason, onToggle }: Props) {
  const playing = status === 'playing';
  return (
    <div className="flex w-full max-w-sm items-center gap-3 rounded-lg border border-line bg-base2/70 px-3 py-2">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled || status === 'loading'}
        aria-label={playing ? 'Pause voice response' : 'Play voice response'}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-accent/50 bg-accent/10 transition-colors hover:bg-accent/25 disabled:opacity-40"
      >
        {status === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-mute">
          <Volume2 className="h-3 w-3" /> VOICE RESPONSE
        </p>
        <p className="truncate font-mono text-[11px] tracking-wider">{disabled ? 'UNAVAILABLE' : LABEL[status]}</p>
        {disabled && disabledReason && <p className="text-[11px] leading-snug text-mute">{disabledReason}</p>}
        {!disabled && error && <p className="text-[11px] leading-snug text-rose-400">{error}</p>}
      </div>
    </div>
  );
}