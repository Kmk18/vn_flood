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
};
