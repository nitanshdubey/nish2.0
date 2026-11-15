/**
 * Supabase client + Edge Function caller.
 * Only PUBLIC configuration is read here. The anon/publishable key is public by design;
 * the Gemini key lives in Supabase secrets and never in the frontend.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/$/, '');
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const isBackendConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
    : null;

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

/** The signed-in user's token when there is a session, otherwise the public key. */
async function accessToken(): Promise<string> {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) return data.session.access_token;
  }
  return anonKey ?? '';
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
    Authorization: `Bearer ${await accessToken()}`,
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
    let detail = '';
    try {
      const data = (await res.json()) as { error?: unknown; message?: unknown };
      detail =
        typeof data.error === 'string' ? data.error : typeof data.message === 'string' ? data.message : '';
    } catch {
      /* body was not JSON */
    }
    throw new BackendError(
      'HTTP',
      detail || `Backend function "${name}" returned status ${res.status}.`,
      res.status,
    );
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