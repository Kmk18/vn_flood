import { create } from 'zustand';

interface MapState {
  isRescueMode: boolean;
  showFloodZones: boolean;
  showSafeZones: boolean;
  toggleRescueMode: () => void;
  toggleFloodZones: () => void;
  toggleSafeZones: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  isRescueMode: false,
  showFloodZones: true,
  showSafeZones: false,
  toggleRescueMode: () => set((state) => ({ isRescueMode: !state.isRescueMode })),
  toggleFloodZones: () => set((state) => ({ showFloodZones: !state.showFloodZones })),
  toggleSafeZones: () => set((state) => ({ showSafeZones: !state.showSafeZones })),
}));
