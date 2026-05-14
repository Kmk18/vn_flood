import { create } from 'zustand';

interface PendingNav {
  id: number;
  lat: number;
  lon: number;
  label: string;
}

interface ResponderState {
  pendingNav: PendingNav | null;
  setPendingNav: (nav: PendingNav | null) => void;
}

export const useResponderStore = create<ResponderState>((set) => ({
  pendingNav: null,
  setPendingNav: (nav) => set({ pendingNav: nav }),
}));
