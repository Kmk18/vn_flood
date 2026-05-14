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

export interface RescueRequest {
  id: number;
  userId: number;
  lat: number;
  lon: number;
  peopleCount: number;
  status: 'open' | 'assigned' | 'resolved';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const rescueApi = {
  getPoints: () =>
    api.get<RescuePoint[]>('/api/rescue/points').then((r) => r.data),

  createRequest: (data: { lat: number; lon: number; peopleCount?: number; notes?: string }) =>
    api.post<RescueRequest>('/api/rescue/requests', data).then((r) => r.data),

  getMyRequests: () =>
    api.get<RescueRequest[]>('/api/rescue/requests/mine').then((r) => r.data),

  getAllRequests: () =>
    api.get<RescueRequest[]>('/api/rescue/requests').then((r) => r.data),

  updateStatus: (id: number, status: 'open' | 'assigned' | 'resolved') =>
    api.patch<RescueRequest>(`/api/rescue/requests/${id}/status`, { status }).then((r) => r.data),

  createPoint: (data: { name: string; lat: number; lon: number; capacity?: number; province?: string; address?: string }) =>
    api.post<RescuePoint>('/api/rescue/points', data).then((r) => r.data),

  updatePoint: (id: number, data: Partial<RescuePoint>) =>
    api.patch<RescuePoint>(`/api/rescue/points/${id}`, data).then((r) => r.data),
};
