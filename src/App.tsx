import { useState } from 'react';
import type { PageId } from './types';
import { useNish } from './context/NishContext';
import MainLayout from './components/layout/MainLayout';
import Home from './pages/Home';
import History from './pages/History';
import AiTools from './pages/AiTools';
import Automations from './pages/Automations';
import Memory from './pages/Memory';
import Integrations from './pages/Integrations';
import SettingsPage from './pages/Settings';

export default function App() {
  const [page, setPage] = useState<PageId>('home');
  const { newConversation } = useNish();

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