import type { VoicePreference } from '../types';
import { BackendError, callFunction } from './supabaseClient';

function extensionFor(type: string): string {
  if (type.includes('mp4')) return 'mp4';
  if (type.includes('ogg')) return 'ogg';
  return 'webm';
}

/** Sends recorded audio to a backend function for cloud transcription. */
export async function transcribeAudio(audio: Blob, opts: { demo: boolean }): Promise<string> {
  if (opts.demo) {
    throw new BackendError(
      'DEMO_MODE',
      'Transcription needs the NISH backend, and demo mode is on. The recording was discarded locally and nothing was uploaded. Use text input to talk to NISH.',
    );
  }
  const form = new FormData();
  form.append('audio', audio, `recording.${extensionFor(audio.type)}`);
  const res = await callFunction('nish-transcribe', { body: form });
  const data = (await res.json().catch(() => null)) as { text?: string } | null;
  if (!data || typeof data.text !== 'string') {
    throw new BackendError('INVALID_RESPONSE', 'The backend returned an invalid transcription.');
  }
  return data.text.trim();
}

/** Requests generated speech audio (cloud TTS) from the backend. */
export async function generateVoiceResponse(
  text: string,
  opts: { voice: VoicePreference; speed: number; demo: boolean },
): Promise<Blob> {
  if (opts.demo) {
    throw new BackendError(
      'DEMO_MODE',
      'Speech audio is not generated in demo mode. Connect the backend and turn off demo mode.',
    );
  }
  const res = await callFunction('nish-tts', {
    json: { text, voice: opts.voice, speed: opts.speed },
  });
  const blob = await res.blob();
  if (!blob.size || !blob.type.startsWith('audio')) {
    throw new BackendError('INVALID_RESPONSE', 'The backend did not return playable audio.');
  }
  return blob;
}