# Contributing to NduloJS

## Setup

```bash
git clone https://github.com/ndulomk/ndulojs
cd ndulojs
bun install
```

## Workspace structure

```
packages/
├── core/        — ndulojs framework (Result, DI, HTTP, Logger, Plugin)
├── cli/         — ndulojs-cli (scaffolding commands)

examples/
├── organizations/  — CRUD example scaffolded by the CLI
├── starter-app/    — production template with DB, auth, Docker

docs/            — documentation
```

## Running tests

```bash
# All packages
bun test

# Per package
bun run --filter ndulojs test
bun run --filter ndulojs-cli test

# Watch mode
bun run --filter ndulojs test --watch
```

All tests must pass before opening a PR.

## Code conventions

**No try/catch in application code.** Errors are values — use `Ok`/`Err` and `ErrorFactory`.

```ts
// ✗
try {
  const user = await repo.findById(id);
  return user;
} catch (err) {
  throw new Error('not found');
}

// ✓
const user = await repo.findById(id);
if (!user) return Err(ErrorFactory.notFound('User not found', 'User', id));
return Ok(user);
```

**No inline comments in shipped code.** Templates must produce clean, self-documenting code.

**Functional over OOP.** Factory functions over classes unless there's a strong reason.

**TypeScript strict mode.** `exactOptionalPropertyTypes` is enabled — handle `undefined` explicitly.

## Commits

Follow [Conventional Commits](https://www.conventionalcommits.org). Commit by context:

```
feat(result): add fromThrowable, combineAll, asyncMap, generic matchError
feat(container): async factories, registerInstance, class DI, duplicate detection
feat(plugin): new plugin system with lifecycle hooks
feat(http): type-safe ResponseControl, middleware chain, error boundary
perf(logger): share single pino-pretty instance across channels
fix(cli): resolve @ndulojs/core bug, add name validation, remove process.exit
docs: update documentation for all new APIs
feat(examples): add CLI-scaffolded organizations CRUD with tests
```

## Opening a PR

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Add or update tests — coverage must not drop
4. Run `bun test` — all tests must pass
5. Run `npm run lint` and `npm run typecheck` in both packages
6. Open a PR with a clear description of what changed and why

## Reporting issues

Open a GitHub issue with:
- What you expected
- What happened instead
- A minimal reproduction if possible

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
