import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { api } from '../api/client';

const PREF_KEY = 'push_notifications_enabled';

// Remote push notifications were removed from Expo Go on Android in SDK 53.
const isExpoGo = Constants.executionEnvironment === 'storeClient';
console.log('[push] executionEnvironment:', Constants.executionEnvironment, '| isExpoGo:', isExpoGo);

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function registerPushToken() {
  if (isExpoGo) return;
  try {
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'b7a33854-6f00-4eab-be9d-158796c4d906',
    })).data;
    console.log('[push] token:', token);
    await api.post('/api/users/push-token', { token });
    console.log('[push] token registered');
  } catch (err) {
    console.warn('[push] registerPushToken failed:', err);
  }
}

export function useNotifications() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(PREF_KEY)
      .then((v) => {
        if (v === 'true') {
          setEnabled(true);
          registerPushToken();
        }
      })
      .catch(() => {});
  }, []);

  const toggle = async (val: boolean) => {
    if (!val) {
      setEnabled(false);
      await SecureStore.setItemAsync(PREF_KEY, 'false');
      return;
    }
    if (!isExpoGo) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
    }
    setEnabled(true);
    await SecureStore.setItemAsync(PREF_KEY, 'true');
    registerPushToken();
  };

  const scheduleAlert = async (title: string, body: string) => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  };

  return { enabled, toggle, scheduleAlert };
}
