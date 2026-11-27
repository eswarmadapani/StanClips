import React from 'react';
import { useStudio } from '../../context/StudioContext';
import { Icon } from '../common/Icon';
import { send } from '../../api/client';
import { useToast } from '../../context/ToastContext';

interface TopbarProps {
  onOpenMobileMenu: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileMenu }) => {
  const { status, view, creatorTab, setCreatorTab, creators, refreshAll, setView } = useStudio();
  const { toast } = useToast();

  const isCreatorView = view.startsWith('c:');
  const activeCreator = isCreatorView
    ? creators.find((c) => `c:${c.id}` === view)
    : null;

  const handleStartLive = async () => {
    if (!activeCreator) return;
    try {
      await send(`/api/creators/${activeCreator.id}/live`, {});
      toast(`Recording started for ${activeCreator.name}`, 'ok');
      await refreshAll();
    } catch (e: any) {
      toast(e.message || 'Failed to start recording', 'bad');
    }
  };

  const handleStopLive = async () => {
    if (!activeCreator?.live_job) return;
    try {
      await send(`/api/live/${activeCreator.live_job}/stop`, {});
      toast(`Recording stopped for ${activeCreator.name}`, 'ok');
      await refreshAll();
    } catch (e: any) {
      toast(e.message || 'Failed to stop recording', 'bad');
    }
  };

  // Get view display titles
  let title = 'Home';
  let subtitle = 'Paste a link or drop in videos to make captioned vertical clips.';

  if (view === 'library') {
    title = 'All videos';
    subtitle = 'Every video and recording, across all creators.';
  } else if (view === 'settings') {
    title = 'Settings';
    subtitle = 'Manage your profile, AI key, connected accounts, and storage.';
  } else if (view === 'usage') {
    title = 'AI Usage';
    subtitle = 'Tracking token consumption and AI service calls.';
  } else if (activeCreator) {
    title = activeCreator.name;
    subtitle = activeCreator.live_job ? 'Recording now' : 'Creator workspace';
  }

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200/60 dark:border-neutral-800">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white truncate">
            {title}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate hidden sm:block">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Creator Live Recording Action */}
      {activeCreator && activeCreator.live_job && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleStopLive}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <Icon name="stop" size={14} />
            <span>Stop recording</span>
          </button>
        </div>
      )}

      {/* Warnings & Alerts */}
      {status?.no_ffmpeg && (
        <div className="w-full text-xs py-2 px-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon name="warn" size={16} />
            <span><b>FFmpeg is missing:</b> Stan Clips requires FFmpeg to cut and render clips.</span>
          </div>
        </div>
      )}
    </header>
  );
};
