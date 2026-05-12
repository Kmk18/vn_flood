export interface BasinPrediction {
  hybasId: number;
  lat: number;
  lon: number;
  province: string;
  floodProb: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  forecastDate: string;
}

export interface BasinForecast extends BasinPrediction {
  forecast7d: { forecastDate: string; floodProb: number; riskLevel: string }[];
}
