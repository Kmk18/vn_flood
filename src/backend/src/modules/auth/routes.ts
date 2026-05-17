import type { Express, Request, Response } from 'express';
import type { Redis } from 'ioredis';
import { and, eq, gt, lt } from 'drizzle-orm';
import { createHash } from 'crypto';
import { z } from 'zod';
import { db, users, sessions } from '../../db';
import { hashPassword, verifyPassword } from '../../lib/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt';
import { createRateLimiter } from '../../middleware/rateLimit';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

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

export const registerAuthRoutes = (app: Express, redis: Redis) => {
  const registerLimiter = createRateLimiter(redis, { windowSeconds: 3600, maxRequests: 5, keyPrefix: 'rl:register' });
  const loginLimiter = createRateLimiter(redis, { windowSeconds: 900, maxRequests: 10, keyPrefix: 'rl:login' });

  app.post('/api/auth/register', registerLimiter, async (req: Request, res: Response) => {
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
      const refreshToken = signRefreshToken(payload);
      const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
      await db.insert(sessions).values({ userId: user.id, tokenHash: hashToken(refreshToken), expiresAt });
      res.status(201).json({
        user,
        accessToken: signAccessToken(payload),
        refreshToken,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[auth] register:error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/login', loginLimiter, async (req: Request, res: Response) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      log('login:validation-fail', { issues: result.error.issues, body: JSON.stringify(req.body) });
      res.status(400).json({ error: result.error.issues });
      return;
    }
    const { email, password } = result.data;

    const [user] = await db
      .select({
        id: users.id, email: users.email, role: users.role,
        name: users.name, passwordHash: users.passwordHash,
      })
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
    const refreshToken = signRefreshToken(payload);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    // Clean up expired sessions for this user, then store new one
    await db.delete(sessions)
      .where(and(eq(sessions.userId, user.id), lt(sessions.expiresAt, new Date())))
      .catch(() => {});
    await db.insert(sessions).values({ userId: user.id, tokenHash: hashToken(refreshToken), expiresAt });

    res.json({
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
      accessToken: signAccessToken(payload),
      refreshToken,
    });
  });

  app.post('/api/auth/refresh', async (req: Request, res: Response) => {
    const result = refreshSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'refreshToken required' });
      return;
    }
    try {
      const payload = verifyRefreshToken(result.data.refreshToken);
      const tokenHash = hashToken(result.data.refreshToken);

      // Validate session exists and hasn't expired
      const [session] = await db
        .select({ id: sessions.id })
        .from(sessions)
        .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
        .limit(1);

      if (!session) {
        log('refresh:no-session', { userId: payload.sub });
        res.status(401).json({ error: 'Session not found or expired' });
        return;
      }

      // Rotate: delete old session, issue new token pair
      const newRefreshToken = signRefreshToken({ sub: payload.sub, email: payload.email, role: payload.role });
      const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
      await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
      await db.insert(sessions).values({ userId: payload.sub, tokenHash: hashToken(newRefreshToken), expiresAt });

      log('refresh:ok', { userId: payload.sub, email: payload.email });
      res.json({
        accessToken: signAccessToken({ sub: payload.sub, email: payload.email, role: payload.role }),
        refreshToken: newRefreshToken,
      });
    } catch {
      log('refresh:fail', {});
      res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  });

  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (typeof refreshToken === 'string') {
      await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(refreshToken))).catch(() => {});
    }
    res.status(204).send();
  });
};
