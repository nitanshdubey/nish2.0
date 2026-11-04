import { Code2, FileText, Globe, Image, Languages, Wrench, Info } from 'lucide-react';
import { Banner, PageHeader } from '../components/ui/Primitives';
import IntegrationCard from '../components/integrations/IntegrationCard';

const TOOLS = [
  { icon: Globe, name: 'Web Research', description: 'Search the web and summarise findings with sources.' },
  { icon: FileText, name: 'Document Analysis', description: 'Read, summarise and question uploaded documents.' },
  { icon: Code2, name: 'Code Assistant', description: 'Explain, review and generate code snippets.' },
  { icon: Image, name: 'Image Understanding', description: 'Describe and extract information from images.' },
  { icon: Languages, name: 'Translation', description: 'Translate text and speech between languages.' },
];

export default function AiTools() {
  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <PageHeader
        icon={Wrench}
        title="AI Tools"
        subtitle="Specialised capabilities NISH will be able to use once the AI backend is connected."
      />
      <div className="mb-4">
        <Banner tone="warn" icon={Info}>
          Placeholder: none of these tools are active. They are planned features and nothing here executes anything yet.
        </Banner>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {TOOLS.map((t) => (
          <IntegrationCard key={t.name} {...t} status="coming-soon" />
        ))}
      </div>
    </div>
  );
}