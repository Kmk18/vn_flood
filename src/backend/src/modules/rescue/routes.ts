import type { Express, Request, Response, NextFunction } from 'express';
import type { Redis } from 'ioredis';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, rescuePoints, rescueRequests } from '../../db';
import { requireAuth } from '../../middleware/requireAuth';

const requireAuthority = (req: Request, res: Response, next: NextFunction) => {
  if (req.user!.role === 'user') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
};

const CACHE_TTL = 3600; // rescue points are stable

async function cached<T>(redis: Redis, key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch { /* redis unavailable */ }

  const data = await fn();

  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
  } catch { /* redis unavailable */ }

  return data;
}

const createPointSchema = z.object({
  name: z.string().min(1).max(200),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  capacity: z.number().int().min(0).optional(),
  province: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
});

const updatePointSchema = createPointSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const createRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  peopleCount: z.number().int().min(1).max(100).default(1),
  notes: z.string().max(500).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['open', 'assigned', 'resolved']),
});

const log = (event: string, detail: Record<string, unknown>) =>
  console.log(`[rescue] ${event}`, { ...detail, ts: new Date().toISOString() });

export const registerRescueRoutes = (app: Express, redis: Redis) => {
  // GET /api/rescue/points — public list of shelters
  app.get('/api/rescue/points', async (_req: Request, res: Response) => {
    try {
      const data = await cached(redis, 'rescue:points', CACHE_TTL, () =>
        db.select().from(rescuePoints).where(eq(rescuePoints.isActive, true))
      );
      res.json(data);
    } catch (err) {
      console.error('[rescue] points:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/rescue/requests — create a rescue request (auth required)
  app.post('/api/rescue/requests', requireAuth, async (req: Request, res: Response) => {
    const result = createRequestSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }

    const userId = req.user!.sub;
    const { lat, lon, peopleCount, notes } = result.data;

    try {
      const [request] = await db
        .insert(rescueRequests)
        .values({ userId, lat, lon, peopleCount, notes, status: 'open' })
        .returning();

      log('request:created', { id: request.id, userId, lat, lon, peopleCount });
      res.status(201).json(request);
    } catch (err) {
      console.error('[rescue] request:create:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/rescue/requests/mine — current user's requests
  app.get('/api/rescue/requests/mine', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    try {
      const data = await db
        .select()
        .from(rescueRequests)
        .where(eq(rescueRequests.userId, userId))
        .orderBy(sql`${rescueRequests.createdAt} desc`);
      res.json(data);
    } catch (err) {
      console.error('[rescue] requests:mine:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/rescue/requests — all open requests (admin/responder only)
  app.get('/api/rescue/requests', requireAuth, async (req: Request, res: Response) => {
    if (req.user!.role === 'user') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    try {
      const data = await db
        .select()
        .from(rescueRequests)
        .where(eq(rescueRequests.status, 'open'))
        .orderBy(sql`${rescueRequests.createdAt} desc`);
      res.json(data);
    } catch (err) {
      console.error('[rescue] requests:list:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/rescue/points — add a shelter point (admin/responder only)
  app.post('/api/rescue/points', requireAuth, requireAuthority, async (req: Request, res: Response) => {
    const result = createPointSchema.safeParse(req.body);
    if (!result.success) { res.status(400).json({ error: result.error.issues }); return; }

    try {
      const [point] = await db.insert(rescuePoints).values(result.data).returning();
      await redis.del('rescue:points');
      log('point:created', { id: point.id, name: point.name });
      res.status(201).json(point);
    } catch (err) {
      console.error('[rescue] point:create:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /api/rescue/points/:id — update a shelter point (admin/responder only)
  app.patch('/api/rescue/points/:id', requireAuth, requireAuthority, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

    const result = updatePointSchema.safeParse(req.body);
    if (!result.success) { res.status(400).json({ error: result.error.issues }); return; }

    try {
      const [updated] = await db
        .update(rescuePoints)
        .set(result.data)
        .where(eq(rescuePoints.id, id))
        .returning();

      if (!updated) { res.status(404).json({ error: 'Point not found' }); return; }
      await redis.del('rescue:points');
      res.json(updated);
    } catch (err) {
      console.error('[rescue] point:update:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /api/rescue/requests/:id/status — update status (admin/responder only)
  app.patch('/api/rescue/requests/:id/status', requireAuth, async (req: Request, res: Response) => {
    if (req.user!.role === 'user') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }

    const result = updateStatusSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }

    try {
      const [updated] = await db
        .update(rescueRequests)
        .set({ status: result.data.status, updatedAt: new Date() })
        .where(eq(rescueRequests.id, id))
        .returning();

      if (!updated) {
        res.status(404).json({ error: 'Request not found' });
        return;
      }

      log('status:updated', { id, status: result.data.status, by: req.user!.sub });
      res.json(updated);
    } catch (err) {
      console.error('[rescue] status:update:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
