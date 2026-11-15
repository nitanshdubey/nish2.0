import { useState, type FormEvent } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Banner, btnGhost } from '../components/ui/Primitives';

export default function Login() {
  const { signIn } = useAuth();
  const { update } = useSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !email.trim() || !password) return;
    setBusy(true);
    setError(null);
    const err = await signIn(email, password);
    if (err) setError(err);
    setBusy(false);
  };

  return (
    <div className="grid h-full place-items-center overflow-y-auto p-4">
      <div className="hud-corners w-full max-w-sm rounded-xl border border-line bg-panel/80 p-6 shadow-panel">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent2 font-display text-base font-bold text-white shadow-glow">
            N
          </div>
          <div>
            <h1 className="font-display text-lg font-bold tracking-[0.3em]">NISH</h1>
            <p className="text-xs text-mute">Sign in to continue</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-xs text-mute">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-base2/80 px-3 py-2 text-sm focus:border-accent/60 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1 block text-xs text-mute">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-base2/80 px-3 py-2 text-sm focus:border-accent/60 focus:outline-none"
            />
          </div>

          {error && (
            <Banner tone="bad" icon={AlertTriangle}>
              {error}
            </Banner>
          )}

          <button
            type="submit"
            disabled={busy || !email.trim() || !password}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-accent to-accent2 px-3 py-2.5 text-sm font-medium text-white shadow-glow transition-opacity disabled:opacity-40 disabled:shadow-none"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </button>
        </form>

        <p className="mt-4 text-xs leading-relaxed text-mute">
          NISH is invite-only. Ask the owner for an account.
        </p>
        <button type="button" onClick={() => update('demoMode', true)} className={`${btnGhost} mt-3 w-full`}>
          Continue in demo mode
        </button>
      </div>
    </div>
  );
}