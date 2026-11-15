import { useEffect, useState } from 'react';
import type { PageId } from './types';
import { useNish } from './context/NishContext';
import { useAuth } from './context/AuthContext';
import { useSettings } from './context/SettingsContext';
import { isBackendConfigured } from './services/supabaseClient';
import MainLayout from './components/layout/MainLayout';
import Home from './pages/Home';
import History from './pages/History';
import AiTools from './pages/AiTools';
import Automations from './pages/Automations';
import Memory from './pages/Memory';
import Integrations from './pages/Integrations';
import SettingsPage from './pages/Settings';
import Login from './pages/Login';

export default function App() {
  const [page, setPage] = useState<PageId>('home');
  const { newConversation, hotkeyPulse } = useNish();
  const { session, loading } = useAuth();
  const { settings } = useSettings();

  useEffect(() => {
    if (hotkeyPulse > 0) setPage('home');
  }, [hotkeyPulse]);

  // Backend mode needs a signed-in user. Demo mode never does.
  const needsLogin = !settings.demoMode && isBackendConfigured;
  if (needsLogin && loading) {
    return (
      <div className="grid h-full place-items-center font-mono text-xs tracking-[0.3em] text-mute">LOADING…</div>
    );
  }
  if (needsLogin && !session) return <Login />;

  const renderPage = () => {
    switch (page) {
      case 'history':
        return <History onOpen={() => setPage('home')} />;
      case 'tools':
        return <AiTools />;
      case 'automations':
        return <Automations />;
      case 'memory':
        return <Memory />;
      case 'integrations':
        return <Integrations />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Home />;
    }
  };

  return (
    <MainLayout
      page={page}
      onNavigate={setPage}
      onNewConversation={() => {
        newConversation();
        setPage('home');
      }}
    >
      {renderPage()}
    </MainLayout>
  );
}