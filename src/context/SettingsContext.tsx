import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Settings } from '../types';

export const DEFAULT_SETTINGS: Settings = {
  darkMode: true,
  accent: 'blue',
  animationIntensity: 'medium',
  voiceEnabled: true,
  preferredVoice: 'male',
  speechSpeed: 1,
  autoPlay: false,
  interactionMode: 'voice-text',
  pushToTalk: false,
  activationShortcut: 'Ctrl + Space',
  demoMode: true,
  memoryEnabled: true,
};

// Only harmless UI preferences are stored. No secrets, ever.
const STORAGE_KEY = 'nish.settings.v1';

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* ignore corrupted or unavailable storage */
  }
  return DEFAULT_SETTINGS;
}

interface SettingsApi {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsApi | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable */
    }
    const root = document.documentElement;
    root.dataset.theme = settings.darkMode ? 'dark' : 'light';
    root.dataset.accent = settings.accent;
    root.dataset.anim = settings.animationIntensity;
  }, [settings]);

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);
  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsApi {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}