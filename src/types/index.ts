export type PageId =
  | 'home'
  | 'history'
  | 'tools'
  | 'automations'
  | 'memory'
  | 'integrations'
  | 'settings'
  | 'planner';

export type NishState = 'standby' | 'listening' | 'processing' | 'responding';

export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  isDemo?: boolean;
  isError?: boolean;
  isVoice?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export type AccentColor = 'blue' | 'cyan' | 'violet';
export type AnimationIntensity = 'low' | 'medium' | 'high';
export type VoicePreference = 'male' | 'female' | 'system';
export type InteractionMode = 'voice-text' | 'text-only';
export type ActivationShortcut = 'Ctrl + Space' | 'Ctrl + Alt + N' | 'Alt + Space';

export interface Settings {
  darkMode: boolean;
  accent: AccentColor;
  animationIntensity: AnimationIntensity;
  voiceEnabled: boolean;
  preferredVoice: VoicePreference;
  speechSpeed: number;
  speakReplies: boolean;
  interactionMode: InteractionMode;
  pushToTalk: boolean;
  activationShortcut: ActivationShortcut;
  demoMode: boolean;
  memoryEnabled: boolean;
  naturalVoice: boolean;
  continuousVoice: boolean;
}

export type BackendStatus =
  | 'demo'
  | 'not-configured'
  | 'unverified'
  | 'checking'
  | 'online'
  | 'offline';

export type StatusTone = 'ok' | 'warn' | 'bad' | 'idle' | 'busy';

export interface StatusInfo {
  label: string;
  tone: StatusTone;
}

export type MicPermission = 'granted' | 'denied' | 'prompt' | 'unknown';
export type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'error';
export type PlaybackStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error';

export type IntegrationStatus =
  | 'connected'
  | 'not-connected'
  | 'configuration-required'
  | 'coming-soon';

export interface MemoryItem {
  id: string;
  kind: 'preference' | 'fact';
  text: string;
  createdAt: number;
}
export interface PlanDraft {
  title: string;
  start?: string;
  inMinutes?: number;
  durationMin?: number;
  date?: string;
  repeat?: 'none' | 'daily' | 'weekdays';
  nonNegotiable?: boolean;
  leadMin?: number;
}

export type BrowserAction =
  | { type: 'search_web'; query: string }
  | { type: 'open_website'; url: string }
  | { type: 'switch_tab'; query: string }
  | { type: 'add_plan_items'; items: PlanDraft[] }
  | { type: 'remove_plan_item'; query: string }
  | { type: 'mark_plan_item'; query: string; status: 'done' | 'skipped' };

export type ConnectorStatus = 'checking' | 'connected' | 'not-detected';

export interface PlanItem {
  id: string;
  title: string;
  date: string;
  start: string;
  dur: number;
  repeat: 'none' | 'daily' | 'weekdays';
  nn: boolean;
  lead: number;
}

export interface PlanOccurrence {
  key: string;
  id: string;
  title: string;
  start: string;
  dur: number;
  nn: boolean;
  repeat: 'none' | 'daily' | 'weekdays';
  lead: number;
  startAt: number;
  endAt: number | null;
  state: 'pending' | 'done' | 'skipped';
  snoozedUntil: number | null;
}

export interface PlanPrefs {
  speak: boolean;
  voice: VoicePreference;
  rate: number;
  defaultLead: number;
}

export interface PlanSnapshot {
  version: string;
  items: PlanItem[];
  today: PlanOccurrence[];
  dateStr: string;
  prefs: PlanPrefs;
  now: number;
}