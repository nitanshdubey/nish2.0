import { AppWindow, CalendarDays, Database, Globe, Info, Mail, Monitor, Plug, Sparkles, Workflow } from 'lucide-react';
import { useNish } from '../context/NishContext';
import { isBackendConfigured } from '../services/supabaseClient';
import IntegrationCard from '../components/integrations/IntegrationCard';
import { Banner, Chip, PageHeader, Panel } from '../components/ui/Primitives';
import type { IntegrationStatus } from '../types';

export default function Integrations() {
  const { backendVerify, health, healthError, checkBackend } = useNish();

  const supabase: { status: IntegrationStatus; detail?: string } =
    backendVerify === 'online'
      ? { status: 'connected' }
      : isBackendConfigured
        ? {
            status: 'not-connected',
            detail: healthError ?? 'Environment variables detected. Run the connection test to verify.',
          }
        : {
            status: 'configuration-required',
            detail: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
          };

  const openai: { status: IntegrationStatus; detail?: string } =
    backendVerify === 'online' && health?.openai === true
      ? { status: 'connected' }
      : {
          status: 'configuration-required',
          detail: 'The key must be stored as a Supabase secret, never in frontend code. Verified via the backend health check.',
        };

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <PageHeader
        icon={Plug}
        title="Connected Services"
        subtitle="Integrations only show as connected after a real, verified connection."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <IntegrationCard
          icon={Sparkles}
          name="OpenAI"
          description="Language model and speech services, accessed only through Supabase Edge Functions."
          {...openai}
        />
        <IntegrationCard
          icon={Database}
          name="Supabase"
          description="Edge Functions, authentication and persistent memory."
          {...supabase}
          action={
            isBackendConfigured
              ? { label: 'Test connection', onClick: () => void checkBackend(), busy: backendVerify === 'checking' }
              : undefined
          }
        />
        <IntegrationCard icon={Workflow} name="n8n" description="Automation workflows through n8n Cloud." status="coming-soon" />
        <IntegrationCard icon={Globe} name="Google services" description="Google account access for connected tools." status="coming-soon" />
        <IntegrationCard icon={Mail} name="Gmail" description="Read, draft and send email." status="coming-soon" />
        <IntegrationCard icon={CalendarDays} name="Google Calendar" description="View and create calendar events." status="coming-soon" />
        <IntegrationCard icon={AppWindow} name="Chrome" description="Browser tab management through a future Chrome extension." status="coming-soon" />
        <IntegrationCard
          icon={Monitor}
          name="Windows desktop connector"
          description="Open applications and switch windows on your PC."
          status="not-connected"
          detail="LOCAL CONNECTOR NOT INSTALLED"
        />
      </div>

      <div className="mt-6">
        <Panel title="Connected devices" icon={Monitor} action={<Chip tone="idle">0 DEVICES</Chip>}>
          <div className="grid place-items-center gap-2 py-8 text-center">
            <Monitor className="h-8 w-8 text-mute" />
            <p className="text-sm font-medium">No local connector detected</p>
            <p className="max-w-md text-xs leading-relaxed text-mute">
              A website cannot control Windows apps, read Chrome tabs or register a system-wide shortcut. A small local
              connector and a Chrome extension will provide those features in a future version.
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 border-t border-line pt-3">
            {['Open applications', 'Switch windows', 'Global shortcut', 'Chrome tab management'].map((c) => (
              <Chip key={c} tone="idle">
                {c.toUpperCase()} · UNAVAILABLE
              </Chip>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4">
        <Banner tone="idle" icon={Info}>
          Nothing on this page is simulated. Statuses are derived from the actual frontend configuration and the backend
          health check.
        </Banner>
      </div>
    </div>
  );
}