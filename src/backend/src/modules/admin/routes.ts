import type { Express, Request, Response, NextFunction } from 'express';
import { eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, users, rescueRequests, predictions, officialAlerts } from '../../db';
import { requireAuth } from '../../middleware/requireAuth';

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
};

const updateRoleSchema = z.object({
  role: z.enum(['user', 'responder', 'admin']),
});

export const registerAdminRoutes = (app: Express) => {
  // GET /api/admin/stats — dashboard overview
  app.get('/api/admin/stats', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [[totalUsers], [activeRequests], [predictionsToday], [activeAlertsCount]] =
        await Promise.all([
          db.select({ count: sql<number>`count(*)::int` }).from(users),
          db.select({ count: sql<number>`count(*)::int` }).from(rescueRequests).where(eq(rescueRequests.status, 'open')),
          db.select({ count: sql<number>`count(*)::int` }).from(predictions).where(eq(predictions.forecastDate, today)),
          db.select({ count: sql<number>`count(*)::int` }).from(officialAlerts).where(eq(officialAlerts.isActive, true)),
        ]);
      res.json({
        totalUsers: totalUsers.count,
        activeRescueRequests: activeRequests.count,
        predictionsToday: predictionsToday.count,
        activeAlerts: activeAlertsCount.count,
      });
    } catch (err) {
      console.error('[admin] stats:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/admin/users?search=&offset= — paginated user list
  app.get('/api/admin/users', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    const search = String(req.query.search ?? '').trim();
    const offset = Math.max(0, parseInt(String(req.query.offset ?? '0'), 10));

    try {
      const query = db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          province: users.province,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(sql`${users.createdAt} desc`)
        .limit(50)
        .offset(offset);

      const data = search
        ? await query.where(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)))
        : await query;

      res.json(data);
    } catch (err) {
      console.error('[admin] users:list:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /api/admin/users/:id — update role
  app.patch('/api/admin/users/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
    if (id === req.user!.sub) { res.status(400).json({ error: 'Cannot change your own role' }); return; }

    const result = updateRoleSchema.safeParse(req.body);
    if (!result.success) { res.status(400).json({ error: result.error.issues }); return; }

    try {
      const [updated] = await db
        .update(users)
        .set({ role: result.data.role, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning({ id: users.id, email: users.email, name: users.name, role: users.role });

      if (!updated) { res.status(404).json({ error: 'User not found' }); return; }
      res.json(updated);
    } catch (err) {
      console.error('[admin] users:update:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /api/admin/users/:id — delete user
  app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
    if (id === req.user!.sub) { res.status(400).json({ error: 'Cannot delete yourself' }); return; }

    try {
      const [deleted] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
      if (!deleted) { res.status(404).json({ error: 'User not found' }); return; }
      res.json({ success: true });
    } catch (err) {
      console.error('[admin] users:delete:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

};
