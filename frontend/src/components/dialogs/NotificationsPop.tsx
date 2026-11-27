import React, { useEffect, useState } from 'react';
import type { NotificationItem } from '../../types/studio';
import { api, send, formatClock } from '../../api/client';
import { useStudio } from '../../context/StudioContext';
import { Icon } from '../common/Icon';

export const NotificationsPop: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshAll } = useStudio();

  useEffect(() => {
    api<NotificationItem[]>('/api/notifications')
      .then((data) => {
        setItems(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await send('/api/notifications/read', {});
      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
      await refreshAll();
    } catch {}
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden mt-12 mr-2"
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Icon name="bell" size={16} />
            <h3 className="text-sm font-bold text-white">Notifications</h3>
          </div>
          {items.some((i) => !i.read) && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-neutral-800/60">
          {loading ? (
            <div className="p-6 text-center text-xs text-neutral-500">Loading…</div>
          ) : !items.length ? (
            <div className="p-6 text-center text-xs text-neutral-500">No notifications yet.</div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 space-y-1 transition-colors ${
                  !n.read ? 'bg-neutral-800/40' : 'hover:bg-neutral-800/20'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">{n.title}</span>
                  <span className="text-[10px] text-neutral-500">{formatClock(n.created_at)}</span>
                </div>
                <p className="text-xs text-neutral-400">{n.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
