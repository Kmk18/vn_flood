import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../api/client';

const PREF_KEY = 'push_notifications_enabled';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerPushToken() {
  try {
    const { data: token } = await Notifications.getDevicePushTokenAsync();
    await fetch(`${API_URL}/api/users/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
  } catch {
    // non-fatal — SSE still works as foreground fallback
  }
}

// Called by the alert store whenever a new SSE alert arrives (app in foreground).
export async function scheduleLocalNotification(title: string, body: string) {
  const pref = await SecureStore.getItemAsync(PREF_KEY).catch(() => null);
  if (pref !== 'true') return;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
}

export function useNotifications() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(PREF_KEY)
      .then((v) => { if (v === 'true') setEnabled(true); })
      .catch(() => {});
  }, []);

  const toggle = async (val: boolean) => {
    if (!val) {
      setEnabled(false);
      await SecureStore.setItemAsync(PREF_KEY, 'false');
      return;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    setEnabled(true);
    await SecureStore.setItemAsync(PREF_KEY, 'true');
    await registerPushToken();
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
