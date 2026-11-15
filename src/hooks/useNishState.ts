import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVoiceRecorder } from './useVoiceRecorder';
import { checkBackendHealth, sendMessage, type BackendHealth } from '../services/aiService';
import { transcribeAudio } from '../services/voiceService';
import { BackendError, isBackendConfigured } from '../services/supabaseClient';
import { callExtension, onExtensionEvent, pingExtension, runBrowserAction } from '../services/chromeBridge';
import * as speech from '../services/speechService';
import { formatBytes, formatDuration, uid } from '../lib/format';
import * as cloud from '../services/historyService';
import type {
  BackendStatus,
  ConnectorStatus,
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

// Hands-free recording (keyboard shortcut) tuning
const VAD_THRESHOLD = 0.1; // microphone level that counts as speech (0..1)
const VAD_SILENCE_MS = 1600; // stop this long after you stop talking
const VAD_NO_SPEECH_MS = 7000; // give up if nothing is said
const VAD_MAX_MS = 45000; // hard limit

// True when the page was opened by the global shortcut (the extension adds #listen).
const OPENED_BY_HOTKEY = typeof window !== 'undefined' && window.location.hash === '#listen';

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

export function useNishState(settings: Settings, userId: string | null = null) {
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const recorder = useVoiceRecorder();

  /* ---------------- Internet connection ---------------- */
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const onlineRef = useRef(online);
  onlineRef.current = online;
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  /* ---------------- Chrome connector ---------------- */
  const [chromeLink, setChromeLink] = useState<{ status: ConnectorStatus; version?: string; shortcut?: string }>({
    status: 'checking',
  });
  const chromeLinkRef = useRef(chromeLink);
  chromeLinkRef.current = chromeLink;

  const checkChrome = useCallback(async () => {
    const r = await pingExtension();
    if (!r.connected) {
      setChromeLink({ status: 'not-detected' });
      return;
    }
    const s = await callExtension({ type: 'get_shortcut' }, 2000);
    setChromeLink({ status: 'connected', version: r.version, shortcut: s.ok ? (s.shortcut ?? '') : undefined });
  }, []);

  useEffect(() => {
    void checkChrome();
    const onFocus = () => void checkChrome();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [checkChrome]);

    /* ---------------- Conversations (saved to your account when signed in) ---------------- */
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
  
    // Cloud sync status (shown on the History page)
    const [sync, setSync] = useState<{ status: 'off' | 'synced' | 'error'; error: string | null }>({
      status: 'off',
      error: null,
    });
    const syncOk = useCallback(() => setSync({ status: 'synced', error: null }), []);
    const syncFail = useCallback((err: unknown) => {
      console.warn('NISH sync failed', err);
      setSync({
        status: 'error',
        error: err instanceof Error ? err.message : 'Could not save to your account.',
      });
    }, []);
    const cloudOn = useCallback(() => Boolean(userIdRef.current) && !settingsRef.current.demoMode, []);
  
    const persistMessage = useCallback(
      (convId: string, msg: Message) => {
        if (!cloudOn() || msg.isError) return;
        const conv = convRef.current.find((c) => c.id === convId);
        if (!conv) return;
        void (async () => {
          try {
            await cloud.upsertConversation(conv);
            await cloud.insertMessage(convId, msg);
            syncOk();
          } catch (err) {
            syncFail(err);
          }
        })();
      },
      [cloudOn, syncOk, syncFail],
    );
  
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
        persistMessage(convId, msg);
      },
      [mutate, persistMessage],
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
        if (patch.content !== undefined && cloudOn()) {
          const conv = convRef.current.find((c) => c.id === convId);
          void (async () => {
            try {
              if (conv) await cloud.upsertConversation(conv); // keeps the saved title in step
              await cloud.patchMessage(msgId, patch.content as string);
              syncOk();
            } catch (err) {
              syncFail(err);
            }
          })();
        }
      },
      [mutate, cloudOn, syncOk, syncFail],
    );
  
    const addNotice = useCallback(
      (content: string) => {
        appendMessage(activeRef.current, {
          id: uid(),
          role: 'assistant',
          content,
          timestamp: Date.now(),
          isError: true,
        });
      },
      [appendMessage],
    );
  
    // A different person signed in (or out): never mix their conversations with the previous person's.
    const prevUser = useRef<string | null>(userId);
    useEffect(() => {
      if (prevUser.current && prevUser.current !== userId) {
        const c = createConversation();
        convRef.current = [c];
        setConvState([c]);
        activeRef.current = c.id;
        setActiveIdState(c.id);
      }
      prevUser.current = userId;
    }, [userId]);
  
    // Load saved conversations once signed in (backend mode).
    useEffect(() => {
      if (!userId || settings.demoMode) {
        setSync({ status: 'off', error: null });
        return;
      }
      let cancelled = false;
      (async () => {
        try {
          const saved = await cloud.fetchConversations();
          if (cancelled) return;
          mutate((local) => {
            const known = new Set(local.map((c) => c.id));
            return [...local, ...saved.filter((c) => !known.has(c.id) && c.messages.length > 0)];
          });
          syncOk();
        } catch (err) {
          if (!cancelled) syncFail(err);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [userId, settings.demoMode, mutate, syncOk, syncFail]);

  /* ---------------- Spoken replies ---------------- */
  const [playback, setPlayback] = useState<{ status: PlaybackStatus; error: string | null }>({
    status: 'idle',
    error: null,
  });
  const playbackRef = useRef(playback);
  playbackRef.current = playback;
  const speakTimer = useRef<number | undefined>(undefined);

  const stopSpeech = useCallback(() => {
    window.clearTimeout(speakTimer.current);
    speech.stopBrowserSpeech();
    if (chromeLinkRef.current.status === 'connected') void callExtension({ type: 'stop_speaking' }, 1500);
    setPlayback({ status: 'idle', error: null });
  }, []);

  const speakText = useCallback(async (text: string) => {
    const s = settingsRef.current;
    const clean = text.trim();
    if (!clean) return;
    window.clearTimeout(speakTimer.current);
    setPlayback({ status: 'loading', error: null });

    // Safety net: some voices send no "finished" event, so reset the player after an estimated duration.
    const armTimer = () => {
      window.clearTimeout(speakTimer.current);
      speakTimer.current = window.setTimeout(
        () => setPlayback((p) => (p.status === 'playing' ? { status: 'ready', error: null } : p)),
        Math.min(180000, 8000 + clean.length * 90),
      );
    };

    if (chromeLinkRef.current.status === 'connected') {
      speech.stopBrowserSpeech();
      const r = await callExtension(
        { type: 'speak', text: clean, voice: s.preferredVoice, rate: s.speechSpeed },
        4000,
      );
      if (!r.ok) {
        setPlayback({ status: 'error', error: r.error ?? 'Could not start speech.' });
        return;
      }
      setPlayback({ status: 'playing', error: null });
      armTimer();
      return;
    }

    speech.speakInBrowser(
      clean,
      { voice: s.preferredVoice, rate: s.speechSpeed },
      {
        onStart: () => {
          setPlayback({ status: 'playing', error: null });
          armTimer();
        },
        onEnd: () => {
          window.clearTimeout(speakTimer.current);
          setPlayback({ status: 'ready', error: null });
        },
        onError: (message) => {
          window.clearTimeout(speakTimer.current);
          setPlayback({ status: 'error', error: message });
        },
      },
    );
  }, []);

  const togglePlayback = useCallback(() => {
    const st = playbackRef.current.status;
    if (st === 'loading') return;
    const viaExtension = chromeLinkRef.current.status === 'connected';
    if (st === 'playing') {
      if (viaExtension) void callExtension({ type: 'pause_speaking' }, 1500);
      else speech.pauseBrowserSpeech();
      setPlayback({ status: 'paused', error: null });
      return;
    }
    if (st === 'paused') {
      if (viaExtension) void callExtension({ type: 'resume_speaking' }, 1500);
      else speech.resumeBrowserSpeech();
      setPlayback({ status: 'playing', error: null });
      return;
    }
    const conv = convRef.current.find((c) => c.id === activeRef.current);
    const last = [...(conv?.messages ?? [])].reverse().find((m) => m.role === 'assistant' && !m.isError);
    if (last) void speakText(last.content);
  }, [speakText]);

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
        const res = await sendMessage(conv.messages, {
          demo: settingsRef.current.demoMode,
          browser: chromeLinkRef.current.status === 'connected',
        });
        stopSpeech();
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
        if (s.voiceEnabled && s.speakReplies) void speakText(res.reply);

        if (res.actions && res.actions.length > 0) {
          for (const action of res.actions.slice(0, 3)) {
            const out = await runBrowserAction(action);
            if (!out.ok) {
              appendMessage(convId, {
                id: uid(),
                role: 'assistant',
                content: `Chrome action failed: ${out.error ?? 'unknown error'}`,
                timestamp: Date.now(),
                isError: true,
              });
            }
          }
        }
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
    [appendMessage, stopSpeech, speakText],
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

  /* ---------------- Recording flow (tap, push-to-talk and hotkey) ---------------- */
  const vadRef = useRef<number | undefined>(undefined);
  const stopVad = useCallback(() => {
    window.clearInterval(vadRef.current);
    vadRef.current = undefined;
  }, []);
  const stopRecordingRef = useRef<() => Promise<void>>(async () => {});

  // Watches the microphone level and stops by itself when you finish talking.
  const startVad = useCallback(() => {
    stopVad();
    const began = Date.now();
    let heard = false;
    let lastVoice = began;
    vadRef.current = window.setInterval(() => {
      if (!recorder.isRecording()) {
        stopVad();
        return;
      }
      const now = Date.now();
      if (recorder.getLevel() > VAD_THRESHOLD) {
        heard = true;
        lastVoice = now;
      }
      if (heard && now - lastVoice > VAD_SILENCE_MS) {
        stopVad();
        void stopRecordingRef.current();
      } else if (!heard && now - began > VAD_NO_SPEECH_MS) {
        stopVad();
        recorder.cancel();
        addNotice('I did not hear anything, so I stopped listening. Press the shortcut again when you are ready.');
      } else if (now - began > VAD_MAX_MS) {
        stopVad();
        void stopRecordingRef.current();
      }
    }, 100);
  }, [recorder.isRecording, recorder.getLevel, recorder.cancel, stopVad, addNotice]);

  const startRecording = useCallback(
    async (auto = false): Promise<boolean> => {
      const s = settingsRef.current;
      if (!s.voiceEnabled || s.interactionMode === 'text-only' || processingRef.current) return false;
      if (!onlineRef.current) {
        addNotice(
          'You appear to be offline. NISH needs an internet connection for voice and AI answers. Check your Wi-Fi and try again.',
        );
        return false;
      }
      stopSpeech(); // talking over NISH interrupts it
      const ok = await recorder.start();
      if (ok && auto) startVad();
      return ok;
    },
    [recorder.start, stopSpeech, startVad, addNotice],
  );

  const stopRecording = useCallback(async () => {
    stopVad();
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
  }, [recorder.stop, stopVad, appendMessage, updateMessage, runAssistant]);
  stopRecordingRef.current = stopRecording;

  const toggleRecording = useCallback(async () => {
    if (recorder.isRecording()) await stopRecording();
    else await startRecording(false);
  }, [recorder.isRecording, startRecording, stopRecording]);

  // Push-to-talk: hold to record, release to send.
  const holdRef = useRef(false);
  const pushStart = useCallback(async () => {
    holdRef.current = true;
    const ok = await startRecording(false);
    if (ok && !holdRef.current) await stopRecording(); // released during permission prompt
  }, [startRecording, stopRecording]);
  const pushEnd = useCallback(async () => {
    holdRef.current = false;
    if (recorder.isRecording()) await stopRecording();
  }, [recorder.isRecording, stopRecording]);

  // Global keyboard shortcut (sent by the Chrome extension): start listening, or send if already recording.
  const [hotkeyPulse, setHotkeyPulse] = useState(0);
  const handleHotkey = useCallback(async () => {
    setHotkeyPulse((n) => n + 1);
    if (recorder.isRecording()) {
      await stopRecordingRef.current();
      return;
    }
    await startRecording(true);
  }, [recorder.isRecording, startRecording]);
  const handleHotkeyRef = useRef(handleHotkey);
  handleHotkeyRef.current = handleHotkey;

  /* ---------------- Conversation management ---------------- */
  const newConversation = useCallback(() => {
    stopSpeech();
    const active = convRef.current.find((c) => c.id === activeRef.current);
    if (active && active.messages.length === 0) return;
    const c = createConversation();
    mutate((l) => [c, ...l]);
    setActive(c.id);
  }, [mutate, setActive, stopSpeech]);

  const selectConversation = useCallback(
    (id: string) => {
      stopSpeech();
      setActive(id);
    },
    [setActive, stopSpeech],
  );

  const deleteConversation = useCallback(
    (id: string) => {
      let next = convRef.current.filter((c) => c.id !== id);
      if (next.length === 0) next = [createConversation()];
      convRef.current = next;
      setConvState(next);
      if (activeRef.current === id) {
        stopSpeech();
        setActive(next[0].id);
      }
      if (cloudOn()) void cloud.removeConversation(id).then(syncOk).catch(syncFail);
    },
    [stopSpeech, setActive, cloudOn, syncOk, syncFail],
  );

  const clearConversations = useCallback(() => {
    stopSpeech();
    const c = createConversation();
    convRef.current = [c];
    setConvState([c]);
    setActive(c.id);
    if (cloudOn()) void cloud.removeAllConversations().then(syncOk).catch(syncFail);
  }, [stopSpeech, setActive, cloudOn, syncOk, syncFail]);

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

  /* ---------------- Events from the Chrome extension ---------------- */
  useEffect(() => {
    return onExtensionEvent((e) => {
      if (e.event === 'hotkey') {
        void handleHotkeyRef.current();
        return;
      }
      switch (e.state) {
        case 'start':
          setPlayback({ status: 'playing', error: null });
          break;
        case 'end':
          window.clearTimeout(speakTimer.current);
          setPlayback({ status: 'ready', error: null });
          break;
        case 'stopped':
          setPlayback((p) => (p.status === 'playing' || p.status === 'paused' ? { status: 'ready', error: null } : p));
          break;
        case 'error':
          window.clearTimeout(speakTimer.current);
          setPlayback({ status: 'error', error: e.message ?? 'Speech failed.' });
          break;
      }
    });
  }, []);

  // Page opened by the shortcut: start listening once it has loaded.
  const listenHandled = useRef(false);
  useEffect(() => {
    if (!OPENED_BY_HOTKEY) return;
    const t = window.setTimeout(() => {
      if (listenHandled.current) return;
      listenHandled.current = true;
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      void handleHotkeyRef.current();
    }, 600);
    return () => window.clearTimeout(t);
  }, []);

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
    const system: StatusInfo = !online
      ? { label: 'NO INTERNET', tone: 'bad' }
      : backendStatus === 'online'
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
    online,
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
      window.clearTimeout(speakTimer.current);
      window.clearInterval(vadRef.current);
      speech.stopBrowserSpeech();
    },
    [],
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
    online,
    // voice
    recorder,
    toggleRecording,
    pushStart,
    pushEnd,
    playback,
    togglePlayback,
    stopSpeech,
    hotkeyPulse,
    // memory
    memory,
    addMemory,
    removeMemory,
    clearMemory,
    clearSession,
    // cloud sync
    syncStatus: sync.status,
    syncError: sync.error,
    // chrome connector
    chromeStatus: chromeLink.status,
    chromeVersion: chromeLink.version,
    chromeShortcut: chromeLink.shortcut,
    checkChrome,
    // backend
    backendStatus,
    backendVerify: verify,
    health,
    healthError,
    checkBackend,
  };
}