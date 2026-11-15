import type { Conversation, Message } from '../types';
import { supabase } from './supabaseClient';

function client() {
  if (!supabase) throw new Error('The backend is not configured.');
  return supabase;
}

interface ConversationRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: { id: string; role: 'user' | 'assistant'; content: string; is_voice: boolean; created_at: string }[];
}

export async function fetchConversations(limit = 30): Promise<Conversation[]> {
  const { data, error } = await client()
    .from('conversations')
    .select('id,title,created_at,updated_at,messages(id,role,content,is_voice,created_at)')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return (data as unknown as ConversationRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    messages: [...row.messages]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map<Message>((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at).getTime(),
        isVoice: m.is_voice || undefined,
      })),
  }));
}

export async function upsertConversation(conv: Conversation): Promise<void> {
  const { error } = await client()
    .from('conversations')
    .upsert(
      {
        id: conv.id,
        title: conv.title,
        created_at: new Date(conv.createdAt).toISOString(),
        updated_at: new Date(conv.updatedAt).toISOString(),
      },
      { onConflict: 'id' },
    );
  if (error) throw new Error(error.message);
}

export async function insertMessage(conversationId: string, msg: Message): Promise<void> {
  const { error } = await client()
    .from('messages')
    .upsert(
      {
        id: msg.id,
        conversation_id: conversationId,
        role: msg.role,
        content: msg.content,
        is_voice: Boolean(msg.isVoice),
        created_at: new Date(msg.timestamp).toISOString(),
      },
      { onConflict: 'id' },
    );
  if (error) throw new Error(error.message);
}

export async function patchMessage(id: string, content: string): Promise<void> {
  const { error } = await client().from('messages').update({ content }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function removeConversation(id: string): Promise<void> {
  const { error } = await client().from('conversations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function removeAllConversations(): Promise<void> {
  const { error } = await client().from('conversations').delete().not('id', 'is', null);
  if (error) throw new Error(error.message);
}