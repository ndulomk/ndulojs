export type Token = string;

export type Factory<T, TRegistry extends RegistryConstraint> = (
  container: ResolverContainer<TRegistry>,
) => T | Promise<T>;

export type Constructor<T> = new (...args: unknown[]) => T;

export type Scope = 'singleton' | 'scoped' | 'transient';

export type Descriptor<T, TRegistry extends RegistryConstraint> = {
  readonly factory: Factory<T, TRegistry>;
  readonly scope: Scope;
};

export type RegistryConstraint = Record<Token, unknown>;

export type ResolverContainer<TRegistry extends RegistryConstraint> = {
  resolve<K extends keyof TRegistry>(token: K): TRegistry[K];
  resolveAsync<K extends keyof TRegistry>(token: K): Promise<TRegistry[K]>;
};

export type Container<TRegistry extends RegistryConstraint> = ResolverContainer<TRegistry> & {
  register<K extends Token, V>(
    token: K,
    factory: Factory<V, TRegistry & Record<K, V>>,
    scope?: Scope,
  ): Container<TRegistry & Record<K, V>>;

  registerOrOverride<K extends Token, V>(
    token: K,
    factory: Factory<V, TRegistry & Record<K, V>>,
    scope?: Scope,
  ): Container<TRegistry & Record<K, V>>;

  registerInstance<K extends Token, V>(
    token: K,
    instance: V,
  ): Container<TRegistry & Record<K, V>>;

  registerClass<K extends Token, V>(
    token: K,
    constructor: Constructor<V>,
    deps?: Token[],
    scope?: Scope,
  ): Container<TRegistry & Record<K, V>>;

  registerScoped<K extends Token, V>(
    token: K,
    factory: Factory<V, TRegistry & Record<K, V>>,
  ): Container<TRegistry & Record<K, V>>;

  registerTransient<K extends Token, V>(
    token: K,
    factory: Factory<V, TRegistry & Record<K, V>>,
  ): Container<TRegistry & Record<K, V>>;

  createScope(): ScopedContainer<TRegistry>;

  has(token: Token): boolean;
  reset(): void;
};

export type ScopedContainer<TRegistry extends RegistryConstraint> = {
  resolve<K extends keyof TRegistry>(token: K): TRegistry[K];
  resolveAsync<K extends keyof TRegistry>(token: K): Promise<TRegistry[K]>;
  dispose(): void;
};
