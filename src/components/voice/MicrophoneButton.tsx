import type { ButtonHTMLAttributes } from 'react';
import { Loader2, Mic, MicOff, Square } from 'lucide-react';
import type { RecorderStatus } from '../../types';
import { formatDuration } from '../../lib/format';

interface Props {
  status: RecorderStatus;
  seconds: number;
  disabled: boolean;
  pushToTalk: boolean;
  hint: string;
  onToggle: () => void;
  onPressStart: () => void;
  onPressEnd: () => void;
}

export default function MicrophoneButton({
  status,
  seconds,
  disabled,
  pushToTalk,
  hint,
  onToggle,
  onPressStart,
  onPressEnd,
}: Props) {
  const recording = status === 'recording';
  const requesting = status === 'requesting';

  const label = recording
    ? 'Stop recording'
    : requesting
      ? 'Waiting for microphone permission'
      : pushToTalk
        ? 'Hold to speak'
        : 'Start recording';

  const handlers: ButtonHTMLAttributes<HTMLButtonElement> = pushToTalk
    ? {
        onPointerDown: (e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          onPressStart();
        },
        onPointerUp: onPressEnd,
        onPointerCancel: onPressEnd,
        onContextMenu: (e) => e.preventDefault(),
        onKeyDown: (e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
            e.preventDefault();
            onPressStart();
          }
        },
        onKeyUp: (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            onPressEnd();
          }
        },
      }
    : { onClick: onToggle };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {recording && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-cyan-400/30" />}
        <button
          type="button"
          aria-label={label}
          aria-pressed={recording}
          disabled={disabled}
          {...handlers}
          className={`relative grid h-16 w-16 touch-none select-none place-items-center rounded-full border-2 transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
            recording
              ? 'border-cyan-400 bg-cyan-400/15 text-cyan-300 shadow-[0_0_28px_rgba(34,211,238,0.45)]'
              : 'border-accent/60 bg-accent/10 text-ink hover:bg-accent/20 hover:shadow-glow'
          }`}
        >
          {requesting ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : recording ? (
            <Square className="h-5 w-5 fill-current" />
          ) : disabled ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </button>
      </div>

      {recording ? (
        <p className="flex items-center gap-2 font-mono text-sm tabular-nums" aria-live="off">
          <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
          REC {formatDuration(seconds)}
        </p>
      ) : (
        <p className="font-mono text-[10px] tracking-[0.2em] text-mute">{hint}</p>
      )}
    </div>
  );
}