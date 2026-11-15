import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { NishProvider } from './context/NishContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <SettingsProvider>
        <AuthProvider>
          <NishProvider>
            <App />
          </NishProvider>
        </AuthProvider>
      </SettingsProvider>
    </MotionConfig>
  </React.StrictMode>,
);