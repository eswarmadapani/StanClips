import type { Destination } from '../types/studio';

export async function api<T = any>(path: string, opt: RequestInit = {}): Promise<T> {
  const r = await fetch(path, opt);
  if (r.status === 401) {
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Please sign in.');
  }
  if (!r.ok) {
    let d = r.statusText;
    try {
      const data = await r.json();
      d = data.detail || d;
    } catch {}
    throw new Error(typeof d === 'string' ? d : 'Something went wrong');
  }
  return r.json();
}

export function send<T = any>(path: string, body?: any, method: string = 'POST'): Promise<T> {
  return api<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

export function formatDuration(sec: number): string {
  if (sec == null || isNaN(sec)) return '0:00';
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}:${rm.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  }
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

export function formatClock(timestamp: number): string {
  if (!timestamp) return '';
  const d = new Date(timestamp * 1000);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function deliveryLabel(p: Destination, isPaused: boolean = false): string {
  if (p.status === 'scheduled') {
    if (isPaused) return 'Posting paused';
    if (p.error) return 'Retry at ' + formatClock(p.due_at);
    if (p.due_at <= Date.now() / 1000) return 'Waiting to upload';
    return 'Scheduled · ' + formatClock(p.due_at);
  }
  const map: Record<string, string> = {
    posting: 'Uploading',
    posted: 'Posted',
    failed: 'Failed',
    cancelled: 'Cancelled',
  };
  return map[p.status] || p.status;
}

export async function uploadVideoFile(
  file: File,
  onProgress: (pct: number, stage: string) => void,
  creatorId?: string,
  options: Record<string, any> = {}
): Promise<{ id: string }> {
  // If small file (< 32MB), upload directly via POST /api/upload
  const DIRECT_UPLOAD_LIMIT = 32 * 1024 * 1024;
  if (file.size <= DIRECT_UPLOAD_LIMIT) {
    onProgress(10, 'Uploading file…');
    const form = new FormData();
    form.append('file', file);
    if (creatorId) form.append('creator', creatorId);
    form.append('options', JSON.stringify(options));

    const xhr = new XMLHttpRequest();
    return new Promise((resolve, reject) => {
      xhr.open('POST', '/api/upload');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          onProgress(pct, `Uploading ${pct}%…`);
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            resolve({ id: '' });
          }
        } else {
          let msg = xhr.statusText || 'Upload failed';
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.detail) msg = data.detail;
          } catch {}
          reject(new Error(msg));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(form);
    });
  }

  // Chunked upload for larger files
  onProgress(2, 'Preparing upload…');
  const startRes = await send<{ id: string; part: number; parts: number }>('/api/upload/start', {
    name: file.name,
    size: file.size,
    creator: creatorId || '',
    options,
  });

  const upid = startRes.id;
  const partSize = startRes.part;
  const totalParts = startRes.parts;

  for (let i = 0; i < totalParts; i++) {
    const startByte = i * partSize;
    const endByte = Math.min(file.size, startByte + partSize);
    const chunk = file.slice(startByte, endByte);

    const res = await fetch(`/api/upload/${upid}/${i}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: chunk,
    });

    if (!res.ok) {
      let msg = 'Upload failed';
      try {
        const data = await res.json();
        if (data.detail) msg = data.detail;
      } catch {}
      throw new Error(msg);
    }

    const pct = Math.round(((i + 1) / totalParts) * 100);
    onProgress(pct, `Uploading part ${i + 1} of ${totalParts} (${pct}%)…`);
  }

  onProgress(99, 'Finalizing upload…');
  return send(`/api/upload/${upid}/finish`, {});
}
