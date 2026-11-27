import React from 'react';
import { useStudio } from '../../context/StudioContext';
import { Icon } from '../common/Icon';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewCreator: () => void;
  onToggleNotifications: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onOpenNewCreator,
  onToggleNotifications,
}) => {
  const { status, jobs, creators, view, setView } = useStudio();

  const workingJobs = jobs.filter((j) => ['queued', 'running'].includes(j.status)).length;
  const isAccounts = status?.accounts !== false;
  const isAdmin = status?.user?.role === 'admin' || status?.user?.is_admin;
  const unreadCount = status?.unread || 0;

  return (
    <>
      {/* Mobile scrim overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 flex flex-col bg-neutral-900/90 text-neutral-200 border-r border-neutral-800 backdrop-blur-xl transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-neutral-800/80">
          <a
            href="/app"
            onClick={(e) => {
              e.preventDefault();
              setView('overview');
              onClose();
            }}
            className="flex items-center gap-2.5 font-bold tracking-tight text-lg text-white"
          >
            <img src="/brand/logo-light.svg?v=stan2" alt="Stan Clips" className="h-7 w-auto" />
          </a>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
            aria-label="Close menu"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <button
            onClick={() => {
              setView('overview');
              onClose();
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'overview'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon name="home" size={18} />
              <span>Home</span>
            </div>
          </button>

          <button
            onClick={() => {
              setView('library');
              onClose();
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'library'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon name="film" size={18} />
              <span>All videos</span>
            </div>
            {workingJobs > 0 ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-lime-400/20 text-[#ccff00] font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ccff00] animate-pulse" />
                {workingJobs} working
              </span>
            ) : jobs.length > 0 ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-semibold">
                {jobs.length}
              </span>
            ) : null}
          </button>

          {/* Creators Section */}
          <div className="pt-5 pb-1 px-3">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Creators
            </span>
          </div>

          {creators.map((c) => {
            const isRec = !!c.live_job;
            const isLive = (c.channels && Object.keys(c.channels).length > 0) || false;
            const isCurrent = view === `c:${c.id}`;

            return (
              <button
                key={c.id}
                onClick={() => {
                  setView(`c:${c.id}`);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isCurrent
                    ? 'bg-neutral-800 text-white font-semibold'
                    : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-300 flex-shrink-0 overflow-hidden">
                    {c.pic ? (
                      <img src={`/api/creators/${c.id}/avatar`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      c.name.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <span className="truncate">{c.name}</span>
                </div>
                {isRec ? (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Rec
                  </span>
                ) : isLive ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Channels configured" />
                ) : null}
              </button>
            );
          })}

          <button
            onClick={() => {
              onOpenNewCreator();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 transition-colors"
          >
            <Icon name="plusc" size={16} />
            <span>New creator</span>
          </button>

          {/* Admin link */}
          {isAdmin && isAccounts && (
            <div className="pt-4">
              <a
                href="/admin"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 transition-colors"
              >
                <Icon name="shield" size={16} />
                <span>Admin dashboard</span>
              </a>
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-neutral-800/80 space-y-2">
          {/* AI Usage Card */}
          {status?.ai && (
            <button
              onClick={() => {
                setView('usage');
                onClose();
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-colors ${
                view === 'usage'
                  ? 'bg-neutral-800 border-neutral-700 text-white'
                  : 'bg-neutral-900/60 border-neutral-800/80 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300">
                  <Icon name="bolt" size={16} />
                </span>
                <div>
                  <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">AI Model</div>
                  <div className="text-xs font-semibold truncate max-w-[110px]">
                    {status.ai.ready ? status.ai.provider || 'Ready' : 'Not configured'}
                  </div>
                </div>
              </div>
              {status.ai.ready && (
                <span className="text-[11px] font-mono text-neutral-400">
                  {status.ai.today_calls || 0} today
                </span>
              )}
            </button>
          )}

          {/* User profile & Settings */}
          <div className="flex items-center justify-between p-1.5">
            <button
              onClick={() => {
                setView('settings');
                onClose();
              }}
              className="flex items-center gap-2.5 text-left flex-1 min-w-0 group"
            >
              <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-xs text-neutral-200 flex-shrink-0 group-hover:border-[#ccff00] transition-colors">
                {status?.user?.name ? status.user.name[0].toUpperCase() : 'S'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate group-hover:text-[#ccff00] transition-colors">
                  {status?.user?.name || 'Settings'}
                </div>
                <div className="text-[11px] text-neutral-400 truncate">
                  {status?.user?.email || 'AI key & connected apps'}
                </div>
              </div>
            </button>

            {/* Notification bell */}
            <button
              onClick={onToggleNotifications}
              className="relative p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              aria-label="Notifications"
            >
              <Icon name="bell" size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
