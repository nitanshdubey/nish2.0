/**
 * Minimal Supabase Edge Function client (no SDK needed).
 * Only PUBLIC configuration is read here. The anon key is public by design;
 * the OpenAI key must live in Supabase secrets and never in the frontend.
 */
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/$/, '');
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const isBackendConfigured = Boolean(url && anonKey);

export type BackendErrorCode =
  | 'DEMO_MODE'
  | 'NOT_CONFIGURED'
  | 'NETWORK'
  | 'HTTP'
  | 'INVALID_RESPONSE';

export class BackendError extends Error {
  code: BackendErrorCode;
  status?: number;
  constructor(code: BackendErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'BackendError';
    this.code = code;
    this.status = status;
  }
}

interface CallOptions {
  json?: unknown;
  body?: BodyInit | null;
}

export async function callFunction(name: string, opts: CallOptions = {}): Promise<Response> {
  if (!url || !anonKey) {
    throw new BackendError(
      'NOT_CONFIGURED',
      'Backend is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or switch back to demo mode.',
    );
  }

  const headers: Record<string, string> = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  };
  let body: BodyInit | null = opts.body ?? null;
  if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.json);
  }

  let res: Response;
  try {
    res = await fetch(`${url}/functions/v1/${name}`, { method: 'POST', headers, body });
  } catch {
    throw new BackendError(
      'NETWORK',
      'Could not reach the NISH backend. Check your connection and the Supabase URL.',
    );
  }
  if (!res.ok) {
    throw new BackendError('HTTP', `Backend function "${name}" returned status ${res.status}.`, res.status);
  }
  return res;
}

export async function callFunctionJson<T>(name: string, json: unknown): Promise<T> {
  const res = await callFunction(name, { json });
  try {
    return (await res.json()) as T;
  } catch {
    throw new BackendError('INVALID_RESPONSE', `Backend function "${name}" returned invalid JSON.`);
  }
}