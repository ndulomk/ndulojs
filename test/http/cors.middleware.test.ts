import { describe, expect, it } from 'vitest';
import {
  buildCorsHeaders,
  handlePreflight,
  isOriginAllowed,
} from '../../src/http/middlewares/cors.middleware';
import type { CorsConfig } from '../../src/http/types';

const wildcardConfig: CorsConfig = { origins: '*' };
const specificConfig: CorsConfig = {
  origins: ['https://app.example.com', 'https://admin.example.com'],
  credentials: true,
};

describe('isOriginAllowed', () => {
  it('allows any origin when origins is *', () => {
    expect(isOriginAllowed('https://anything.com', wildcardConfig)).toBe(true);
  });

  it('allows null origin (server-to-server)', () => {
    expect(isOriginAllowed(null, specificConfig)).toBe(true);
  });

  it('allows listed origins', () => {
    expect(isOriginAllowed('https://app.example.com', specificConfig)).toBe(true);
  });

  it('blocks unlisted origins', () => {
    expect(isOriginAllowed('https://evil.com', specificConfig)).toBe(false);
  });
});

describe('buildCorsHeaders', () => {
  it('returns * for wildcard config', () => {
    const headers = buildCorsHeaders('https://anything.com', wildcardConfig);
    expect(headers['Access-Control-Allow-Origin']).toBe('*');
  });

  it('returns the specific origin when matched', () => {
    const headers = buildCorsHeaders('https://app.example.com', specificConfig);
    expect(headers['Access-Control-Allow-Origin']).toBe('https://app.example.com');
  });

  it('returns empty object for disallowed origin', () => {
    const headers = buildCorsHeaders('https://evil.com', specificConfig);
    expect(headers).toEqual({});
  });

  it('includes credentials header when configured', () => {
    const headers = buildCorsHeaders('https://app.example.com', specificConfig);
    expect(headers['Access-Control-Allow-Credentials']).toBe('true');
  });

  it('does not include credentials header when not configured', () => {
    const headers = buildCorsHeaders('https://anything.com', wildcardConfig);
    expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
  });

  it('includes allow-methods header', () => {
    const headers = buildCorsHeaders(null, wildcardConfig);
    expect(headers['Access-Control-Allow-Methods']).toBeDefined();
  });
});

describe('handlePreflight', () => {
  it('returns 204 status', () => {
    const response = handlePreflight('https://app.example.com', specificConfig);
    expect(response.status).toBe(204);
  });

  it('returns empty body', async () => {
    const response = handlePreflight(null, wildcardConfig);
    const text = await response.text();
    expect(text).toBe('');
  });

  it('includes CORS headers', () => {
    const response = handlePreflight('https://app.example.com', specificConfig);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
  });
});
