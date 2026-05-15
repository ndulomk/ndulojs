# Dependency Injection

NduloJS includes a functional, type-safe DI container. No decorators, no `reflect-metadata`, no magic.

## Creating a container

```ts
import { createContainer } from 'ndulojs';

const container = createContainer();
```

## Registering dependencies

```ts
const container = createContainer()
  .register('Config',         ()  => loadConfig())
  .register('Database',       (c) => createDatabase(c.resolve('Config')))
  .register('UserRepository', (c) => createUserRepository(c.resolve('Database')))
  .register('UserService',    (c) => createUserService(c.resolve('UserRepository')));
```

The factory receives the container so it can resolve its own dependencies. Chaining is fully type-safe — `resolve()` infers the correct return type for each token.

## Pre-built values

```ts
const config = { port: 3000, db: 'postgres' };
container.registerInstance('Config', config);
```

## Registering classes with constructor injection

```ts
class Engine {
  start() { return 'vroom'; }
}

class Car {
  constructor(readonly engine: Engine) {}
}

container
  .registerClass('engine', Engine)
  .registerClass('car', Car, ['engine']); // injects Engine
```

Pass an array of token names as the third argument to inject dependencies by constructor.

## Async factories

Factories can return promises. Use `resolveAsync()` instead of `resolve()`:

```ts
container.register('Database', async () => {
  const conn = await createConnection();
  return conn;
});

const db = await container.resolveAsync('Database');
```

Sync `resolve()` throws a clear error if the factory is async, preventing silent bugs.

## Duplicate detection

`register()` throws `AlreadyRegisteredError` if a token is already registered. Use `registerOrOverride()` to explicitly overwrite:

```ts
container.register('Config', () => ({ port: 3000 }));
container.register('Config', () => ({ port: 8080 }));
// → AlreadyRegisteredError

container.registerOrOverride('Config', () => ({ port: 8080 }));
// → OK, previous value replaced
```

## Scopes

| Scope | Behaviour |
|---|---|
| `singleton` (default) | Created once, reused forever |
| `scoped` | Created once per scope (e.g. per request) |
| `transient` | New instance on every `resolve()` |

```ts
container.register('Logger', () => createLogger(), 'singleton');
container.registerScoped('RequestContext', () => createContext());
container.registerTransient('IdGenerator', () => createIdGenerator());
```

## Scoped containers

Useful for per-request dependencies — each request gets its own instances of scoped tokens while sharing singletons.

```ts
const scope = container.createScope();
const ctx = scope.resolve('RequestContext'); // fresh instance
scope.dispose(); // clears scoped cache
```

Scopes have their own circular dependency stack — isolated from the parent and other scopes.

## Resolving

```ts
// Sync — throws if factory is async
const service = container.resolve('UserService');

// Async — handles both sync and async factories
const db = await container.resolveAsync('Database');
```

## Circular dependency detection

The container detects circular dependencies at resolution time and throws a clear error instead of hanging:

```
[NduloJS Container] Circular dependency detected: A → B → C → A
"A" depends on something that eventually depends on itself.
```

## Checking registration

```ts
container.has('UserService'); // true | false
```

## Resetting (testing)

```ts
container.reset(); // clears singleton cache — factories run again on next resolve
```

## Recommended pattern

Register everything once at the application entry point:

```ts
// src/index.ts
import { createContainer, createApp } from 'ndulojs';
import { registerUserModule } from './modules/users/user.module.js';
import { registerFarmModule } from './modules/farms/farm.module.js';

const container = createContainer()
  .register('Config',   () => loadConfig())
  .register('Database', (c) => createDatabase(c.resolve('Config')));

const app = await createApp({ port: 3000 });

registerUserModule(container, app);
registerFarmModule(container, app);

app.listen(3000);
```

Each module wires its own dependencies internally:

```ts
// src/modules/farms/farm.module.ts
export const registerFarmModule = (container: Container<any>, app: IHttpAdapter): void => {
  const repo    = createFarmRepository();
  const service = createFarmService(repo);
  createFarmController(app, service);
};
```
