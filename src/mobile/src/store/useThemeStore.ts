import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: false,
  setIsDark: (isDark) => set({ isDark }),
}));
