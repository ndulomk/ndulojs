# NduloJS

An opinionated TypeScript backend framework built on [Elysia](https://elysiajs.com).

NduloJS enforces Clean Architecture structurally — dependency injection, explicit error handling, and layered modules — so your codebase stays consistent as it grows.

---

## Features

- **Result pattern** — no try/catch. Errors are typed values: `Result<T, AppError>`.
  `fromThrowable`, `combineAll`, `asyncMap`, `matchError` for any discriminated union.
- **DI container** — functional, type-safe, zero decorators. Async factories, class injection, singleton/scoped/transient.
- **Plugin system** — lifecycle hooks (`register`, `boot`, `start`, `stop`), dependency ordering, full access to container + HTTP adapter.
- **HTTP adapter** — Elysia under the hood. Type-safe response control, middleware chain with `ctx.state`, error boundary, lifecycle hooks.
- **Structured logger** — three channels (app, http, error). Single worker thread in dev, daily rotation in prod.
- **CLI** — scaffold modules, submodules, and full projects in seconds. Full CRUD templates, name validation, no `process.exit`.

---

## Install

```bash
# New project
npx ndulojs create my-app
cd my-app && bun install && bun dev

# Existing project
bun add ndulojs
```

---

## Quick start

```ts
import { createApp, Ok } from 'ndulojs';

const { app, logger } = await createApp({ port: 3000 });

app.get('/health', () => Ok({ status: 'ok' }));

app.listen(3000);
logger.app.info('Server started');
```

---

## Result pattern

```ts
import { Ok, Err, ErrorFactory, fromThrowable, combineAll } from 'ndulojs';
import type { Result, AppError } from 'ndulojs';

// Wrap throwing code
const parsed = fromThrowable(() => JSON.parse(raw));

// Chain async operations
const enriched = await asyncMap(result, (user) => fetchProfile(user.id));

// Collect all errors, not just the first
const [a, b, c] = await Promise.all([op1(), op2(), op3()]);
const all = combineAll([a, b, c]);

// Pattern-match on error type — generic for any discriminated union
matchError(result.error, {
  NOT_FOUND:        (e) => 404,
  VALIDATION_ERROR: (e) => 422,
  default:          (e) => 500,
});
```

| Error type | Status |
|---|---|
| `notFound` | 404 |
| `unauthorized` | 401 |
| `forbidden` | 403 |
| `validation` | 422 |
| `conflict` | 409 |
| `business` | 400 |
| `database` | 500 |
| `externalService` | 502 |
| `tooManyRequests` | 429 |

Every `Result` carries a `Symbol('@ndulojs/result')` tag for reliable runtime checks.

---

## Dependency injection

```ts
import { createContainer } from 'ndulojs';

// Sync factories (default)
const container = createContainer()
  .register('Config',         ()  => loadConfig())
  .register('UserRepository', (c) => createUserRepository(c.resolve('Config')))
  .register('UserService',    (c) => createUserService(c.resolve('UserRepository')));

// Pre-built values
container.registerInstance('Config', { port: 3000 });

// Async factories
container.register('Database', async () => {
  const conn = await createConnection();
  return conn;
});
const db = await container.resolveAsync('Database');

// Class with constructor injection
class Car { constructor(readonly engine: Engine) {} }
container
  .registerClass('engine', Engine)
  .registerClass('car', Car, ['engine']);

// Duplicate detection — use registerOrOverride to explicitly overwrite
container.registerOrOverride('Config', () => ({ port: 8080 }));
```

- Singleton by default, scoped and transient available
- Circular dependency detection
- Async factories supported via `resolveAsync()`

---

## Plugin system

```ts
import { createApp } from 'ndulojs';
import type { Plugin } from 'ndulojs';

const myPlugin: Plugin = {
  name: 'audit',
  register(ctx) {
    ctx.container.register('AuditService', () => createAuditService());
  },
  boot(ctx) {
    ctx.app.get('/audit/logs', async () => ctx.container.resolveAsync('AuditService'));
  },
};

const { app, plugins } = await createApp({
  port: 3000,
  plugins: [myPlugin],
});

await plugins.startAll();
```

---

## CLI

```bash
# New project
npx ndulojs create my-app

# Generate a module with full CRUD templates
ndulo generate module farms

# Generate a submodule
ndulo generate module farms --sub members

# Add a single file to an existing module
ndulo add controller farms
ndulo add service farms
```

`generate module` creates the full Clean Architecture structure with typed DTOs, CRUD ports, service delegation, repository stubs, and controller routes:

```
src/modules/farms/
├── events/farm.events.ts
├── application/
│   ├── dtos/farm.dto.ts
│   ├── ports/farm.port.ts
│   └── services/farm.service.ts
└── infrastructure/
    ├── persistence/farm.repository.ts
    └── http/controllers/farm.controller.ts
```

---

## Logger

```ts
import { createLogger } from 'ndulojs';

const logger = createLogger({ pretty: true }); // dev — single worker thread
const logger = createLogger({ dir: 'logs', retainDays: 30 }); // prod

logger.app.info('Server started');
logger.http.info({ method: 'GET' }, 'Request');
logger.error.error({ err }, 'Error');

// Per-request context
const log = logger.context({ requestId, userId });
log.app.info('Processing request');
```

---

## Documentation

- [Result Pattern](./docs/result.md)
- [Dependency Injection](./docs/container.md)
- [CLI Reference](./docs/cli.md)

---

## Examples

- [`examples/organizations/`](./examples/organizations) — Self-contained Organizations CRUD scaffolded by the CLI, with in-memory store and integration tests
- [`examples/starter-app/`](./examples/starter-app) — Full production template with auth, database, Docker, metrics

```bash
cd examples/organizations
bun install
bun test        # 9 integration tests
bun start       # http://localhost:3000
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

MIT
