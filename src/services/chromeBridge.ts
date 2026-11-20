import type { BrowserAction, PlanSnapshot } from '../types';

const REQUEST = 'nish-web';
const RESPONSE = 'nish-ext';

export interface BridgeResult {
  ok: boolean;
  message?: string;
  error?: string;
  version?: string;
  shortcut?: string;
  snapshot?: PlanSnapshot;
}

export type ExtensionEvent =
  | { event: 'hotkey' }
  | { event: 'plan' }
  | { event: 'open-planner' }
  | { event: 'tts'; state: 'start' | 'end' | 'stopped' | 'error'; message?: string };

let counter = 0;

function request(payload: Record<string, unknown>, timeoutMs: number): Promise<BridgeResult> {
  return new Promise((resolve, reject) => {
    const id = `${Date.now()}-${++counter}`;
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error('timeout'));
    }, timeoutMs);

    function onMessage(e: MessageEvent) {
      if (e.source !== window || e.origin !== window.location.origin) return;
      const d = e.data as { source?: string; id?: string; result?: BridgeResult } | null;
      if (!d || d.source !== RESPONSE || d.id !== id || !d.result) return;
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(d.result);
    }

    window.addEventListener('message', onMessage);
    window.postMessage({ source: REQUEST, id, payload }, window.location.origin);
  });
}

const NOT_RESPONDING =
  'The NISH Chrome connector did not respond. Check that the extension is installed, enabled and up to date, then refresh this page.';

/** Is the NISH Chrome extension installed and allowed on this page? */
export async function pingExtension(): Promise<{ connected: boolean; version?: string }> {
  try {
    const r = await request({ type: 'ping' }, 1200);
    return { connected: r.ok, version: r.version };
  } catch {
    return { connected: false };
  }
}

export async function runBrowserAction(action: BrowserAction): Promise<BridgeResult> {
  try {
    return await request({ ...action }, 8000);
  } catch {
    return { ok: false, error: NOT_RESPONDING };
  }
}

/** Any other command for the extension (speech, shortcut info, ...). */
export async function callExtension(payload: Record<string, unknown>, timeoutMs = 4000): Promise<BridgeResult> {
  try {
    return await request(payload, timeoutMs);
  } catch {
    return { ok: false, error: NOT_RESPONDING };
  }
}

/** Events pushed by the extension: the keyboard shortcut and speech progress. */
export function onExtensionEvent(handler: (e: ExtensionEvent) => void): () => void {
  const listener = (e: MessageEvent) => {
    if (e.source !== window || e.origin !== window.location.origin) return;
    const d = e.data as { source?: string; event?: string; state?: string; message?: string } | null;
    if (!d || d.source !== RESPONSE || typeof d.event !== 'string') return;
    if (d.event === 'hotkey' || d.event === 'plan' || d.event === 'open-planner') {
      handler({ event: d.event });
    } else if (d.event === 'tts' && typeof d.state === 'string') {
      handler({ event: 'tts', state: d.state as 'start' | 'end' | 'stopped' | 'error', message: d.message });
    }
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}