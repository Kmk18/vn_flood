import { Colors } from './index';
import { useThemeStore } from '../store/useThemeStore';

export const useTheme = () => {
  const isDarkMode = useThemeStore((s) => s.isDark);
  return { isDarkMode, colors: isDarkMode ? Colors.dark : Colors.light };
};
