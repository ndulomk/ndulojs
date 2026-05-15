import { AlreadyRegisteredError, CircularDependencyError, NotRegisteredError } from './errors';
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

export const createContainer = <
  TRegistry extends RegistryConstraint = Record<never, never>,
>(): Container<TRegistry> => {
  const descriptors = new Map<Token, Descriptor<unknown, TRegistry>>();
  const singletonCache = new Map<Token, unknown>();
  const resolutionStack: Token[] = [];

  const resolve = <K extends keyof TRegistry>(token: K): TRegistry[K] => {
    const key = token as Token;

    const descriptor = descriptors.get(key);
    if (!descriptor) throw new NotRegisteredError(key);

    if (resolutionStack.includes(key)) throw new CircularDependencyError(key, [...resolutionStack]);

    if (descriptor.scope === 'singleton' && singletonCache.has(key)) {
      return singletonCache.get(key) as TRegistry[K];
    }

    resolutionStack.push(key);
    try {
      const value = descriptor.factory(container as never);

      if (value instanceof Promise) {
        throw new Error(
          `[NduloJS Container] Token "${key}" has an async factory. Use resolveAsync() instead.`,
        );
      }

      if (descriptor.scope === 'singleton') {
        singletonCache.set(key, value);
      }

      return value as TRegistry[K];
    } finally {
      resolutionStack.pop();
    }
  };

  const resolveAsync = async <K extends keyof TRegistry>(
    token: K,
  ): Promise<TRegistry[K]> => {
    const key = token as Token;

    const descriptor = descriptors.get(key);
    if (!descriptor) throw new NotRegisteredError(key);

    if (resolutionStack.includes(key)) throw new CircularDependencyError(key, [...resolutionStack]);

    if (descriptor.scope === 'singleton' && singletonCache.has(key)) {
      return singletonCache.get(key) as TRegistry[K];
    }

    resolutionStack.push(key);
    try {
      const value = await descriptor.factory(container as never);

      if (descriptor.scope === 'singleton') {
        singletonCache.set(key, value);
      }

      return value as TRegistry[K];
    } finally {
      resolutionStack.pop();
    }
  };

  const setDescriptor = <K extends Token, V>(
    token: K,
    factory: Factory<V, TRegistry & Record<K, V>>,
    scope: Scope,
  ): void => {
    descriptors.set(token, {
      factory: factory as Factory<unknown, TRegistry>,
      scope,
    });
  };

  const registerInstance = <K extends Token, V>(
    token: K,
    instance: V,
  ): Container<TRegistry & Record<K, V>> => {
    if (descriptors.has(token)) throw new AlreadyRegisteredError(token);
    setDescriptor(token, () => instance, 'singleton');
    return container as unknown as Container<TRegistry & Record<K, V>>;
  };

  const register = <K extends Token, V>(
    token: K,
    factory: Factory<V, TRegistry & Record<K, V>>,
    scope: Scope = 'singleton',
  ): Container<TRegistry & Record<K, V>> => {
    if (descriptors.has(token)) throw new AlreadyRegisteredError(token);
    setDescriptor(token, factory, scope);
    return container as unknown as Container<TRegistry & Record<K, V>>;
  };

  const registerOrOverride = <K extends Token, V>(
    token: K,
    factory: Factory<V, TRegistry & Record<K, V>>,
    scope: Scope = 'singleton',
  ): Container<TRegistry & Record<K, V>> => {
    singletonCache.delete(token);
    setDescriptor(token, factory, scope);
    return container as unknown as Container<TRegistry & Record<K, V>>;
  };

  const registerClass = <K extends Token, V>(
    token: K,
    constructor: Constructor<V>,
    deps?: Token[],
    scope?: Scope,
  ): Container<TRegistry & Record<K, V>> => {
    return register(
      token,
      deps
        ? (c) => new constructor(...deps.map((d) => c.resolve(d)))
        : () => new constructor(),
      scope ?? 'singleton',
    ) as unknown as Container<TRegistry & Record<K, V>>;
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
    const scopeStack: Token[] = [];

    const scopedResolve = <K extends keyof TRegistry>(token: K): TRegistry[K] => {
      const key = token as Token;
      const descriptor = descriptors.get(key);

      if (!descriptor) throw new NotRegisteredError(key);

      // Singletons resolved via parent
      if (descriptor.scope === 'singleton') {
        return resolve(token);
      }

      if (scopeStack.includes(key)) throw new CircularDependencyError(key, [...scopeStack]);

      if (descriptor.scope === 'scoped') {
        if (scopedCache.has(key)) return scopedCache.get(key) as TRegistry[K];
        scopeStack.push(key);
        try {
          const value = descriptor.factory(container as never);
          if (value instanceof Promise) {
            throw new Error(
              `[NduloJS Container] Token "${key}" has an async factory. Use resolveAsync() instead.`,
            );
          }
          scopedCache.set(key, value);
          return value as TRegistry[K];
        } finally {
          scopeStack.pop();
        }
      }

      // transient
      scopeStack.push(key);
      try {
        const value = descriptor.factory(container as never);
        if (value instanceof Promise) {
          throw new Error(
            `[NduloJS Container] Token "${key}" has an async factory. Use resolveAsync() instead.`,
          );
        }
        return value as TRegistry[K];
      } finally {
        scopeStack.pop();
      }
    };

    const scopedResolveAsync = async <K extends keyof TRegistry>(
      token: K,
    ): Promise<TRegistry[K]> => {
      const key = token as Token;
      const descriptor = descriptors.get(key);

      if (!descriptor) throw new NotRegisteredError(key);

      if (descriptor.scope === 'singleton') {
        return resolveAsync(token);
      }

      if (scopeStack.includes(key)) throw new CircularDependencyError(key, [...scopeStack]);

      if (descriptor.scope === 'scoped') {
        if (scopedCache.has(key)) return scopedCache.get(key) as TRegistry[K];
        scopeStack.push(key);
        try {
          const value = await descriptor.factory(container as never);
          scopedCache.set(key, value);
          return value as TRegistry[K];
        } finally {
          scopeStack.pop();
        }
      }

      scopeStack.push(key);
      try {
        return (await descriptor.factory(container as never)) as TRegistry[K];
      } finally {
        scopeStack.pop();
      }
    };

    return {
      resolve: scopedResolve,
      resolveAsync: scopedResolveAsync,
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
    resolveAsync,
    register: register as Container<TRegistry>['register'],
    registerOrOverride: registerOrOverride as Container<TRegistry>['registerOrOverride'],
    registerInstance: registerInstance as Container<TRegistry>['registerInstance'],
    registerClass: registerClass as Container<TRegistry>['registerClass'],
    registerScoped: registerScoped as Container<TRegistry>['registerScoped'],
    registerTransient: registerTransient as Container<TRegistry>['registerTransient'],
    createScope,
    has,
    reset,
  };

  return container;
};
