import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from './src/theme/useTheme';

export default function App() {
  const { colors, isDarkMode } = useTheme();
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AppNavigator />
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      </View>
    </SafeAreaProvider>
  );
}
