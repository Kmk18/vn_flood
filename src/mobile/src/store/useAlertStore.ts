import { create } from 'zustand';

export interface Alert {
  id: string;
  title: string;
  message: string;
  isUrgent: boolean;
  timestamp: string;
}

interface AlertState {
  alerts: Alert[];
  addAlert: (alert: Alert) => void;
  clearAlerts: () => void;
}

const mockAlerts: Alert[] = [
  {
    id: '1',
    title: 'Flood Warning',
    message: 'Water levels rising rapidly in downtown area. Evacuate if possible.',
    isUrgent: true,
    timestamp: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Weather Advisory',
    message: 'Heavy rain expected for the next 24 hours.',
    isUrgent: false,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  }
];

export const useAlertStore = create<AlertState>((set) => ({
  alerts: mockAlerts,
  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts] })),
  clearAlerts: () => set({ alerts: [] }),
}));
