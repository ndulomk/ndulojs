# Contributing to NduloJS

## Setup

```bash
git clone https://github.com/ndulomk/ndulojs
cd ndulojs
bun install
```

## Running tests

```bash
bun test         # run all tests
bun test --watch # watch mode
```

All tests must pass before opening a PR.

## Project structure

```
src/
├── container/   — DI container
├── http/        — HTTP adapter + middlewares
├── logger/      — logger suite
├── result/      — Result pattern, ErrorFactory, utilities
└── cli/         — CLI commands and templates

test/            — mirrors src/ structure
docs/            — documentation
examples/        — starter app
```

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

**No comments in generated files.** Templates produce clean code — no inline explanations.

**Functional over OOP.** Factory functions over classes unless there's a strong reason.

## Commits

Follow [Conventional Commits](https://www.conventionalcommits.org):

```
feat: add rate limit middleware
fix: correct singular derivation for -ves words
docs: add container scoped scope example
test: add CLI generate submodule tests
chore: update dependencies
```

## Opening a PR

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Add or update tests — coverage must not drop
4. Run `bun test` — all tests must pass
5. Open a PR with a clear description of what changed and why

## Reporting issues

Open a GitHub issue with:
- What you expected
- What happened instead
- A minimal reproduction if possible

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
