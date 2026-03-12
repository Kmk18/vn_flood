import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createRedisClient } from './redisClient';
import { testConnection } from './db';
import { registerFloodRoutes } from './modules/flood/routes';
import { registerForumRoutes } from './modules/forum/routes';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const redis = createRedisClient();

// Simple test endpoint
app.get('/api/ping', (_req, res) => {
  res.json({ message: 'pong from backend', time: new Date().toISOString() });
});

app.get('/api/health', async (_req, res) => {
  const [redisOk, dbOk] = await Promise.all([
    redis.ping().then((p) => p === 'PONG').catch(() => false),
    testConnection(),
  ]);

  res.json({
    status: 'ok',
    redis: redisOk ? 'connected' : 'unavailable',
    db: dbOk ? 'connected' : 'unavailable',
  });
});

registerFloodRoutes(app, redis);
registerForumRoutes(app, redis);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});

