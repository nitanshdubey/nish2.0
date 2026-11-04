export type PageId =
  | 'home'
  | 'history'
  | 'tools'
  | 'automations'
  | 'memory'
  | 'integrations'
  | 'settings';

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
  autoPlay: boolean;
  interactionMode: InteractionMode;
  pushToTalk: boolean;
  activationShortcut: ActivationShortcut;
  demoMode: boolean;
  memoryEnabled: boolean;
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