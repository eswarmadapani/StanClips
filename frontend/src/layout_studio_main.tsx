import React from 'react';
import { createRoot } from 'react-dom/client';
import { ToastProvider } from './context/ToastContext';
import { LayoutStudioApp } from './components/layout_studio/LayoutStudioApp';

function mount() {
  const container = document.getElementById('root');
  if (!container) {
    console.error('[Stan Clips] Could not find #root element for Layout Studio');
    return;
  }
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <ToastProvider>
          <LayoutStudioApp />
        </ToastProvider>
      </React.StrictMode>
    );
  } catch (err) {
    console.error('[Stan Clips] Fatal error during Layout Studio mount:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
