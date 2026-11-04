import { useState, type FormEvent } from 'react';
import { Brain, Info, Plus, Trash2, X } from 'lucide-react';
import { useNish } from '../context/NishContext';
import { useSettings } from '../context/SettingsContext';
import { Banner, ConfirmButton, PageHeader, Panel, Toggle, btnPrimary } from '../components/ui/Primitives';
import type { MemoryItem } from '../types';

function MemoryList({ kind, title, placeholder }: { kind: MemoryItem['kind']; title: string; placeholder: string }) {
  const { memory, addMemory, removeMemory } = useNish();
  const { settings } = useSettings();
  const [text, setText] = useState('');
  const items = memory.filter((m) => m.kind === kind);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    addMemory(kind, text);
    setText('');
  };

  return (
    <Panel title={title}>
      <form onSubmit={submit} className="mb-3 flex gap-2">
        <label htmlFor={`mem-${kind}`} className="sr-only">
          {title}
        </label>
        <input
          id={`mem-${kind}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!settings.memoryEnabled}
          placeholder={settings.memoryEnabled ? placeholder : 'Memory is turned off'}
          className="min-w-0 flex-1 rounded-lg border border-line bg-base2/80 px-3 py-2 text-sm placeholder:text-mute focus:border-accent/60 focus:outline-none disabled:opacity-50"
        />
        <button type="submit" disabled={!settings.memoryEnabled || !text.trim()} className={btnPrimary} aria-label="Add">
          <Plus className="h-4 w-4" />
        </button>
      </form>
      {items.length === 0 ? (
        <p className="py-6 text-center text-xs text-mute">Nothing saved yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-2 rounded-lg border border-line bg-base2/60 px-3 py-2 text-sm">
              <span className="min-w-0 break-words">{i.text}</span>
              <button
                type="button"
                onClick={() => removeMemory(i.id)}
                aria-label={`Remove: ${i.text}`}
                className="text-mute hover:text-rose-400"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default function Memory() {
  const { conversations, memory, clearMemory } = useNish();
  const { settings, update } = useSettings();
  const convCount = conversations.filter((c) => c.messages.length > 0).length;

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <PageHeader
        icon={Brain}
        title="Memory"
        subtitle="What NISH should remember about you. Designed for persistent storage through Supabase."
      />
      <div className="mb-4">
        <Banner tone="warn" icon={Info}>
          Session only: entries here are kept in this tab and vanish on refresh. Persistent cloud memory is not
          operational until the Supabase integration is connected.
        </Banner>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MemoryList kind="preference" title="Saved preferences" placeholder="e.g. Keep answers short" />
        <MemoryList kind="fact" title="Important facts" placeholder="e.g. My timezone is IST" />

        <Panel title="Conversation memory">
          <p className="text-sm">
            <span className="font-mono text-lg">{convCount}</span>{' '}
            <span className="text-mute">conversation{convCount === 1 ? '' : 's'} in this session.</span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-mute">
            Automatic summarisation of past conversations into long-term memory will be available with the backend.
          </p>
        </Panel>

        <Panel title="Memory management">
          <Toggle
            label="Enable memory"
            description="When off, new memory entries cannot be added."
            checked={settings.memoryEnabled}
            onChange={(v) => update('memoryEnabled', v)}
          />
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-3">
            <p className="text-xs text-mute">{memory.length} saved entr{memory.length === 1 ? 'y' : 'ies'}</p>
            <ConfirmButton
              label="Clear memory"
              confirmLabel="Confirm clear"
              icon={Trash2}
              disabled={memory.length === 0}
              onConfirm={clearMemory}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}