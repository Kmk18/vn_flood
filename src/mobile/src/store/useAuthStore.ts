import { create } from 'zustand';
import { authApi } from '../api/auth';
import { usersApi } from '../api/users';
import { saveTokens, clearTokens, getAccessToken } from '../api/client';

export interface User {
  id: number;
  email: string;
  name: string | null;
  role: string;
  province: string | null;
  phone: string | null;
  address: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  updateUser: (updated: Partial<User>) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: false,

  hydrate: async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const user = await usersApi.getMe();
      set({ isAuthenticated: true, user });
    } catch {
      await clearTokens();
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const data = await authApi.login(email, password);
      await saveTokens(data.accessToken, data.refreshToken);
      set({ isAuthenticated: true, user: data.user, isLoading: false });
      return { success: true };
    } catch (err: any) {
      set({ isLoading: false });
      const msg =
        err.response?.data?.error === 'Invalid email or password'
          ? 'Email hoặc mật khẩu không đúng.'
          : 'Đăng nhập thất bại. Vui lòng thử lại.';
      return { success: false, error: msg };
    }
  },

  signup: async (name, email, password) => {
    set({ isLoading: true });
    try {
      const data = await authApi.register(email, password, name);
      await saveTokens(data.accessToken, data.refreshToken);
      set({ isAuthenticated: true, user: data.user, isLoading: false });
      return { success: true };
    } catch (err: any) {
      set({ isLoading: false });
      const msg =
        err.response?.data?.error === 'Email already registered'
          ? 'Email đã tồn tại. Vui lòng dùng email khác.'
          : 'Đăng ký thất bại. Vui lòng thử lại.';
      return { success: false, error: msg };
    }
  },

  updateUser: (updated) =>
    set((state) => ({ user: state.user ? { ...state.user, ...updated } : null })),

  logout: async () => {
    await clearTokens();
    set({ isAuthenticated: false, user: null });
  },
}));
