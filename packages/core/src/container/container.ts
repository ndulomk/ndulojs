import { CircularDependencyError, NotRegisteredError } from './errors';
import type {
  Constructor,
  Container,
  Descriptor,
  Factory,
  RegistryConstraint,
  Scope,
  ScopedContainer,
  Token,
} from './types';

/**
 * Creates a new dependency injection container.
 *
 * Functional, no decorators, no metadata reflection.
 * Type-safe — resolve() infers the correct return type from the registry.
 *
 * @example
 * const container = createContainer();
 *
 * const app = container
 *   .register('Config', () => loadConfig())
 *   .register('Database', (c) => createDatabase(c.resolve('Config')))
 *   .register('UserRepository', (c) => createUserRepository(c.resolve('Database')))
 *   .register('UserService', (c) => createUserService(c.resolve('UserRepository')));
 *
 * const userService = app.resolve('UserService');
 */
export const createContainer = <
  TRegistry extends RegistryConstraint = Record<never, never>,
>(): Container<TRegistry> => {
  // Internal state — kept in closure, not exposed
  const descriptors = new Map<Token, Descriptor<unknown, TRegistry>>();
  const singletonCache = new Map<Token, unknown>();

  // Tracks which tokens are currently being resolved — for circular dep detection
  const resolutionStack: Token[] = [];

  const resolve = <K extends keyof TRegistry>(token: K): TRegistry[K] => {
    const key = token as Token;

    const descriptor = descriptors.get(key);
    if (!descriptor) {
      throw new NotRegisteredError(key);
    }

    // Circular dependency check
    if (resolutionStack.includes(key)) {
      throw new CircularDependencyError(key, [...resolutionStack]);
    }

    // Return cached singleton
    if (descriptor.scope === 'singleton' && singletonCache.has(key)) {
      return singletonCache.get(key) as TRegistry[K];
    }

    // Resolve — track the stack for circular detection
    resolutionStack.push(key);
    try {
      const value = descriptor.factory(container as never);

      if (descriptor.scope === 'singleton') {
        singletonCache.set(key, value);
      }

      return value as TRegistry[K];
    } finally {
      // Always pop, even if factory throws
      resolutionStack.pop();
    }
  };

  const register = <K extends Token, V>(
    token: K,
    factory: Factory<V, TRegistry & Record<K, V>>,
    scope: Scope = 'singleton',
  ): Container<TRegistry & Record<K, V>> => {
    descriptors.set(token, {
      factory: factory as Factory<unknown, TRegistry>,
      scope,
    });

    // Returns the same container cast to the extended registry type
    // This enables the fluent chaining: container.register(...).register(...)
    return container as unknown as Container<TRegistry & Record<K, V>>;
  };

  const registerClass = <K extends Token, V>(
    token: K,
    constructor: Constructor<V>,
    scope: Scope = 'singleton',
  ): Container<TRegistry & Record<K, V>> => {
    return register(token, () => new constructor(), scope) as unknown as Container<
      TRegistry & Record<K, V>
    >;
  };

  const registerScoped = <K extends Token, V>(
    token: K,
    factory: Factory<V, TRegistry & Record<K, V>>,
  ): Container<TRegistry & Record<K, V>> => {
    return register(token, factory, 'scoped') as unknown as Container<TRegistry & Record<K, V>>;
  };

  const registerTransient = <K extends Token, V>(
    token: K,
    factory: Factory<V, TRegistry & Record<K, V>>,
  ): Container<TRegistry & Record<K, V>> => {
    return register(token, factory, 'transient') as unknown as Container<TRegistry & Record<K, V>>;
  };

  const createScope = (): ScopedContainer<TRegistry> => {
    const scopedCache = new Map<Token, unknown>();

    return {
      resolve: <K extends keyof TRegistry>(token: K): TRegistry[K] => {
        const key = token as Token;
        const descriptor = descriptors.get(key);

        if (!descriptor) {
          throw new NotRegisteredError(key);
        }

        // Singletons come from parent cache
        if (descriptor.scope === 'singleton') {
          return resolve(token);
        }

        // Scoped: one instance per scope
        if (descriptor.scope === 'scoped') {
          if (scopedCache.has(key)) {
            return scopedCache.get(key) as TRegistry[K];
          }

          resolutionStack.push(key);
          try {
            const value = descriptor.factory(container as never);
            scopedCache.set(key, value);
            return value as TRegistry[K];
          } finally {
            resolutionStack.pop();
          }
        }

        // Transient: always fresh
        resolutionStack.push(key);
        try {
          return descriptor.factory(container as never) as TRegistry[K];
        } finally {
          resolutionStack.pop();
        }
      },

      dispose: (): void => {
        scopedCache.clear();
      },
    };
  };

  const has = (token: Token): boolean => descriptors.has(token);

  const reset = (): void => {
    singletonCache.clear();
  };

  const container: Container<TRegistry> = {
    resolve,
    register: register as Container<TRegistry>['register'],
    registerClass: registerClass as Container<TRegistry>['registerClass'],
    registerScoped: registerScoped as Container<TRegistry>['registerScoped'],
    registerTransient: registerTransient as Container<TRegistry>['registerTransient'],
    createScope,
    has,
    reset,
  };

  return container;
};
