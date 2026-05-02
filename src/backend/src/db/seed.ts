import dotenv from 'dotenv';
dotenv.config();

import { db } from './client';
import { basins, predictions, rescuePoints } from './schema';

const BASINS = [
  { hybasId: 4120017410, lat: 21.028, lon: 105.834, province: 'Hà Nội',         elevM: 12,  slopeDeg: 1.2, distRiverM: 320,  basinAreaKm2: 890,  riverOrder: 5 },
  { hybasId: 4120017420, lat: 20.858, lon: 106.684, province: 'Hải Phòng',       elevM: 4,   slopeDeg: 0.5, distRiverM: 180,  basinAreaKm2: 620,  riverOrder: 4 },
  { hybasId: 4120017430, lat: 18.340, lon: 105.905, province: 'Hà Tĩnh',         elevM: 8,   slopeDeg: 2.1, distRiverM: 240,  basinAreaKm2: 1100, riverOrder: 5 },
  { hybasId: 4120017440, lat: 16.468, lon: 107.591, province: 'Thừa Thiên Huế',  elevM: 6,   slopeDeg: 3.4, distRiverM: 150,  basinAreaKm2: 740,  riverOrder: 4 },
  { hybasId: 4120017450, lat: 15.880, lon: 108.335, province: 'Quảng Nam',       elevM: 10,  slopeDeg: 4.2, distRiverM: 290,  basinAreaKm2: 980,  riverOrder: 5 },
  { hybasId: 4120017460, lat: 14.058, lon: 108.277, province: 'Gia Lai',         elevM: 780, slopeDeg: 6.8, distRiverM: 410,  basinAreaKm2: 1340, riverOrder: 3 },
  { hybasId: 4120017470, lat: 12.245, lon: 109.197, province: 'Khánh Hòa',       elevM: 15,  slopeDeg: 3.1, distRiverM: 200,  basinAreaKm2: 560,  riverOrder: 4 },
  { hybasId: 4120017480, lat: 11.940, lon: 108.442, province: 'Bình Thuận',      elevM: 22,  slopeDeg: 2.7, distRiverM: 350,  basinAreaKm2: 820,  riverOrder: 4 },
  { hybasId: 4120017490, lat: 10.823, lon: 106.629, province: 'TP. Hồ Chí Minh', elevM: 3,   slopeDeg: 0.3, distRiverM: 120,  basinAreaKm2: 480,  riverOrder: 6 },
  { hybasId: 4120017500, lat: 10.036, lon: 105.788, province: 'Cần Thơ',         elevM: 2,   slopeDeg: 0.2, distRiverM: 90,   basinAreaKm2: 410,  riverOrder: 6 },
  { hybasId: 4120017510, lat: 10.460, lon: 105.630, province: 'An Giang',        elevM: 3,   slopeDeg: 0.4, distRiverM: 110,  basinAreaKm2: 590,  riverOrder: 6 },
  { hybasId: 4120017520, lat: 9.780,  lon: 105.150, province: 'Cà Mau',          elevM: 1,   slopeDeg: 0.1, distRiverM: 80,   basinAreaKm2: 370,  riverOrder: 5 },
];

const RESCUE_POINTS = [
  { name: 'Trường THPT Chu Văn An',      lat: 21.045, lon: 105.846, capacity: 500, province: 'Hà Nội',          address: '10 Thụy Khuê, Tây Hồ' },
  { name: 'Nhà văn hóa quận Hải Châu',  lat: 16.068, lon: 108.212, capacity: 300, province: 'Đà Nẵng',         address: '45 Trần Phú, Hải Châu' },
  { name: 'Trung tâm thể thao Phú Thọ', lat: 10.774, lon: 106.666, capacity: 800, province: 'TP. Hồ Chí Minh', address: '1 Lữ Gia, Quận 11' },
  { name: 'Trường Đại học Cần Thơ',     lat: 10.030, lon: 105.769, capacity: 600, province: 'Cần Thơ',         address: '3/2 Ninh Kiều' },
  { name: 'Nhà thi đấu tỉnh Hà Tĩnh',  lat: 18.343, lon: 105.906, capacity: 400, province: 'Hà Tĩnh',         address: '12 Nguyễn Du, TP Hà Tĩnh' },
];

function riskLevel(p: number): string {
  if (p < 0.2) return 'low';
  if (p < 0.5) return 'medium';
  if (p < 0.75) return 'high';
  return 'critical';
}

async function seed() {
  console.log('Seeding basins...');
  await db.insert(basins).values(BASINS).onConflictDoNothing();

  console.log('Seeding rescue points...');
  await db.insert(rescuePoints).values(RESCUE_POINTS).onConflictDoNothing();

  console.log('Seeding mock predictions (next 7 days)...');
  const rows: typeof predictions.$inferInsert[] = [];
  const runDate = new Date().toISOString().slice(0, 10);

  for (const basin of BASINS) {
    for (let d = 0; d < 7; d++) {
      const date = new Date();
      date.setDate(date.getDate() + d);
      const forecastDate = date.toISOString().slice(0, 10);

      // Mekong delta + Central VN basins get higher mock risk
      const base = [4120017500, 4120017510, 4120017520].includes(basin.hybasId) ? 0.55
        : [4120017430, 4120017440, 4120017450].includes(basin.hybasId) ? 0.40
        : 0.15;
      const floodProb = Math.min(0.99, base + Math.random() * 0.25 - 0.05 * d);

      rows.push({ hybasId: basin.hybasId, forecastDate, runDate, floodProb, riskLevel: riskLevel(floodProb) });
    }
  }

  await db.insert(predictions).values(rows).onConflictDoNothing();
  console.log(`Done — ${BASINS.length} basins, ${rows.length} predictions, ${RESCUE_POINTS.length} rescue points.`);
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
