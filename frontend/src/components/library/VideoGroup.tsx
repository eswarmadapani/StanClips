import React from 'react';
import type { Job } from '../../types/studio';
import { useStudio } from '../../context/StudioContext';
import { formatDuration } from '../../api/client';
import { ClipStrip } from './ClipStrip';
import { Icon } from '../common/Icon';
import { useToast } from '../../context/ToastContext';

export const VideoGroup: React.FC<{ job: Job }> = ({ job }) => {
  const { selectedIds, toggleSelect, cancelJob, deleteJob, creators } = useStudio();
  const { toast } = useToast();

  const isBusy = job.status === 'queued' || job.status === 'running';
  const selKey = `j:${job.id}`;
  const isSelected = selectedIds.has(selKey);

  const creatorName = job.creator
    ? creators.find((c) => c.id === job.creator)?.name
    : null;

  const handleCopyJobError = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (job.error) {
      navigator.clipboard.writeText(`Video error (${job.title || job.source?.name || 'video'}): ${job.error}`);
      toast('Error copied to clipboard', 'ok');
    }
  };

  const handleDownloadAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `/api/clips.zip?jobs=${encodeURIComponent(job.id)}`;
  };

  return (
    <section className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-5 backdrop-blur-md space-y-4">
      {/* Video Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Thumbnail */}
          <div className="relative w-16 h-10 sm:w-20 sm:h-12 bg-neutral-950 rounded-lg overflow-hidden flex-shrink-0 border border-neutral-800 flex items-center justify-center">
            {job.thumb ? (
              <img
                src={`/media/${encodeURIComponent(job.id)}/thumb.jpg`}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <Icon name={job.source?.type === 'file' ? 'film' : 'link'} size={18} className="text-neutral-500" />
            )}
            {job.duration ? (
              <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 text-[10px] font-mono text-white">
                {formatDuration(job.duration)}
              </span>
            ) : null}
          </div>

          {/* Titles & Metadata */}
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white truncate">
              {job.title || job.source.name || 'Untitled video'}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-400 mt-0.5">
              {creatorName && <span className="font-semibold text-neutral-300">@{creatorName}</span>}
              {job.uploader && <span>{job.uploader}</span>}
              <span>{job.clips.length} {job.clips.length === 1 ? 'clip' : 'clips'}</span>
              {job.took ? <span>made in {formatDuration(job.took)}</span> : null}
              {job.stage && <span className="text-neutral-300">· {job.stage}</span>}
            </div>
          </div>
        </div>

        {/* Video Actions: Cancel / Download all / Delete / Select */}
        <div className="flex items-center gap-2">
          {isBusy ? (
            <button
              type="button"
              onClick={() => cancelJob(job.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <Icon name="x" size={14} />
              <span>Cancel</span>
            </button>
          ) : (
            <>
              {job.clips.some((c) => c.status === 'done') && (
                <button
                  type="button"
                  onClick={handleDownloadAll}
                  className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  title="Download all clips in a .zip"
                  aria-label="Download all clips"
                >
                  <Icon name="down" size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={() => deleteJob(job.id)}
                className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                title="Delete this video and its clips"
                aria-label="Delete video"
              >
                <Icon name="trash" size={16} />
              </button>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelect(selKey)}
                className="w-4 h-4 rounded bg-neutral-900 border-neutral-700 text-[#ccff00] focus:ring-0 cursor-pointer ml-1"
                aria-label="Select video"
              />
            </>
          )}
        </div>
      </div>

      {/* Progress bar if busy */}
      {isBusy && job.progress != null && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-neutral-400">
            <span>{job.stage || 'Processing…'}</span>
            <span>{Math.round(job.progress * 100)}%</span>
          </div>
          <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ccff00] transition-all duration-300"
              style={{ width: `${Math.round(job.progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Error banner if failed */}
      {job.error && (
        <div className="flex items-center justify-between text-xs text-red-300 bg-red-950/60 px-3.5 py-2.5 rounded-xl border border-red-800/40">
          <span className="truncate">{job.error}</span>
          <button
            type="button"
            onClick={handleCopyJobError}
            className="text-xs font-bold text-red-200 underline ml-3 flex-shrink-0 cursor-pointer"
          >
            Copy error
          </button>
        </div>
      )}

      {/* Horizontal Strip of Clips */}
      <ClipStrip job={job} />
    </section>
  );
};
