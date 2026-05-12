import { api } from './client';

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
};
