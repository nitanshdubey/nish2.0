import { Eraser, Info, Keyboard, Mic, RefreshCw, RotateCcw, Settings as SettingsIcon, Trash2 } from 'lucide-react';
import { useNish } from '../context/NishContext';
import { useSettings } from '../context/SettingsContext';
import { isBackendConfigured } from '../services/supabaseClient';
import {
  Banner,
  Chip,
  ConfirmButton,
  PageHeader,
  Panel,
  Segmented,
  Toggle,
  btnGhost,
} from '../components/ui/Primitives';
import { StatusDot } from '../components/ui/StatusIndicator';
import type { MicPermission } from '../types';

const PERMISSION_TEXT: Record<MicPermission, string> = {
  granted: 'Granted: NISH can record when you press the microphone button.',
  denied: 'Blocked: allow the microphone in your browser’s site settings (lock icon in the address bar), then retry.',
  prompt: 'Not yet requested: your browser will ask the first time you record.',
  unknown: 'Unknown: this browser does not report permission state. It will ask when you record.',
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/60 py-2.5 text-sm last:border-0">
      <span className="text-mute">{label}</span>
      <span className="flex items-center gap-2 text-right">{children}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, update, reset } = useSettings();
  const nish = useNish();
  const perm = nish.recorder.permission;

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        subtitle="Preferences are stored in this browser only. No secrets or credentials are ever saved."
        actions={
          <button type="button" onClick={reset} className={btnGhost}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Appearance">
          <Toggle
            label="Dark mode"
            description="Turn off for a light interface."
            checked={settings.darkMode}
            onChange={(v) => update('darkMode', v)}
          />
          <Segmented
            label="Accent color"
            value={settings.accent}
            onChange={(v) => update('accent', v)}
            options={[
              { value: 'blue', label: 'Electric blue' },
              { value: 'cyan', label: 'Cyan' },
              { value: 'violet', label: 'Violet' },
            ]}
          />
          <Segmented
            label="Animation intensity"
            value={settings.animationIntensity}
            onChange={(v) => update('animationIntensity', v)}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
          />
        </Panel>

        <Panel title="Voice">
          <Toggle
            label="Voice enabled"
            description="Enables the microphone and spoken responses."
            checked={settings.voiceEnabled}
            onChange={(v) => update('voiceEnabled', v)}
          />
          <Segmented
            label="Preferred voice"
            value={settings.preferredVoice}
            onChange={(v) => update('preferredVoice', v)}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'system', label: 'System default' },
            ]}
          />
          <div className="py-2.5">
            <div className="mb-2 flex justify-between text-sm">
              <label htmlFor="speech-speed">Speech speed</label>
              <span className="font-mono text-xs text-mute">{settings.speechSpeed.toFixed(2)}×</span>
            </div>
            <input
              id="speech-speed"
              type="range"
              min={0.75}
              max={1.5}
              step={0.05}
              value={settings.speechSpeed}
              onChange={(e) => update('speechSpeed', Number(e.target.value))}
              className="w-full"
              style={{ accentColor: 'rgb(var(--accent))' }}
            />
          </div>
          <Toggle
            label="Auto-play responses"
            description="Play spoken replies automatically (backend mode only)."
            checked={settings.autoPlay}
            onChange={(v) => update('autoPlay', v)}
          />
          <p className="mt-1 text-xs leading-relaxed text-mute">
            Voice choices are saved for the future text-to-speech backend. No speech audio is generated in demo mode.
          </p>
        </Panel>

        <Panel title="Interaction" icon={Keyboard}>
          <Segmented
            label="Input mode"
            value={settings.interactionMode}
            onChange={(v) => update('interactionMode', v)}
            options={[
              { value: 'voice-text', label: 'Voice + text' },
              { value: 'text-only', label: 'Text only' },
            ]}
          />
          <Toggle
            label="Push-to-talk"
            description="Hold the microphone button to record; release to send."
            checked={settings.pushToTalk}
            onChange={(v) => update('pushToTalk', v)}
          />
          <Segmented
            label="Activation shortcut"
            value={settings.activationShortcut}
            onChange={(v) => update('activationShortcut', v)}
            options={[
              { value: 'Ctrl + Space', label: 'Ctrl + Space' },
              { value: 'Ctrl + Alt + N', label: 'Ctrl + Alt + N' },
              { value: 'Alt + Space', label: 'Alt + Space' },
            ]}
          />
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Chip tone="idle">LOCAL CONNECTOR NOT INSTALLED</Chip>
            <span className="text-xs text-mute">
              A web page cannot register a system-wide shortcut. This setting is saved for the future connector.
            </span>
          </div>
        </Panel>

        <Panel title="AI">
          <Toggle
            label="Demo mode"
            description="On: sample replies, no network calls. Off: use the Supabase backend."
            checked={settings.demoMode}
            onChange={(v) => update('demoMode', v)}
          />
          <div className="mt-1">
            <Row label="Backend configuration">
              <Chip tone={isBackendConfigured ? 'ok' : 'idle'}>{isBackendConfigured ? 'ENV VARS FOUND' : 'NOT CONFIGURED'}</Chip>
            </Row>
            <Row label="Backend connection">
              <StatusDot tone={nish.statuses.system.tone} />
              {nish.statuses.system.label}
            </Row>
            <Row label="AI service">
              <StatusDot tone={nish.statuses.ai.tone} />
              {nish.statuses.ai.label}
            </Row>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={btnGhost}
              disabled={!isBackendConfigured || nish.backendVerify === 'checking'}
              onClick={() => void nish.checkBackend()}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${nish.backendVerify === 'checking' ? 'animate-spin' : ''}`} />
              Test connection
            </button>
            {!isBackendConfigured && (
              <span className="text-xs text-mute">Add the two VITE_SUPABASE_* variables to enable.</span>
            )}
          </div>
          {nish.healthError && <p className="mt-2 text-xs text-rose-400">{nish.healthError}</p>}
        </Panel>

        <Panel title="Privacy" icon={Mic} className="xl:col-span-2">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Microphone permission</p>
              <p className="mt-1 text-xs leading-relaxed text-mute">{PERMISSION_TEXT[perm]}</p>
              <p className="mt-2 text-xs leading-relaxed text-mute">
                Audio is recorded only while you hold or toggle the microphone. In demo mode it never leaves your device.
              </p>
            </div>
            <div className="space-y-3">
              <Toggle
                label="Memory enabled"
                description="Allow saving preferences and facts on the Memory page."
                checked={settings.memoryEnabled}
                onChange={(v) => update('memoryEnabled', v)}
              />
              <div className="flex flex-wrap gap-2">
                <ConfirmButton
                  label="Clear conversation history"
                  confirmLabel="Confirm clear history"
                  icon={Eraser}
                  onConfirm={nish.clearConversations}
                />
                <ConfirmButton
                  label="Clear session"
                  confirmLabel="Confirm clear session"
                  icon={Trash2}
                  onConfirm={nish.clearSession}
                />
              </div>
              <Banner tone="idle" icon={Info}>
                “Clear session” removes conversations, memory entries and loaded audio. Saved settings are kept.
              </Banner>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}