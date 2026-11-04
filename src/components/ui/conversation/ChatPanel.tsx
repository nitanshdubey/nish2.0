import { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import type { Message } from '../../types';
import ChatMessage from './ChatMessage';
import MessageInput from './MessageInput';
import { Chip } from '../ui/Primitives';

interface Props {
  title: string;
  messages: Message[];
  processing: boolean;
  inputDisabled: boolean;
  demo: boolean;
  onSend: (text: string) => void;
}

const SUGGESTIONS = ['What can you do?', 'What time is it?', 'Hello NISH'];

export default function ChatPanel({ title, messages, processing, inputDisabled, demo, onSend }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, processing]);

  return (
    <section
      aria-label="Conversation"
      className="hud-corners flex h-full min-h-[440px] flex-col rounded-xl border border-line bg-panel/70 shadow-panel backdrop-blur lg:min-h-0"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.25em] text-mute">CONVERSATION</p>
          <h2 className="truncate text-sm font-medium">{title}</h2>
        </div>
        {demo && <Chip tone="warn">DEMO MODE</Chip>}
      </header>

      <div ref={scrollRef} role="log" aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl border border-accent/40 bg-accent/10 text-accent">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium">No messages yet</p>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-mute">
                Type below or use the microphone.{' '}
                {demo ? 'Replies are clearly labelled samples while demo mode is on.' : 'Messages are sent to your NISH backend.'}
              </p>
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={inputDisabled}
                  onClick={() => onSend(s)}
                  className="rounded-full border border-line bg-base2/70 px-3 py-1.5 text-xs text-mute transition-colors hover:border-accent/50 hover:text-ink disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <ChatMessage key={m.id} message={m} />)
        )}

        {processing && (
          <div className="flex items-center gap-3" aria-label="NISH is processing">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent2 font-display text-xs font-bold text-white">
              N
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-line bg-base2/80 px-3.5 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
                  style={{ animationDelay: `${i * 180}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <MessageInput onSend={onSend} disabled={inputDisabled} loading={processing} />
    </section>
  );
}