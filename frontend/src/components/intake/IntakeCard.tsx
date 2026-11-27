import React, { useState, useRef, useEffect } from 'react';
import { useStudio } from '../../context/StudioContext';
import { send, api, uploadVideoFile } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Icon } from '../common/Icon';

interface PreviewInfo {
  title: string;
  uploader: string;
  duration: number;
  is_live: boolean;
  thumb: string;
}

interface StagedLink {
  id: string;
  kind: 'link';
  url: string;
  state: 'wait' | 'ok' | 'bad';
  info?: PreviewInfo;
  msg?: string;
  sending?: boolean;
}

interface StagedFile {
  id: string;
  kind: 'file';
  file: File;
  src: string;
  dur?: number;
  state: 'ready' | 'up' | 'error' | 'done';
  pct: number;
  err?: string;
}

type StagedItem = StagedLink | StagedFile;

interface IntakeCardProps {
  defaultCreatorId?: string;
}

const VIDEO_EXT = /\.(mp4|mov|mkv|webm|m4v|ts|flv)$/i;

const fmtLen = (sec: number): string => {
  const s = Math.round(sec || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${rem}` : `${m}:${rem}`;
};

const fmtSize = (bytes: number): string => {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
  return Math.max(1, Math.round(bytes / 1e6)) + ' MB';
};

const isChannel = (u: string): boolean =>
  /^(https?:\/\/)?(www\.)?(twitch\.tv|kick\.com)\/[A-Za-z0-9_]+\/?$/i.test(u) ||
  /youtube\.com\/(@[^/]+|channel\/[^/]+)\/?(live|videos|streams)?\/?$/i.test(u);

const looksLink = (u: string): boolean =>
  /^https?:\/\/([\w-]+\.)*(youtube\.com|youtu\.be|twitch\.tv|kick\.com)\//i.test(u);

const fullLink = (u: string): boolean =>
  /[?&]v=[\w-]{11}\b|youtu\.be\/[\w-]{11}\b|\/(shorts|live|embed)\/[\w-]{11}\b|twitch\.tv\/videos\/\d{6,}|clips\.twitch\.tv\/\w|twitch\.tv\/\w+\/clip\/\w|kick\.com\/[\w-]+\/(videos?|clips?)\/[\w-]{6,}/i.test(
    u
  );

export const IntakeCard: React.FC<IntakeCardProps> = ({ defaultCreatorId }) => {
  const { creators, refreshAll } = useStudio();
  const { toast } = useToast();

  const [urlInput, setUrlInput] = useState('');
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);
  const [channelWarning, setChannelWarning] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState(defaultCreatorId || '');
  const [captionStyle, setCaptionStyle] = useState('bounce');
  const [targetDuration, setTargetDuration] = useState('60');
  const [selectedLayout, setSelectedLayout] = useState('blur');
  const [showOptions, setShowOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQueued, setIsQueued] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkDebounceRef = useRef<number | null>(null);
  const stagedRef = useRef<StagedItem[]>(stagedItems);
  stagedRef.current = stagedItems;

  useEffect(() => {
    if (defaultCreatorId) setCreatorId(defaultCreatorId);
  }, [defaultCreatorId]);

  const removeStagedItem = (id: string) => {
    setStagedItems((prev) => {
      const next = prev.filter((item) => {
        if (item.id === id && item.kind === 'file') {
          try {
            URL.revokeObjectURL(item.src);
          } catch {}
          return false;
        }
        return item.id !== id;
      });
      return next;
    });
  };

  const takeLink = async (rawUrl: string) => {
    const cleanUrl = rawUrl.trim();
    if (!cleanUrl) return;

    // Check duplicate
    if (stagedRef.current.some((x) => x.kind === 'link' && x.url === cleanUrl && x.state !== 'bad')) {
      setUrlInput('');
      setChannelWarning(null);
      return;
    }

    if (stagedRef.current.length >= 5) {
      toast('You can queue up to 5 videos at a time. Process or remove one first.', 'bad');
      return;
    }

    const newId = Math.random().toString(36).slice(2, 10);
    const stagedLink: StagedLink = {
      id: newId,
      kind: 'link',
      url: cleanUrl,
      state: 'wait',
    };

    setStagedItems((prev) => [...prev, stagedLink]);
    setUrlInput('');
    setChannelWarning(null);

    // Call /api/preview
    try {
      const info = await api<PreviewInfo>('/api/preview?url=' + encodeURIComponent(cleanUrl));
      setStagedItems((prev) =>
        prev.map((item) =>
          item.kind === 'link' && item.id === newId ? { ...item, state: 'ok', info } : item
        )
      );
    } catch (err: any) {
      setStagedItems((prev) =>
        prev.map((item) =>
          item.kind === 'link' && item.id === newId ? { ...item, state: 'bad', msg: err.message || 'Could not fetch video info' } : item
        )
      );
    }
  };

  // Triggered when staged items finish fetching and user had previously clicked "Make clips"
  useEffect(() => {
    if (isQueued) {
      const hasWaiting = stagedItems.some((x) => x.state === 'wait');
      if (!hasWaiting) {
        setIsQueued(false);
        const hasReady = stagedItems.some((x) => x.state === 'ok' || x.state === 'ready');
        if (hasReady) {
          executeMakeClips();
        } else {
          toast("Couldn't open that video. Check the link is public and complete.", 'bad');
        }
      }
    }
  }, [stagedItems, isQueued]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrlInput(val);

    if (linkDebounceRef.current) {
      window.clearTimeout(linkDebounceRef.current);
      linkDebounceRef.current = null;
    }

    const trimmed = val.trim();
    if (!trimmed) {
      setChannelWarning(null);
      return;
    }

    if (isChannel(trimmed)) {
      setChannelWarning(
        "That's a channel, not a video. To clip live streams, add them under Creators and press Start recording."
      );
      return;
    }

    setChannelWarning(null);

    if (fullLink(trimmed)) {
      takeLink(trimmed);
      return;
    }

    if (looksLink(trimmed)) {
      linkDebounceRef.current = window.setTimeout(() => {
        takeLink(trimmed);
      }, 800);
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || !files.length) return;
    const remainingSlots = 5 - stagedItems.length;
    if (remainingSlots <= 0) {
      toast('You can queue up to 5 videos at a time. Process or remove one first.', 'bad');
      return;
    }

    const added: StagedFile[] = [];
    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const f = files[i];
      if (!f.type.startsWith('video/') && !VIDEO_EXT.test(f.name)) {
        toast(`${f.name} is not a supported video file.`, 'bad');
        continue;
      }
      const newFileItem: StagedFile = {
        id: Math.random().toString(36).slice(2, 10),
        kind: 'file',
        file: f,
        src: URL.createObjectURL(f),
        state: 'ready',
        pct: 0,
      };
      added.push(newFileItem);
    }

    if (added.length) {
      setStagedItems((prev) => [...prev, ...added]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const buildOptions = () => {
    let layoutDraft: any = undefined;
    try {
      const raw = localStorage.getItem('peakcut_active_draft');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.layout) {
          layoutDraft = parsed.layout;
        }
      }
    } catch {}

    const opts: Record<string, any> = {
      captions: true,
      style: captionStyle,
      min_len: 15,
      max_len: Number(targetDuration) || 60,
      layout: layoutDraft ? 'gameplay' : selectedLayout,
      quality: 720,
    };

    if (layoutDraft) {
      opts.layout_data = layoutDraft;
      opts.facecam_pos = 'top';
    }

    return opts;
  };

  const executeMakeClips = async () => {
    if (isSubmitting) return;

    // Check if input currently has a link that hasn't been staged
    const typed = urlInput.trim();
    if (typed && looksLink(typed) && !isChannel(typed)) {
      takeLink(typed);
      setIsQueued(true);
      toast('Finding video details… Clipping will start automatically.', 'ok');
      return;
    }

    // If any item is currently fetching preview
    if (stagedItems.some((x) => x.state === 'wait')) {
      setIsQueued(true);
      toast('Finding video details… Clipping will start as soon as it is ready.', 'ok');
      return;
    }

    const readyLinks = stagedItems.filter((x): x is StagedLink => x.kind === 'link' && x.state === 'ok');
    const readyFiles = stagedItems.filter((x): x is StagedFile => x.kind === 'file' && x.state === 'ready');

    if (!readyLinks.length && !readyFiles.length) {
      toast('Paste a YouTube, Twitch or Kick video link, or upload a video file first.', 'bad');
      return;
    }

    setIsSubmitting(true);
    let started = 0;
    let failed = 0;
    const cleanOpts = buildOptions();

    // Process ready links
    for (const l of readyLinks) {
      setStagedItems((prev) =>
        prev.map((item) => (item.kind === 'link' && item.id === l.id ? { ...item, sending: true } : item))
      );
      try {
        await send('/api/jobs', {
          url: l.url,
          options: cleanOpts,
          creator: creatorId || undefined,
        });
        started++;
        removeStagedItem(l.id);
      } catch (err: any) {
        failed++;
        setStagedItems((prev) =>
          prev.map((item) =>
            item.kind === 'link' && item.id === l.id ? { ...item, sending: false, state: 'bad', msg: err.message || 'Job submission failed' } : item
          )
        );
      }
    }

    // Process ready files
    for (const f of readyFiles) {
      setStagedItems((prev) =>
        prev.map((item) => (item.kind === 'file' && item.id === f.id ? { ...item, state: 'up', pct: 5 } : item))
      );
      try {
        await uploadVideoFile(
          f.file,
          (pct) => {
            setStagedItems((prev) =>
              prev.map((item) => (item.kind === 'file' && item.id === f.id ? { ...item, pct } : item))
            );
          },
          creatorId || undefined,
          cleanOpts
        );
        started++;
        removeStagedItem(f.id);
      } catch (err: any) {
        failed++;
        setStagedItems((prev) =>
          prev.map((item) =>
            item.kind === 'file' && item.id === f.id ? { ...item, state: 'error', err: err.message || 'Upload failed' } : item
          )
        );
      }
    }

    setIsSubmitting(false);

    if (started > 0) {
      toast(
        started === 1 ? 'Video added! Clipping has started.' : `${started} videos are being clipped now.`,
        'ok'
      );
      await refreshAll();
    } else if (failed > 0) {
      toast('Nothing was started. The error is shown on the video.', 'bad');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeMakeClips();
  };

  const readyCount = stagedItems.filter((x) => x.state === 'ok' || x.state === 'ready').length;
  const hasPendingItems = stagedItems.some((x) => x.state === 'wait');

  return (
    <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-lg relative overflow-hidden">
      <form onSubmit={handleFormSubmit} className="space-y-4">
        {/* Main URL intake row */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
              <Icon name="link" size={18} />
            </span>
            <input
              type="text"
              id="url"
              value={urlInput}
              onChange={handleUrlChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  executeMakeClips();
                }
              }}
              placeholder={
                stagedItems.length > 0
                  ? 'Paste another YouTube, Twitch or Kick video link'
                  : 'Paste a YouTube, Twitch or Kick video link'
              }
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-neutral-950/80 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#ccff00] transition-colors"
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            id="goBtn"
            disabled={(!readyCount && !hasPendingItems && !urlInput.trim()) || isSubmitting}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#ccff00] hover:bg-[#bde900] disabled:opacity-40 disabled:hover:bg-[#ccff00] text-[#172000] font-bold text-sm transition-all shadow-sm flex-shrink-0 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Icon name="up" size={16} className="animate-bounce" />
                <span>Sending…</span>
              </>
            ) : isQueued ? (
              <>
                <Icon name="clock" size={16} />
                <span>Finding video…</span>
              </>
            ) : (
              <>
                <Icon name="scissors" size={16} />
                <span>
                  Make clips
                  {readyCount > 1 ? ` (${readyCount})` : ''}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Channel Warning Alert */}
        {channelWarning && (
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/60 text-xs text-amber-300 flex items-center gap-2.5 animate-fadeIn">
            <Icon name="warn" size={16} className="text-amber-400 flex-shrink-0" />
            <span>{channelWarning}</span>
          </div>
        )}

        {/* Staged Videos & Files Preview Queue */}
        {stagedItems.length > 0 && (
          <div className="space-y-2.5 pt-1 animate-fadeIn">
            {stagedItems.map((item) => {
              // 1. Link in 'wait' (fetching preview)
              if (item.kind === 'link' && item.state === 'wait') {
                return (
                  <div
                    key={item.id}
                    className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-3 flex items-center gap-3.5 relative overflow-hidden"
                  >
                    <div className="w-28 sm:w-32 aspect-video rounded-lg bg-neutral-800/80 animate-pulse flex-shrink-0 flex items-center justify-center text-neutral-600">
                      <Icon name="film" size={20} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 bg-neutral-800/80 rounded w-3/4 animate-pulse" />
                      <div className="h-3 bg-neutral-800/50 rounded w-1/3 animate-pulse" />
                      <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ccff00] animate-ping" />
                        <span>Finding video details…</span>
                      </div>
                    </div>
                    {!isSubmitting && (
                      <button
                        type="button"
                        onClick={() => removeStagedItem(item.id)}
                        className="p-1.5 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                        title="Cancel"
                      >
                        <Icon name="x" size={16} />
                      </button>
                    )}
                  </div>
                );
              }

              // 2. Link in 'bad' (lookup failed)
              if (item.kind === 'link' && item.state === 'bad') {
                return (
                  <div
                    key={item.id}
                    className="bg-red-950/30 border border-red-900/50 rounded-xl p-3 flex items-center gap-3 relative overflow-hidden"
                  >
                    <Icon name="warn" size={18} className="text-red-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-semibold text-red-200 truncate">{item.url}</p>
                      <p className="text-red-400 text-[11px] mt-0.5">{item.msg || 'Unable to load video details.'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStagedItem(item.id)}
                      className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                );
              }

              // 3. Link in 'ok' (Preview loaded successfully)
              if (item.kind === 'link' && item.state === 'ok' && item.info) {
                const info = item.info;
                return (
                  <div
                    key={item.id}
                    className="bg-neutral-950/70 border border-neutral-800/90 rounded-xl p-3 flex items-center gap-3.5 relative overflow-hidden group hover:border-neutral-700 transition-colors"
                  >
                    {/* Thumbnail with duration or live badge */}
                    <div className="w-28 sm:w-32 aspect-video rounded-lg bg-neutral-900 overflow-hidden relative flex-shrink-0 border border-neutral-800">
                      {info.thumb ? (
                        <img src={info.thumb} alt={info.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600">
                          <Icon name="film" size={20} />
                        </div>
                      )}
                      {info.is_live ? (
                        <span className="absolute bottom-1 right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          LIVE
                        </span>
                      ) : info.duration ? (
                        <span className="absolute bottom-1 right-1 bg-black/85 backdrop-blur-xs text-white text-[10px] font-semibold px-1.5 py-0.5 rounded font-mono shadow-sm">
                          {fmtLen(info.duration)}
                        </span>
                      ) : null}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <h4
                        className="text-sm font-bold text-neutral-100 truncate group-hover:text-white transition-colors"
                        title={info.title}
                      >
                        {info.title}
                      </h4>
                      <p className="text-xs text-neutral-400 truncate mt-0.5 flex items-center gap-2">
                        <span>{info.uploader || 'Video source'}</span>
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        {item.sending ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#ccff00]">
                            <Icon name="up" size={12} className="animate-bounce" />
                            <span>Sending to clipper…</span>
                          </span>
                        ) : info.is_live ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                            <span>Live now</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#ccff00] bg-[#ccff00]/10 border border-[#ccff00]/25 px-2 py-0.5 rounded-full">
                            <Icon name="check" size={11} />
                            <span>Ready</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Remove Action */}
                    {!item.sending && !isSubmitting && (
                      <button
                        type="button"
                        onClick={() => removeStagedItem(item.id)}
                        className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                        title={`Remove ${info.title}`}
                      >
                        <Icon name="x" size={16} />
                      </button>
                    )}
                  </div>
                );
              }

              // 4. Staged File
              if (item.kind === 'file') {
                return (
                  <div
                    key={item.id}
                    className="bg-neutral-950/70 border border-neutral-800/90 rounded-xl p-3 flex items-center gap-3.5 relative overflow-hidden group hover:border-neutral-700 transition-colors"
                  >
                    <div className="w-28 sm:w-32 aspect-video rounded-lg bg-neutral-900 overflow-hidden relative flex-shrink-0 border border-neutral-800 flex items-center justify-center text-neutral-400">
                      <video
                        src={`${item.src}#t=1`}
                        muted
                        preload="metadata"
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-neutral-100 truncate" title={item.file.name}>
                        {item.file.name}
                      </h4>
                      <p className="text-xs text-neutral-400 truncate mt-0.5">
                        {fmtSize(item.file.size)} · Local video file
                      </p>

                      {item.state === 'up' && (
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-[11px] text-neutral-400">
                            <span>Uploading…</span>
                            <span>{item.pct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#ccff00] transition-all duration-200"
                              style={{ width: `${item.pct}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {item.state === 'error' && (
                        <p className="text-xs text-red-400 mt-1 font-medium">{item.err || 'Upload failed'}</p>
                      )}

                      {item.state === 'ready' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#ccff00] bg-[#ccff00]/10 border border-[#ccff00]/25 px-2 py-0.5 rounded-full mt-1">
                          <Icon name="check" size={11} />
                          <span>Ready to upload</span>
                        </span>
                      )}
                    </div>

                    {item.state !== 'up' && !isSubmitting && (
                      <button
                        type="button"
                        onClick={() => removeStagedItem(item.id)}
                        className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                        title={`Remove ${item.file.name}`}
                      >
                        <Icon name="x" size={16} />
                      </button>
                    )}
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}

        {/* Toolbar: Upload file, Creator selector, Options toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="video/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting || stagedItems.length >= 5}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/70 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 font-medium transition-colors cursor-pointer disabled:opacity-40"
            >
              <Icon name="up" size={14} />
              <span>Upload video file</span>
            </button>

            {/* Creator selector */}
            {creators.length > 0 && (
              <select
                value={creatorId}
                onChange={(e) => setCreatorId(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-800/70 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 font-medium transition-colors focus:outline-none cursor-pointer"
              >
                <option value="">No creator (Default)</option>
                {creators.map((c) => (
                  <option key={c.id} value={c.id}>
                    @{c.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setShowOptions((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/70 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 font-medium transition-colors cursor-pointer"
            >
              <Icon name="sliders" size={14} />
              <span>Options</span>
            </button>
          </div>

          <div className="text-neutral-500 text-xs hidden sm:block">
            Supports MP4, MOV, MKV up to 4K
          </div>
        </div>

        {/* Expandable Options Drawer */}
        {showOptions && (
          <div className="pt-3 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs animate-fadeIn">
            <div>
              <label className="block text-neutral-400 font-semibold mb-1.5">Caption Style</label>
              <div className="flex gap-1.5 flex-wrap">
                {['bounce', 'hype', 'clean', 'none'].map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setCaptionStyle(style)}
                    className={`px-2.5 py-1 rounded-lg capitalize border font-medium transition-all cursor-pointer ${
                      captionStyle === style
                        ? 'bg-neutral-800 border-[#ccff00] text-white font-semibold'
                        : 'border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 font-semibold mb-1.5">Clip Target Length</label>
              <div className="flex gap-1.5">
                {[
                  { id: '30', label: '30s' },
                  { id: '60', label: '60s' },
                  { id: '90', label: '90s' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setTargetDuration(d.id)}
                    className={`px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                      targetDuration === d.id
                        ? 'bg-neutral-800 border-[#ccff00] text-white font-semibold'
                        : 'border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 font-semibold mb-1.5">Layout Mode</label>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { id: 'blur', label: 'Blur fill' },
                  { id: 'zoom', label: 'Zoom' },
                  { id: 'crop', label: 'Crop' },
                ].map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setSelectedLayout(l.id)}
                    className={`px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                      selectedLayout === l.id
                        ? 'bg-neutral-800 border-[#ccff00] text-white font-semibold'
                        : 'border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 font-semibold mb-1.5">Layout Studio</label>
              <a
                href={urlInput.trim() ? `/app/layout-studio/draft?url=${encodeURIComponent(urlInput.trim())}` : "/app/layout-studio/draft"}
                onClick={() => {
                  try {
                    const u = urlInput.trim();
                    if (u) {
                      localStorage.setItem("peakcut_active_draft", JSON.stringify({source: {key: u, url: u, title: u}, layout: undefined}));
                      sessionStorage.setItem("peakcut_link", u);
                    }
                  } catch {}
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-white font-semibold border border-neutral-700 transition-colors"
              >
                <span>Customize 9:16 layout</span>
                <span className="text-[#ccff00]">→</span>
              </a>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
