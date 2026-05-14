import { api } from './client';

export interface TodayPrediction {
  hybasId: number;
  forecastDate: string;
  floodProb: number;
  riskLevel: string;
  lat: number;
  lon: number;
  province: string;
}

export interface ForecastDay {
  forecastDate: string;
  floodProb: number;
  riskLevel: string;
}

export const floodApi = {
  getToday: (riskMin: 'medium' | 'high' | 'critical' = 'medium') =>
    api.get<TodayPrediction[]>('/api/flood/predictions/today', { params: { risk_min: riskMin } }).then((r) => r.data),

  getBasinForecast: (hybasId: number) =>
    api.get<ForecastDay[]>(`/api/flood/predictions/basin/${hybasId}`).then((r) => r.data),

  getAlerts: () =>
    api.get<TodayPrediction[]>('/api/flood/alerts').then((r) => r.data),
};
