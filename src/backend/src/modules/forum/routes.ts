import type { Express, Request, Response } from 'express';
import type { Redis } from 'ioredis';

export const registerForumRoutes = (app: Express, _redis: Redis) => {
  app.get('/api/forum/threads', (_req: Request, res: Response) => {
    res.status(501).json({ error: 'Forum not yet implemented' });
  });
};
