import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PlanDraft, PlanPrefs, PlanSnapshot } from '../types';
import { callExtension, onExtensionEvent } from '../services/chromeBridge';
import { planLink } from '../services/planLink';
import { useSettings } from './SettingsContext';

export type PlanLinkStatus = 'loading' | 'ready' | 'unavailable' | 'outdated';

interface PlanApi {
  status: PlanLinkStatus;
  snapshot: PlanSnapshot | null;
  refresh: () => Promise<void>;
  /** Each returns an error message, or null on success. */
  add: (items: PlanDraft[]) => Promise<string | null>;
  remove: (id: string) => Promise<string | null>;
  setStatus: (id: string, date: string, status: 'done' | 'skipped' | 'pending') => Promise<string | null>;
  setPrefs: (p: Partial<Pick<PlanPrefs, 'speak' | 'defaultLead'>>) => Promise<string | null>;
  test: () => Promise<string | null>;
}

const PlanContext = createContext<PlanApi | null>(null);
const pad = (n: number) => String(n).padStart(2, '0');

export function PlanProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [status, setStatus] = useState<PlanLinkStatus>('loading');
  const [snapshot, setSnapshot] = useState<PlanSnapshot | null>(null);
  const snapRef = useRef<PlanSnapshot | null>(null);

  const refresh = useCallback(async () => {
    const r = await callExtension({ type: 'plan_get' }, 2500);
    if (r.ok && r.snapshot) {
      snapRef.current = r.snapshot;
      setSnapshot(r.snapshot);
      setStatus('ready');
      return;
    }
    const silent = (r.error ?? '').includes('did not respond');
    setStatus((prev) => (prev === 'ready' && silent ? prev : silent ? 'unavailable' : 'outdated'));
  }, []);

  const call = useCallback(
    async (payload: Record<string, unknown>): Promise<string | null> => {
      const r = await callExtension(payload, 6000);
      await refresh();
      return r.ok ? null : (r.error ?? 'Something went wrong.');
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
    const unsubscribe = onExtensionEvent((e) => {
      if (e.event === 'plan') void refresh();
    });
    const again = () => void refresh();
    window.addEventListener('focus', again);
    window.addEventListener('online', again);
    const id = window.setInterval(again, 60000);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', again);
      window.removeEventListener('online', again);
      window.clearInterval(id);
    };
  }, [refresh]);

  // Keep the reminder voice in step with the Voice settings.
  useEffect(() => {
    if (status !== 'ready') return;
    void callExtension({ type: 'plan_prefs', voice: settings.preferredVoice, rate: settings.speechSpeed }, 3000);
  }, [status, settings.preferredVoice, settings.speechSpeed]);

  // What NISH is told with every message: the time, and today's plan.
  const getContext = useCallback(() => {
    const d = new Date();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    let text = `Current local time for the user: ${stamp} (${d.toLocaleDateString('en-US', { weekday: 'long' })}, timezone ${tz}).`;
    const snap = snapRef.current;
    if (snap) {
      if (snap.today.length === 0) {
        text += "\nToday's plan: empty.";
      } else {
        const lines = snap.today.map(
          (o) => `- ${o.start} ${o.title}${o.dur ? ` (${o.dur} min)` : ''}${o.nn ? ' [non-negotiable]' : ''} - ${o.state}`,
        );
        text += `\nToday's plan:\n${lines.join('\n')}`;
      }
    }
    return text.slice(0, 3000);
  }, []);

  useEffect(() => {
    planLink.getContext = getContext;
    planLink.refresh = refresh;
  }, [getContext, refresh]);

  const value = useMemo<PlanApi>(
    () => ({
      status,
      snapshot,
      refresh,
      add: (items) => call({ type: 'add_plan_items', items }),
      remove: (id) => call({ type: 'plan_remove', id }),
      setStatus: (id, date, s) => call({ type: 'plan_status', id, date, status: s }),
      setPrefs: (p) => call({ type: 'plan_prefs', ...p }),
      test: async () => {
        const r = await callExtension({ type: 'plan_test' }, 6000);
        return r.ok ? null : (r.error ?? 'Could not send the test reminder.');
      },
    }),
    [status, snapshot, refresh, call],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanApi {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used inside PlanProvider');
  return ctx;
}