import { AlertTriangle, Mic } from 'lucide-react';
import type { Message } from '../../types';
import { formatMsgTime } from '../../lib/format';
import { Chip } from '../ui/Primitives';

export default function ChatMessage({ message }: { message: Message }) {
  const time = formatMsgTime(message.timestamp);

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%]">
          <div className="mb-1 flex items-center justify-end gap-2 font-mono text-[10px] tracking-wider text-mute">
            <span>YOU</span>
            <time>{time}</time>
          </div>
          <div className="flex items-start gap-2 whitespace-pre-wrap break-words rounded-lg rounded-tr-sm border border-accent/30 bg-accent/10 px-3.5 py-2.5 text-sm leading-relaxed">
            {message.isVoice && <Mic className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-label="Voice message" />}
            <span>{message.content}</span>
          </div>
        </div>
      </div>
    );
  }

  const isError = message.isError;
  return (
    <div className="flex gap-3">
      <div
        className={`mt-5 grid h-8 w-8 shrink-0 place-items-center rounded-lg font-display text-xs font-bold text-white ${
          isError ? 'bg-rose-500/80' : 'bg-gradient-to-br from-accent to-accent2 shadow-glow'
        }`}
        aria-hidden
      >
        N
      </div>
      <div className="min-w-0 max-w-[88%]">
        <div className="mb-1 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-wider text-mute">
          <span className={isError ? 'text-rose-400' : 'text-accent'}>{isError ? 'NISH · NOTICE' : 'NISH'}</span>
          <time>{time}</time>
          {message.isDemo && <Chip tone="warn">DEMO RESPONSE</Chip>}
        </div>
        <div
          className={`flex items-start gap-2 whitespace-pre-wrap break-words rounded-lg rounded-tl-sm border px-3.5 py-2.5 text-sm leading-relaxed ${
            isError ? 'border-rose-400/40 bg-rose-400/10' : 'border-line bg-base2/80'
          }`}
        >
          {isError && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />}
          <span>{message.content}</span>
        </div>
      </div>
    </div>
  );
}