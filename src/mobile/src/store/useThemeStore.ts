import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const KEY = 'settings_dark_mode';

interface ThemeState {
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: false,
  setIsDark: (isDark) => {
    set({ isDark });
    SecureStore.setItemAsync(KEY, isDark ? '1' : '0').catch(() => {});
  },
  hydrate: async () => {
    const v = await SecureStore.getItemAsync(KEY).catch(() => null);
    if (v !== null) set({ isDark: v === '1' });
  },
}));
