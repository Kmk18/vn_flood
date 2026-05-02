import type { Express, Request, Response } from 'express';
import type { Redis } from 'ioredis';
import { eq, and, gte, lte, inArray, sql } from 'drizzle-orm';
import { db, basins, predictions } from '../../db';

const RISK_ORDER = { low: 0, medium: 1, high: 2, critical: 3 };
const CACHE_TTL = { basins: 86400, predictions: 3600 }; // seconds

async function cached<T>(redis: Redis, key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch { /* redis unavailable, skip cache */ }

  const data = await fn();

  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
  } catch { /* redis unavailable, skip cache */ }

  return data;
}

export const registerFloodRoutes = (app: Express, redis: Redis) => {
  // GET /api/flood/basins
  app.get('/api/flood/basins', async (_req: Request, res: Response) => {
    try {
      const data = await cached(redis, 'flood:basins', CACHE_TTL.basins, () =>
        db.select().from(basins)
      );
      res.json(data);
    } catch (err) {
      console.error('[flood] basins:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/flood/predictions/today?risk_min=low|medium|high|critical
  app.get('/api/flood/predictions/today', async (req: Request, res: Response) => {
    const riskMin = (req.query.risk_min as string) ?? 'low';
    const minOrder = RISK_ORDER[riskMin as keyof typeof RISK_ORDER] ?? 0;

    try {
      const today = new Date().toISOString().slice(0, 10);
      const cacheKey = `flood:predictions:today:${riskMin}`;

      const data = await cached(redis, cacheKey, CACHE_TTL.predictions, async () => {
        const latestRun = await db
          .select({ runDate: sql<string>`max(${predictions.runDate})` })
          .from(predictions);
        const runDate = latestRun[0]?.runDate ?? today;

        const rows = await db
          .select({
            hybasId: predictions.hybasId,
            forecastDate: predictions.forecastDate,
            floodProb: predictions.floodProb,
            riskLevel: predictions.riskLevel,
            lat: basins.lat,
            lon: basins.lon,
            province: basins.province,
          })
          .from(predictions)
          .innerJoin(basins, eq(predictions.hybasId, basins.hybasId))
          .where(
            and(
              eq(predictions.forecastDate, today),
              eq(predictions.runDate, runDate)
            )
          )
          .orderBy(sql`${predictions.floodProb} desc`);

        return rows;
      });

      const filtered = data.filter(
        (r) => (RISK_ORDER[r.riskLevel as keyof typeof RISK_ORDER] ?? 0) >= minOrder
      );
      res.json(filtered);
    } catch (err) {
      console.error('[flood] predictions:today:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/flood/predictions/basin/:hybas_id
  app.get('/api/flood/predictions/basin/:hybas_id', async (req: Request, res: Response) => {
    const hybasId = parseInt(req.params.hybas_id, 10);
    if (isNaN(hybasId)) {
      res.status(400).json({ error: 'Invalid hybas_id' });
      return;
    }

    try {
      const cacheKey = `flood:predictions:basin:${hybasId}`;

      const data = await cached(redis, cacheKey, CACHE_TTL.predictions, async () => {
        const latestRun = await db
          .select({ runDate: sql<string>`max(${predictions.runDate})` })
          .from(predictions);
        const runDate = latestRun[0]?.runDate ?? new Date().toISOString().slice(0, 10);

        return db
          .select({
            forecastDate: predictions.forecastDate,
            floodProb: predictions.floodProb,
            riskLevel: predictions.riskLevel,
          })
          .from(predictions)
          .where(
            and(
              eq(predictions.hybasId, hybasId),
              eq(predictions.runDate, runDate)
            )
          )
          .orderBy(predictions.forecastDate);
      });

      res.json(data);
    } catch (err) {
      console.error('[flood] predictions:basin:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/flood/alerts — high/critical basins in next 3 days
  app.get('/api/flood/alerts', async (_req: Request, res: Response) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const in3Days = new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10);

      const data = await cached(redis, 'flood:alerts', CACHE_TTL.predictions, async () => {
        const latestRun = await db
          .select({ runDate: sql<string>`max(${predictions.runDate})` })
          .from(predictions);
        const runDate = latestRun[0]?.runDate ?? today;

        return db
          .select({
            hybasId: predictions.hybasId,
            forecastDate: predictions.forecastDate,
            floodProb: predictions.floodProb,
            riskLevel: predictions.riskLevel,
            lat: basins.lat,
            lon: basins.lon,
            province: basins.province,
          })
          .from(predictions)
          .innerJoin(basins, eq(predictions.hybasId, basins.hybasId))
          .where(
            and(
              inArray(predictions.riskLevel, ['high', 'critical']),
              gte(predictions.forecastDate, today),
              lte(predictions.forecastDate, in3Days),
              eq(predictions.runDate, runDate)
            )
          )
          .orderBy(sql`${predictions.floodProb} desc`);
      });

      res.json(data);
    } catch (err) {
      console.error('[flood] alerts:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
