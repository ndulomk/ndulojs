import { describe, expect, it } from 'vitest';
import {
  createRequestLog,
  createResponseLog,
  extractIp,
  generateRequestId,
} from '../../src/http/middlewares/logger.middleware';

const makeRequest = (headers: Record<string, string> = {}): Request =>
  new Request('http://localhost/api/users', { headers });

describe('extractIp', () => {
  it('extracts from x-forwarded-for', () => {
    const req = makeRequest({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    expect(extractIp(req)).toBe('1.2.3.4');
  });

  it('extracts from x-real-ip when no forwarded', () => {
    const req = makeRequest({ 'x-real-ip': '9.10.11.12' });
    expect(extractIp(req)).toBe('9.10.11.12');
  });

  it('returns undefined when no IP headers', () => {
    expect(extractIp(makeRequest())).toBeUndefined();
  });

  it('takes first IP from x-forwarded-for chain', () => {
    const req = makeRequest({ 'x-forwarded-for': '  10.0.0.1  , 10.0.0.2' });
    expect(extractIp(req)).toBe('10.0.0.1');
  });
});

describe('generateRequestId', () => {
  it('returns a non-empty string', () => {
    const id = generateRequestId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('returns unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateRequestId()));
    expect(ids.size).toBe(100);
  });
});

describe('createRequestLog', () => {
  it('includes method and path', () => {
    const req = makeRequest();
    const log = createRequestLog(req, 'req-1');
    expect(log.method).toBe('GET');
    expect(log.path).toBe('/api/users');
  });

  it('includes requestId', () => {
    const log = createRequestLog(makeRequest(), 'my-id');
    expect(log.requestId).toBe('my-id');
  });

  it('includes user-agent when present', () => {
    const req = makeRequest({ 'user-agent': 'TestAgent/1.0' });
    const log = createRequestLog(req, 'id');
    expect(log.userAgent).toBe('TestAgent/1.0');
  });
});

describe('createResponseLog', () => {
  it('includes statusCode and durationMs', () => {
    const req = makeRequest();
    const start = Date.now() - 50;
    const log = createResponseLog(req, 'id', 200, start);
    expect(log.statusCode).toBe(200);
    expect(log.durationMs).toBeGreaterThanOrEqual(50);
  });

  it('includes method and path', () => {
    const req = makeRequest();
    const log = createResponseLog(req, 'id', 404, Date.now());
    expect(log.method).toBe('GET');
    expect(log.path).toBe('/api/users');
  });
});
