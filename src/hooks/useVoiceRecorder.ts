import { useCallback, useEffect, useRef, useState } from 'react';
import type { MicPermission, RecorderStatus } from '../types';

const PREFERRED_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

function describeError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Microphone access was blocked. Allow it in your browser’s site settings, or continue with text.';
    case 'NotFoundError':
      return 'No microphone was found. Connect one, or continue with text.';
    case 'NotReadableError':
      return 'The microphone is in use by another application or could not be opened.';
    case 'OverconstrainedError':
      return 'The microphone does not support the requested audio settings.';
    default:
      return 'Could not start recording. Please try again, or continue with text.';
  }
}

export interface RecordingResult {
  blob: Blob;
  seconds: number;
}

export function useVoiceRecorder() {
  const supported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined';

  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<MicPermission>('unknown');

  const statusRef = useRef<RecorderStatus>('idle');
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const startedAtRef = useRef(0);

  const updateStatus = useCallback((s: RecorderStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  // Track the browser's microphone permission state where supported.
  useEffect(() => {
    let cancelled = false;
    let perm: PermissionStatus | undefined;
    navigator.permissions
      ?.query({ name: 'microphone' as PermissionName })
      .then((p) => {
        if (cancelled) return;
        perm = p;
        const sync = () => setPermission(p.state as MicPermission);
        sync();
        p.onchange = sync;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (perm) perm.onchange = null;
    };
  }, []);

  const teardown = useCallback(() => {
    window.clearInterval(timerRef.current);
    timerRef.current = undefined;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    analyserRef.current = null;
    dataRef.current = null;
    recorderRef.current = null;
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (statusRef.current === 'recording' || statusRef.current === 'requesting') return false;
    setError(null);
    if (!supported) {
      setError('This browser does not support microphone recording. Please use text instead.');
      updateStatus('error');
      return false;
    }
    updateStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      setPermission('granted');

      const mimeType = PREFERRED_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = rec;

      // Audio level analysis (optional: recording still works without it)
      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          ctxRef.current = ctx;
          analyserRef.current = analyser;
          dataRef.current = new Uint8Array(analyser.fftSize);
        }
      } catch {
        /* level meter unavailable */
      }

      rec.start(250);
      startedAtRef.current = Date.now();
      setSeconds(0);
      timerRef.current = window.setInterval(
        () => setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000)),
        500,
      );
      updateStatus('recording');
      return true;
    } catch (err) {
      teardown();
      if (err instanceof DOMException && err.name === 'NotAllowedError') setPermission('denied');
      setError(describeError(err));
      updateStatus('error');
      return false;
    }
  }, [supported, teardown, updateStatus]);

  const stop = useCallback((): Promise<RecordingResult | null> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === 'inactive') {
        resolve(null);
        return;
      }
      const elapsed = Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000));
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        teardown();
        setSeconds(0);
        updateStatus('idle');
        resolve(blob.size > 0 ? { blob, seconds: elapsed } : null);
      };
      rec.stop();
    });
  }, [teardown, updateStatus]);

  const cancel = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.onstop = null;
      rec.stop();
    }
    teardown();
    setSeconds(0);
    updateStatus('idle');
  }, [teardown, updateStatus]);

  /** 0..1 live microphone level; 0 when not recording. */
  const getLevel = useCallback((): number => {
    const analyser = analyserRef.current;
    const data = dataRef.current;
    if (!analyser || !data) return 0;
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / data.length) * 3.2);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    if (statusRef.current === 'error') updateStatus('idle');
  }, [updateStatus]);

  const isRecording = useCallback(() => statusRef.current === 'recording', []);

  useEffect(() => cancel, [cancel]);

  return {
    supported,
    status,
    seconds,
    error,
    permission,
    start,
    stop,
    cancel,
    getLevel,
    clearError,
    isRecording,
  };
}