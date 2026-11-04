import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVoiceRecorder } from './useVoiceRecorder';
import { checkBackendHealth, sendMessage, type BackendHealth } from '../services/aiService';
import { generateVoiceResponse, transcribeAudio } from '../services/voiceService';
import { BackendError, isBackendConfigured } from '../services/supabaseClient';
import { formatBytes, formatDuration, uid } from '../lib/format';
import type {
  BackendStatus,
  Conversation,
  MemoryItem,
  Message,
  NishState,
  PlaybackStatus,
  Settings,
  StatusInfo,
} from '../types';

type Phase = 'idle' | 'processing' | 'responding';
type Verify = 'unverified' | 'checking' | 'online' | 'offline';

const createConversation = (): Conversation => {
  const now = Date.now();
  return { id: uid(), title: 'New conversation', createdAt: now, updatedAt: now, messages: [] };
};

const makeTitle = (text: string): string => {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 48 ? `${t.slice(0, 48)}…` : t || 'New conversation';
};

const errorText = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
};

export function useNishState(settings: Settings) {
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const recorder = useVoiceRecorder();

  /* ---------------- Conversations (session-only) ---------------- */
  const [conversations, setConvState] = useState<Conversation[]>(() => [createConversation()]);
  const convRef = useRef(conversations);
  const [activeId, setActiveIdState] = useState<string>(() => conversations[0].id);
  const activeRef = useRef(activeId);

  const mutate = useCallback((fn: (c: Conversation[]) => Conversation[]) => {
    convRef.current = fn(convRef.current);
    setConvState(convRef.current);
  }, []);

  const setActive = useCallback((id: string) => {
    activeRef.current = id;
    setActiveIdState(id);
  }, []);

  const appendMessage = useCallback(
    (convId: string, msg: Message) => {
      mutate((list) =>
        list.map((c) => {
          if (c.id !== convId) return c;
          const firstUser = msg.role === 'user' && !c.messages.some((m) => m.role === 'user');
          return {
            ...c,
            title: firstUser ? makeTitle(msg.content) : c.title,
            updatedAt: msg.timestamp,
            messages: [...c.messages, msg],
          };
        }),
      );
    },
    [mutate],
  );

  const updateMessage = useCallback(
    (convId: string, msgId: string, patch: Partial<Message>) => {
      mutate((list) =>
        list.map((c) => {
          if (c.id !== convId) return c;
          const title =
            patch.content && c.title.startsWith('Voice message') ? makeTitle(patch.content) : c.title;
          return { ...c, title, messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)) };
        }),
      );
    },
    [mutate],
  );

  /* ---------------- Voice playback ---------------- */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const [playback, setPlayback] = useState<{ status: PlaybackStatus; error: string | null }>({
    status: 'idle',
    error: null,
  });

  const releaseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onplay = null;
      audioRef.current.onpause = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setPlayback({ status: 'idle', error: null });
  }, []);

  const playBlob = useCallback(
    async (blob: Blob) => {
      releaseAudio();
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay = () => setPlayback({ status: 'playing', error: null });
      audio.onpause = () => {
        if (!audio.ended) setPlayback({ status: 'paused', error: null });
      };
      audio.onended = () => setPlayback({ status: 'ready', error: null });
      audio.onerror = () => setPlayback({ status: 'error', error: 'The audio could not be played.' });
      try {
        await audio.play();
      } catch {
        setPlayback({ status: 'error', error: 'Playback was blocked by the browser. Press play to retry.' });
      }
    },
    [releaseAudio],
  );

  const playText = useCallback(
    async (text: string) => {
      const s = settingsRef.current;
      setPlayback({ status: 'loading', error: null });
      try {
        const blob = await generateVoiceResponse(text, {
          voice: s.preferredVoice,
          speed: s.speechSpeed,
          demo: s.demoMode,
        });
        await playBlob(blob);
      } catch (err) {
        setPlayback({ status: 'error', error: errorText(err) });
      }
    },
    [playBlob],
  );

  const togglePlayback = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      if (a.paused) {
        if (a.ended) a.currentTime = 0;
        a.play().catch(() => setPlayback({ status: 'error', error: 'Playback was blocked by the browser.' }));
      } else {
        a.pause();
      }
      return;
    }
    const conv = convRef.current.find((c) => c.id === activeRef.current);
    const last = [...(conv?.messages ?? [])].reverse().find((m) => m.role === 'assistant' && !m.isError);
    if (last) void playText(last.content);
  }, [playText]);

  /* ---------------- Assistant processing ---------------- */
  const [phase, setPhase] = useState<Phase>('idle');
  const processingRef = useRef(false);
  const respondTimer = useRef<number | undefined>(undefined);

  const runAssistant = useCallback(
    async (convId: string) => {
      const conv = convRef.current.find((c) => c.id === convId);
      if (!conv) return;
      processingRef.current = true;
      setPhase('processing');
      try {
        const res = await sendMessage(conv.messages, { demo: settingsRef.current.demoMode });
        releaseAudio();
        appendMessage(convId, {
          id: uid(),
          role: 'assistant',
          content: res.reply,
          timestamp: Date.now(),
          isDemo: res.isDemo,
        });
        setPhase('responding');
        window.clearTimeout(respondTimer.current);
        respondTimer.current = window.setTimeout(
          () => setPhase('idle'),
          Math.min(4500, 1200 + res.reply.length * 18),
        );
        const s = settingsRef.current;
        if (!res.isDemo && s.voiceEnabled && s.autoPlay) void playText(res.reply);
      } catch (err) {
        appendMessage(convId, {
          id: uid(),
          role: 'assistant',
          content: errorText(err),
          timestamp: Date.now(),
          isError: true,
        });
        setPhase('idle');
      } finally {
        processingRef.current = false;
      }
    },
    [appendMessage, releaseAudio, playText],
  );

  const sendText = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || processingRef.current || recorder.isRecording()) return;
      const convId = activeRef.current;
      appendMessage(convId, { id: uid(), role: 'user', content: text, timestamp: Date.now() });
      await runAssistant(convId);
    },
    [appendMessage, runAssistant, recorder.isRecording],
  );

  /* ---------------- Recording flow ---------------- */
  const startRecording = useCallback(async (): Promise<boolean> => {
    const s = settingsRef.current;
    if (!s.voiceEnabled || s.interactionMode === 'text-only' || processingRef.current) return false;
    releaseAudio();
    return recorder.start();
  }, [recorder.start, releaseAudio]);

  const stopRecording = useCallback(async () => {
    const result = await recorder.stop();
    if (!result) return;
    const convId = activeRef.current;
    const msgId = uid();
    appendMessage(convId, {
      id: msgId,
      role: 'user',
      content: `Voice message · ${formatDuration(result.seconds)}`,
      timestamp: Date.now(),
      isVoice: true,
    });
    processingRef.current = true;
    setPhase('processing');
    try {
      const text = await transcribeAudio(result.blob, { demo: settingsRef.current.demoMode });
      if (!text) throw new BackendError('INVALID_RESPONSE', 'No speech was detected in the recording.');
      updateMessage(convId, msgId, { content: text });
      processingRef.current = false;
      await runAssistant(convId);
    } catch (err) {
      processingRef.current = false;
      const detail = `${formatDuration(result.seconds)}, ${formatBytes(result.blob.size)}`;
      const content =
        err instanceof BackendError && err.code === 'DEMO_MODE'
          ? `Voice captured (${detail}) but not transcribed. ${err.message}`
          : errorText(err);
      appendMessage(convId, { id: uid(), role: 'assistant', content, timestamp: Date.now(), isError: true });
      setPhase('idle');
    }
  }, [recorder.stop, appendMessage, updateMessage, runAssistant]);

  const toggleRecording = useCallback(async () => {
    if (recorder.isRecording()) await stopRecording();
    else await startRecording();
  }, [recorder.isRecording, startRecording, stopRecording]);

  // Push-to-talk: hold to record, release to send.
  const holdRef = useRef(false);
  const pushStart = useCallback(async () => {
    holdRef.current = true;
    const ok = await startRecording();
    if (ok && !holdRef.current) await stopRecording(); // released during permission prompt
  }, [startRecording, stopRecording]);
  const pushEnd = useCallback(async () => {
    holdRef.current = false;
    if (recorder.isRecording()) await stopRecording();
  }, [recorder.isRecording, stopRecording]);

  /* ---------------- Conversation management ---------------- */
  const newConversation = useCallback(() => {
    releaseAudio();
    const active = convRef.current.find((c) => c.id === activeRef.current);
    if (active && active.messages.length === 0) return;
    const c = createConversation();
    mutate((l) => [c, ...l]);
    setActive(c.id);
  }, [mutate, setActive, releaseAudio]);

  const selectConversation = useCallback(
    (id: string) => {
      releaseAudio();
      setActive(id);
    },
    [setActive, releaseAudio],
  );

  const deleteConversation = useCallback(
    (id: string) => {
      let next = convRef.current.filter((c) => c.id !== id);
      if (next.length === 0) next = [createConversation()];
      convRef.current = next;
      setConvState(next);
      if (activeRef.current === id) {
        releaseAudio();
        setActive(next[0].id);
      }
    },
    [releaseAudio, setActive],
  );

  const clearConversations = useCallback(() => {
    releaseAudio();
    const c = createConversation();
    convRef.current = [c];
    setConvState([c]);
    setActive(c.id);
  }, [releaseAudio, setActive]);

  /* ---------------- Memory (session-only) ---------------- */
  const [memory, setMemory] = useState<MemoryItem[]>([]);
  const addMemory = useCallback((kind: MemoryItem['kind'], text: string) => {
    const t = text.trim();
    if (!t) return;
    setMemory((m) => [{ id: uid(), kind, text: t, createdAt: Date.now() }, ...m]);
  }, []);
  const removeMemory = useCallback((id: string) => setMemory((m) => m.filter((i) => i.id !== id)), []);
  const clearMemory = useCallback(() => setMemory([]), []);
  const clearSession = useCallback(() => {
    clearConversations();
    clearMemory();
  }, [clearConversations, clearMemory]);

  /* ---------------- Backend verification ---------------- */
  const [verify, setVerify] = useState<Verify>('unverified');
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const checkBackend = useCallback(async () => {
    if (!isBackendConfigured) return;
    setVerify('checking');
    setHealthError(null);
    try {
      const h = await checkBackendHealth();
      setHealth(h);
      setVerify(h.ok ? 'online' : 'offline');
    } catch (err) {
      setHealth(null);
      setVerify('offline');
      setHealthError(errorText(err));
    }
  }, []);

  useEffect(() => {
    if (!settings.demoMode && isBackendConfigured) void checkBackend();
  }, [settings.demoMode, checkBackend]);

  const backendStatus: BackendStatus = settings.demoMode
    ? 'demo'
    : !isBackendConfigured
      ? 'not-configured'
      : verify;

  /* ---------------- Derived state ---------------- */
  const nishState: NishState =
    recorder.status === 'recording'
      ? 'listening'
      : phase === 'processing'
        ? 'processing'
        : phase === 'responding' || playback.status === 'playing'
          ? 'responding'
          : 'standby';

  const statuses = useMemo(() => {
    const system: StatusInfo =
      backendStatus === 'online'
        ? { label: 'ONLINE', tone: 'ok' }
        : backendStatus === 'checking'
          ? { label: 'CONNECTING', tone: 'busy' }
          : { label: 'OFFLINE', tone: backendStatus === 'offline' ? 'bad' : 'idle' };

    const aiMap: Record<BackendStatus, StatusInfo> = {
      demo: { label: 'DEMO MODE', tone: 'warn' },
      'not-configured': { label: 'NOT CONFIGURED', tone: 'idle' },
      unverified: { label: 'UNVERIFIED', tone: 'warn' },
      checking: { label: 'CHECKING', tone: 'busy' },
      online: { label: 'READY', tone: 'ok' },
      offline: { label: 'UNREACHABLE', tone: 'bad' },
    };

    let mic: StatusInfo;
    if (!settings.voiceEnabled || settings.interactionMode === 'text-only') mic = { label: 'DISABLED', tone: 'idle' };
    else if (!recorder.supported) mic = { label: 'UNSUPPORTED', tone: 'bad' };
    else if (recorder.status === 'recording') mic = { label: 'RECORDING', tone: 'busy' };
    else if (recorder.status === 'requesting') mic = { label: 'REQUESTING', tone: 'busy' };
    else if (recorder.permission === 'denied') mic = { label: 'BLOCKED', tone: 'bad' };
    else if (recorder.permission === 'granted') mic = { label: 'READY', tone: 'ok' };
    else mic = { label: 'NOT REQUESTED', tone: 'idle' };

    return { system, ai: aiMap[backendStatus], mic };
  }, [
    backendStatus,
    recorder.status,
    recorder.permission,
    recorder.supported,
    settings.voiceEnabled,
    settings.interactionMode,
  ]);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? conversations[0];

  useEffect(
    () => () => {
      window.clearTimeout(respondTimer.current);
      releaseAudio();
    },
    [releaseAudio],
  );

  return {
    // conversations
    conversations,
    activeId,
    activeConversation,
    newConversation,
    selectConversation,
    deleteConversation,
    clearConversations,
    sendText,
    // state
    phase,
    nishState,
    statuses,
    // voice
    recorder,
    toggleRecording,
    pushStart,
    pushEnd,
    playback,
    togglePlayback,
    // memory
    memory,
    addMemory,
    removeMemory,
    clearMemory,
    clearSession,
    // backend
    backendStatus,
    backendVerify: verify,
    health,
    healthError,
    checkBackend,
  };
}