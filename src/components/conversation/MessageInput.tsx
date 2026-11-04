import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, Send } from 'lucide-react';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function MessageInput({ onSend, disabled = false, loading = false }: Props) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const wasDisabled = useRef(false);

  // Auto-grow up to ~5 lines
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [value]);

  // Return focus once processing finishes
  useEffect(() => {
    if (wasDisabled.current && !disabled) ref.current?.focus();
    wasDisabled.current = disabled;
  }, [disabled]);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-line p-3">
      <div className="flex items-end gap-2 rounded-lg border border-line bg-base2/80 p-2 transition-colors focus-within:border-accent/60">
        <label htmlFor="nish-input" className="sr-only">
          Message NISH
        </label>
        <textarea
          id="nish-input"
          ref={ref}
          rows={1}
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask NISH anything..."
          className="max-h-[132px] min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-ink placeholder:text-mute focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gradient-to-br from-accent to-accent2 text-white shadow-glow transition-opacity disabled:opacity-40 disabled:shadow-none"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
      <p className="mt-1.5 px-1 font-mono text-[10px] tracking-wider text-mute">
        ENTER TO SEND · SHIFT+ENTER FOR NEW LINE
      </p>
    </div>
  );
}