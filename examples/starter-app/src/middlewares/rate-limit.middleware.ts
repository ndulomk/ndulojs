import Redis from 'ioredis';
import { env } from '@/config/env';
import { ErrorFactory, Err } from 'ndulojs';
import type { RequestContext } from 'ndulojs';
import { logger } from '@/shared/logger/logger';

const redisConnection = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redisConnection.on('error', (error) => {
  logger.error({ error }, 'Redis rate limiter connection error');
});

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export const RateLimitPresets = {
  AUTH: {
    windowMs: 15 * 60 * 1000, 
    maxRequests: 5,
    keyPrefix: 'auth:',
  },
  API: {
    windowMs: 60 * 1000,
    maxRequests: 60,
    keyPrefix: 'api:',
  },
  PUBLIC: {
    windowMs: 60 * 1000,
    maxRequests: 120,
    keyPrefix: 'public:',
  },
  CRITICAL: {
    windowMs: 60 * 60 * 1000, 
    maxRequests: 10,
    keyPrefix: 'critical:',
  },
} as const;

const getClientIp = (ctx: RequestContext): string =>
  ctx.headers['x-forwarded-for']?.split(',')[0]?.trim() ??
  ctx.headers['x-real-ip'] ??
  'unknown';

/**
 * Handler-level rate limiter using Redis sliding window (INCR + TTL).
 *
 * Returns `null` if the request is allowed, or an `Err(TooManyRequests)`
 * Result to return directly from the handler.
 *
 * @example
 * router.post('/login', async (ctx) => {
 *   const limited = await rateLimit(ctx, RateLimitPresets.AUTH);
 *   if (limited) return limited;
 *   // ... handler logic
 * });
 */
export const rateLimit = async (
  ctx: RequestContext,
  config: RateLimitConfig,
): Promise<ReturnType<typeof Err> | null> => {
  const ip = getClientIp(ctx);
  const key = `ratelimit:${config.keyPrefix ?? ''}${ip}`;
  const windowSeconds = Math.ceil(config.windowMs / 1000);

  try {
    const multi = redisConnection.multi();
    multi.incr(key);
    multi.ttl(key);
    const results = await multi.exec();

    if (!results) {
      logger.warn({ ip, key }, 'Redis rate limit check failed — allowing request');
      return null;
    }

    const [[, currentCount], [, ttl]] = results as [[null, number], [null, number]];

    if (ttl === -1) {
      await redisConnection.expire(key, windowSeconds);
    }

    if (currentCount > config.maxRequests) {
      const retryAfter = ttl > 0 ? ttl : windowSeconds;
      logger.warn(
        { ip, path: ctx.path, count: currentCount, limit: config.maxRequests },
        'Rate limit exceeded',
      );
      return Err(
        ErrorFactory.tooManyRequests(
          `Too many requests. Try again in ${retryAfter} seconds.`,
          retryAfter,
          'RateLimitMiddleware',
        ),
      );
    }

    return null;
  } catch (error) {
    logger.error({ error, ip, key }, 'Rate limit check error — allowing request');
    return null;
  }
};