import { Request, Response, NextFunction } from 'express';
import redis from '../services/redis.js';

export function rateLimit(maxRequests: number, windowSeconds: number, keyPrefix = 'rl') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `${keyPrefix}:${req.ip}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count));

    if (count > maxRequests) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }
    next();
  };
}
