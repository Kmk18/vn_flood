import type { Express, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, users, pushTokens } from '../../db';
import { requireAuth } from '../../middleware/requireAuth';
import { hashPassword, verifyPassword } from '../../lib/password';

const updateSchema = z.object({
  name:     z.string().min(1).max(100).optional(),
  province: z.string().min(1).max(100).optional(),
  phone:    z.string().regex(/^[0-9+\s\-().]{7,20}$/, 'Số điện thoại không hợp lệ').optional(),
  address:  z.string().min(1).max(255).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' });

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8, 'Password must be at least 8 characters'),
});

const USER_SELECT = {
  id:        users.id,
  email:     users.email,
  name:      users.name,
  role:      users.role,
  province:  users.province,
  phone:     users.phone,
  address:   users.address,
  createdAt: users.createdAt,
};

export const registerUserRoutes = (app: Express) => {
  app.get('/api/users/me', requireAuth, async (req: Request, res: Response) => {
    try {
      const [user] = await db
        .select(USER_SELECT)
        .from(users)
        .where(eq(users.id, req.user!.sub))
        .limit(1);

      if (!user) { res.status(404).json({ error: 'User not found' }); return; }
      res.json(user);
    } catch (err) {
      console.error('[users] me:get:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/users/me', requireAuth, async (req: Request, res: Response) => {
    const result = updateSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }

    try {
      const [user] = await db
        .update(users)
        .set({ ...result.data, updatedAt: new Date() })
        .where(eq(users.id, req.user!.sub))
        .returning(USER_SELECT);

      res.json(user);
    } catch (err) {
      console.error('[users] me:patch:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/users/me', requireAuth, async (req: Request, res: Response) => {
    await db.delete(users).where(eq(users.id, req.user!.sub));
    res.status(204).send();
  });

  app.patch('/api/users/me/password', requireAuth, async (req: Request, res: Response) => {
    const result = changePasswordSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }
    const { currentPassword, newPassword } = result.data;

    try {
      const [user] = await db
        .select({ id: users.id, passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, req.user!.sub))
        .limit(1);

      if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
        res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });
        return;
      }

      const passwordHash = await hashPassword(newPassword);
      await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, req.user!.sub));
      res.json({ success: true });
    } catch (err) {
      console.error('[users] password:change:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/users/push-token', async (req: Request, res: Response) => {
    const { token } = req.body;
    if (typeof token !== 'string' || token.length < 10) {
      res.status(400).json({ error: 'Invalid token' }); return;
    }
    try {
      await db.insert(pushTokens).values({ token }).onConflictDoNothing();
      res.json({ success: true });
    } catch (err) {
      console.error('[users] push-token:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
