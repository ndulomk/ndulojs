import { describe, expect, it } from 'vitest';
import { ErrorFactory } from '../../src/result/factory';

describe('ErrorFactory', () => {
  describe('common fields', () => {
    it('always includes timestamp', () => {
      const error = ErrorFactory.notFound('test');
      expect(error.timestamp).toBeDefined();
      expect(() => new Date(error.timestamp)).not.toThrow();
    });

    it('always includes stack trace', () => {
      const error = ErrorFactory.notFound('test');
      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });

    it('stack trace does not contain internal ErrorFactory frames', () => {
      const error = ErrorFactory.notFound('test');
      expect(error.stack).not.toContain('ErrorFactory');
      expect(error.stack).not.toContain('captureStack');
    });

    it('accepts optional component', () => {
      const error = ErrorFactory.notFound('test', 'User', '123', 'UserService');
      expect(error.component).toBe('UserService');
    });
  });

  describe('validation', () => {
    it('creates error with type VALIDATION_ERROR', () => {
      const error = ErrorFactory.validation('Invalid input');
      expect(error.type).toBe('VALIDATION_ERROR');
    });

    it('has statusCode 422', () => {
      const error = ErrorFactory.validation('Invalid input');
      expect(error.statusCode).toBe(422);
    });

    it('defaults to empty errors array', () => {
      const error = ErrorFactory.validation('Invalid input');
      expect(error.errors).toEqual([]);
    });

    it('includes field errors', () => {
      const fields = [{ field: 'email', message: 'Invalid email', rule: 'email' }];
      const error = ErrorFactory.validation('Invalid input', fields);
      expect(error.errors).toHaveLength(1);
      expect(error.errors[0]?.field).toBe('email');
    });
  });

  describe('notFound', () => {
    it('has type NOT_FOUND and statusCode 404', () => {
      const error = ErrorFactory.notFound('User not found');
      expect(error.type).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });

    it('includes resource and resourceId', () => {
      const error = ErrorFactory.notFound('User not found', 'User', '123');
      expect(error.resource).toBe('User');
      expect(error.resourceId).toBe('123');
    });
  });

  describe('unauthorized', () => {
    it('has type UNAUTHORIZED and statusCode 401', () => {
      const error = ErrorFactory.unauthorized('Not authenticated');
      expect(error.type).toBe('UNAUTHORIZED');
      expect(error.statusCode).toBe(401);
    });

    it('includes reason', () => {
      const error = ErrorFactory.unauthorized('Token expired', 'expired_token');
      expect(error.reason).toBe('expired_token');
    });
  });

  describe('forbidden', () => {
    it('has type FORBIDDEN and statusCode 403', () => {
      const error = ErrorFactory.forbidden('Access denied');
      expect(error.type).toBe('FORBIDDEN');
      expect(error.statusCode).toBe(403);
    });

    it('includes requiredPermission', () => {
      const error = ErrorFactory.forbidden('Access denied', 'admin:write');
      expect(error.requiredPermission).toBe('admin:write');
    });
  });

  describe('conflict', () => {
    it('has type CONFLICT and statusCode 409', () => {
      const error = ErrorFactory.conflict('Email already exists');
      expect(error.type).toBe('CONFLICT');
      expect(error.statusCode).toBe(409);
    });

    it('includes conflictingField and existingValue', () => {
      const error = ErrorFactory.conflict('Email taken', 'email', 'ada@example.com');
      expect(error.conflictingField).toBe('email');
      expect(error.existingValue).toBe('ada@example.com');
    });
  });

  describe('business', () => {
    it('has type BUSINESS_ERROR and statusCode 400', () => {
      const error = ErrorFactory.business('Insufficient stock');
      expect(error.type).toBe('BUSINESS_ERROR');
      expect(error.statusCode).toBe(400);
    });

    it('includes code', () => {
      const error = ErrorFactory.business('Insufficient stock', 'INSUFFICIENT_STOCK');
      expect(error.code).toBe('INSUFFICIENT_STOCK');
    });
  });

  describe('database', () => {
    it('has type DATABASE_ERROR and statusCode 500', () => {
      const error = ErrorFactory.database('Query failed');
      expect(error.type).toBe('DATABASE_ERROR');
      expect(error.statusCode).toBe(500);
    });

    it('includes operation and table', () => {
      const error = ErrorFactory.database('Insert failed', undefined, 'INSERT', 'users');
      expect(error.operation).toBe('INSERT');
      expect(error.table).toBe('users');
    });

    it('includes cause', () => {
      const cause = new Error('connection refused');
      const error = ErrorFactory.database('Query failed', cause);
      expect(error.cause).toBe(cause);
    });
  });

  describe('externalService', () => {
    it('has type EXTERNAL_SERVICE_ERROR and statusCode 502', () => {
      const error = ErrorFactory.externalService('Resend failed', 'resend');
      expect(error.type).toBe('EXTERNAL_SERVICE_ERROR');
      expect(error.statusCode).toBe(502);
    });

    it('includes service name', () => {
      const error = ErrorFactory.externalService('Failed', 'stripe');
      expect(error.service).toBe('stripe');
    });
  });

  describe('internal', () => {
    it('has type INTERNAL_SERVER_ERROR and statusCode 500', () => {
      const error = ErrorFactory.internal('Unexpected error');
      expect(error.type).toBe('INTERNAL_SERVER_ERROR');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('tooManyRequests', () => {
    it('has type BUSINESS_ERROR, statusCode 429, code TOO_MANY_REQUESTS', () => {
      const error = ErrorFactory.tooManyRequests('Slow down', 60);
      expect(error.type).toBe('BUSINESS_ERROR');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('TOO_MANY_REQUESTS');
    });

    it('includes retryAfter in metadata', () => {
      const error = ErrorFactory.tooManyRequests('Slow down', 60);
      expect(error.metadata?.retryAfter).toBe(60);
    });
  });
});
