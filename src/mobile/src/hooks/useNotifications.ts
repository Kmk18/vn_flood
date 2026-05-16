import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// expo-notifications is not supported in Expo Go (SDK 53+).
// Local push is disabled here; danger-zone alerts still appear in-app via useAlertStore.
// To re-enable: install expo-notifications in a dev/production build and uncomment the push logic.

const PREF_KEY = 'push_notifications_enabled';

export function useNotifications() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(PREF_KEY)
      .then((v) => setEnabled(v === 'true'))
      .catch(() => {});
  }, []);

  const toggle = async (val: boolean) => {
    if (val) {
      Alert.alert(
        'Thông báo đẩy',
        'Tính năng này yêu cầu cài đặt ứng dụng đầy đủ (development build). Cảnh báo trong ứng dụng vẫn hoạt động bình thường.',
        [{ text: 'OK' }],
      );
      return;
    }
    setEnabled(false);
    await SecureStore.setItemAsync(PREF_KEY, 'false');
  };
  
  const scheduleAlert = async (_title: string, _body: string) => {};

  return { enabled, toggle, scheduleAlert };
}
