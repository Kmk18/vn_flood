import type { Express, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, users } from '../../db';
import { hashPassword, verifyPassword } from '../../lib/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt';

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const log = (event: string, detail: Record<string, unknown>) =>
  console.log(`[auth] ${event}`, { ...detail, ts: new Date().toISOString() });

export const registerAuthRoutes = (app: Express) => {
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }
    const { email, password, name } = result.data;

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      log('register:conflict', { email });
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    try {
      const passwordHash = await hashPassword(password);
      const [user] = await db
        .insert(users)
        .values({ email, passwordHash, name })
        .returning({ id: users.id, email: users.email, role: users.role, name: users.name });

      log('register:ok', { userId: user.id, email });
      const payload = { sub: user.id, email: user.email, role: user.role };
      res.status(201).json({
        user,
        accessToken: signAccessToken(payload),
        refreshToken: signRefreshToken(payload),
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[auth] register:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }
    const { email, password } = result.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      log('login:fail', { email });
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    log('login:ok', { userId: user.id, email });
    const payload = { sub: user.id, email: user.email, role: user.role };
    res.json({
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    });
  });

  app.post('/api/auth/refresh', (req: Request, res: Response) => {
    const result = refreshSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'refreshToken required' });
      return;
    }
    try {
      const payload = verifyRefreshToken(result.data.refreshToken);
      log('refresh:ok', { userId: payload.sub, email: payload.email });
      res.json({
        accessToken: signAccessToken({ sub: payload.sub, email: payload.email, role: payload.role }),
      });
    } catch {
      log('refresh:fail', {});
      res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  });
};
