import { describe, expect, it } from 'vitest';
import {
  checkRateLimit,
  createMemoryRateLimitStore,
} from '../../src/http/middlewares/rate-limit.middleware';
import type { RateLimitConfig } from '../../src/http/types';

const makeRequest = (ip = '1.2.3.4'): Request =>
  new Request('http://localhost/test', {
    headers: { 'x-forwarded-for': ip },
  });

const config: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 3,
  keyPrefix: 'test:',
};

describe('createMemoryRateLimitStore', () => {
  it('increments count on each call', async () => {
    const store = createMemoryRateLimitStore();
    const first = await store.increment('key', 60_000);
    const second = await store.increment('key', 60_000);
    expect(first.count).toBe(1);
    expect(second.count).toBe(2);
  });

  it('resets count after window expires', async () => {
    const store = createMemoryRateLimitStore();
    await store.increment('key', 1); // 1ms window — expires immediately
    await new Promise((r) => setTimeout(r, 5));
    const result = await store.increment('key', 60_000);
    expect(result.count).toBe(1);
  });

  it('reset() removes the key', async () => {
    const store = createMemoryRateLimitStore();
    await store.increment('key', 60_000);
    await store.increment('key', 60_000);
    await store.reset('key');
    const result = await store.increment('key', 60_000);
    expect(result.count).toBe(1);
  });

  it('tracks different keys independently', async () => {
    const store = createMemoryRateLimitStore();
    await store.increment('keyA', 60_000);
    await store.increment('keyA', 60_000);
    const b = await store.increment('keyB', 60_000);
    expect(b.count).toBe(1);
  });
});

describe('checkRateLimit', () => {
  it('allows requests under the limit', async () => {
    const store = createMemoryRateLimitStore();
    const result = await checkRateLimit(makeRequest(), config, store);
    expect(result.allowed).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('blocks requests over the limit', async () => {
    const store = createMemoryRateLimitStore();
    for (let i = 0; i < config.maxRequests; i++) {
      await checkRateLimit(makeRequest(), config, store);
    }
    const result = await checkRateLimit(makeRequest(), config, store);
    expect(result.allowed).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns X-RateLimit headers', async () => {
    const store = createMemoryRateLimitStore();
    const result = await checkRateLimit(makeRequest(), config, store);
    expect(result.headers['X-RateLimit-Limit']).toBe('3');
    expect(result.headers['X-RateLimit-Remaining']).toBeDefined();
    expect(result.headers['X-RateLimit-Reset']).toBeDefined();
  });

  it('returns Retry-After header when blocked', async () => {
    const store = createMemoryRateLimitStore();
    for (let i = 0; i <= config.maxRequests; i++) {
      await checkRateLimit(makeRequest(), config, store);
    }
    const result = await checkRateLimit(makeRequest(), config, store);
    expect(result.headers['Retry-After']).toBeDefined();
  });

  it('tracks different IPs independently', async () => {
    const store = createMemoryRateLimitStore();
    for (let i = 0; i < config.maxRequests; i++) {
      await checkRateLimit(makeRequest('1.1.1.1'), config, store);
    }
    // Different IP should still be allowed
    const result = await checkRateLimit(makeRequest('2.2.2.2'), config, store);
    expect(result.allowed).toBe(true);
  });

  it('error result has type BUSINESS_ERROR and status 429', async () => {
    const store = createMemoryRateLimitStore();
    for (let i = 0; i <= config.maxRequests; i++) {
      await checkRateLimit(makeRequest(), config, store);
    }
    const result = await checkRateLimit(makeRequest(), config, store);
    expect(result.error?.success).toBe(false);
    if (result.error && !result.error.success) {
      expect(result.error.error.statusCode).toBe(429);
      expect(result.error.error.type).toBe('BUSINESS_ERROR');
    }
  });
});
