import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const KEY = 'settings_share_location';

interface LocationState {
  shareLocation: boolean;
  setShareLocation: (val: boolean) => void;
  hydrate: () => Promise<void>;
}

export const useLocationStore = create<LocationState>((set) => ({
  shareLocation: false,
  setShareLocation: (shareLocation) => {
    set({ shareLocation });
    SecureStore.setItemAsync(KEY, shareLocation ? '1' : '0').catch(() => {});
  },
  hydrate: async () => {
    const v = await SecureStore.getItemAsync(KEY).catch(() => null);
    if (v !== null) set({ shareLocation: v === '1' });
  },
}));
