# ndulojs

An opinionated TypeScript backend framework built on [Elysia](https://elysiajs.com).

NduloJS enforces Clean Architecture structurally — dependency injection, explicit error handling, and layered modules — so your codebase stays consistent as it grows.

---

## Features

- **Result pattern** — no try/catch. Errors are typed values: `Result<T, AppError>`
- **DI container** — functional, type-safe, zero decorators
- **HTTP adapter** — Elysia under the hood, abstracted behind a clean interface
- **Structured logger** — three channels (app, http, error) with daily rotation
- **CLI** — scaffold modules, submodules, and full projects in seconds

---

## Install

```bash
# New project
npx ndulojs-cli create my-app
cd my-app && bun install && bun dev

# Existing project
bun add ndulojs
```

---

## Quick start

```ts
import { createApp, createContainer, Ok, Err, ErrorFactory } from 'ndulojs';

const app = await createApp({ port: 3000 });

app.get('/health', () => Ok({ status: 'ok' }));

app.listen(3000);
```

---

## Result pattern

Handlers return `Ok(value)` or `Err(error)`. The framework maps errors to HTTP status codes automatically — no middleware needed.

```ts
app.get('/users/:id', async ({ params }) => {
  const user = await db.findById(params.id);
  if (!user) return Err(ErrorFactory.notFound('User not found', 'User', params.id));
  return Ok(user);
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

---

## Dependency injection

```ts
import { createContainer } from 'ndulojs';

const container = createContainer()
  .register('Config',         ()  => loadConfig())
  .register('Database',       (c) => createDatabase(c.resolve('Config')))
  .register('UserRepository', (c) => createUserRepository(c.resolve('Database')))
  .register('UserService',    (c) => createUserService(c.resolve('UserRepository')));

const userService = container.resolve('UserService');
```

- Singleton by default
- Scoped and transient scopes available
- Circular dependency detection with a clear error message

---

## CLI

```bash
# New project
npx ndulojs-cli create my-app

# Generate a module
ndulo generate module farms

# Generate a submodule
ndulo generate module farms --sub members

# Add a single file to an existing module
ndulo add controller farms
ndulo add service farms
```

`generate module` creates the full Clean Architecture structure:

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

const logger = createLogger({ pretty: true });        // dev
const logger = createLogger({ dir: 'logs', retainDays: 30 }); // prod

logger.app.info('Server started');
logger.http.info({ method: 'GET', path: '/users', status: 200 }, 'Request');
logger.error.error({ err }, 'Unhandled exception');

// Per-request context
const log = logger.context({ requestId, userId });
log.app.info('Processing request');
```

---

## Project structure

```
src/
├── modules/
│   └── {module}/
│       ├── events/
│       ├── application/
│       │   ├── dtos/
│       │   ├── ports/
│       │   └── services/
│       └── infrastructure/
│           ├── persistence/
│           └── http/controllers/
└── index.ts
```

---

## Documentation

- [Result Pattern](https://github.com/ndulomk/ndulojs/blob/main/docs/result.md)
- [Dependency Injection](https://github.com/ndulomk/ndulojs/blob/main/docs/container.md)
- [CLI Reference](https://github.com/ndulomk/ndulojs/blob/main/docs/cli.md)

---

## Contributing

See [CONTRIBUTING.md](https://github.com/ndulomk/ndulojs/blob/main/CONTRIBUTING.md).

---

## License

MIT