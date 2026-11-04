# NISH — Personal AI Desktop Assistant (frontend v0.1)

React + TypeScript + Vite + Tailwind + Framer Motion + Lucide.

## Run
```bash
npm install
npm run dev      # development
npm run build    # type-check + production build (outputs dist/)
```

## Deploy (GitHub → Cloudflare Pages)
Build command: `npm run build` · Output directory: `dist`
Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables.

## Modes
- **Demo mode (default):** text works, replies are clearly labelled samples, microphone
  permission/recording works, nothing is sent anywhere.
- **Backend mode:** turn demo off (top bar or Settings → AI). Requests go to Supabase
  Edge Functions. If env vars are missing, NISH shows an error instead of faking success.

## Backend contract (Supabase Edge Functions, all POST)
| Function          | Request                                   | Response            |
|-------------------|-------------------------------------------|---------------------|
| `nish-health`     | `{}`                                      | `{ ok: true, openai: boolean }` |
| `nish-chat`       | `{ messages: [{ role, content }] }`       | `{ reply: string }` |
| `nish-transcribe` | multipart form, field `audio`             | `{ text: string }`  |
| `nish-tts`        | `{ text, voice, speed }`                  | audio bytes (`audio/*`) |

The OpenAI key lives only in Supabase secrets, never in frontend code.

## Not possible from a website (by design, not simulated)
Global system-wide shortcut, Windows app control, Chrome tab access. These need a
future local connector / Chrome extension. The UI shows them as not installed.

## Structure
`src/components` UI · `src/pages` views · `src/services` backend layer ·
`src/hooks` recorder + app state · `src/context` providers · `src/lib` helpers.