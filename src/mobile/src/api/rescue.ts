import { api } from './client';

export interface RescuePoint {
  id: number;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
  province: string;
  address: string;
  isActive: boolean;
}

export interface AssignedUser {
  id: number;
  name: string;
}

export interface RescueRequest {
  id: number;
  userId: number;
  lat: number;
  lon: number;
  peopleCount: number;
  status: 'open' | 'assigned' | 'resolved';
  notes?: string;
  photos: string[];
  assignedUsers: AssignedUser[];
  createdAt: string;
  updatedAt: string;
}

export const rescueApi = {
  getPoints: () =>
    api.get<RescuePoint[]>('/api/rescue/points').then((r) => r.data),

  createRequest: (data: { lat: number; lon: number; peopleCount?: number; notes?: string; photos?: string[] }) => {
    const form = new FormData();
    form.append('lat', String(data.lat));
    form.append('lon', String(data.lon));
    if (data.peopleCount != null) form.append('peopleCount', String(data.peopleCount));
    if (data.notes) form.append('notes', data.notes);
    (data.photos ?? []).forEach((uri, i) => {
      form.append('photos', { uri, name: `photo_${i}.jpg`, type: 'image/jpeg' } as any);
    });
    return api.post<RescueRequest>('/api/rescue/requests', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  getMyRequests: () =>
    api.get<RescueRequest[]>('/api/rescue/requests/mine').then((r) => r.data),

  // Returns open + assigned by default; pass 'all' to include resolved
  getAllRequests: (status?: string) =>
    api.get<RescueRequest[]>('/api/rescue/requests', status ? { params: { status } } : undefined)
      .then((r) => r.data),

  // Filter by status for the responder tabs
  getByStatus: (status: 'open' | 'assigned' | 'resolved') =>
    api.get<RescueRequest[]>('/api/rescue/requests', { params: { status } }).then((r) => r.data),

  // Add self to assignedUsers; backend sets status → 'assigned'
  assignSelf: (id: number) =>
    api.patch<RescueRequest>(`/api/rescue/requests/${id}/assign`).then((r) => r.data),

  // Mark resolved — only allowed if caller is in assignedUsers
  resolve: (id: number) =>
    api.patch<RescueRequest>(`/api/rescue/requests/${id}/resolve`).then((r) => r.data),

  getAllPoints: async () => {
    try {
      return await api.get<RescuePoint[]>('/api/rescue/points/all').then((r) => r.data);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return api.get<RescuePoint[]>('/api/rescue/points').then((r) => r.data);
      }
      throw err;
    }
  },

  createPoint: (data: { name: string; lat: number; lon: number; capacity?: number; province?: string; address?: string }) =>
    api.post<RescuePoint>('/api/rescue/points', data).then((r) => r.data),

  updatePoint: (id: number, data: Partial<RescuePoint>) =>
    api.patch<RescuePoint>(`/api/rescue/points/${id}`, data).then((r) => r.data),

  deletePoint: (id: number) =>
    api.delete<{ success: boolean }>(`/api/rescue/points/${id}`).then((r) => r.data),

  setRequestStatus: (id: number, status: 'open' | 'assigned' | 'resolved') =>
    api.patch<RescueRequest>(`/api/rescue/requests/${id}/status`, { status }).then((r) => r.data),
};
