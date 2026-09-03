import { Request, Response, NextFunction } from 'express';
import { redisClient } from './redis';

export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip;
  const key = `ratelimit:${ip}`;

  redisClient.get(key).then((value) => {
    if (value && parseInt(value) >= 10) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    redisClient.incr(key);
    next();
  });
  
  // מה השלב הבא? מה צריך לעשות עם Redis?
};