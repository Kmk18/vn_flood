import Redis from 'ioredis';

export const createRedisClient = () => {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const tls = url.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined;
  const client = new Redis(url, {
    tls,
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy: (times) => {
      if (times >= 3) return null; // stop retrying after 3 attempts
      return times * 1000;         // 1s, 2s, 3s then give up
    },
  });

  let warned = false;
  client.on('error', () => {
    if (!warned) {
      console.warn('Redis unavailable — caching disabled until it connects');
      warned = true;
    }
  });

  client.on('connect', () => {
    warned = false;
    console.log('Redis connected');
  });

  client.connect().catch(() => {});

  return client;
};

