import type { Express, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, users } from '../../db';
import { requireAuth } from '../../middleware/requireAuth';

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  province: z.string().min(1).max(100).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' });

export const registerUserRoutes = (app: Express) => {
  app.get('/api/users/me', requireAuth, async (req: Request, res: Response) => {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        province: users.province,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.user!.sub))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  });

  app.patch('/api/users/me', requireAuth, async (req: Request, res: Response) => {
    const result = updateSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }

    const [user] = await db
      .update(users)
      .set({ ...result.data, updatedAt: new Date() })
      .where(eq(users.id, req.user!.sub))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        province: users.province,
      });

    res.json(user);
  });

  app.delete('/api/users/me', requireAuth, async (req: Request, res: Response) => {
    await db.delete(users).where(eq(users.id, req.user!.sub));
    res.status(204).send();
  });
};
