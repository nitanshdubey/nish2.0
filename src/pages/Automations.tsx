import { useState } from 'react';
import { BarChart3, Bell, FileText, FolderTree, Info, Mail, Search, Workflow } from 'lucide-react';
import AutomationCard from '../components/automation/AutomationCard';
import { Banner, PageHeader } from '../components/ui/Primitives';

const AUTOMATIONS = [
  { icon: Mail, name: 'Send an email', description: 'Compose and send an email from a spoken or typed request.' },
  { icon: FileText, name: 'Summarize a document', description: 'Read a document and produce a short summary.' },
  { icon: Bell, name: 'Create a reminder', description: 'Set a reminder with a time and optional notes.' },
  { icon: FolderTree, name: 'Organize information', description: 'Sort notes and files into structured categories.' },
  { icon: Search, name: 'Search online', description: 'Run a web search and return the key findings.' },
  { icon: BarChart3, name: 'Generate a report', description: 'Assemble a formatted report from gathered data.' },
];

export default function Automations() {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <PageHeader
        icon={Workflow}
        title="Automation Center"
        subtitle="Workflows that NISH will trigger through n8n Cloud."
      />
      <div className="mb-4 space-y-3">
        <Banner tone="warn" icon={Info}>
          Workflow integration will be configured later. These cards are interface demonstrations; pressing Run does not
          execute anything.
        </Banner>
        {notice && (
          <Banner tone="idle" icon={Info} onDismiss={() => setNotice(null)}>
            {notice}
          </Banner>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {AUTOMATIONS.map((a) => (
          <AutomationCard
            key={a.name}
            {...a}
            onRun={() => setNotice(`“${a.name}” was not run. No workflow engine (n8n) is connected yet, so nothing was executed.`)}
          />
        ))}
      </div>
    </div>
  );
}