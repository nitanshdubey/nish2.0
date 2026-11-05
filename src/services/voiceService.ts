import type { VoicePreference } from '../types';
import { toWav16k } from '../lib/audioWav';
import { BackendError, callFunction } from './supabaseClient';

/** Converts the recording to WAV, then sends it to the backend for transcription. */
export async function transcribeAudio(audio: Blob, opts: { demo: boolean }): Promise<string> {
  if (opts.demo) {
    throw new BackendError(
      'DEMO_MODE',
      'Transcription needs the NISH backend, and demo mode is on. The recording was discarded locally and nothing was uploaded. Use text input to talk to NISH.',
    );
  }

  let wav: Blob;
  try {
    wav = await toWav16k(audio);
  } catch {
    throw new BackendError(
      'INVALID_RESPONSE',
      'Could not process the recording on this device. Please try again, or use text.',
    );
  }

  const form = new FormData();
  form.append('audio', wav, 'recording.wav');
  const res = await callFunction('nish-transcribe', { body: form });
  const data = (await res.json().catch(() => null)) as { text?: string } | null;
  if (!data || typeof data.text !== 'string') {
    throw new BackendError('INVALID_RESPONSE', 'The backend returned an invalid transcription.');
  }
  return data.text.trim();
}

/** Requests generated speech audio (cloud TTS) from the backend. Not built yet. */
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