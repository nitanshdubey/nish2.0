import {
    Brain,
    History as HistoryIcon,
    Home,
    PanelLeftClose,
    PanelLeftOpen,
    Plug,
    Settings as SettingsIcon,
    SquarePen,
    Workflow,
    Wrench,
    type LucideIcon,
  } from 'lucide-react';
  import type { PageId } from '../../types';
  
  type NavId = PageId | 'new';
  
  const NAV: { id: NavId; label: string; icon: LucideIcon }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'new', label: 'New Conversation', icon: SquarePen },
    { id: 'history', label: 'Conversation History', icon: HistoryIcon },
    { id: 'tools', label: 'AI Tools', icon: Wrench },
    { id: 'automations', label: 'Automations', icon: Workflow },
    { id: 'memory', label: 'Memory', icon: Brain },
    { id: 'integrations', label: 'Connected Services', icon: Plug },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];
  
  interface Props {
    page: PageId;
    collapsed: boolean;
    mobileOpen: boolean;
    onNavigate: (p: PageId) => void;
    onNewConversation: () => void;
    onToggleCollapse: () => void;
    onCloseMobile: () => void;
  }
  
  export default function Sidebar({
    page,
    collapsed,
    mobileOpen,
    onNavigate,
    onNewConversation,
    onToggleCollapse,
    onCloseMobile,
  }: Props) {
    return (
      <>
        {mobileOpen && (
          <div
            className="fixed inset-x-0 bottom-0 top-14 z-30 bg-black/60 lg:hidden"
            onClick={onCloseMobile}
            aria-hidden
          />
        )}
        <aside
          aria-label="Primary navigation"
          className={`fixed bottom-0 left-0 top-14 z-40 flex w-64 flex-col border-r border-line bg-base2 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          } ${collapsed ? 'lg:w-[68px]' : 'lg:w-60'}`}
        >
          <nav className="flex-1 space-y-1 overflow-y-auto p-2">
            {NAV.map((item) => {
              const active = item.id === page;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => (item.id === 'new' ? onNewConversation() : onNavigate(item.id))}
                  className={`relative flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? 'border-accent/40 bg-accent/10 text-ink'
                      : 'border-transparent text-mute hover:bg-panel hover:text-ink'
                  } ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
                >
                  {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" />}
                  <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-accent' : ''}`} />
                  <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
                </button>
              );
            })}
          </nav>
  
          <div className="border-t border-line p-2">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-mute transition-colors hover:bg-panel hover:text-ink lg:flex"
            >
              {collapsed ? (
                <PanelLeftOpen className="mx-auto h-[18px] w-[18px]" />
              ) : (
                <>
                  <PanelLeftClose className="h-[18px] w-[18px]" /> Collapse
                </>
              )}
            </button>
            <p className={`px-3 py-1 font-mono text-[9px] tracking-[0.2em] text-mute ${collapsed ? 'lg:hidden' : ''}`}>
              NISH v0.1 · FRONTEND
            </p>
          </div>
        </aside>
      </>
    );
  }