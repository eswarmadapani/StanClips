import React, { useState } from 'react';
import { useToast, ToastItem } from '../../context/ToastContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div
      id="toasts"
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md pointer-events-none"
    >
      {toasts.map((t) => (
        <SingleToast key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
};

const SingleToast: React.FC<{ toast: ToastItem; onClose: () => void }> = ({ toast, onClose }) => {
  const [copied, setCopied] = useState(false);

  const copyError = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(toast.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const isBad = toast.kind === 'bad';
  const isOk = toast.kind === 'ok';

  return (
    <div
      onClick={onClose}
      className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg backdrop-blur-md transition-all cursor-pointer ${
        isBad
          ? 'bg-red-950/90 border-red-500/40 text-red-100'
          : isOk
          ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100'
          : 'bg-neutral-900/90 border-neutral-700/60 text-neutral-100'
      }`}
    >
      <span className="flex-1 overflow-hidden text-ellipsis">{toast.message}</span>
      {isBad && (
        <button
          type="button"
          onClick={copyError}
          className="text-xs px-2.5 py-1 rounded bg-red-800/60 hover:bg-red-700 text-white border border-red-400/30 font-semibold"
        >
          {copied ? 'Copied' : 'Copy error'}
        </button>
      )}
    </div>
  );
};
