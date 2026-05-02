import { create } from 'zustand';
import { MOCK_PREDICTIONS, MOCK_ALERTS, BasinForecast } from '../mock/floodData';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#2ECC71',
  medium: '#F39C12',
  high: '#E74C3C',
  critical: '#8E44AD',
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  critical: 'Nguy hiểm',
};

interface FloodState {
  basins: BasinForecast[];
  alerts: BasinForecast[];
  selectedBasin: BasinForecast | null;
  filterMinRisk: RiskLevel;
  setSelectedBasin: (basin: BasinForecast | null) => void;
  setFilterMinRisk: (risk: RiskLevel) => void;
}

export const useFloodStore = create<FloodState>((set) => ({
  basins: MOCK_PREDICTIONS,
  alerts: MOCK_ALERTS,
  selectedBasin: null,
  filterMinRisk: 'low',
  setSelectedBasin: (basin) => set({ selectedBasin: basin }),
  setFilterMinRisk: (risk) => set({ filterMinRisk: risk }),
}));
