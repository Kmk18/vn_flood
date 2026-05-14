import { api } from './client';

export interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  role: string;
  province: string | null;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  activeRescueRequests: number;
  predictionsToday: number;
  activeAlerts: number;
}

export const adminApi = {
  getStats: () =>
    api.get<AdminStats>('/api/admin/stats').then((r) => r.data),

  getUsers: (search?: string, offset = 0) =>
    api.get<AdminUser[]>('/api/admin/users', { params: { search, offset } }).then((r) => r.data),

  updateRole: (id: number, role: 'user' | 'responder' | 'admin') =>
    api.patch<AdminUser>(`/api/admin/users/${id}`, { role }).then((r) => r.data),

  deleteUser: (id: number) =>
    api.delete<{ success: boolean }>(`/api/admin/users/${id}`).then((r) => r.data),

};
