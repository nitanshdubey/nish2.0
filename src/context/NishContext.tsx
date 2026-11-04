import { createContext, useContext, type ReactNode } from 'react';
import { useNishState } from '../hooks/useNishState';
import { useSettings } from './SettingsContext';

type NishApi = ReturnType<typeof useNishState>;
const NishContext = createContext<NishApi | null>(null);

export function NishProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const api = useNishState(settings);
  return <NishContext.Provider value={api}>{children}</NishContext.Provider>;
}

export function useNish(): NishApi {
  const ctx = useContext(NishContext);
  if (!ctx) throw new Error('useNish must be used inside NishProvider');
  return ctx;
}