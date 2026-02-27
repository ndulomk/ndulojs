# Result Pattern

NduloJS uses the Result monad for error handling. Instead of throwing exceptions, every operation that can fail returns a `Result<T, AppError>`.

## Why not try/catch?

`try/catch` has two problems in large codebases:

1. **Invisible failures** — nothing in the type system tells you a function can throw. You discover it at runtime.
2. **Untyped errors** — the `catch` block gives you `unknown`. You lose all type information.

With `Result`, failures are explicit in the return type and fully typed.

```ts
// try/catch — failure is invisible, error is unknown
const user = await findUser(id); // can this throw? who knows

// Result — failure is explicit, error is typed
const result = await findUser(id); // Result<User, AppError>
if (!result.success) {
  result.error; // AppError — fully typed
}
```

## Basic usage

```ts
import { Ok, Err, ErrorFactory } from '@ndulojs/core';
import type { Result, AppError } from '@ndulojs/core';

const findUser = async (id: string): Promise<Result<User, AppError>> => {
  const user = await db.findById(id);
  if (!user) return Err(ErrorFactory.notFound('User not found', 'User', id));
  return Ok(user);
};

const result = await findUser('123');

if (result.success) {
  console.log(result.value); // User
} else {
  console.log(result.error); // AppError
}
```

## ErrorFactory

All errors are created through `ErrorFactory`. Each method returns a typed error with the correct HTTP status code.

```ts
ErrorFactory.notFound('User not found', 'User', id)         // 404
ErrorFactory.unauthorized('Invalid token', 'invalid_token') // 401
ErrorFactory.forbidden('Insufficient permissions')          // 403
ErrorFactory.validation('Invalid input', fieldErrors)       // 422
ErrorFactory.conflict('Email already exists', 'email')      // 409
ErrorFactory.business('Insufficient stock', 'LOW_STOCK')    // 400
ErrorFactory.database('Query failed', err, 'SELECT')        // 500
ErrorFactory.externalService('Stripe failed', 'stripe')     // 502
ErrorFactory.tooManyRequests('Slow down', retryAfter)       // 429
ErrorFactory.internal('Unexpected error', err)              // 500
```

## In HTTP handlers

Return `Result` directly from handlers. The framework maps errors to HTTP responses automatically.

```ts
app.get('/users/:id', async ({ params }) => {
  return userService.findById(params.id); // Result<User, AppError>
});
```

A successful `Ok(user)` becomes:
```json
{ "success": true, "data": { "id": "...", "name": "..." } }
```

A failed `Err(notFound)` becomes:
```json
{ "success": false, "error": { "type": "NOT_FOUND", "message": "User not found", ... } }
```

## Utilities

```ts
import { map, flatMap, unwrapOr, isOk, isErr, combine, matchError } from '@ndulojs/core';

// Transform a success value
const name = map(result, user => user.name);

// Chain operations
const updated = flatMap(result, user => updateUser(user));

// Provide a fallback
const user = unwrapOr(result, defaultUser);

// Type guards
if (isOk(result)) { /* result.value is typed */ }
if (isErr(result)) { /* result.error is typed */ }

// Combine multiple results
const all = combine([result1, result2, result3]);
// Ok([v1, v2, v3]) or Err(firstFailure)

// Pattern match on error type
matchError(result.error, {
  NOT_FOUND:        (e) => reply(404, e),
  VALIDATION_ERROR: (e) => reply(422, e),
  default:          (e) => reply(500, e),
});
```