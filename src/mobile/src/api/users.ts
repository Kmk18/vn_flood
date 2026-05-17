import { api } from './client';

export const usersApi = {
  getMe: () => api.get('/api/users/me').then((r) => r.data),

  updateMe: (data: { name?: string; province?: string; phone?: string; address?: string }) =>
    api.patch('/api/users/me', data).then((r) => r.data),

  deleteMe: () => api.delete('/api/users/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/api/users/me/password', { currentPassword, newPassword }).then((r) => r.data),
};
