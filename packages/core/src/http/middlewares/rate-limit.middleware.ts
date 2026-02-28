import type { RateLimitConfig } from '../types';
import { ErrorFactory } from '../../result/factory';
import { Err } from '../../result/types';
import type { AppError } from '../../result/errors';
import type { Failure } from '../../result/types';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitStore = {
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
  reset(key: string): Promise<void>;
};

export const createMemoryRateLimitStore = (): RateLimitStore => {
  const store = new Map<string, RateLimitEntry>();

  return {
    increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
      const now = Date.now();
      const existing = store.get(key);

      if (!existing || now > existing.resetAt) {
        const entry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
        store.set(key, entry);
        return Promise.resolve({ count: 1, resetAt: entry.resetAt });
      }

      existing.count += 1;
      return Promise.resolve({ count: existing.count, resetAt: existing.resetAt });
    },

    reset(key: string): Promise<void> {
      store.delete(key);
      return Promise.resolve();
    },
  };
};

const getClientKey = (request: Request, prefix: string): string => {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  return `ratelimit:${prefix}${ip}`;
};

export type RateLimitResult =
  | { allowed: true; headers: Record<string, string>; error?: undefined }
  | { allowed: false; headers: Record<string, string>; error: Failure<AppError> };

export const checkRateLimit = async (
  request: Request,
  config: RateLimitConfig,
  store: RateLimitStore,
): Promise<RateLimitResult> => {
  const key = getClientKey(request, config.keyPrefix ?? '');
  const { count, resetAt } = await store.increment(key, config.windowMs);

  const remaining = Math.max(0, config.maxRequests - count);
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': new Date(resetAt).toISOString(),
  };

  if (count > config.maxRequests) {
    headers['Retry-After'] = String(retryAfter);
    return {
      allowed: false,
      headers,
      error: Err(
        ErrorFactory.tooManyRequests(
          `Too many requests. Try again in ${retryAfter} seconds.`,
          retryAfter,
          'RateLimitMiddleware',
        ),
      ),
    };
  }

  return { allowed: true, headers };
};
