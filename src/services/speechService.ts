import type { VoicePreference } from '../types';

const MALE = /\b(male|david|mark|george|guy|ryan|james|richard|daniel|alex|ravi|prabhat|rishi|brian|christopher|eric|roger|sean)\b/i;
const FEMALE = /\b(female|zira|hazel|susan|heera|samantha|aria|jenny|libby|sonia|emma|michelle|linda|catherine|kalpana|swara)\b/i;
const HINDI = /[\u0900-\u097F]/;

export function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' code omitted. ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' link ')
    .replace(/[*_#>`~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function chunkText(text: string, max = 220): string[] {
  const sentences = text.match(/[^.!?।\n]+[.!?।]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if (cur && (cur + s).length > max) {
      chunks.push(cur.trim());
      cur = s;
    } else {
      cur += s;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  const out: string[] = [];
  for (const c of chunks) {
    if (c.length <= max * 2) out.push(c);
    else for (let i = 0; i < c.length; i += max) out.push(c.slice(i, i + max));
  }
  return out;
}

export function browserSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function pickBrowserVoice(pref: VoicePreference, text: string): SpeechSynthesisVoice | null {
  if (pref === 'system') return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const lang = HINDI.test(text) ? 'hi' : 'en';
  let pool = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
  if (!pool.length) pool = voices;
  const re = pref === 'male' ? MALE : FEMALE;
  const matches = pool.filter((v) => re.test(v.name));
  const best = matches.find((v) => v.lang.toLowerCase() === 'en-in') ?? matches[0];
  return best ?? pool.find((v) => v.lang.toLowerCase() === 'en-in') ?? pool[0] ?? null;
}

let browserToken = 0;

interface BrowserSpeechCallbacks {
  onStart: () => void;
  onEnd: () => void;
  onError: (message: string) => void;
}

/** Fallback voice used when the Chrome connector is not installed. Needs one click on the page first. */
export function speakInBrowser(
  text: string,
  opts: { voice: VoicePreference; rate: number },
  cb: BrowserSpeechCallbacks,
): void {
  if (!browserSpeechSupported()) {
    cb.onError('This browser cannot speak replies.');
    return;
  }
  const clean = cleanForSpeech(text).slice(0, 4000);
  if (!clean) {
    cb.onError('There was nothing to say.');
    return;
  }
  const synth = window.speechSynthesis;
  const token = ++browserToken;
  synth.cancel();

  const voice = pickBrowserVoice(opts.voice, clean);
  const chunks = chunkText(clean);
  chunks.forEach((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else if (HINDI.test(clean)) {
      u.lang = 'hi-IN';
    }
    u.rate = Math.min(2, Math.max(0.5, opts.rate));
    if (i === 0) u.onstart = () => token === browserToken && cb.onStart();
    if (i === chunks.length - 1) u.onend = () => token === browserToken && cb.onEnd();
    u.onerror = (ev) => {
      if (token !== browserToken) return;
      if (ev.error === 'interrupted' || ev.error === 'canceled') return;
      cb.onError(
        ev.error === 'not-allowed'
          ? 'Chrome blocks speech until you click somewhere on the page once. Click the page, then press play.'
          : `Speech error: ${ev.error}`,
      );
    };
    synth.speak(u);
  });
}

export function stopBrowserSpeech(): void {
  browserToken++;
  if (browserSpeechSupported()) window.speechSynthesis.cancel();
}
export function pauseBrowserSpeech(): void {
  if (browserSpeechSupported()) window.speechSynthesis.pause();
}
export function resumeBrowserSpeech(): void {
  if (browserSpeechSupported()) window.speechSynthesis.resume();
}