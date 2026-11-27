import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Status, Job, Creator, Clip } from '../types/studio';
import { api, send } from '../api/client';
import { useToast } from './ToastContext';

interface StudioContextValue {
  status: Status | null;
  jobs: Job[];
  creators: Creator[];
  view: string;
  creatorTab: 'clips' | 'setup' | 'activity';
  settingsTab: 'profile' | 'ai' | 'apps' | 'security' | 'storage';
  selectedIds: Set<string>;
  activeClip: { job: Job; clip: Clip } | null;
  setView: (v: string, pushHistory?: boolean) => void;
  setCreatorTab: (tab: 'clips' | 'setup' | 'activity') => void;
  setSettingsTab: (tab: 'profile' | 'ai' | 'apps' | 'security' | 'storage') => void;
  toggleSelect: (id: string) => void;
  clearSelect: () => void;
  refreshAll: () => Promise<void>;
  openClipModal: (jobId: string, clipId: string) => void;
  closeClipModal: () => void;
  cancelJob: (jobId: string) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
  deleteClip: (jobId: string, clipId: string) => Promise<void>;
  deleteSelected: () => Promise<void>;
  downloadSelectedZip: () => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export const useStudio = () => {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used inside StudioProvider');
  return ctx;
};

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<Status | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [view, setViewInternal] = useState<string>('overview');
  const [creatorTab, setCreatorTab] = useState<'clips' | 'setup' | 'activity'>('clips');
  const [settingsTab, setSettingsTab] = useState<'profile' | 'ai' | 'apps' | 'security' | 'storage'>('profile');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeClip, setActiveClip] = useState<{ job: Job; clip: Clip } | null>(null);

  const { toast } = useToast();
  const syncVersionRef = useRef<number>(0);
  const unmountedRef = useRef<boolean>(false);

  // Sync routing from URL path
  const syncViewFromPath = useCallback(() => {
    const path = window.location.pathname;
    if (path.startsWith('/app/creators/')) {
      const parts = path.split('/');
      const cid = parts[3];
      const tab = (parts[4] as any) || 'clips';
      if (cid) {
        setViewInternal(`c:${decodeURIComponent(cid)}`);
        setCreatorTab(tab);
        return;
      }
    } else if (path.startsWith('/app/settings')) {
      const parts = path.split('/');
      const stab = (parts[3] as any) || 'profile';
      setViewInternal('settings');
      setSettingsTab(stab);
      return;
    } else if (path === '/app/videos') {
      setViewInternal('library');
      return;
    } else if (path === '/app/usage') {
      setViewInternal('usage');
      return;
    }
    setViewInternal('overview');
  }, []);

  const setView = useCallback((v: string, pushHistory: boolean = true) => {
    setViewInternal(v);
    if (pushHistory) {
      let targetUrl = '/app';
      if (v === 'library') targetUrl = '/app/videos';
      else if (v === 'settings') targetUrl = `/app/settings/${settingsTab}`;
      else if (v === 'usage') targetUrl = '/app/usage';
      else if (v.startsWith('c:')) targetUrl = `/app/creators/${encodeURIComponent(v.slice(2))}/${creatorTab}`;

      if (window.location.pathname !== targetUrl) {
        window.history.pushState({ view: v }, '', targetUrl);
      }
    }
  }, [settingsTab, creatorTab]);

  useEffect(() => {
    syncViewFromPath();
    const onPopState = () => syncViewFromPath();
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [syncViewFromPath]);

  // Fetch all core data
  const refreshAll = useCallback(async () => {
    try {
      const [st, jbs, crs] = await Promise.all([
        api<Status>('/api/status'),
        api<Job[]>('/api/jobs'),
        api<Creator[]>('/api/creators'),
      ]);
      setStatus(st);
      setJobs(jbs);
      setCreators(crs);
    } catch (e: any) {
      console.error('Failed to load initial studio data:', e);
    }
  }, []);

  // Initial load + long-poll /api/sync
  useEffect(() => {
    unmountedRef.current = false;
    refreshAll();

    let active = true;
    const pollSync = async () => {
      while (active && !unmountedRef.current) {
        try {
          const res = await api<{ bump?: number; sync?: number }>(
            `/api/sync?since=${syncVersionRef.current}`
          );
          if (res && res.sync != null) {
            syncVersionRef.current = res.sync;
          }
          if (active && res && (res.bump || res.sync !== syncVersionRef.current)) {
            await refreshAll();
          }
        } catch (err) {
          // Back off gently on error
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    };

    pollSync();

    return () => {
      active = false;
      unmountedRef.current = true;
    };
  }, [refreshAll]);

  // Selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelect = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Modals
  const openClipModal = useCallback(
    (jobId: string, clipId: string) => {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) return;
      const clip = job.clips.find((c) => c.id === clipId);
      if (!clip) return;
      setActiveClip({ job, clip });
    },
    [jobs]
  );

  const closeClipModal = useCallback(() => {
    setActiveClip(null);
  }, []);

  // Job and clip operations
  const cancelJob = useCallback(
    async (jobId: string) => {
      try {
        await send(`/api/jobs/${encodeURIComponent(jobId)}/cancel`, {});
        toast('Clipping job cancelled', 'ok');
        await refreshAll();
      } catch (e: any) {
        toast(e.message || 'Failed to cancel job', 'bad');
      }
    },
    [toast, refreshAll]
  );

  const deleteJob = useCallback(
    async (jobId: string) => {
      if (!window.confirm('Delete this video and all of its clips?')) return;
      try {
        await send('/api/bulk/delete', { jobs: [jobId], clips: [] });
        toast('Video deleted', 'ok');
        await refreshAll();
      } catch (e: any) {
        toast(e.message || 'Failed to delete video', 'bad');
      }
    },
    [toast, refreshAll]
  );

  const deleteClip = useCallback(
    async (jobId: string, clipId: string) => {
      if (!window.confirm('Delete this clip?')) return;
      try {
        await send('/api/bulk/delete', { jobs: [], clips: [`${jobId}:${clipId}`] });
        toast('Clip deleted', 'ok');
        if (activeClip?.clip.id === clipId) {
          setActiveClip(null);
        }
        await refreshAll();
      } catch (e: any) {
        toast(e.message || 'Failed to delete clip', 'bad');
      }
    },
    [activeClip, toast, refreshAll]
  );

  const deleteSelected = useCallback(async () => {
    if (!selectedIds.size) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected item(s)?`)) return;

    const jobsDel: string[] = [];
    const clipsDel: string[] = [];

    selectedIds.forEach((id) => {
      if (id.startsWith('j:')) jobsDel.push(id.slice(2));
      else if (id.startsWith('c:')) {
        const parts = id.slice(2).split(':');
        clipsDel.push(`${parts[0]}:${parts[1]}`);
      }
    });

    try {
      await send('/api/bulk/delete', { jobs: jobsDel, clips: clipsDel });
      toast('Selected items deleted', 'ok');
      clearSelect();
      await refreshAll();
    } catch (e: any) {
      toast(e.message || 'Failed to delete items', 'bad');
    }
  }, [selectedIds, toast, clearSelect, refreshAll]);

  const downloadSelectedZip = useCallback(() => {
    if (!selectedIds.size) return;
    const jobsDown: string[] = [];
    const clipsDown: string[] = [];

    selectedIds.forEach((id) => {
      if (id.startsWith('j:')) jobsDown.push(id.slice(2));
      else if (id.startsWith('c:')) {
        const parts = id.slice(2).split(':');
        clipsDown.push(`${parts[0]}:${parts[1]}`);
      }
    });

    const params = new URLSearchParams();
    if (jobsDown.length) params.set('jobs', jobsDown.join(','));
    if (clipsDown.length) params.set('clips', clipsDown.join(','));
    window.location.href = `/api/clips.zip?${params.toString()}`;
  }, [selectedIds]);

  return (
    <StudioContext.Provider
      value={{
        status,
        jobs,
        creators,
        view,
        creatorTab,
        settingsTab,
        selectedIds,
        activeClip,
        setView,
        setCreatorTab,
        setSettingsTab,
        toggleSelect,
        clearSelect,
        refreshAll,
        openClipModal,
        closeClipModal,
        cancelJob,
        deleteJob,
        deleteClip,
        deleteSelected,
        downloadSelectedZip,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
};
