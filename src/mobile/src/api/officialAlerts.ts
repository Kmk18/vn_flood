import { api, API_URL, getAccessToken } from './client';

export interface OfficialAlert {
  id: number;
  title: string;
  message: string;
  isUrgent: boolean;
  province: string | null;
  postedBy: number | null;
  createdAt: string;
  isActive: boolean;
}

export const officialAlertsApi = {
  getAll: () =>
    api.get<OfficialAlert[]>('/api/official-alerts').then((r) => r.data),

  create: (data: { title: string; message: string; isUrgent: boolean; province?: string }) =>
    api.post<OfficialAlert>('/api/official-alerts', data).then((r) => r.data),

  remove: (id: number) =>
    api.delete<{ success: boolean }>(`/api/official-alerts/${id}`).then((r) => r.data),

  getReadIds: () =>
    api.get<number[]>('/api/official-alerts/reads').then((r) => r.data),

  markRead: (id: number) =>
    api.post<{ success: boolean }>(`/api/official-alerts/${id}/read`).then((r) => r.data),
};

type SSEEvent =
  | { type: 'new'; data: OfficialAlert }
  | { type: 'delete'; id: number };

function parseSSEChunk(chunk: string, onEvent: (e: SSEEvent) => void) {
  let dataLine = '';
  for (const line of chunk.split('\n')) {
    if (line.startsWith('data: ')) {
      dataLine = line.slice(6).trim();
    } else if (line === '' && dataLine) {
      try { onEvent(JSON.parse(dataLine)); } catch { /* ignore malformed */ }
      dataLine = '';
    }
  }
}

export function subscribeToAlerts(
  onNew: (alert: OfficialAlert) => void,
  onDelete: (id: number) => void,
): () => void {
  let aborted = false;
  let currentXhr: XMLHttpRequest | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = async () => {
    if (aborted) return;
    const token = await getAccessToken();
    if (aborted) return;

    const xhr = new XMLHttpRequest();
    currentXhr = xhr;
    let cursor = 0;

    xhr.open('GET', `${API_URL}/api/official-alerts/stream`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Accept', 'text/event-stream');
    xhr.setRequestHeader('Cache-Control', 'no-cache');

    xhr.onreadystatechange = () => {
      if (xhr.readyState < 3 || xhr.status !== 200) return;
      const chunk = xhr.responseText.slice(cursor);
      cursor = xhr.responseText.length;
      if (chunk) parseSSEChunk(chunk, (e) => {
        if (e.type === 'new') onNew(e.data);
        else if (e.type === 'delete') onDelete(e.id);
      });
    };

    xhr.onloadend = () => {
      currentXhr = null;
      if (!aborted) retryTimer = setTimeout(connect, 3_000);
    };

    xhr.send();
  };

  connect();

  return () => {
    aborted = true;
    if (retryTimer) clearTimeout(retryTimer);
    currentXhr?.abort();
  };
}
