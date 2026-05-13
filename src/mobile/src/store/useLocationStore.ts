import { create } from 'zustand';

interface LocationState {
  shareLocation: boolean;
  setShareLocation: (val: boolean) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  shareLocation: false,
  setShareLocation: (shareLocation) => set({ shareLocation }),
}));
