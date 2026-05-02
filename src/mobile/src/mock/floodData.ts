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

const today = new Date();
const day = (offset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

function riskLevel(p: number): 'low' | 'medium' | 'high' | 'critical' {
  if (p < 0.2) return 'low';
  if (p < 0.5) return 'medium';
  if (p < 0.75) return 'high';
  return 'critical';
}

function forecast(baseProb: number) {
  return Array.from({ length: 7 }, (_, i) => {
    const floodProb = Math.min(0.99, Math.max(0.01, baseProb + (Math.random() * 0.2 - 0.05 * i)));
    return { forecastDate: day(i), floodProb, riskLevel: riskLevel(floodProb) };
  });
}

const SEED: { hybasId: number; lat: number; lon: number; province: string; baseProb: number }[] = [
  { hybasId: 4120017410, lat: 21.028, lon: 105.834, province: 'Hà Nội',           baseProb: 0.18 },
  { hybasId: 4120017420, lat: 20.858, lon: 106.684, province: 'Hải Phòng',         baseProb: 0.22 },
  { hybasId: 4120017430, lat: 18.340, lon: 105.905, province: 'Hà Tĩnh',           baseProb: 0.48 },
  { hybasId: 4120017440, lat: 16.468, lon: 107.591, province: 'Thừa Thiên Huế',    baseProb: 0.62 },
  { hybasId: 4120017450, lat: 15.880, lon: 108.335, province: 'Quảng Nam',         baseProb: 0.71 },
  { hybasId: 4120017460, lat: 14.058, lon: 108.277, province: 'Gia Lai',           baseProb: 0.14 },
  { hybasId: 4120017470, lat: 12.245, lon: 109.197, province: 'Khánh Hòa',         baseProb: 0.30 },
  { hybasId: 4120017480, lat: 11.940, lon: 108.442, province: 'Bình Thuận',        baseProb: 0.25 },
  { hybasId: 4120017490, lat: 10.823, lon: 106.629, province: 'TP. Hồ Chí Minh',  baseProb: 0.19 },
  { hybasId: 4120017500, lat: 10.036, lon: 105.788, province: 'Cần Thơ',           baseProb: 0.78 },
  { hybasId: 4120017510, lat: 10.460, lon: 105.630, province: 'An Giang',          baseProb: 0.85 },
  { hybasId: 4120017520, lat: 9.780,  lon: 105.150, province: 'Cà Mau',            baseProb: 0.60 },
];

export const MOCK_PREDICTIONS: BasinForecast[] = SEED.map(({ hybasId, lat, lon, province, baseProb }) => {
  const floodProb = Math.min(0.99, Math.max(0.01, baseProb));
  return {
    hybasId,
    lat,
    lon,
    province,
    floodProb,
    riskLevel: riskLevel(floodProb),
    forecastDate: day(0),
    forecast7d: forecast(baseProb),
  };
});

export const MOCK_ALERTS = MOCK_PREDICTIONS.filter(
  (b) => b.riskLevel === 'high' || b.riskLevel === 'critical'
);
