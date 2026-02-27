import { describe, expect, it, vi } from 'vitest';
import { ErrorFactory } from '../../src/result/factory';
import { Err, Ok } from '../../src/result/types';
import {
  combine,
  flatMap,
  isErr,
  isOk,
  map,
  matchError,
  unwrap,
  unwrapOr,
  unwrapOrElse,
} from '../../src/result/utils';

const okResult = Ok(10);
const errResult = Err(ErrorFactory.notFound('Not found'));

describe('map', () => {
  it('transforms the value when Success', () => {
    const result = map(okResult, (n) => n * 2);
    expect(result.success).toBe(true);
    if (result.success) expect(result.value).toBe(20);
  });

  it('passes Failure through without calling fn', () => {
    const fn = vi.fn();
    const result = map(errResult, fn);
    expect(result.success).toBe(false);
    expect(fn).not.toHaveBeenCalled();
  });

  it('can change the value type', () => {
    const result = map(Ok('hello'), (s) => s.length);
    if (result.success) expect(result.value).toBe(5);
  });
});

describe('flatMap', () => {
  it('chains a function returning Result when Success', () => {
    const result = flatMap(okResult, (n) => Ok(n + 5));
    expect(result.success).toBe(true);
    if (result.success) expect(result.value).toBe(15);
  });

  it('short-circuits on Failure without calling fn', () => {
    const fn = vi.fn();
    const result = flatMap(errResult, fn);
    expect(result.success).toBe(false);
    expect(fn).not.toHaveBeenCalled();
  });

  it('propagates inner Failure', () => {
    const inner = Err(ErrorFactory.business('Failed'));
    const result = flatMap(okResult, () => inner);
    expect(result.success).toBe(false);
  });
});

describe('unwrap', () => {
  it('returns the value when Success', () => {
    expect(unwrap(okResult)).toBe(10);
  });

  it('throws when called on Failure', () => {
    expect(() => unwrap(errResult)).toThrow();
  });
});

describe('unwrapOr', () => {
  it('returns value when Success', () => {
    expect(unwrapOr(okResult, 99)).toBe(10);
  });

  it('returns fallback when Failure', () => {
    expect(unwrapOr(errResult, 99)).toBe(99);
  });
});

describe('unwrapOrElse', () => {
  it('returns value when Success', () => {
    const result = unwrapOrElse(okResult, () => 99);
    expect(result).toBe(10);
  });

  it('calls fn with the error when Failure', () => {
    const result = unwrapOrElse(errResult, (_err) => 99);
    expect(result).toBe(99);
  });
});

describe('isOk', () => {
  it('returns true for Success', () => {
    expect(isOk(okResult)).toBe(true);
  });

  it('returns false for Failure', () => {
    expect(isOk(errResult)).toBe(false);
  });
});

describe('isErr', () => {
  it('returns true for Failure', () => {
    expect(isErr(errResult)).toBe(true);
  });

  it('returns false for Success', () => {
    expect(isErr(okResult)).toBe(false);
  });
});

describe('combine', () => {
  it('returns Ok with all values when all succeed', () => {
    const results = [Ok(1), Ok(2), Ok(3)];
    const combined = combine(results);
    expect(combined.success).toBe(true);
    if (combined.success) expect(combined.value).toEqual([1, 2, 3]);
  });

  it('returns the first Failure encountered', () => {
    const first = Err(ErrorFactory.notFound('First error'));
    const results = [Ok(1), first, Ok(3)];
    const combined = combine(results);
    expect(combined.success).toBe(false);
    if (!combined.success) expect(combined.error.message).toBe('First error');
  });

  it('returns Ok with empty array for empty input', () => {
    const combined = combine([]);
    expect(combined.success).toBe(true);
    if (combined.success) expect(combined.value).toEqual([]);
  });
});

describe('matchError', () => {
  it('calls the matching handler', () => {
    const error = ErrorFactory.notFound('User not found');
    const result = matchError(error, {
      NOT_FOUND: (e) => `404: ${e.message}`,
      default: () => 'default',
    });
    expect(result).toBe('404: User not found');
  });

  it('falls through to default when no specific handler', () => {
    const error = ErrorFactory.internal('Crash');
    const result = matchError(error, {
      NOT_FOUND: () => 'not found',
      default: (e) => `default: ${e.type}`,
    });
    expect(result).toBe('default: INTERNAL_SERVER_ERROR');
  });

  it('works with all error types', () => {
    const cases = [
      ErrorFactory.validation('bad input'),
      ErrorFactory.unauthorized('no token'),
      ErrorFactory.forbidden('no permission'),
      ErrorFactory.conflict('duplicate'),
      ErrorFactory.business('rule violated'),
      ErrorFactory.database('query failed'),
      ErrorFactory.externalService('timeout', 'stripe'),
      ErrorFactory.internal('crash'),
    ];

    for (const error of cases) {
      const result = matchError(error, {
        default: (e) => e.statusCode,
      });
      expect(typeof result).toBe('number');
    }
  });
});
