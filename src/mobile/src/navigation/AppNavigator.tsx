import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { AuthNavigator } from './AuthNavigator';
import { RescueModeScreen } from '../screens/RescueModeScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { AppSettingsScreen } from '../screens/AppSettingsScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { AuthorityScreen } from '../screens/AuthorityScreen';
import { useAuthStore } from '../store/useAuthStore';
import { useFloodStore } from '../store/useFloodStore';
import { useAlertStore } from '../store/useAlertStore';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const hydrate = useAuthStore((state) => state.hydrate);
  const fetchData = useFloodStore((state) => state.fetchData);
  const fetchAlerts = useAlertStore((state) => state.fetchAlerts);

  useEffect(() => {
    hydrate();
    fetchData();
    fetchAlerts();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="RescueMode" component={RescueModeScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="AppSettings" component={AppSettingsScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Admin" component={AdminScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Authority" component={AuthorityScreen} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
