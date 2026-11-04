import { useMemo, useState } from 'react';
import { History as HistoryIcon, MessageSquare, Plus, Search, Trash2 } from 'lucide-react';
import { useNish } from '../context/NishContext';
import { Banner, Chip, PageHeader, btnPrimary } from '../components/ui/Primitives';
import { formatDateTime } from '../lib/format';
import { Info } from 'lucide-react';

export default function History({ onOpen }: { onOpen: () => void }) {
  const { conversations, activeId, selectConversation, deleteConversation, newConversation } = useNish();
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations
      .filter((c) => c.messages.length > 0)
      .filter(
        (c) => !q || c.title.toLowerCase().includes(q) || c.messages.some((m) => m.content.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [conversations, query]);

  return (
    <div className="mx-auto w-full max-w-4xl p-4 sm:p-6">
      <PageHeader
        icon={HistoryIcon}
        title="Conversation History"
        subtitle="Previous conversations from this browser session."
        actions={
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              newConversation();
              onOpen();
            }}
          >
            <Plus className="h-4 w-4" /> New conversation
          </button>
        }
      />

      <div className="mb-4">
        <Banner tone="warn" icon={Info}>
          Session only: history lives in this tab’s memory and is lost on refresh. Persistent cloud history is not
          connected yet.
        </Banner>
      </div>

      <div className="relative mb-4">
        <label htmlFor="history-search" className="sr-only">
          Search conversations
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
        <input
          id="history-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations..."
          className="w-full rounded-lg border border-line bg-base2/80 py-2.5 pl-9 pr-3 text-sm placeholder:text-mute focus:border-accent/60 focus:outline-none"
        />
      </div>

      {items.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-line py-16 text-center">
          <MessageSquare className="h-8 w-8 text-mute" />
          <p className="text-sm font-medium">{query ? 'No matching conversations' : 'No conversations yet'}</p>
          <p className="text-xs text-mute">
            {query ? 'Try a different search term.' : 'Start chatting on the Home screen and it will appear here.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-xl border border-line bg-panel/70 p-2 pr-3">
              <button
                type="button"
                onClick={() => {
                  selectConversation(c.id);
                  onOpen();
                }}
                className="min-w-0 flex-1 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent/10"
              >
                <p className="flex items-center gap-2 truncate text-sm font-medium">
                  <span className="truncate">{c.title}</span>
                  {c.id === activeId && <Chip tone="ok">ACTIVE</Chip>}
                </p>
                <p className="mt-0.5 font-mono text-[10px] tracking-wider text-mute">
                  {formatDateTime(c.updatedAt)} · {c.messages.length} MESSAGE{c.messages.length === 1 ? '' : 'S'}
                </p>
              </button>
              <button
                type="button"
                onClick={() => deleteConversation(c.id)}
                aria-label={`Delete conversation ${c.title}`}
                className="grid h-9 w-9 place-items-center rounded-lg text-mute transition-colors hover:bg-rose-400/10 hover:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}