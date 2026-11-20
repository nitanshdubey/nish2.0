import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { NishProvider } from './context/NishContext';
import './index.css';
import { PlanProvider } from './context/PlanContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <SettingsProvider>
        <AuthProvider>
          <PlanProvider>
            <NishProvider>
              <App />
            </NishProvider>
          </PlanProvider>
        </AuthProvider>
      </SettingsProvider>
    </MotionConfig>
  </React.StrictMode>,
);