import React, { useState, useEffect, useMemo } from 'react';
import type { Creator, Job, CreatorProfile } from '../../types/studio';
import { useStudio } from '../../context/StudioContext';
import { send, api, formatDuration } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Icon } from '../common/Icon';
import { VideoGroup } from '../library/VideoGroup';
import { IntakeCard } from '../intake/IntakeCard';

// Platform definitions matching PeakCut
const PLATFORMS: Record<
  string,
  { name: string; bg: string; fg: string; hint: string; iconPath: string }
> = {
  youtube: {
    name: 'YouTube',
    bg: '#FF0000',
    fg: '#FFFFFF',
    hint: 'https://www.youtube.com/@name',
    iconPath:
      'M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z',
  },
  twitch: {
    name: 'Twitch',
    bg: '#9146FF',
    fg: '#FFFFFF',
    hint: 'https://www.twitch.tv/name',
    iconPath:
      'M11.57 4.71h1.72v5.15h-1.72zm4.72 0H18v5.15h-1.71zM6 0 1.71 4.29v15.42h5.15V24l4.28-4.29h3.43L22.29 12V0zm14.57 11.14-3.43 3.43h-3.43l-3 3v-3H6.86V1.71h13.71z',
  },
  kick: {
    name: 'Kick',
    bg: '#0B0E0F',
    fg: '#53FC18',
    hint: 'https://kick.com/name',
    iconPath:
      'M1.5 1.5h7v6h2.5V5h2.5V2.5H16v-1h6.5v7H20V11h-2.5v2H20v2.5h2.5v7H16v-1h-2.5V19H11v-2.5H8.5v6h-7z',
  },
};

function costHint(every: number): string {
  const ev = Number(every) || 3;
  return `About ${Math.round((60 / ev) * 2)} AI calls per live hour at most. Each check covers everything since the last one, so slower checks don't miss moments; they find them later.`;
}

function formatRelativeTime(ts: number): string {
  if (!ts) return '';
  const diffSec = Math.max(0, Math.round(Date.now() / 1000 - ts));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const d = new Date(ts * 1000);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const CreatorDetail: React.FC<{ creator: Creator }> = ({ creator }) => {
  const { jobs, creatorTab, setCreatorTab, refreshAll, setView } = useStudio();
  const { toast } = useToast();

  // Inputs for connecting new channels
  const [connectInputs, setConnectInputs] = useState<Record<string, string>>({
    youtube: '',
    twitch: '',
    kick: '',
  });
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  // Form state for Setup tab
  const [formData, setFormData] = useState({
    auto_watch: creator.auto_watch ?? false,
    ai_every_min: creator.ai_every_min ?? 3,
    live_per_hour: creator.live_per_hour ?? 4,
    decide_mode: creator.decide_mode ?? 'both',
    min_score: creator.min_score ?? 80,
    must_clip_min: creator.must_clip_min ?? 0,
    min_gap_min: creator.min_gap_min ?? 2,
    trigger_words: creator.trigger_words ?? 'clip that, clip it',
    captions: creator.captions ?? true,
    style: creator.style ?? 'bounce',
    layout: creator.layout ?? 'blur',
    facecam_pos: creator.facecam_pos ?? 'top',
    min_len: creator.min_len ?? 15,
    max_len: creator.max_len ?? 60,
    accounts: creator.accounts ?? [],
    post_min_score: creator.post_min_score ?? 75,
    post_gap_min: creator.post_gap_min ?? 45,
    daily_cap: creator.daily_cap ?? 6,
    privacy: creator.privacy ?? 'public',
    post_footer: creator.post_footer ?? '',
  });

  const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Sync formData when creator changes
  useEffect(() => {
    setFormData({
      auto_watch: creator.auto_watch ?? false,
      ai_every_min: creator.ai_every_min ?? 3,
      live_per_hour: creator.live_per_hour ?? 4,
      decide_mode: creator.decide_mode ?? 'both',
      min_score: creator.min_score ?? 80,
      must_clip_min: creator.must_clip_min ?? 0,
      min_gap_min: creator.min_gap_min ?? 2,
      trigger_words: creator.trigger_words ?? 'clip that, clip it',
      captions: creator.captions ?? true,
      style: creator.style ?? 'bounce',
      layout: creator.layout ?? 'blur',
      facecam_pos: creator.facecam_pos ?? 'top',
      min_len: creator.min_len ?? 15,
      max_len: creator.max_len ?? 60,
      accounts: creator.accounts ?? [],
      post_min_score: creator.post_min_score ?? 75,
      post_gap_min: creator.post_gap_min ?? 45,
      daily_cap: creator.daily_cap ?? 6,
      privacy: creator.privacy ?? 'public',
      post_footer: creator.post_footer ?? '',
    });
  }, [creator]);

  // Load connected posting accounts
  useEffect(() => {
    api<any[]>('/api/accounts')
      .then((accs) => setAvailableAccounts(accs || []))
      .catch(() => {});
  }, []);

  // Determine if form has unsaved changes
  const isDirty = useMemo(() => {
    return (
      formData.auto_watch !== (creator.auto_watch ?? false) ||
      formData.ai_every_min !== (creator.ai_every_min ?? 3) ||
      formData.live_per_hour !== (creator.live_per_hour ?? 4) ||
      formData.decide_mode !== (creator.decide_mode ?? 'both') ||
      formData.min_score !== (creator.min_score ?? 80) ||
      formData.must_clip_min !== (creator.must_clip_min ?? 0) ||
      formData.min_gap_min !== (creator.min_gap_min ?? 2) ||
      formData.trigger_words !== (creator.trigger_words ?? 'clip that, clip it') ||
      formData.captions !== (creator.captions ?? true) ||
      formData.style !== (creator.style ?? 'bounce') ||
      formData.layout !== (creator.layout ?? 'blur') ||
      formData.facecam_pos !== (creator.facecam_pos ?? 'top') ||
      formData.min_len !== (creator.min_len ?? 15) ||
      formData.max_len !== (creator.max_len ?? 60) ||
      formData.post_min_score !== (creator.post_min_score ?? 75) ||
      formData.post_gap_min !== (creator.post_gap_min ?? 45) ||
      formData.daily_cap !== (creator.daily_cap ?? 6) ||
      formData.privacy !== (creator.privacy ?? 'public') ||
      formData.post_footer !== (creator.post_footer ?? '') ||
      JSON.stringify(formData.accounts) !== JSON.stringify(creator.accounts ?? [])
    );
  }, [formData, creator]);

  const creatorJobs = jobs.filter((j) => j.creator === creator.id);
  const liveJob = creator.live_job ? jobs.find((j) => j.id === creator.live_job) : null;

  // Find if creator is currently live on any platform
  const liveProfiles = Object.entries(creator.profiles || {}).filter(([_, p]) => p.live);
  const activeLiveProfile = liveProfiles.length ? liveProfiles[0][1] : null;

  // --- Handlers ---

  const handleConnectChannel = async (platform: string) => {
    const url = connectInputs[platform]?.trim();
    if (!url) return;
    setConnectingPlatform(platform);
    try {
      const newChannels = { ...(creator.channels || {}), [platform]: url };
      await send(
        `/api/creators/${encodeURIComponent(creator.id)}`,
        {
          channels: newChannels,
          channel: creator.channel || url,
        },
        'PUT'
      );
      toast(`Connected ${PLATFORMS[platform].name} channel. Fetching live status…`, 'ok');
      setConnectInputs((prev) => ({ ...prev, [platform]: '' }));
      await refreshAll();
    } catch (err: any) {
      toast(err.message || `Failed to connect ${platform} channel`, 'bad');
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleRemoveChannel = async (platform: string) => {
    if (!window.confirm(`Disconnect this ${PLATFORMS[platform]?.name || platform} channel?`)) return;
    try {
      const newChannels = { ...(creator.channels || {}) };
      delete newChannels[platform];
      let newMain = creator.channel;
      if (newMain === creator.channels?.[platform]) {
        newMain = Object.values(newChannels)[0] || '';
      }
      await send(
        `/api/creators/${encodeURIComponent(creator.id)}`,
        {
          channels: newChannels,
          channel: newMain,
        },
        'PUT'
      );
      toast(`Disconnected ${PLATFORMS[platform]?.name || platform} channel`, 'ok');
      await refreshAll();
    } catch (err: any) {
      toast(err.message || 'Failed to remove channel', 'bad');
    }
  };

  const handleSetMainChannel = async (channelUrl: string) => {
    try {
      await send(
        `/api/creators/${encodeURIComponent(creator.id)}`,
        { channel: channelUrl },
        'PUT'
      );
      toast('Recording source updated', 'ok');
      await refreshAll();
    } catch (err: any) {
      toast(err.message || 'Failed to update channel', 'bad');
    }
  };

  const handleStartLive = async (channelUrl?: string) => {
    try {
      await send(
        `/api/creators/${encodeURIComponent(creator.id)}/live`,
        channelUrl ? { channel: channelUrl } : {}
      );
      toast(`Recording started for ${creator.name}`, 'ok');
      setCreatorTab('clips');
      await refreshAll();
    } catch (err: any) {
      toast(err.message || 'Failed to start recording', 'bad');
    }
  };

  const handleStopLive = async () => {
    if (!creator.live_job) return;
    if (!window.confirm('Stop recording? Clips already made are kept.')) return;
    try {
      await send(`/api/live/${encodeURIComponent(creator.live_job)}/stop`, {});
      toast('Recording stopped. Clips already made are kept.', 'ok');
      await refreshAll();
    } catch (err: any) {
      toast(err.message || 'Failed to stop recording', 'bad');
    }
  };

  const handleClipLive = async (seconds: number) => {
    if (!creator.live_job) return;
    try {
      await send(`/api/live/${encodeURIComponent(creator.live_job)}/clip`, { seconds });
      toast(`Clipping the last ${seconds} seconds…`, 'ok');
    } catch (err: any) {
      toast(err.message || 'Failed to request clip', 'bad');
    }
  };

  const handleSaveSetup = async () => {
    setIsSaving(true);
    try {
      await send(`/api/creators/${encodeURIComponent(creator.id)}`, formData, 'PUT');
      toast('Saved creator settings', 'ok');
      await refreshAll();
    } catch (err: any) {
      toast(err.message || 'Failed to save settings', 'bad');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardSetup = () => {
    setFormData({
      auto_watch: creator.auto_watch ?? false,
      ai_every_min: creator.ai_every_min ?? 3,
      live_per_hour: creator.live_per_hour ?? 4,
      decide_mode: creator.decide_mode ?? 'both',
      min_score: creator.min_score ?? 80,
      must_clip_min: creator.must_clip_min ?? 0,
      min_gap_min: creator.min_gap_min ?? 2,
      trigger_words: creator.trigger_words ?? 'clip that, clip it',
      captions: creator.captions ?? true,
      style: creator.style ?? 'bounce',
      layout: creator.layout ?? 'blur',
      facecam_pos: creator.facecam_pos ?? 'top',
      min_len: creator.min_len ?? 15,
      max_len: creator.max_len ?? 60,
      accounts: creator.accounts ?? [],
      post_min_score: creator.post_min_score ?? 75,
      post_gap_min: creator.post_gap_min ?? 45,
      daily_cap: creator.daily_cap ?? 6,
      privacy: creator.privacy ?? 'public',
      post_footer: creator.post_footer ?? '',
    });
    toast('Changes discarded', 'ok');
  };

  const handleDeleteCreator = async () => {
    const typed = window.prompt(`Type "${creator.name}" to confirm deleting this creator and all their clips:`);
    if (typed?.trim().toLowerCase() !== creator.name.toLowerCase()) {
      toast('Creator deletion cancelled', 'bad');
      return;
    }
    try {
      await api(`/api/creators/${encodeURIComponent(creator.id)}`, { method: 'DELETE' });
      toast(`Deleted creator ${creator.name}`, 'ok');
      setView('overview');
      await refreshAll();
    } catch (err: any) {
      toast(err.message || 'Failed to delete creator', 'bad');
    }
  };

  const avatarUrl = `/api/creators/${encodeURIComponent(creator.id)}/avatar?v=${creator.created || 1}`;

  return (
    <div className="space-y-6 pb-20">
      {/* ===================== CREATOR HEADER ===================== */}
      <section className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xl font-bold text-white flex-shrink-0 overflow-hidden shadow-inner">
              <img
                src={avatarUrl}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <span className="uppercase">{creator.name.slice(0, 1)}</span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold tracking-tight text-white truncate">
                  {creator.name}
                </h2>
                {activeLiveProfile && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Live now
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 truncate mt-0.5">
                {activeLiveProfile?.followers ||
                  (creator.channel ? creator.channel : 'No stream connected yet')}
              </p>
            </div>
          </div>

          {/* Header Action Button */}
          <div className="flex items-center gap-3">
            {creator.live_job ? (
              <button
                onClick={handleStopLive}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-colors"
              >
                <Icon name="stop" size={16} />
                Stop recording
              </button>
            ) : (
              <button
                onClick={() => handleStartLive(creator.channel)}
                disabled={!creator.channels || !Object.keys(creator.channels).length}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ccff00] hover:bg-[#bde900] text-neutral-950 text-xs font-bold shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Icon name="radio" size={16} />
                Start recording
              </button>
            )}
          </div>
        </div>

        {/* Creator Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-neutral-800/80" role="tablist">
          {(['clips', 'setup', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={creatorTab === tab}
              onClick={() => setCreatorTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                creatorTab === tab
                  ? 'bg-neutral-800 text-white font-bold shadow-sm border border-neutral-700'
                  : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {/* ===================== LIVE RECORDING RUNNING CARD ===================== */}
      {creatorTab === 'clips' && liveJob && (
        <section className="bg-neutral-900/90 border border-red-500/40 rounded-2xl p-6 backdrop-blur-md space-y-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  Live
                </span>
                <h3 className="text-base font-bold text-white">
                  {liveJob.title || liveJob.source?.name || 'Live Recording'}
                </h3>
              </div>
              <p className="text-xs text-neutral-400">
                {liveJob.uploader ? `${liveJob.uploader} · ` : ''}
                {liveJob.stage || 'Recording highlights as they happen'}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleClipLive(30)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ccff00] hover:bg-[#bde900] text-neutral-950 text-xs font-bold transition-all shadow-sm"
              >
                <Icon name="scissors" size={14} />
                Clip last 30s
              </button>
              <button
                onClick={() => handleClipLive(60)}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-all border border-neutral-700"
              >
                Last 60s
              </button>
              <button
                onClick={handleStopLive}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all"
              >
                <Icon name="stop" size={14} />
                Stop
              </button>
            </div>
          </div>

          {/* Live Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-neutral-800">
            <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/80">
              <div className="text-sm font-bold text-white">
                {formatDuration((liveJob as any).live?.elapsed || liveJob.duration || 0)}
              </div>
              <div className="text-[11px] text-neutral-400">Recorded duration</div>
            </div>
            <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/80">
              <div className="text-sm font-bold text-white">
                {Math.round(((liveJob as any).live?.buffer_sec || 1200) / 60)} min
              </div>
              <div className="text-[11px] text-neutral-400">Kept in buffer</div>
            </div>
            <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/80">
              <div className="text-sm font-bold text-white">
                {(liveJob as any).live?.checks || 0}
              </div>
              <div className="text-[11px] text-neutral-400">AI calls made</div>
            </div>
            <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/80">
              <div className="text-sm font-bold text-[#ccff00]">
                {liveJob.clips?.length || 0}
              </div>
              <div className="text-[11px] text-neutral-400">Clips produced</div>
            </div>
          </div>
        </section>
      )}

      {/* ===================== TAB 1: CLIPS ===================== */}
      {creatorTab === 'clips' && (
        <div className="space-y-6">
          {/* Intake Card specifically for this creator */}
          <IntakeCard defaultCreatorId={creator.id} />

          {/* Videos and Clips Stream */}
          <div className="space-y-6">
            {!creatorJobs.length ? (
              <div className="p-16 text-center bg-neutral-900/40 border border-neutral-800/80 rounded-2xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-800 text-[#ccff00] mx-auto flex items-center justify-center font-bold text-lg">
                  <Icon name="scissors" size={22} />
                </div>
                <h3 className="text-base font-bold text-white">No clips for {creator.name} yet</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Start recording their live stream, or paste a link to one of their videos above to generate clips.
                </p>
              </div>
            ) : (
              creatorJobs.map((j) => <VideoGroup key={j.id} job={j} />)
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 2: SETUP ===================== */}
      {creatorTab === 'setup' && (
        <div className="space-y-6 max-w-4xl">
          {/* CARD 1: Their stream */}
          <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl p-6 backdrop-blur-md space-y-5">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Their stream</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Where to record from, and whether to start by itself.
              </p>
            </div>

            {/* Platform Channel Rows */}
            <div className="space-y-3">
              {Object.entries(PLATFORMS).map(([platformKey, plat]) => {
                const connectedUrl = creator.channels?.[platformKey];
                const profile = (creator.profiles || {})[platformKey];
                const isConnected = !!connectedUrl;
                const isMain = creator.channel === connectedUrl;
                const isConnecting = connectingPlatform === platformKey;

                return (
                  <div
                    key={platformKey}
                    className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800/80"
                  >
                    {/* Platform Logo Badge */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: plat.bg, color: plat.fg }}
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d={plat.iconPath} />
                        </svg>
                      </span>

                      {/* Connected Channel Details */}
                      {isConnected ? (
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {profile?.pic && (
                            <img
                              src={`/api/creators/${encodeURIComponent(creator.id)}/avatar?p=${platformKey}&v=${profile.at || 1}`}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover border border-neutral-700 flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-white truncate">
                              {profile?.name || connectedUrl}
                            </div>
                            <div className="text-[11px] text-neutral-400 truncate">
                              {profile?.followers ? `${plat.name} · ${profile.followers}` : plat.name}
                            </div>
                          </div>

                          {/* Live Status Badge */}
                          {profile?.live ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              Live{profile.viewers ? ` · ${profile.viewers.toLocaleString()}` : ''}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-800 text-neutral-400">
                              Offline
                            </span>
                          )}

                          {/* Record from selector */}
                          {creator.channels && Object.keys(creator.channels).length > 1 && (
                            <label className="flex items-center gap-1.5 text-xs text-neutral-300 cursor-pointer ml-2">
                              <input
                                type="radio"
                                name="mainChannel"
                                checked={isMain}
                                onChange={() => handleSetMainChannel(connectedUrl)}
                                className="accent-[#ccff00]"
                              />
                              Record from
                            </label>
                          )}

                          {/* Remove Channel Button */}
                          <button
                            onClick={() => handleRemoveChannel(platformKey)}
                            className="p-1 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-800/80 transition-colors ml-1"
                            title={`Remove ${plat.name} channel`}
                          >
                            <Icon name="x" size={16} />
                          </button>
                        </div>
                      ) : (
                        /* Unconnected Channel Input Form */
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleConnectChannel(platformKey);
                          }}
                          className="flex items-center gap-2 flex-1 min-w-0"
                        >
                          <input
                            type="text"
                            value={connectInputs[platformKey] || ''}
                            onChange={(e) =>
                              setConnectInputs((prev) => ({
                                ...prev,
                                [platformKey]: e.target.value,
                              }))
                            }
                            placeholder={plat.hint}
                            className="flex-1 min-w-0 px-3 py-1.5 text-xs rounded-lg bg-neutral-900 border border-neutral-700/80 text-white placeholder-neutral-500 focus:outline-none focus:border-[#ccff00]"
                          />
                          <button
                            type="submit"
                            disabled={isConnecting || !connectInputs[platformKey]?.trim()}
                            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold border border-neutral-700 disabled:opacity-40 transition-colors flex-shrink-0"
                          >
                            {isConnecting ? 'Checking…' : 'Connect'}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Auto Watch Toggle */}
            <div className="pt-4 border-t border-neutral-800/80">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.auto_watch}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, auto_watch: e.target.checked }))
                  }
                  className="mt-1 w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-[#ccff00] focus:ring-[#ccff00] accent-[#ccff00]"
                />
                <div className="text-xs">
                  <span className="font-semibold text-white block">
                    Record automatically when they go live
                  </span>
                  <span className="text-neutral-400 text-[11px] block mt-0.5">
                    Checks straight away, then every two minutes.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* CARD 2: How the AI decides */}
          <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl p-6 backdrop-blur-md space-y-5">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">How the AI decides</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Two separate AI checks. The words judge reads only what was said. The reaction judge sees only how loud the streamer got and how busy chat was, never the words.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Check live stream every */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="font-medium text-neutral-300">Check the live stream every</label>
                <select
                  value={formData.ai_every_min}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, ai_every_min: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-[#ccff00]"
                >
                  <option value={1}>1 minute</option>
                  <option value={2}>2 minutes</option>
                  <option value={3}>3 minutes (Recommended)</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                </select>
                <p className="text-[11px] text-neutral-400 mt-1">
                  {costHint(formData.ai_every_min)}
                </p>
              </div>

              {/* Informational callout */}
              <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/80 md:col-span-2 text-[11px] text-neutral-400">
                On top of that, the AI always looks straight away when the stream suddenly gets louder or chat gets busier, and when someone says &quot;clip&quot; or &quot;clip it&quot;.
              </div>

              {/* Most live clips per hour */}
              <div className="space-y-1.5">
                <label className="font-medium text-neutral-300">Most live clips per hour</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={formData.live_per_hour}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, live_per_hour: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-[#ccff00]"
                />
              </div>

              {/* Make a clip when */}
              <div className="space-y-1.5">
                <label className="font-medium text-neutral-300">Make a clip when</label>
                <select
                  value={formData.decide_mode}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, decide_mode: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-[#ccff00]"
                >
                  <option value="both">Both judges say yes</option>
                  <option value="either">Both say yes, or words judge is very sure (90+)</option>
                </select>
              </div>

              {/* Words judge must score at least */}
              <div className="space-y-1.5">
                <label className="font-medium text-neutral-300">Words judge must score at least</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.min_score}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, min_score: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-[#ccff00]"
                />
              </div>

              {/* Minimum gap between live clips */}
              <div className="space-y-1.5">
                <label className="font-medium text-neutral-300">Minimum gap between clips (minutes)</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={formData.min_gap_min}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, min_gap_min: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-[#ccff00]"
                />
              </div>

              {/* Trigger words */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="font-medium text-neutral-300">
                  Always clip the last 30 seconds when someone says
                </label>
                <input
                  type="text"
                  value={formData.trigger_words}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, trigger_words: e.target.value }))
                  }
                  placeholder="clip that, clip it"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-[#ccff00]"
                />
                <span className="text-[11px] text-neutral-400 block mt-1">
                  Separate phrases with commas. Matched on the transcript, so it needs no AI call.
                </span>
              </div>
            </div>
          </div>

          {/* CARD 3: Clips */}
          <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl p-6 backdrop-blur-md space-y-5">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Clips</h3>
              <p className="text-xs text-neutral-400 mt-1">How this creator&apos;s clips look.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Captions toggle */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.captions}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, captions: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 accent-[#ccff00]"
                  />
                  <span className="font-semibold text-white">Generate captions</span>
                </label>
              </div>

              {/* Caption style */}
              <div className="space-y-1.5">
                <label className="font-medium text-neutral-300">Caption style</label>
                <select
                  disabled={!formData.captions}
                  value={formData.style}
                  onChange={(e) => setFormData((prev) => ({ ...prev, style: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-[#ccff00] disabled:opacity-40"
                >
                  <option value="bounce">Bounce</option>
                  <option value="hype">Hype</option>
                  <option value="clean">Clean</option>
                </select>
              </div>

              {/* Layout */}
              <div className="space-y-1.5">
                <label className="font-medium text-neutral-300">Layout</label>
                <select
                  value={formData.layout}
                  onChange={(e) => setFormData((prev) => ({ ...prev, layout: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-[#ccff00]"
                >
                  <option value="blur">Full frame + blurred fill</option>
                  <option value="zoom">Zoomed in + blurred fill</option>
                  <option value="crop">Fill the screen (centre crop)</option>
                  <option value="gameplay">Gameplay + facecam split</option>
                </select>
              </div>

              {/* Facecam Position */}
              {formData.layout === 'gameplay' && (
                <div className="space-y-1.5">
                  <label className="font-medium text-neutral-300">Facecam position</label>
                  <select
                    value={formData.facecam_pos}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, facecam_pos: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-[#ccff00]"
                  >
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
              )}

              {/* Target Duration */}
              <div className="space-y-1.5">
                <label className="font-medium text-neutral-300">Max clip length (seconds)</label>
                <input
                  type="number"
                  min={10}
                  max={180}
                  value={formData.max_len}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, max_len: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-[#ccff00]"
                />
              </div>
            </div>
          </div>

          {/* CARD 4: Publishing */}
          <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl p-6 backdrop-blur-md space-y-5">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Publishing</h3>
              <p className="text-xs text-neutral-400 mt-1">Connected accounts to post to.</p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Account Checkboxes */}
              <div>
                <label className="font-medium text-neutral-300 block mb-2">Connected Accounts</label>
                {availableAccounts.length ? (
                  <div className="space-y-2">
                    {availableAccounts.map((acc) => {
                      const isChecked = formData.accounts.includes(acc.id);
                      return (
                        <label
                          key={acc.id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData((prev) => ({
                                ...prev,
                                accounts: checked
                                  ? [...prev.accounts, acc.id]
                                  : prev.accounts.filter((id) => id !== acc.id),
                              }));
                            }}
                            className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 accent-[#ccff00]"
                          />
                          <span className="font-semibold text-white">{acc.name}</span>
                          <span className="text-[11px] text-neutral-400 capitalize">
                            ({acc.platform})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-neutral-500 text-[11px] p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                    No accounts connected yet. Connect your YouTube, Instagram, or TikTok under Settings.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Min score to post */}
                <div className="space-y-1.5">
                  <label className="font-medium text-neutral-300">Only post clips scoring at least</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.post_min_score}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, post_min_score: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-[#ccff00]"
                  />
                </div>

                {/* Minutes between posts */}
                <div className="space-y-1.5">
                  <label className="font-medium text-neutral-300">Minutes between posts on one account</label>
                  <input
                    type="number"
                    min={5}
                    value={formData.post_gap_min}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, post_gap_min: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-[#ccff00]"
                  />
                </div>

                {/* Daily cap */}
                <div className="space-y-1.5">
                  <label className="font-medium text-neutral-300">Most posts per account per day</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.daily_cap}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, daily_cap: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-[#ccff00]"
                  />
                </div>

                {/* Privacy */}
                <div className="space-y-1.5">
                  <label className="font-medium text-neutral-300">Who can see posts</label>
                  <select
                    value={formData.privacy}
                    onChange={(e) => setFormData((prev) => ({ ...prev, privacy: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-[#ccff00]"
                  >
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                {/* Post Footer */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="font-medium text-neutral-300">
                    Line added to every post (credit, campaign tag)
                  </label>
                  <input
                    type="text"
                    value={formData.post_footer}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, post_footer: e.target.value }))
                    }
                    placeholder="Clipped from @streamer"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-[#ccff00]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CARD 5: Danger Zone - Delete Creator */}
          <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <div>
              <h3 className="text-base font-bold text-red-400">Delete this creator</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Removes {creator.name}, their settings, and every video and clip filed under them. This cannot be undone.
              </p>
            </div>
            <button
              onClick={handleDeleteCreator}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold transition-all shadow-sm"
            >
              <Icon name="trash" size={16} />
              Delete creator
            </button>
          </div>

          {/* STICKY BOTTOM SAVE BAR */}
          {isDirty && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 rounded-2xl bg-neutral-900/95 border border-neutral-700 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                <Icon name="warn" size={16} />
                You have unsaved changes
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDiscardSetup}
                  className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveSetup}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#ccff00] hover:bg-[#bde900] text-neutral-950 text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  <Icon name="check" size={16} />
                  {isSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 3: ACTIVITY ===================== */}
      {creatorTab === 'activity' && (
        <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl p-6 backdrop-blur-md space-y-5 max-w-4xl">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Activity Log</h3>
            <p className="text-xs text-neutral-400 mt-1">
              Recordings, clips, and publishing activity for {creator.name}.
            </p>
          </div>

          <div className="space-y-2">
            {creator.log && creator.log.length ? (
              creator.log.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-baseline justify-between gap-4 p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/70 text-xs"
                >
                  <span className="text-neutral-200 flex-1 leading-relaxed">{entry.msg}</span>
                  <span className="text-[11px] text-neutral-500 font-mono flex-shrink-0">
                    {formatRelativeTime(entry.t)}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-xs text-neutral-500">
                Nothing has happened yet. Recordings, clips and posts for this creator will be listed here.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
