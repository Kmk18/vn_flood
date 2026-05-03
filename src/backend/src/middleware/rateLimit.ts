import type { Redis } from 'ioredis';
import type { Request, Response, NextFunction } from 'express';

interface RateLimitOpts {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix?: string;
}

export const createRateLimiter = (redis: Redis, opts: RateLimitOpts) => {
  const prefix = opts.keyPrefix ?? 'rl';

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const key = `${prefix}:${req.path}:${ip}`;

    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, opts.windowSeconds);
      }

      res.setHeader('X-RateLimit-Limit', opts.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, opts.maxRequests - count));

      if (count > opts.maxRequests) {
        const ttl = await redis.ttl(key);
        res.setHeader('Retry-After', ttl);
        res.status(429).json({ error: 'Too many requests', retryAfter: ttl });
        return;
      }
    } catch {
      // Redis unavailable — fail open, don't block requests
    }

    next();
  };
};
