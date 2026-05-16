import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { AuthNavigator } from './AuthNavigator';
import { RescueModeScreen } from '../screens/RescueModeScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { AppSettingsScreen } from '../screens/AppSettingsScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { AuthorityScreen } from '../screens/AuthorityScreen';
import { ResponderScreen } from '../screens/ResponderScreen';
import { useAuthStore } from '../store/useAuthStore';
import { useFloodStore } from '../store/useFloodStore';
import { useAlertStore } from '../store/useAlertStore';
import { useTheme } from '../theme/useTheme';
import { useThemeStore } from '../store/useThemeStore';
import { useLocationStore } from '../store/useLocationStore';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const hydrate = useAuthStore((state) => state.hydrate);
  const fetchData = useFloodStore((state) => state.fetchData);
  const fetchAlerts = useAlertStore((state) => state.fetchAlerts);
  const connectSSE = useAlertStore((state) => state.connectSSE);
  const disconnectSSE = useAlertStore((state) => state.disconnectSSE);
  const { colors, isDarkMode } = useTheme();
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const hydrateLocation = useLocationStore((s) => s.hydrate);

  const navTheme = {
    ...(isDarkMode ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDarkMode ? DarkTheme : DefaultTheme).colors,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  };

  useEffect(() => {
    hydrate();
    hydrateTheme();
    hydrateLocation();
    fetchData();
    fetchAlerts();
    connectSSE();

    // Reconnect SSE when app comes back to foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') connectSSE();
    });

    return () => {
      sub.remove();
      disconnectSSE();
    };
  }, []);

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="RescueMode" component={RescueModeScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="AppSettings" component={AppSettingsScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="Authority" component={AuthorityScreen} />
        <Stack.Screen name="Responder" component={ResponderScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
