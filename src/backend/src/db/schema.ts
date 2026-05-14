import {
  pgTable,
  serial,
  bigint,
  varchar,
  real,
  integer,
  boolean,
  timestamp,
  date,
  index,
  unique,
  text,
  jsonb,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }),
  // 'user' | 'admin' | 'responder'
  role: varchar('role', { length: 20 }).notNull().default('user'),
  province: varchar('province', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  address: varchar('address', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const basins = pgTable('basins', {
  hybasId: bigint('hybas_id', { mode: 'number' }).primaryKey(),
  lat: real('lat').notNull(),
  lon: real('lon').notNull(),
  province: varchar('province', { length: 100 }),
  // 0=north 1=central 2=south
  regionId: integer('region_id'),
  elevM: real('elev_m'),
  slopeDeg: real('slope_deg'),
  twi: real('twi'),
  distRiverM: real('dist_river_m'),
  basinAreaKm2: real('basin_area_km2'),  // SUB_AREA in km²
  upAreaKm2: real('up_area_km2'),        // UP_AREA in km² — upstream drainage
  riverOrder: integer('river_order'),
});

export const basinWeather = pgTable(
  'basin_weather',
  {
    id: serial('id').primaryKey(),
    hybasId: bigint('hybas_id', { mode: 'number' })
      .notNull()
      .references(() => basins.hybasId, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    precipMm: real('precip_mm'),
  },
  (t) => [
    unique().on(t.hybasId, t.date),
    index('idx_bw_date').on(t.date),
    index('idx_bw_basin').on(t.hybasId),
  ]
);

export const predictions = pgTable(
  'predictions',
  {
    id: serial('id').primaryKey(),
    hybasId: bigint('hybas_id', { mode: 'number' })
      .notNull()
      .references(() => basins.hybasId, { onDelete: 'cascade' }),
    forecastDate: date('forecast_date').notNull(),
    runDate: date('run_date').notNull(),
    floodProb: real('flood_prob').notNull(),
    // 'low' | 'medium' | 'high' | 'critical'
    riskLevel: varchar('risk_level', { length: 10 }).notNull(),
  },
  (t) => [
    unique().on(t.hybasId, t.forecastDate, t.runDate),
    index('idx_pred_date').on(t.forecastDate),
    index('idx_pred_basin').on(t.hybasId),
  ]
);

export const alerts = pgTable('alerts', {
  id: serial('id').primaryKey(),
  hybasId: bigint('hybas_id', { mode: 'number' })
    .notNull()
    .references(() => basins.hybasId, { onDelete: 'cascade' }),
  forecastDate: date('forecast_date').notNull(),
  riskLevel: varchar('risk_level', { length: 10 }).notNull(),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
});

export const rescuePoints = pgTable('rescue_points', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  lat: real('lat').notNull(),
  lon: real('lon').notNull(),
  capacity: integer('capacity'),
  province: varchar('province', { length: 100 }),
  address: varchar('address', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
});


export const officialAlerts = pgTable('official_alerts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  message: varchar('message', { length: 1000 }).notNull(),
  isUrgent: boolean('is_urgent').notNull().default(false),
  province: varchar('province', { length: 100 }),
  postedBy: integer('posted_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
});

export const rescueRequests = pgTable('rescue_requests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  lat: real('lat').notNull(),
  lon: real('lon').notNull(),
  peopleCount: integer('people_count').notNull().default(1),
  // 'open' | 'assigned' | 'resolved'
  status: varchar('status', { length: 20 }).notNull().default('open'),
  notes: varchar('notes', { length: 500 }),
  photos: text('photos').array().default([]),
  assignedUsers: jsonb('assigned_users').$type<{ id: number; name: string }[]>().notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
