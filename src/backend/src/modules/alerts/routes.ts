import type { Express, Request, Response, NextFunction } from 'express';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, officialAlerts } from '../../db';
import { requireAuth } from '../../middleware/requireAuth';

const requireAuthority = (req: Request, res: Response, next: NextFunction) => {
  if (req.user!.role === 'user') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
};

const createAlertSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  isUrgent: z.boolean().default(false),
  province: z.string().max(100).optional(),
});

export const registerAlertsRoutes = (app: Express) => {
  // GET /api/official-alerts — public, active alerts ordered newest first
  app.get('/api/official-alerts', async (_req: Request, res: Response) => {
    try {
      const data = await db
        .select()
        .from(officialAlerts)
        .where(eq(officialAlerts.isActive, true))
        .orderBy(sql`${officialAlerts.createdAt} desc`);
      res.json(data);
    } catch (err) {
      console.error('[alerts] list:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/official-alerts — admin/responder only
  app.post('/api/official-alerts', requireAuth, requireAuthority, async (req: Request, res: Response) => {
    const result = createAlertSchema.safeParse(req.body);
    if (!result.success) { res.status(400).json({ error: result.error.issues }); return; }

    try {
      const [alert] = await db
        .insert(officialAlerts)
        .values({ ...result.data, postedBy: req.user!.sub })
        .returning();
      res.status(201).json(alert);
    } catch (err) {
      console.error('[alerts] create:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /api/official-alerts/:id — admin/responder only (soft-delete)
  app.delete('/api/official-alerts/:id', requireAuth, requireAuthority, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

    try {
      const [updated] = await db
        .update(officialAlerts)
        .set({ isActive: false })
        .where(eq(officialAlerts.id, id))
        .returning({ id: officialAlerts.id });

      if (!updated) { res.status(404).json({ error: 'Alert not found' }); return; }
      res.json({ success: true });
    } catch (err) {
      console.error('[alerts] delete:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
