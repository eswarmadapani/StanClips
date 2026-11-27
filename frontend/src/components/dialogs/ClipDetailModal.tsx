import React, { useState, useEffect } from 'react';
import type { Job, Clip } from '../../types/studio';
import { useStudio } from '../../context/StudioContext';
import { send, api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Icon } from '../common/Icon';

interface ClipDetailModalProps {
  job: Job;
  clip: Clip;
  onClose: () => void;
}

export const ClipDetailModal: React.FC<ClipDetailModalProps> = ({ job, clip, onClose }) => {
  const { refreshAll, deleteClip } = useStudio();
  const { toast } = useToast();

  const [hook, setHook] = useState(clip.hook || '');
  const [title, setTitle] = useState(clip.title || '');
  const [description, setDescription] = useState(clip.description || '');
  const [hashtags, setHashtags] = useState((clip.hashtags || []).join(' '));
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const videoUrl = clip.file ? `/media/${encodeURIComponent(job.id)}/${encodeURIComponent(clip.file)}` : '';

  useEffect(() => {
    // Load connected accounts for publishing
    api<any[]>('/api/accounts')
      .then((accs) => {
        setAccounts(accs || []);
        if (accs && accs.length) setSelectedAccount(accs[0].id);
      })
      .catch(() => {});
  }, []);

  const handleReRender = async () => {
    setIsSaving(true);
    try {
      await send(`/api/jobs/${encodeURIComponent(job.id)}/clips/${encodeURIComponent(clip.id)}/render`, {
        hook,
        title,
        description,
        hashtags: hashtags.split(/\s+/).filter(Boolean),
        start: clip.start,
        end: clip.end,
      });
      toast('Re-rendering clip…', 'ok');
      await refreshAll();
      onClose();
    } catch (e: any) {
      toast(e.message || 'Failed to re-render clip', 'bad');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSchedulePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) {
      toast('Please select a destination account', 'bad');
      return;
    }
    setIsScheduling(true);
    try {
      const dueTimestamp = scheduleTime ? Math.floor(new Date(scheduleTime).getTime() / 1000) : Math.floor(Date.now() / 1000);
      await send('/api/posts', {
        clip_id: clip.id,
        job_id: job.id,
        account_id: selectedAccount,
        title: title || hook,
        description,
        hashtags: hashtags.split(/\s+/).filter(Boolean),
        due_at: dueTimestamp,
      });
      toast('Clip scheduled for publishing!', 'ok');
      await refreshAll();
    } catch (e: any) {
      toast(e.message || 'Failed to schedule post', 'bad');
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-black text-white transition-colors cursor-pointer"
        >
          <Icon name="x" size={18} />
        </button>

        {/* Left Column: 9:16 Video Player */}
        <div className="md:w-1/2 bg-black flex items-center justify-center p-4 border-b md:border-b-0 md:border-r border-neutral-800">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              autoPlay
              loop
              playsInline
              className="max-h-[500px] md:max-h-[700px] w-auto aspect-[9/16] rounded-xl object-contain shadow-2xl"
            />
          ) : (
            <div className="text-neutral-500 text-sm">No video file available</div>
          )}
        </div>

        {/* Right Column: Metadata, Editing, and Publishing */}
        <div className="md:w-1/2 p-6 overflow-y-auto space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Clip Details</h2>
              <p className="text-xs text-neutral-400">Edit titles, hook, or schedule publication.</p>
            </div>

            {/* Hook input */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Hook Text (Caps on video)</label>
              <input
                type="text"
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-[#ccff00]"
              />
            </div>

            {/* Title input */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-[#ccff00]"
              />
            </div>

            {/* Description input */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-[#ccff00]"
              />
            </div>

            {/* Hashtags input */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Hashtags (space-separated)</label>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="shorts viral gaming"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-[#ccff00]"
              />
            </div>

            {/* Publishing Section */}
            <div className="pt-4 border-t border-neutral-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">Schedule Publication</h3>
              {accounts.length > 0 ? (
                <form onSubmit={handleSchedulePost} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <select
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.platform} ({a.name})
                        </option>
                      ))}
                    </select>

                    <input
                      type="datetime-local"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isScheduling}
                    className="w-full py-2.5 rounded-xl bg-[#ccff00] hover:bg-[#bde900] text-[#172000] text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    {isScheduling ? 'Scheduling…' : 'Schedule Post'}
                  </button>
                </form>
              ) : (
                <div className="text-xs text-neutral-400">
                  No social accounts connected.{' '}
                  <a href="/app/settings/apps" className="text-[#ccff00] underline font-semibold">
                    Connect YouTube or Instagram
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Modal Bottom Actions */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => {
                deleteClip(job.id, clip.id);
                onClose();
              }}
              className="px-3 py-2 rounded-xl text-neutral-400 hover:text-red-400 text-xs font-semibold transition-colors cursor-pointer"
            >
              Delete clip
            </button>

            <button
              type="button"
              onClick={handleReRender}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {isSaving ? 'Re-rendering…' : 'Re-render'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
