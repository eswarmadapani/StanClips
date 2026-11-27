import React from 'react';
import { createRoot } from 'react-dom/client';
import { ToastProvider } from './context/ToastContext';
import { StudioProvider } from './context/StudioContext';
import { App } from './App';

function mount() {
  const container = document.getElementById('root');
  if (!container) {
    console.error('[Stan Clips] Could not find #root element to mount React application');
    return;
  }
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <ToastProvider>
          <StudioProvider>
            <App />
          </StudioProvider>
        </ToastProvider>
      </React.StrictMode>
    );
  } catch (err) {
    console.error('[Stan Clips] Fatal error during React mount:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
