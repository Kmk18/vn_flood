import { api } from './client';

export const authApi = {
  register: (email: string, password: string, name?: string) =>
    api.post('/api/auth/register', { email, password, name }).then((r) => r.data),

  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }).then((r) => r.data),

  refresh: (refreshToken: string) =>
    api.post('/api/auth/refresh', { refreshToken }).then((r) => r.data),
};
