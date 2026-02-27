/**
 * A token is the key used to register and resolve dependencies.
 * Using a string literal type gives us type safety when resolving.
 */
export type Token = string;

/**
 * A factory function that receives the container and returns a value.
 * The container is passed so factories can resolve their own dependencies.
 */
export type Factory<T, TRegistry extends RegistryConstraint> = (
  container: ResolverContainer<TRegistry>,
) => T;

/**
 * A class constructor — for OOP support via registerClass.
 */
export type Constructor<T> = new (...args: unknown[]) => T;

/**
 * The scope of a dependency.
 * - singleton: created once, reused forever (default)
 * - scoped: created once per scope (e.g. per HTTP request)
 * - transient: created fresh every time resolve() is called
 */
export type Scope = 'singleton' | 'scoped' | 'transient';

/**
 * Internal descriptor for a registered dependency.
 */
export type Descriptor<T, TRegistry extends RegistryConstraint> = {
  readonly factory: Factory<T, TRegistry>;
  readonly scope: Scope;
};

/**
 * The registry maps tokens to their value types.
 * This is what gives resolve() its return type inference.
 *
 * @example
 * type MyRegistry = {
 *   Database: Database;
 *   UserRepository: IUserRepository;
 *   UserService: IUserService;
 * }
 */
export type RegistryConstraint = Record<Token, unknown>;

/**
 * A container that can only resolve — used inside factory functions
 * to avoid exposing register() to dependency factories.
 */
export type ResolverContainer<TRegistry extends RegistryConstraint> = {
  resolve<K extends keyof TRegistry>(token: K): TRegistry[K];
};

/**
 * The full container API exposed to the application.
 */
export type Container<TRegistry extends RegistryConstraint> = ResolverContainer<TRegistry> & {
  /**
   * Register a dependency with a factory function.
   * Default scope is singleton.
   */
  register<K extends Token, V>(
    token: K,
    factory: Factory<V, TRegistry & Record<K, V>>,
    scope?: Scope,
  ): Container<TRegistry & Record<K, V>>;

  /**
   * Register a class constructor as a dependency.
   * The class will be instantiated with new when resolved.
   */
  registerClass<K extends Token, V>(
    token: K,
    constructor: Constructor<V>,
    scope?: Scope,
  ): Container<TRegistry & Record<K, V>>;

  /**
   * Register a scoped dependency (shorthand for scope: 'scoped').
   * Scoped dependencies are resolved fresh per scope context.
   */
  registerScoped<K extends Token, V>(
    token: K,
    factory: Factory<V, TRegistry & Record<K, V>>,
  ): Container<TRegistry & Record<K, V>>;

  /**
   * Register a transient dependency (shorthand for scope: 'transient').
   * Transient dependencies are created fresh on every resolve().
   */
  registerTransient<K extends Token, V>(
    token: K,
    factory: Factory<V, TRegistry & Record<K, V>>,
  ): Container<TRegistry & Record<K, V>>;

  /**
   * Create a scoped child container.
   * Scoped dependencies resolved within this child get their own instances.
   * Singletons are still shared from the parent.
   */
  createScope(): ScopedContainer<TRegistry>;

  /**
   * Check if a token has been registered.
   */
  has(token: Token): boolean;

  /**
   * Reset all singleton instances (useful for testing).
   */
  reset(): void;
};

/**
 * A scoped container — child of the main container.
 * Has its own cache for scoped dependencies.
 */
export type ScopedContainer<TRegistry extends RegistryConstraint> = {
  resolve<K extends keyof TRegistry>(token: K): TRegistry[K];
  dispose(): void;
};
