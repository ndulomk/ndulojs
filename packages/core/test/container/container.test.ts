import { describe, expect, it, vi } from 'vitest';
import { createContainer } from '../../src/container/container';
import { CircularDependencyError, NotRegisteredError } from '../../src/container/errors';

// --- helpers ---

type Database = { query: (sql: string) => string };
type UserRepository = { findById: (id: string) => string };
type UserService = { getUser: (id: string) => string };

/**
 * Declare the registry upfront so the container knows all types.
 * This is the recommended pattern — type the registry, not each register call.
 */
type AppRegistry = {
  db: Database;
  userRepo: UserRepository;
  userService: UserService;
};

const createDatabase = (): Database => ({
  query: (sql) => `result of: ${sql}`,
});

const createUserRepository = (db: Database): UserRepository => ({
  findById: (id) => db.query(`SELECT * FROM users WHERE id = '${id}'`),
});

const createUserService = (repo: UserRepository): UserService => ({
  getUser: (id) => repo.findById(id),
});

describe('createContainer', () => {
  it('creates an empty container', () => {
    const container = createContainer();
    expect(container).toBeDefined();
    expect(container.has('anything')).toBe(false);
  });
});

describe('register + resolve', () => {
  it('resolves a simple value', () => {
    const container = createContainer<{ db: Database }>().register('db', () => createDatabase());
    const db = container.resolve('db');
    expect(db.query('SELECT 1')).toBe('result of: SELECT 1');
  });

  it('resolves dependencies between tokens', () => {
    const container = createContainer<AppRegistry>()
      .register('db', () => createDatabase())
      .register('userRepo', (c) => createUserRepository(c.resolve('db')))
      .register('userService', (c) => createUserService(c.resolve('userRepo')));

    const service = container.resolve('userService');
    expect(service.getUser('123')).toContain('123');
  });

  it('supports fluent chaining', () => {
    const container = createContainer<{ a: number; b: number; c: number }>()
      .register('a', () => 1)
      .register('b', () => 2)
      .register('c', () => 3);

    expect(container.resolve('a')).toBe(1);
    expect(container.resolve('b')).toBe(2);
    expect(container.resolve('c')).toBe(3);
  });

  it('throws NotRegisteredError for unknown token', () => {
    const container = createContainer();
    expect(() => container.resolve('unknown' as never)).toThrow(NotRegisteredError);
  });

  it('error message includes the token name', () => {
    const container = createContainer();
    expect(() => container.resolve('MissingService' as never)).toThrow(
      'Token "MissingService" has not been registered',
    );
  });
});

describe('singleton scope (default)', () => {
  it('returns the same instance on multiple resolves', () => {
    const factory = vi.fn(() => ({ id: Math.random() }));
    const container = createContainer<{ service: { id: number } }>().register('service', factory);

    const first = container.resolve('service');
    const second = container.resolve('service');

    expect(first).toBe(second);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('factory is only called once even with multiple consumers', () => {
    type Reg = { db: Database; repoA: UserRepository; repoB: UserRepository };
    const dbFactory = vi.fn(() => createDatabase());
    const container = createContainer<Reg>()
      .register('db', dbFactory)
      .register('repoA', (c) => createUserRepository(c.resolve('db')))
      .register('repoB', (c) => createUserRepository(c.resolve('db')));

    container.resolve('repoA');
    container.resolve('repoB');

    expect(dbFactory).toHaveBeenCalledTimes(1);
  });
});

describe('transient scope', () => {
  it('returns a new instance on every resolve', () => {
    const factory = vi.fn(() => ({ id: Math.random() }));
    const container = createContainer<{ service: { id: number } }>().registerTransient(
      'service',
      factory,
    );

    const first = container.resolve('service');
    const second = container.resolve('service');

    expect(first).not.toBe(second);
    expect(factory).toHaveBeenCalledTimes(2);
  });
});

describe('scoped scope', () => {
  it('returns same instance within a scope', () => {
    const factory = vi.fn(() => ({ id: Math.random() }));
    const container = createContainer<{ service: { id: number } }>().registerScoped(
      'service',
      factory,
    );

    const scope = container.createScope();
    const first = scope.resolve('service');
    const second = scope.resolve('service');

    expect(first).toBe(second);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('returns different instances across different scopes', () => {
    const factory = vi.fn(() => ({ id: Math.random() }));
    const container = createContainer<{ service: { id: number } }>().registerScoped(
      'service',
      factory,
    );

    const scopeA = container.createScope();
    const scopeB = container.createScope();

    const fromA = scopeA.resolve('service');
    const fromB = scopeB.resolve('service');

    expect(fromA).not.toBe(fromB);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('singletons are shared across scopes', () => {
    const singletonFactory = vi.fn(() => ({ id: Math.random() }));
    const container = createContainer<{ singleton: { id: number } }>().register(
      'singleton',
      singletonFactory,
    );

    const scopeA = container.createScope();
    const scopeB = container.createScope();

    const fromA = scopeA.resolve('singleton');
    const fromB = scopeB.resolve('singleton');

    expect(fromA).toBe(fromB);
    expect(singletonFactory).toHaveBeenCalledTimes(1);
  });

  it('dispose clears the scoped cache', () => {
    const factory = vi.fn(() => ({ id: Math.random() }));
    const container = createContainer<{ service: { id: number } }>().registerScoped(
      'service',
      factory,
    );

    const scope = container.createScope();
    scope.resolve('service');
    scope.dispose();

    const scope2 = container.createScope();
    scope2.resolve('service');

    expect(factory).toHaveBeenCalledTimes(2);
  });
});

describe('circular dependency detection', () => {
  it('throws CircularDependencyError instead of stack overflow', () => {
    const container = createContainer<{ a: unknown; b: unknown }>()
      .register('a', (c) => c.resolve('b'))
      .register('b', (c) => c.resolve('a'));

    expect(() => container.resolve('a')).toThrow(CircularDependencyError);
  });

  it('error message shows the full resolution chain', () => {
    const container = createContainer<{ a: unknown; b: unknown; c: unknown }>()
      .register('a', (c) => c.resolve('b'))
      .register('b', (c) => c.resolve('c'))
      .register('c', (c) => c.resolve('a'));

    expect(() => container.resolve('a')).toThrow('a → b → c → a');
  });

  it('detects self-referencing dependency', () => {
    const container = createContainer<{ a: unknown }>().register('a', (c) => c.resolve('a'));
    expect(() => container.resolve('a')).toThrow(CircularDependencyError);
  });
});

describe('registerClass (OOP support)', () => {
  it('instantiates a class with new', () => {
    class MyService {
      readonly name = 'MyService';
      greet(): string {
        return `Hello from ${this.name}`;
      }
    }

    const container = createContainer<{ myService: MyService }>().registerClass(
      'myService',
      MyService,
    );
    const instance = container.resolve('myService');

    expect(instance).toBeInstanceOf(MyService);
    expect(instance.greet()).toBe('Hello from MyService');
  });

  it('respects singleton scope — same instance every time', () => {
    class Counter {
      count = 0;
    }

    const container = createContainer<{ counter: Counter }>().registerClass('counter', Counter);
    const a = container.resolve('counter');
    const b = container.resolve('counter');

    a.count = 42;
    expect(b.count).toBe(42);
    expect(a).toBe(b);
  });

  it('respects transient scope — new instance every time', () => {
    class Counter {
      count = 0;
    }

    const container = createContainer<{ counter: Counter }>().registerClass(
      'counter',
      Counter,
      'transient',
    );
    const a = container.resolve('counter');
    const b = container.resolve('counter');

    a.count = 42;
    expect(b.count).toBe(0);
    expect(a).not.toBe(b);
  });
});

describe('has', () => {
  it('returns true for registered tokens', () => {
    const container = createContainer<{ db: Database }>().register('db', () => createDatabase());
    expect(container.has('db')).toBe(true);
  });

  it('returns false for unregistered tokens', () => {
    const container = createContainer();
    expect(container.has('db')).toBe(false);
  });
});

describe('reset', () => {
  it('clears singleton cache — factory is called again after reset', () => {
    const factory = vi.fn(() => ({ id: Math.random() }));
    const container = createContainer<{ service: { id: number } }>().register('service', factory);

    const first = container.resolve('service');
    container.reset();
    const second = container.resolve('service');

    expect(first).not.toBe(second);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('does not remove registrations — token is still resolvable after reset', () => {
    const container = createContainer<{ service: { ok: boolean } }>().register('service', () => ({
      ok: true,
    }));
    container.reset();
    expect(() => container.resolve('service')).not.toThrow();
  });
});
