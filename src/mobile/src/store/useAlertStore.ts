import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { officialAlertsApi, subscribeToAlerts } from '../api/officialAlerts';
import { scheduleLocalNotification } from '../hooks/useNotifications';

const GUEST_READ_IDS_KEY = 'guest_read_ids';

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
  resetReadIds: () => void;
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
      const [alertsResult, readsResult] = await Promise.allSettled([
        officialAlertsApi.getAll(),
        officialAlertsApi.getReadIds(),
      ]);

      if (alertsResult.status === 'fulfilled') {
        set({
          alerts: alertsResult.value.map((a) => ({
            id: String(a.id),
            title: a.title,
            message: a.message,
            isUrgent: a.isUrgent,
            timestamp: a.createdAt,
            province: a.province,
          })),
        });
      }

      if (readsResult.status === 'fulfilled') {
        // Authenticated: server is authoritative, replace local state entirely
        set({ readIds: new Set(readsResult.value.map(String)) });
      } else {
        // Unauthenticated: restore persisted guest reads
        try {
          const stored = await SecureStore.getItemAsync(GUEST_READ_IDS_KEY);
          if (stored) set({ readIds: new Set(JSON.parse(stored) as string[]) });
        } catch {}
      }
    } catch {
      // keep existing data on error
    }
  },

  resetReadIds: () => set({ readIds: new Set<string>() }),

  addAlert: (alert) => set((state) => {
    if (state.alerts.some((a) => a.id === alert.id)) return state;
    return { alerts: [alert, ...state.alerts] };
  }),

  removeAlert: (id) => set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) })),

  markRead: (id) => {
    const state = get();
    if (state.readIds.has(id)) return;
    const readIds = new Set(state.readIds);
    readIds.add(id);
    set({ readIds });
    const numId = parseInt(id, 10);
    if (!isNaN(numId)) {
      officialAlertsApi.markRead(numId).catch(() => {
        // Server rejected (unauthenticated) — persist guest reads locally
        SecureStore.setItemAsync(GUEST_READ_IDS_KEY, JSON.stringify([...get().readIds])).catch(() => {});
      });
    }
  },

  markAllRead: () => {
    const state = get();
    const unread = state.alerts.filter((a) => !state.readIds.has(a.id));
    set({ readIds: new Set(state.alerts.map((a) => a.id)) });
    unread.forEach((a) => {
      const numId = parseInt(a.id, 10);
      if (!isNaN(numId)) {
        officialAlertsApi.markRead(numId).catch(() => {
          SecureStore.setItemAsync(GUEST_READ_IDS_KEY, JSON.stringify([...get().readIds])).catch(() => {});
        });
      }
    });
  },

  connectSSE: () => {
    _sseCleanup?.();
    const { addAlert, removeAlert } = get();
    _sseCleanup = subscribeToAlerts(
      (raw) => {
        addAlert({
          id: String(raw.id),
          title: raw.title,
          message: raw.message,
          isUrgent: raw.isUrgent,
          timestamp: raw.createdAt,
          province: raw.province,
        });
        scheduleLocalNotification(raw.title, raw.message).catch(() => {});
      },
      (id) => removeAlert(String(id)),
    );
  },

  disconnectSSE: () => {
    _sseCleanup?.();
    _sseCleanup = null;
  },
}));
