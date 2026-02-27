import { describe, expect, it, vi, beforeAll } from 'vitest';
import pino from 'pino';

beforeAll(() => {
  vi.spyOn(pino, 'transport').mockReturnValue(
    pino.destination('/dev/null') as ReturnType<typeof pino.transport>,
  );
});

import { createLogger } from '../../src/logger/logger.js';
import { createContextLogger } from '../../src/logger/factory.js';

describe('createLogger', () => {
  it('returns all three channels', () => {
    const logger = createLogger({ pretty: true });
    expect(logger.app).toBeDefined();
    expect(logger.http).toBeDefined();
    expect(logger.error).toBeDefined();
  });

  it('returns a context() function', () => {
    const logger = createLogger({ pretty: true });
    expect(typeof logger.context).toBe('function');
  });

  it('uses defaults when no config is provided', () => {
    expect(() => createLogger()).not.toThrow();
  });
});

describe('NduloLogger interface', () => {
  it('exposes all log level methods', () => {
    const logger = createLogger({ pretty: true });
    expect(typeof logger.app.trace).toBe('function');
    expect(typeof logger.app.debug).toBe('function');
    expect(typeof logger.app.info).toBe('function');
    expect(typeof logger.app.warn).toBe('function');
    expect(typeof logger.app.error).toBe('function');
    expect(typeof logger.app.fatal).toBe('function');
  });

  it('exposes .child() method', () => {
    const logger = createLogger({ pretty: true });
    expect(typeof logger.app.child).toBe('function');
  });

  it('exposes underlying pino instance', () => {
    const logger = createLogger({ pretty: true });
    expect(logger.app.pino).toBeDefined();
    expect(typeof logger.app.pino.info).toBe('function');
  });

  it('accepts string message', () => {
    const logger = createLogger({ pretty: true });
    expect(() => logger.app.info('hello')).not.toThrow();
  });

  it('accepts object + message', () => {
    const logger = createLogger({ pretty: true });
    expect(() => logger.app.info({ requestId: 'abc' }, 'hello')).not.toThrow();
  });

  it('accepts object without message', () => {
    const logger = createLogger({ pretty: true });
    expect(() => logger.app.info({ requestId: 'abc' })).not.toThrow();
  });
});

describe('child logger', () => {
  it('returns a NduloLogger', () => {
    const logger = createLogger({ pretty: true });
    const child = logger.app.child({ requestId: 'req-1' });
    expect(typeof child.info).toBe('function');
    expect(typeof child.child).toBe('function');
  });

  it('can chain child calls', () => {
    const logger = createLogger({ pretty: true });
    const child = logger.app.child({ requestId: 'req-1' }).child({ userId: 'user-42' });
    expect(() => child.info('nested child')).not.toThrow();
  });
});

describe('context()', () => {
  it('returns app, http, error loggers', () => {
    const logger = createLogger({ pretty: true });
    const ctx = logger.context({ requestId: 'req-1', userId: 'user-42' });
    expect(ctx.app).toBeDefined();
    expect(ctx.http).toBeDefined();
    expect(ctx.error).toBeDefined();
  });

  it('context loggers are functional', () => {
    const logger = createLogger({ pretty: true });
    const ctx = logger.context({ requestId: 'req-1' });
    expect(() => ctx.app.info('context log')).not.toThrow();
    expect(() => ctx.http.info({ path: '/api' }, 'request')).not.toThrow();
    expect(() => ctx.error.error('something failed')).not.toThrow();
  });

  it('different contexts are independent', () => {
    const logger = createLogger({ pretty: true });
    const ctxA = logger.context({ requestId: 'req-A' });
    const ctxB = logger.context({ requestId: 'req-B' });
    expect(() => ctxA.app.info('from A')).not.toThrow();
    expect(() => ctxB.app.info('from B')).not.toThrow();
  });
});

describe('createContextLogger', () => {
  it('binds context to all channels', () => {
    const logger = createLogger({ pretty: true });
    const ctx = createContextLogger(
      { app: logger.app, http: logger.http, error: logger.error },
      { requestId: 'req-1', userId: 'u-1' },
    );
    expect(() => ctx.app.info('bound app log')).not.toThrow();
    expect(() => ctx.http.info('bound http log')).not.toThrow();
    expect(() => ctx.error.error('bound error log')).not.toThrow();
  });
});

describe('channel field', () => {
  it('app channel has channel=app in bindings', () => {
    const logger = createLogger({ pretty: true });
    expect(logger.app.pino.bindings()['channel']).toBe('app');
  });

  it('http channel has channel=http', () => {
    const logger = createLogger({ pretty: true });
    expect(logger.http.pino.bindings()['channel']).toBe('http');
  });

  it('error channel has channel=error', () => {
    const logger = createLogger({ pretty: true });
    expect(logger.error.pino.bindings()['channel']).toBe('error');
  });
});
