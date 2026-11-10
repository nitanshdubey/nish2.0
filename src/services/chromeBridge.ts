import type { BrowserAction } from '../types';

const REQUEST = 'nish-web';
const RESPONSE = 'nish-ext';

export interface BridgeResult {
  ok: boolean;
  message?: string;
  error?: string;
  version?: string;
}

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
    return {
      ok: false,
      error:
        'The NISH Chrome connector did not respond. Check that the extension is installed and enabled, then refresh this page.',
    };
  }
}