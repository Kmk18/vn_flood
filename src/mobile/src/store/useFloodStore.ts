import { create } from 'zustand';
import { BasinForecast } from '../mock/floodData';
import { floodApi, TodayPrediction } from '../api/flood';

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

export const RISK_COLORS_ALPHA: Record<RiskLevel, string> = {
  low:      'rgba(46,204,113,0.18)',
  medium:   'rgba(243,156,18,0.25)',
  high:     'rgba(231,76,60,0.32)',
  critical: 'rgba(142,68,173,0.40)',
};

function toBasinForecast(p: TodayPrediction, forecast7d: BasinForecast['forecast7d'] = []): BasinForecast {
  return {
    hybasId: p.hybasId,
    lat: p.lat,
    lon: p.lon,
    province: p.province,
    floodProb: p.floodProb,
    riskLevel: p.riskLevel as RiskLevel,
    forecastDate: p.forecastDate,
    forecast7d,
  };
}

const REFETCH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface FloodState {
  basins: BasinForecast[];
  alerts: BasinForecast[];
  selectedBasin: BasinForecast | null;
  filterMinRisk: RiskLevel;
  isLoading: boolean;
  lastFetched: number;
  fetchData: (force?: boolean) => Promise<void>;
  fetchForecast: (hybasId: number) => Promise<void>;
  setSelectedBasin: (basin: BasinForecast | null) => void;
  setFilterMinRisk: (risk: RiskLevel) => void;
}

export const useFloodStore = create<FloodState>((set, get) => ({
  basins: [],
  alerts: [],
  selectedBasin: null,
  filterMinRisk: 'low',
  isLoading: false,
  lastFetched: 0,

  fetchData: async (force = false) => {
    if (!force && Date.now() - get().lastFetched < REFETCH_INTERVAL_MS) return;
    set({ isLoading: true });
    try {
      const [todayPreds, alertPreds] = await Promise.all([
        floodApi.getToday(),
        floodApi.getAlerts(),
      ]);

      // Fetch 7-day forecasts for alert basins in parallel
      const alertIds = [...new Set(alertPreds.map((p) => p.hybasId))];
      const forecasts = await Promise.all(
        alertIds.map((id) => floodApi.getBasinForecast(id).catch(() => []))
      );
      const forecastMap = new Map(alertIds.map((id, i) => [id, forecasts[i]]));

      // Build full basin list; pre-populate forecast for alert basins
      const basins = todayPreds.map((p) =>
        toBasinForecast(p, forecastMap.get(p.hybasId) ?? [])
      );

      // Deduplicate alerts: one entry per basin (API returns one row per forecast date)
      const seen = new Set<number>();
      const alerts = alertPreds
        .filter((p) => { if (seen.has(p.hybasId)) return false; seen.add(p.hybasId); return true; })
        .map((p) => toBasinForecast(p, forecastMap.get(p.hybasId) ?? []));

      set({ basins, alerts, isLoading: false, lastFetched: Date.now() });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchForecast: async (hybasId: number) => {
    const basin = get().basins.find((b) => b.hybasId === hybasId);
    if (!basin || basin.forecast7d.length > 0) return;

    try {
      const forecast7d = await floodApi.getBasinForecast(hybasId);
      set((state) => ({
        basins: state.basins.map((b) =>
          b.hybasId === hybasId ? { ...b, forecast7d } : b
        ),
        selectedBasin:
          state.selectedBasin?.hybasId === hybasId
            ? { ...state.selectedBasin, forecast7d }
            : state.selectedBasin,
      }));
    } catch { /* keep empty forecast */ }
  },

  setSelectedBasin: (basin) => set({ selectedBasin: basin }),
  setFilterMinRisk: (risk) => set({ filterMinRisk: risk }),
}));
