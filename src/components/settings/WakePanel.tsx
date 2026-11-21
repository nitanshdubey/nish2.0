import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Ear, Info } from 'lucide-react';
import { callExtension, type WakeStatus } from '../../services/chromeBridge';
import { useNish } from '../../context/NishContext';
import { Banner, Chip, Panel, Segmented, Toggle, btnGhost, btnPrimary } from '../ui/Primitives';
import type { StatusTone } from '../../types';

const STATE: Record<string, { label: string; tone: StatusTone }> = {
  off: { label: 'OFF', tone: 'idle' },
  'needs-permission': { label: 'NEEDS MICROPHONE PERMISSION', tone: 'warn' },
  starting: { label: 'STARTING…', tone: 'busy' },
  listening: { label: 'LISTENING FOR “WAKE UP NISH”', tone: 'ok' },
  paused: { label: 'PAUSED WHILE NISH IS ACTIVE', tone: 'busy' },
  denied: { label: 'MICROPHONE BLOCKED', tone: 'bad' },
  unsupported: { label: 'NOT SUPPORTED IN THIS MODE', tone: 'bad' },
  error: { label: 'ERROR', tone: 'bad' },
  stopped: { label: 'NOT RUNNING', tone: 'warn' },
};

export default function WakePanel() {
  const { chromeStatus } = useNish();
  const [wake, setWake] = useState<WakeStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const r = await callExtension({ type: 'wake_status' }, 2500);
    if (r.ok && r.wake) {
      setWake(r.wake);
      setErr(null);
    } else {
      setErr(r.error ?? 'Could not read the wake word status. Make sure the Chrome connector is version 0.4.0.');
    }
  }, []);

  useEffect(() => {
    if (chromeStatus !== 'connected') return;
    void refresh();
    const id = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(id);
  }, [chromeStatus, refresh]);

  const act = async (payload: Record<string, unknown>) => {
    const r = await callExtension(payload, 5000);
    if (!r.ok) setErr(r.error ?? 'That did not work.');
    await refresh();
  };

  if (chromeStatus !== 'connected') {
    return (
      <Panel title="Wake word" icon={Ear}>
        <Banner tone="warn" icon={Info}>
          The wake word runs inside the Chrome connector. Install or enable it, then refresh this page.
        </Banner>
      </Panel>
    );
  }

  const info = STATE[wake?.state ?? 'off'] ?? { label: (wake?.state ?? '').toUpperCase(), tone: 'idle' as StatusTone };

  return (
    <Panel title="Wake word" icon={Ear} action={<Chip tone={info.tone}>{info.label}</Chip>}>
      <Banner tone="warn" icon={Info}>
        Privacy: while this is on, Chrome streams microphone audio to Google’s speech service to recognise “Wake up
        NISH”. It needs internet and is off by default. Turn it off whenever you do not want it.
      </Banner>

      {err && (
        <div className="mt-3">
          <Banner tone="bad" icon={AlertTriangle} onDismiss={() => setErr(null)}>
            {err}
          </Banner>
        </div>
      )}

      <Toggle
        label="Wake up NISH"
        description="Say “Wake up NISH” and NISH opens on your screen and listens. You can add a command: “Wake up NISH, search for laptops.”"
        checked={Boolean(wake?.enabled)}
        onChange={(v) => {
          if (!v) void act({ type: 'wake_disable' });
          else if (!wake?.perm) void act({ type: 'wake_setup' });
          else void act({ type: 'wake_enable' });
        }}
      />

      {wake?.enabled && !wake.perm && (
        <button type="button" className={`${btnPrimary} mt-1`} onClick={() => void act({ type: 'wake_setup' })}>
          Allow microphone for wake word
        </button>
      )}
      {wake?.state === 'error' && wake.detail && (
        <p className="mt-2 text-xs text-rose-400">Last error: {wake.detail}. The wake word needs internet.</p>
      )}

      <Segmented
        label="Listener mode"
        value={wake?.mode ?? 'offscreen'}
        onChange={(m) => void act({ type: 'wake_mode', mode: m })}
        options={[
          { value: 'offscreen', label: 'Hidden (recommended)' },
          { value: 'tab', label: 'Pinned tab (fallback)' },
        ]}
      />
      <p className="text-xs leading-relaxed text-mute">
        If hidden mode shows “not supported” or never listens, switch to the pinned tab. That tab also shows what
        Chrome hears, which helps tune the wake phrase.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
        <button type="button" className={btnGhost} onClick={() => void act({ type: 'wake_trigger' })}>
          Test wake (no microphone needed)
        </button>
        {wake?.lastWakeAt ? (
          <span className="font-mono text-[10px] tracking-wider text-mute">
            LAST WAKE: {new Date(wake.lastWakeAt).toLocaleTimeString()}
          </span>
        ) : null}
      </div>
    </Panel>
  );
}