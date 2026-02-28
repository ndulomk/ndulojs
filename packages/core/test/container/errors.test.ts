import { describe, expect, it } from 'vitest';
import {
  AlreadyRegisteredError,
  CircularDependencyError,
  NotRegisteredError,
} from '../../src/container/errors';

describe('NotRegisteredError', () => {
  it('has correct name', () => {
    const error = new NotRegisteredError('MyService');
    expect(error.name).toBe('NotRegisteredError');
  });

  it('message includes the token', () => {
    const error = new NotRegisteredError('MyService');
    expect(error.message).toContain('MyService');
  });

  it('is an instance of Error', () => {
    expect(new NotRegisteredError('x')).toBeInstanceOf(Error);
  });
});

describe('CircularDependencyError', () => {
  it('has correct name', () => {
    const error = new CircularDependencyError('a', ['a', 'b']);
    expect(error.name).toBe('CircularDependencyError');
  });

  it('message shows the full chain with arrow notation', () => {
    const error = new CircularDependencyError('a', ['a', 'b', 'c']);
    expect(error.message).toContain('a → b → c → a');
  });

  it('is an instance of Error', () => {
    expect(new CircularDependencyError('a', [])).toBeInstanceOf(Error);
  });
});

describe('AlreadyRegisteredError', () => {
  it('has correct name', () => {
    const error = new AlreadyRegisteredError('MyService');
    expect(error.name).toBe('AlreadyRegisteredError');
  });

  it('message includes the token', () => {
    const error = new AlreadyRegisteredError('MyService');
    expect(error.message).toContain('MyService');
  });

  it('is an instance of Error', () => {
    expect(new AlreadyRegisteredError('x')).toBeInstanceOf(Error);
  });
});
