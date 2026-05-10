import { useColorScheme } from 'react-native';
import { Colors } from './index';

export const useTheme = () => {
  const isDarkMode = useColorScheme() === 'dark';
  return { isDarkMode, colors: isDarkMode ? Colors.dark : Colors.light };
};
