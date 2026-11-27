import React, { useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import { send } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Icon } from '../common/Icon';

export const CreatorModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { refreshAll } = useStudio();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [youtube, setYoutube] = useState('');
  const [twitch, setTwitch] = useState('');
  const [kick, setKick] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const channels: Record<string, string> = {};
      if (youtube.trim()) channels.youtube = youtube.trim();
      if (twitch.trim()) channels.twitch = twitch.trim();
      if (kick.trim()) channels.kick = kick.trim();

      await send('/api/creators', {
        name: name.trim(),
        channels,
      });

      toast(`Creator @${name.trim()} added!`, 'ok');
      await refreshAll();
      onClose();
    } catch (e: any) {
      toast(e.message || 'Failed to add creator', 'bad');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight">Add New Creator</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">Creator Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kai Cenat"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-[#ccff00]"
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-neutral-800">
            <span className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Live Channels (Optional)
            </span>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">YouTube Channel URL</label>
              <input
                type="url"
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                placeholder="https://youtube.com/@..."
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-[#ccff00]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">Twitch Channel URL</label>
              <input
                type="url"
                value={twitch}
                onChange={(e) => setTwitch(e.target.value)}
                placeholder="https://twitch.tv/..."
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-[#ccff00]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">Kick Channel URL</label>
              <input
                type="url"
                value={kick}
                onChange={(e) => setKick(e.target.value)}
                placeholder="https://kick.com/..."
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-[#ccff00]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 rounded-xl bg-[#ccff00] hover:bg-[#bde900] text-[#172000] text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-40"
            >
              {isSubmitting ? 'Creating…' : 'Create Creator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
