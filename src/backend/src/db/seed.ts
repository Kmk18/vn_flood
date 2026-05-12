import dotenv from 'dotenv';
dotenv.config();

import { sql } from 'drizzle-orm';
import { db } from './client';
import { basins, rescuePoints, users } from './schema';
import { hashPassword } from '../lib/password';

const BASINS = [
  // regionId: 0=north 1=central 2=south   twi: Topographic Wetness Index   upAreaKm2: upstream drainage area
  { hybasId: 4120017410, lat: 21.028, lon: 105.834, province: 'Hà Nội',          regionId: 0, elevM: 12,  slopeDeg: 1.2, twi: 8.5,  distRiverM: 320, basinAreaKm2: 890,  upAreaKm2: 14500, riverOrder: 5 },
  { hybasId: 4120017420, lat: 20.858, lon: 106.684, province: 'Hải Phòng',        regionId: 0, elevM: 4,   slopeDeg: 0.5, twi: 9.2,  distRiverM: 180, basinAreaKm2: 620,  upAreaKm2: 13200, riverOrder: 4 },
  { hybasId: 4120017430, lat: 18.340, lon: 105.905, province: 'Hà Tĩnh',          regionId: 1, elevM: 8,   slopeDeg: 2.1, twi: 7.1,  distRiverM: 240, basinAreaKm2: 1100, upAreaKm2: 3200,  riverOrder: 5 },
  { hybasId: 4120017440, lat: 16.468, lon: 107.591, province: 'Thừa Thiên Huế',   regionId: 1, elevM: 6,   slopeDeg: 3.4, twi: 7.8,  distRiverM: 150, basinAreaKm2: 740,  upAreaKm2: 2800,  riverOrder: 4 },
  { hybasId: 4120017450, lat: 15.880, lon: 108.335, province: 'Quảng Nam',        regionId: 1, elevM: 10,  slopeDeg: 4.2, twi: 7.5,  distRiverM: 290, basinAreaKm2: 980,  upAreaKm2: 5400,  riverOrder: 5 },
  { hybasId: 4120017460, lat: 14.058, lon: 108.277, province: 'Gia Lai',          regionId: 1, elevM: 780, slopeDeg: 6.8, twi: 6.2,  distRiverM: 410, basinAreaKm2: 1340, upAreaKm2: 8900,  riverOrder: 3 },
  { hybasId: 4120017470, lat: 12.245, lon: 109.197, province: 'Khánh Hòa',        regionId: 1, elevM: 15,  slopeDeg: 3.1, twi: 7.0,  distRiverM: 200, basinAreaKm2: 560,  upAreaKm2: 2100,  riverOrder: 4 },
  { hybasId: 4120017480, lat: 11.940, lon: 108.442, province: 'Bình Thuận',       regionId: 2, elevM: 22,  slopeDeg: 2.7, twi: 6.8,  distRiverM: 350, basinAreaKm2: 820,  upAreaKm2: 3600,  riverOrder: 4 },
  { hybasId: 4120017490, lat: 10.823, lon: 106.629, province: 'TP. Hồ Chí Minh',  regionId: 2, elevM: 3,   slopeDeg: 0.3, twi: 9.5,  distRiverM: 120, basinAreaKm2: 480,  upAreaKm2: 28000, riverOrder: 6 },
  { hybasId: 4120017500, lat: 10.036, lon: 105.788, province: 'Cần Thơ',          regionId: 2, elevM: 2,   slopeDeg: 0.2, twi: 10.1, distRiverM: 90,  basinAreaKm2: 410,  upAreaKm2: 44000, riverOrder: 6 },
  { hybasId: 4120017510, lat: 10.460, lon: 105.630, province: 'An Giang',         regionId: 2, elevM: 3,   slopeDeg: 0.4, twi: 9.8,  distRiverM: 110, basinAreaKm2: 590,  upAreaKm2: 52000, riverOrder: 6 },
  { hybasId: 4120017520, lat: 9.780,  lon: 105.150, province: 'Cà Mau',           regionId: 2, elevM: 1,   slopeDeg: 0.1, twi: 10.5, distRiverM: 80,  basinAreaKm2: 370,  upAreaKm2: 38000, riverOrder: 5 },
];

const RESCUE_POINTS = [
  { name: 'Trường THPT Chu Văn An',      lat: 21.045, lon: 105.846, capacity: 500, province: 'Hà Nội',          address: '10 Thụy Khuê, Tây Hồ' },
  { name: 'Nhà văn hóa quận Hải Châu',  lat: 16.068, lon: 108.212, capacity: 300, province: 'Đà Nẵng',         address: '45 Trần Phú, Hải Châu' },
  { name: 'Trung tâm thể thao Phú Thọ', lat: 10.774, lon: 106.666, capacity: 800, province: 'TP. Hồ Chí Minh', address: '1 Lữ Gia, Quận 11' },
  { name: 'Trường Đại học Cần Thơ',     lat: 10.030, lon: 105.769, capacity: 600, province: 'Cần Thơ',         address: '3/2 Ninh Kiều' },
  { name: 'Nhà thi đấu tỉnh Hà Tĩnh',  lat: 18.343, lon: 105.906, capacity: 400, province: 'Hà Tĩnh',         address: '12 Nguyễn Du, TP Hà Tĩnh' },
];


async function seed() {
  console.log('Seeding admin accounts...');
  const [hash1, hash2] = await Promise.all([hashPassword('K18m11k04.'), hashPassword('admin123')]);
  await db.insert(users).values([
    { email: 'admin@vnflood.vn', passwordHash: hash1, name: 'Admin', role: 'admin' },
    { email: 'test@vnflood.vn',  passwordHash: hash2, name: 'Test Admin', role: 'admin' },
  ]).onConflictDoUpdate({ target: users.email, set: { passwordHash: sql`EXCLUDED.password_hash` } });

  console.log('Seeding basins...');
  await db.insert(basins).values(BASINS).onConflictDoNothing();

  console.log('Seeding rescue points...');
  await db.insert(rescuePoints).values(RESCUE_POINTS).onConflictDoNothing();

  console.log(`Done — ${BASINS.length} basins, ${RESCUE_POINTS.length} rescue points. Run ingestion to populate predictions.`);
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
