# Dependency Injection

NduloJS includes a functional, type-safe DI container. No decorators, no `reflect-metadata`, no magic.

## Creating a container

```ts
import { createContainer } from '@ndulojs/core';

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

## Resolving

```ts
const userService = container.resolve('UserService');
// TypeScript knows the exact type — no casting needed
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

## Class support

```ts
class UserService {
  constructor(private repo: IUserRepository) {}
}

container.registerClass('UserService', UserService);
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
import { createContainer, createApp } from '@ndulojs/core';
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