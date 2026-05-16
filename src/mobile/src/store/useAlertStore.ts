import { create } from 'zustand';
import { officialAlertsApi, subscribeToAlerts } from '../api/officialAlerts';

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
  readIds: Set<string>;
  fetchAlerts: () => Promise<void>;
  addAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  connectSSE: () => void;
  disconnectSSE: () => void;
}

// Module-level so the cleanup survives store re-renders
let _sseCleanup: (() => void) | null = null;

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  readIds: new Set<string>(),

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
      // keep existing data on error
    }
  },

  addAlert: (alert) => set((state) => {
    if (state.alerts.some((a) => a.id === alert.id)) return state;
    return { alerts: [alert, ...state.alerts] };
  }),

  removeAlert: (id) => set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) })),

  markRead: (id) => set((state) => {
    if (state.readIds.has(id)) return state;
    const readIds = new Set(state.readIds);
    readIds.add(id);
    return { readIds };
  }),

  markAllRead: () => set((state) => ({
    readIds: new Set(state.alerts.map((a) => a.id)),
  })),

  connectSSE: () => {
    _sseCleanup?.();
    const { addAlert, removeAlert } = get();
    _sseCleanup = subscribeToAlerts(
      (raw) => addAlert({
        id: String(raw.id),
        title: raw.title,
        message: raw.message,
        isUrgent: raw.isUrgent,
        timestamp: raw.createdAt,
        province: raw.province,
      }),
      (id) => removeAlert(String(id)),
    );
  },

  disconnectSSE: () => {
    _sseCleanup?.();
    _sseCleanup = null;
  },
}));
