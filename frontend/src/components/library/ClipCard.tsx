import React, { useState } from 'react';
import type { Job, Clip, Destination } from '../../types/studio';
import { useStudio } from '../../context/StudioContext';
import { formatDuration, deliveryLabel, send } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Icon } from '../common/Icon';

interface ClipCardProps {
  job: Job;
  clip: Clip;
}

export const ClipCard: React.FC<ClipCardProps> = ({ job, clip }) => {
  const { selectedIds, toggleSelect, openClipModal, deleteClip, refreshAll } = useStudio();
  const { toast } = useToast();
  const [copiedText, setCopiedText] = useState(false);

  const selKey = `c:${job.id}:${clip.id}`;
  const isSelected = selectedIds.has(selKey);
  const isReady = clip.status === 'done';
  const isBusy = ['queued', 'rendering'].includes(clip.status);

  const durationSec = clip.end - clip.start;
  const mediaBase = `/media/${encodeURIComponent(job.id)}/`;
  const coverUrl = clip.cover
    ? `${mediaBase}${encodeURIComponent(clip.cover)}?v=${clip.version}`
    : undefined;
  const fileUrl = clip.file
    ? `${mediaBase}${encodeURIComponent(clip.file)}?download=1`
    : undefined;

  const handleCopyPostText = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${clip.title || ''}\n\n${clip.description || ''}\n\n${(clip.hashtags || []).map((h) => `#${h}`).join(' ')}`.trim();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      toast('Post text copied to clipboard', 'ok');
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      toast('Failed to copy to clipboard', 'bad');
    }
  };

  const handleCancelPost = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    try {
      await send(`/api/posts/${encodeURIComponent(postId)}/cancel`, {});
      toast('Scheduled post cancelled', 'ok');
      await refreshAll();
    } catch (err: any) {
      toast(err.message || 'Failed to cancel post', 'bad');
    }
  };

  return (
    <article
      className={`group relative flex flex-col bg-neutral-900 border rounded-2xl overflow-hidden transition-all duration-200 ${
        isSelected
          ? 'border-[#ccff00] shadow-md ring-1 ring-[#ccff00]/50'
          : 'border-neutral-800 hover:border-neutral-700'
      }`}
    >
      {/* 9:16 Portrait Cover Area */}
      <div
        onClick={() => openClipModal(job.id, clip.id)}
        className="relative w-full aspect-[9/16] bg-neutral-950 overflow-hidden cursor-pointer flex items-center justify-center"
      >
        {isReady && coverUrl ? (
          <>
            <img
              src={coverUrl}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Play veil overlay */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="w-12 h-12 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md">
                <Icon name="play" size={20} />
              </span>
            </div>
          </>
        ) : (
          <div className="p-4 text-center text-xs text-neutral-400">
            {clip.status === 'error' ? (
              <span className="text-red-400 font-medium">Render failed. Open to try again.</span>
            ) : isBusy && clip.status === 'rendering' ? (
              <span className="flex flex-col items-center gap-2">
                <span className="w-5 h-5 border-2 border-neutral-600 border-t-[#ccff00] rounded-full animate-spin" />
                Rendering clip…
              </span>
            ) : (
              <span>Waiting to render…</span>
            )}
          </div>
        )}

        {/* AI Score Badge (Top Left) */}
        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[11px] font-bold text-neutral-200 border border-white/10">
          {clip.score ? `${clip.score}` : 'Hand'}
        </span>

        {/* Duration Badge (Top Right) */}
        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[11px] font-mono text-white border border-white/10">
          {formatDuration(durationSec)}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
        <div>
          {/* Hook text */}
          <h4 className="text-sm font-bold text-white line-clamp-1 tracking-tight">
            {clip.hook || 'Untitled clip'}
          </h4>
          {/* Clip title */}
          {clip.title && (
            <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">{clip.title}</p>
          )}

          {/* Destinations Status Rows */}
          {clip.posts && Object.keys(clip.posts).length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-neutral-800 space-y-1.5 text-xs">
              {Object.entries(clip.posts)
                .filter(([, p]) => p.status !== 'cancelled')
                .map(([pid, p]) => (
                  <DestinationRow
                    key={pid}
                    postId={pid}
                    dest={p}
                    onCancel={(e) => handleCancelPost(e, pid)}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-neutral-800/80">
          <div className="flex items-center gap-1.5">
            {/* Selection Checkbox */}
            {!isBusy && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelect(selKey)}
                className="w-4 h-4 rounded bg-neutral-900 border-neutral-700 text-[#ccff00] focus:ring-0 cursor-pointer"
                aria-label="Select clip"
              />
            )}

            {/* Download Button */}
            {isReady && fileUrl && (
              <a
                href={fileUrl}
                download
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Download clip"
                aria-label="Download"
              >
                <Icon name="down" size={15} />
              </a>
            )}

            {/* Copy post copy */}
            <button
              type="button"
              onClick={handleCopyPostText}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Copy post copy"
              aria-label="Copy post copy"
            >
              <Icon name="copy" size={15} />
            </button>

            {/* Delete clip */}
            {!isBusy && (
              <button
                type="button"
                onClick={() => deleteClip(job.id, clip.id)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                title="Delete clip"
                aria-label="Delete clip"
              >
                <Icon name="trash" size={15} />
              </button>
            )}
          </div>

          {/* Primary Action Button: Post / Open */}
          {isReady && (
            <button
              type="button"
              onClick={() => openClipModal(job.id, clip.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ccff00] hover:bg-[#bde900] text-[#172000] text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Icon name="send" size={13} />
              <span>Post</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

const DestinationRow: React.FC<{
  postId: string;
  dest: Destination;
  onCancel: (e: React.MouseEvent) => void;
}> = ({ dest, onCancel }) => {
  const { toast } = useToast();
  const label = deliveryLabel(dest);
  const isQueued = dest.status === 'scheduled';
  const isFailed = dest.status === 'failed';

  const copyError = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dest.error) {
      navigator.clipboard.writeText(dest.error);
      toast('Error copied to clipboard', 'ok');
    }
  };

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between text-neutral-300">
        <strong className="font-semibold truncate max-w-[110px]">{dest.account_name}</strong>
        <span
          className={`text-[11px] font-medium ${
            dest.status === 'posted'
              ? 'text-emerald-400'
              : dest.status === 'posting'
              ? 'text-sky-400'
              : isFailed
              ? 'text-red-400'
              : 'text-amber-400'
          }`}
        >
          {label}
        </span>
      </div>
      {dest.error && (
        <div className="flex items-center justify-between text-[11px] text-red-400 bg-red-950/40 px-2 py-1 rounded border border-red-900/30 mt-0.5">
          <span className="truncate">{dest.error}</span>
          <button
            type="button"
            onClick={copyError}
            className="text-[10px] font-bold text-red-300 underline ml-2 flex-shrink-0 cursor-pointer"
          >
            Copy error
          </button>
        </div>
      )}
      {isQueued && (
        <button
          type="button"
          onClick={onCancel}
          className="self-start text-[10px] text-neutral-400 hover:text-white underline cursor-pointer"
        >
          Cancel post
        </button>
      )}
    </div>
  );
};
