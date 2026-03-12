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
    title: 'Cảnh báo Lũ lụt',
    message: 'Mực nước đang dâng cao nhanh chóng ở khu vực trung tâm. Vui lòng sơ tán nếu có thể.',
    isUrgent: true,
    timestamp: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Cố vấn Thời tiết',
    message: 'Dự kiến sẽ có mưa lớn trong 24 giờ tới.',
    isUrgent: false,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  }
];

export const useAlertStore = create<AlertState>((set) => ({
  alerts: mockAlerts,
  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts] })),
  clearAlerts: () => set({ alerts: [] }),
}));
