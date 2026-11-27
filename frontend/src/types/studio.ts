export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_admin: boolean;
  verified: boolean;
}

export interface AiStatus {
  ready: boolean;
  provider?: string;
  today_calls?: number;
  problem?: string;
}

export interface Status {
  user?: User;
  ai?: AiStatus;
  no_ffmpeg?: boolean;
  disk_full?: boolean;
  accounts?: boolean;
  unread?: number;
}

export interface Destination {
  account_name: string;
  platform: string;
  status: 'scheduled' | 'posting' | 'posted' | 'failed' | 'cancelled' | string;
  url?: string;
  due_at: number;
  error?: string;
}

export interface Clip {
  id: string;
  version: number;
  status: 'queued' | 'rendering' | 'done' | 'error' | string;
  score: number;
  start: number;
  end: number;
  hook?: string;
  title?: string;
  description?: string;
  hashtags?: string[];
  file?: string;
  cover?: string;
  posts?: Record<string, Destination>;
}

export interface JobSource {
  type: 'file' | 'link' | string;
  name?: string;
  url?: string;
}

export interface Job {
  id: string;
  status: 'queued' | 'running' | 'done' | 'error' | 'live' | string;
  title?: string;
  source: JobSource;
  duration?: number;
  took?: number;
  kind?: string;
  stage?: string;
  progress?: number;
  error?: string;
  clips: Clip[];
  ai?: { note?: string };
  creator?: string;
  thumb?: boolean;
  uploader?: string;
}

export interface CreatorProfile {
  platform?: string;
  name?: string;
  followers?: string;
  pic?: string;
  channel?: string;
  at?: number;
  live?: boolean;
  viewers?: number | null;
  title?: string;
  started?: number | null;
  embed?: string;
  live_at?: number;
}

export interface Creator {
  id: string;
  name: string;
  channel?: string;
  channels?: Record<string, string>;
  profile?: CreatorProfile;
  profiles?: Record<string, CreatorProfile>;
  live_job?: string | null;
  auto_watch?: boolean;
  ai_every_min?: number;
  live_per_hour?: number;
  decide_mode?: string;
  min_score?: number;
  must_clip_min?: number;
  min_gap_min?: number;
  trigger_words?: string;
  captions?: boolean;
  style?: string;
  layout?: string;
  facecam_pos?: string;
  min_len?: number;
  max_len?: number;
  accounts?: string[];
  post_min_score?: number;
  post_gap_min?: number;
  daily_cap?: number;
  privacy?: string;
  rate_per_1k?: number;
  post_footer?: string;
  log?: { t: number; msg: string }[];
  pic?: string;
  created?: number;
}

export interface QueuePost extends Destination {
  id: string;
  clip_id: string;
  job_id: string;
  title: string;
  creator_name?: string;
  views?: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  text: string;
  link?: string;
  created_at: number;
  read: boolean;
}

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutConfig {
  preset?: string;
  regions: {
    facecam?: CropRect;
    gameplay?: CropRect;
    [key: string]: CropRect | undefined;
  };
  active_layer?: string;
  background?: {
    type: 'color' | 'blur';
    color?: string;
  };
  hook?: {
    enabled: boolean;
    y: number;
  };
  captions?: {
    enabled: boolean;
    y: number;
  };
  quality?: number;
}
