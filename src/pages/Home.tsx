import { AlertTriangle } from 'lucide-react';
import { useNish } from '../context/NishContext';
import { useSettings } from '../context/SettingsContext';
import VoiceVisualizer from '../components/visualizer/VoiceVisualizer';
import MicrophoneButton from '../components/voice/MicrophoneButton';
import AudioPlayer from '../components/voice/AudioPlayer';
import StatusPanel from '../components/dashboard/StatusPanel';
import ChatPanel from '../components/conversation/ChatPanel';
import { Banner } from '../components/ui/Primitives';

export default function Home() {
  const nish = useNish();
  const { settings } = useSettings();
  const { recorder } = nish;

  const processing = nish.phase === 'processing';
  const voiceOff = !settings.voiceEnabled || settings.interactionMode === 'text-only';
  const micDisabled = voiceOff || !recorder.supported || processing;

  const micHint = voiceOff
    ? settings.interactionMode === 'text-only'
      ? 'TEXT-ONLY MODE'
      : 'VOICE DISABLED IN SETTINGS'
    : !recorder.supported
      ? 'RECORDING UNSUPPORTED IN THIS BROWSER'
      : recorder.status === 'requesting'
        ? 'WAITING FOR PERMISSION…'
        : settings.pushToTalk
          ? 'HOLD TO SPEAK'
          : 'TAP TO SPEAK';

  const hasReply = nish.activeConversation.messages.some((m) => m.role === 'assistant' && !m.isError);
  const audioReason = !settings.voiceEnabled
    ? 'Voice responses are disabled in Settings.'
    : settings.demoMode
      ? 'Demo mode: no speech audio is generated.'
      : !hasReply
        ? 'Waiting for a response to read aloud.'
        : undefined;

  return (
    <div className="grid flex-1 gap-4 p-3 sm:p-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:grid-rows-[minmax(0,1fr)]">
      <section
        aria-label="NISH interaction"
        className="hud-grid hud-corners relative flex min-h-[600px] flex-col items-center justify-between gap-4 overflow-hidden rounded-xl border border-line bg-base2/40 p-4 lg:min-h-0"
      >
        <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center gap-4">
          <VoiceVisualizer
            state={nish.nishState}
            intensity={settings.animationIntensity}
            getLevel={recorder.getLevel}
          />

          <MicrophoneButton
            status={recorder.status}
            seconds={recorder.seconds}
            disabled={micDisabled}
            pushToTalk={settings.pushToTalk}
            hint={micHint}
            onToggle={() => void nish.toggleRecording()}
            onPressStart={() => void nish.pushStart()}
            onPressEnd={() => void nish.pushEnd()}
          />

          {recorder.error && (
            <div className="w-full max-w-sm">
              <Banner tone="bad" icon={AlertTriangle} onDismiss={recorder.clearError}>
                {recorder.error}
              </Banner>
            </div>
          )}

          <AudioPlayer
            status={nish.playback.status}
            error={nish.playback.error}
            disabled={Boolean(audioReason)}
            disabledReason={audioReason}
            onToggle={nish.togglePlayback}
          />
        </div>

        <StatusPanel />
      </section>

      <ChatPanel
        title={nish.activeConversation.title}
        messages={nish.activeConversation.messages}
        processing={processing}
        inputDisabled={processing || recorder.status === 'recording' || recorder.status === 'requesting'}
        demo={settings.demoMode}
        onSend={(t) => void nish.sendText(t)}
      />
    </div>
  );
}