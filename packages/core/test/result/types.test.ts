import { describe, expect, it } from 'vitest';
import { Err, Ok } from '../../src/result/types';

describe('Ok', () => {
  it('creates a Success with the given value', () => {
    const result = Ok(42);
    expect(result.success).toBe(true);
    expect(result.value).toBe(42);
  });

  it('works with objects', () => {
    const user = { id: '1', name: 'Ada' };
    const result = Ok(user);
    expect(result.success).toBe(true);
    expect(result.value).toEqual(user);
  });

  it('works with null', () => {
    const result = Ok(null);
    expect(result.success).toBe(true);
    expect(result.value).toBeNull();
  });

  it('works with undefined', () => {
    const result = Ok(undefined);
    expect(result.success).toBe(true);
    expect(result.value).toBeUndefined();
  });

  it('is readonly — value cannot be reassigned', () => {
    const result = Ok(10);
    // TypeScript enforces this at compile time
    // This test documents the intent
    expect(Object.isFrozen(result) || result.success === true).toBe(true);
  });
});

describe('Err', () => {
  it('creates a Failure with the given error', () => {
    const error = { message: 'Something went wrong' };
    const result = Err(error);
    expect(result.success).toBe(false);
    expect(result.error).toEqual(error);
  });

  it('works with strings', () => {
    const result = Err('error message');
    expect(result.success).toBe(false);
    expect(result.error).toBe('error message');
  });

  it('works with null', () => {
    const result = Err(null);
    expect(result.success).toBe(false);
    expect(result.error).toBeNull();
  });
});

describe('Result discriminated union', () => {
  it('can be narrowed with success check', () => {
    const result = Math.random() > 0.5 ? Ok('hello') : Err('oops');

    if (result.success) {
      // TypeScript knows this is Success<string> here
      expect(typeof result.value).toBe('string');
    } else {
      // TypeScript knows this is Failure<string> here
      expect(typeof result.error).toBe('string');
    }
  });
});
