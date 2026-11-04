import { useState, type ReactNode } from 'react';
import type { PageId } from '../../types';
import TopBar from './TopBar';
import Sidebar from './Sidebar';

interface Props {
  page: PageId;
  onNavigate: (p: PageId) => void;
  onNewConversation: () => void;
  children: ReactNode;
}

export default function MainLayout({ page, onNavigate, onNewConversation, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = (p: PageId) => {
    onNavigate(p);
    setMobileOpen(false);
  };

  return (
    <div className="flex h-full flex-col">
      <TopBar onMenu={() => setMobileOpen(true)} onNavigate={go} />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar
          page={page}
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onNavigate={go}
          onNewConversation={() => {
            onNewConversation();
            setMobileOpen(false);
          }}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <main id="main" className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}