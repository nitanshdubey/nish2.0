import type { Conversation, Message, Settings } from '../types';
import { BackendError, callFunctionJson } from './supabaseClient';

export interface ChatReply {
  reply: string;
  isDemo: boolean;
}

export interface BackendHealth {
  ok: boolean;
  ai?: boolean;
  provider?: string;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function demoReply(input: string): string {
  const t = input.toLowerCase().trim();
  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(t)) {
    return 'Hello. NISH is running in demo mode, so this reply is a sample and no AI model was contacted. You can test text input, interface states and microphone permission right now.';
  }
  if (/\b(time|date|day)\b/.test(t)) {
    return `Your device clock reads ${new Date().toLocaleString()}. This was read locally in your browser; demo mode does not call an AI service.`;
  }
  if (/\b(what can you do|help|capabilities|features)\b/.test(t)) {
    return 'Sample reply (demo mode): once the Supabase backend is connected, NISH will handle voice transcription, AI answers, spoken responses, memory and automations. Right now this interface demonstrates the layout, states and integration points.';
  }
  if (/\b(who are you|your name)\b/.test(t)) {
    return 'Sample reply (demo mode): I am NISH, a personal AI assistant interface. No AI model is connected yet.';
  }
  const echo = input.length > 120 ? `${input.slice(0, 120)}…` : input;
  return `Sample reply (demo mode): I received "${echo}". No AI model was contacted. Connect the Supabase backend and turn off demo mode to get real answers.`;
}

/** Sends the conversation (last item = new user message). */
export async function sendMessage(
  messages: Message[],
  opts: { demo: boolean },
): Promise<ChatReply> {
  if (opts.demo) {
    await wait(700 + Math.random() * 700);
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    return { reply: demoReply(lastUser?.content ?? ''), isDemo: true };
  }
  const data = await callFunctionJson<{ reply?: string }>('nish-chat', {
    messages: messages
      .filter((m) => !m.isError)
      .map((m) => ({ role: m.role, content: m.content })),
  });
  if (typeof data.reply !== 'string' || !data.reply.trim()) {
    throw new BackendError('INVALID_RESPONSE', 'The backend returned an empty reply.');
  }
  return { reply: data.reply, isDemo: false };
}

export async function checkBackendHealth(): Promise<BackendHealth> {
  return callFunctionJson<BackendHealth>('nish-health', {});
}

/* ---- Persistence layer: ready to wire to Supabase, not used by the UI yet. ----
 * They never return fake data: in demo mode they throw, so nothing can pretend
 * that cloud persistence is working. */

export async function loadConversationHistory(opts: { demo: boolean }): Promise<Conversation[]> {
  if (opts.demo) throw new BackendError('DEMO_MODE', 'Cloud history is unavailable in demo mode.');
  const data = await callFunctionJson<{ conversations?: Conversation[] }>('nish-history', {});
  return data.conversations ?? [];
}

export async function saveConversation(
  conversation: Conversation,
  opts: { demo: boolean },
): Promise<void> {
  if (opts.demo) throw new BackendError('DEMO_MODE', 'Cloud saving is unavailable in demo mode.');
  await callFunctionJson('nish-save-conversation', { conversation });
}

export async function loadUserSettings(opts: { demo: boolean }): Promise<Partial<Settings>> {
  if (opts.demo) throw new BackendError('DEMO_MODE', 'Cloud settings are unavailable in demo mode.');
  const data = await callFunctionJson<{ settings?: Partial<Settings> }>('nish-settings', {});
  return data.settings ?? {};
}