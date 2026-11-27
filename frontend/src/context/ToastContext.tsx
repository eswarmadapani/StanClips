import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ToastItem {
  id: string;
  message: string;
  kind?: 'ok' | 'bad' | 'warn' | '';
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (message: string, kind?: 'ok' | 'bad' | 'warn' | '') => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  toast: () => {},
  removeToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, kind: 'ok' | 'bad' | 'warn' | '' = '') => {
    if (!message) return;
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, kind }]);
    const duration = kind === 'bad' ? 7000 : 3500;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};
