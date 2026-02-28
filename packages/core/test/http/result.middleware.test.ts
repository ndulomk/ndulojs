import { describe, expect, it } from 'vitest';
import { ErrorFactory } from '../../src/result/factory';
import { Err, Ok } from '../../src/result/types';
import {
  errorToStatus,
  formatErrorResponse,
  formatSuccessResponse,
  isResult,
  processHandlerResult,
} from '../../src/http/middlewares/result.middleware';

describe('isResult', () => {
  it('returns true for Ok', () => {
    expect(isResult(Ok('hello'))).toBe(true);
  });

  it('returns true for Err', () => {
    expect(isResult(Err(ErrorFactory.notFound('x')))).toBe(true);
  });

  it('returns false for plain objects', () => {
    expect(isResult({ foo: 'bar' })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isResult(null)).toBe(false);
  });

  it('returns false for strings', () => {
    expect(isResult('hello')).toBe(false);
  });

  it('returns false for arrays', () => {
    expect(isResult([1, 2, 3])).toBe(false);
  });
});

describe('errorToStatus', () => {
  it('maps VALIDATION_ERROR to 422', () => {
    expect(errorToStatus(ErrorFactory.validation('bad'))).toBe(422);
  });

  it('maps NOT_FOUND to 404', () => {
    expect(errorToStatus(ErrorFactory.notFound('missing'))).toBe(404);
  });

  it('maps UNAUTHORIZED to 401', () => {
    expect(errorToStatus(ErrorFactory.unauthorized('no token'))).toBe(401);
  });

  it('maps FORBIDDEN to 403', () => {
    expect(errorToStatus(ErrorFactory.forbidden('no access'))).toBe(403);
  });

  it('maps CONFLICT to 409', () => {
    expect(errorToStatus(ErrorFactory.conflict('duplicate'))).toBe(409);
  });

  it('maps BUSINESS_ERROR to 400', () => {
    expect(errorToStatus(ErrorFactory.business('rule'))).toBe(400);
  });

  it('maps DATABASE_ERROR to 500', () => {
    expect(errorToStatus(ErrorFactory.database('query failed'))).toBe(500);
  });

  it('maps EXTERNAL_SERVICE_ERROR to 502', () => {
    expect(errorToStatus(ErrorFactory.externalService('timeout', 'stripe'))).toBe(502);
  });

  it('maps tooManyRequests to 429', () => {
    expect(errorToStatus(ErrorFactory.tooManyRequests('slow down', 60))).toBe(429);
  });
});

describe('formatErrorResponse', () => {
  it('includes success: false', () => {
    const res = formatErrorResponse(ErrorFactory.notFound('missing'));
    expect(res.success).toBe(false);
  });

  it('includes error type and message', () => {
    const res = formatErrorResponse(ErrorFactory.notFound('User not found'));
    expect(res.error.type).toBe('NOT_FOUND');
    expect(res.error.message).toBe('User not found');
  });

  it('includes validation details for VALIDATION_ERROR', () => {
    const fields = [{ field: 'email', message: 'Invalid email' }];
    const res = formatErrorResponse(ErrorFactory.validation('bad input', fields));
    expect(res.error.details).toEqual(fields);
  });

  it('includes resource for NOT_FOUND', () => {
    const res = formatErrorResponse(ErrorFactory.notFound('User not found', 'User', '123'));
    expect(res.error.resource).toBe('User');
  });

  it('includes code for BUSINESS_ERROR', () => {
    const res = formatErrorResponse(
      ErrorFactory.business('Insufficient stock', 'INSUFFICIENT_STOCK'),
    );
    expect(res.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('includes timestamp', () => {
    const res = formatErrorResponse(ErrorFactory.notFound('x'));
    expect(res.error.timestamp).toBeDefined();
  });
});

describe('formatSuccessResponse', () => {
  it('wraps value in success envelope', () => {
    const res = formatSuccessResponse({ id: '1', name: 'Ada' });
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ id: '1', name: 'Ada' });
  });

  it('works with primitives', () => {
    expect(formatSuccessResponse(42)).toEqual({ success: true, data: 42 });
    expect(formatSuccessResponse(null)).toEqual({ success: true, data: null });
  });
});

describe('processHandlerResult', () => {
  it('wraps Ok result — status 200', () => {
    const { body, status } = processHandlerResult(Ok({ id: '1' }));
    expect(status).toBe(200);
    expect((body as { success: boolean }).success).toBe(true);
  });

  it('unwraps Err result — correct status', () => {
    const { body, status } = processHandlerResult(Err(ErrorFactory.notFound('missing')));
    expect(status).toBe(404);
    expect((body as { success: boolean }).success).toBe(false);
  });

  it('passes through raw values untouched', () => {
    const raw = { custom: 'response' };
    const { body, status } = processHandlerResult(raw);
    expect(body).toBe(raw);
    expect(status).toBe(200);
  });

  it('passes through null', () => {
    const { body, status } = processHandlerResult(null);
    expect(body).toBeNull();
    expect(status).toBe(200);
  });
});
