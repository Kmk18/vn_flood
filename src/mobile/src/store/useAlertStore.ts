import { create } from 'zustand';
import { officialAlertsApi } from '../api/officialAlerts';

export interface Alert {
  id: string;
  title: string;
  message: string;
  isUrgent: boolean;
  timestamp: string;
  province?: string | null;
}

interface AlertState {
  alerts: Alert[];
  fetchAlerts: () => Promise<void>;
  addAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],

  fetchAlerts: async () => {
    try {
      const data = await officialAlertsApi.getAll();
      set({
        alerts: data.map((a) => ({
          id: String(a.id),
          title: a.title,
          message: a.message,
          isUrgent: a.isUrgent,
          timestamp: a.createdAt,
          province: a.province,
        })),
      });
    } catch {
      // keep mock data on error
    }
  },

  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts] })),
  removeAlert: (id) => set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) })),
}));
