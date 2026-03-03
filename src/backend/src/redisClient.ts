import Redis from 'ioredis';

export const createRedisClient = () => {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const client = new Redis(url);

  client.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('Redis error', err);
  });

  return client;
};

