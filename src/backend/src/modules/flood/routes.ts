import type { Express, Request, Response } from 'express';
import type Redis from 'ioredis';

export const registerFloodRoutes = (app: Express, redis: Redis.Redis) => {
  // Placeholder: will use AI service + Redis caching later
  app.get('/api/flood/preview', async (_req: Request, res: Response) => {
    const mock = {
      region: 'VN',
      riskLevel: 'unknown',
      probability: 0,
      message:
        'Flood prediction AI not implemented yet. This endpoint is part of the framework setup.'
    };
    res.json(mock);
  });
};

