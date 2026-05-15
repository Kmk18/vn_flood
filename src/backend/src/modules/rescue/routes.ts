import type { Express, Request, Response, NextFunction } from 'express';
import type { Redis } from 'ioredis';
import { eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import { db, rescuePoints, rescueRequests, users } from '../../db';
import { requireAuth } from '../../middleware/requireAuth';

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads'),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024, files: 5 } });

const requireAuthority = (req: Request, res: Response, next: NextFunction) => {
  if (req.user!.role === 'user') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
};

const CACHE_TTL = 3600;

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
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  peopleCount: z.coerce.number().int().min(1).max(100).default(1),
  notes: z.string().max(500).optional(),
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
  app.post('/api/rescue/requests', requireAuth, upload.array('photos', 5), async (req: Request, res: Response) => {
    const result = createRequestSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }

    const userId = req.user!.sub;
    const { lat, lon, peopleCount, notes } = result.data;
    const files = (req.files ?? []) as Express.Multer.File[];
    const photos = files.map((f) => `/uploads/${f.filename}`);

    try {
      const [request] = await db
        .insert(rescueRequests)
        .values({ userId, lat, lon, peopleCount, notes, photos, status: 'open', assignedUsers: [] })
        .returning();

      log('request:created', { id: request.id, userId, lat, lon, peopleCount, photos: photos.length });
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

  // GET /api/rescue/requests — list requests (admin/responder only)
  // ?status=open|assigned|resolved  →  filter by that status
  // no param                        →  open + assigned (for map overlay)
  app.get('/api/rescue/requests', requireAuth, async (req: Request, res: Response) => {
    if (req.user!.role === 'user') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const status = req.query.status as string | undefined;
    try {
      const data = await db
        .select()
        .from(rescueRequests)
        .where(
          status
            ? eq(rescueRequests.status, status)
            : inArray(rescueRequests.status, ['open', 'assigned'])
        )
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

  // PATCH /api/rescue/requests/:id/assign — add self to assignedUsers (responder/admin)
  app.patch('/api/rescue/requests/:id/assign', requireAuth, requireAuthority, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

    const callerId = req.user!.sub;

    try {
      const [current] = await db
        .select()
        .from(rescueRequests)
        .where(eq(rescueRequests.id, id));

      if (!current) { res.status(404).json({ error: 'Request not found' }); return; }
      if (current.status === 'resolved') {
        res.status(400).json({ error: 'Request already resolved' });
        return;
      }

      const existing = (current.assignedUsers ?? []) as { id: number; name: string }[];
      if (existing.some((u) => u.id === callerId)) {
        res.json(current);
        return;
      }

      const [callerRow] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, callerId));
      const callerName = callerRow?.name || callerRow?.email || `#${callerId}`;

      const [updated] = await db
        .update(rescueRequests)
        .set({
          assignedUsers: [...existing, { id: callerId, name: callerName }],
          status: 'assigned',
          updatedAt: new Date(),
        })
        .where(eq(rescueRequests.id, id))
        .returning();

      log('request:assigned', { id, by: callerId });
      res.json(updated);
    } catch (err) {
      console.error('[rescue] request:assign:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /api/rescue/requests/:id/resolve — mark resolved (only an assignee)
  app.patch('/api/rescue/requests/:id/resolve', requireAuth, requireAuthority, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

    const callerId = req.user!.sub;

    try {
      const [current] = await db
        .select()
        .from(rescueRequests)
        .where(eq(rescueRequests.id, id));

      if (!current) { res.status(404).json({ error: 'Request not found' }); return; }

      const assignedUsers = (current.assignedUsers ?? []) as { id: number; name: string }[];
      if (!assignedUsers.some((u) => u.id === callerId)) {
        res.status(403).json({ error: 'Only an assigned rescuer can complete this request' });
        return;
      }

      const [updated] = await db
        .update(rescueRequests)
        .set({ status: 'resolved', updatedAt: new Date() })
        .where(eq(rescueRequests.id, id))
        .returning();

      log('request:resolved', { id, by: callerId });
      res.json(updated);
    } catch (err) {
      console.error('[rescue] request:resolve:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
