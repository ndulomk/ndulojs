import type { Result } from './types';
import { Err, Ok } from './types';
import type { Failure, Success } from './types';

/**
 * Transforms the value inside a Success result.
 * If the result is a Failure, it passes through untouched.
 */
export const map = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> => {
  if (result.success) return Ok(fn(result.value));
  return result as unknown as Failure<E>;
};

/**
 * Transforms the value inside a Success result asynchronously.
 * If the result is a Failure, it passes through untouched.
 */
export const asyncMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Promise<U>,
): Promise<Result<U, E>> => {
  if (result.success) return fn(result.value).then(Ok);
  return Promise.resolve(result as unknown as Failure<E>);
};

/**
 * Chains operations that return Results.
 * Prevents nested Results like Result<Result<T, E>, E>.
 */
export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> => {
  if (result.success) return fn(result.value);
  return result as unknown as Failure<E>;
};

/**
 * Chains async operations that return Results.
 */
export const asyncFlatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Promise<Result<U, E>>,
): Promise<Result<U, E>> => {
  if (result.success) return fn(result.value);
  return Promise.resolve(result as unknown as Failure<E>);
};

/**
 * Extracts the value from a Success result.
 * Throws if called on a Failure — use only when you are certain.
 */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.success) return result.value;
  throw new Error(`Called unwrap on a Failure: ${JSON.stringify(result.error)}`);
};

/**
 * Returns the value if Success, or a fallback value if Failure.
 */
export const unwrapOr = <T, E>(result: Result<T, E>, fallback: T): T =>
  result.success ? result.value : fallback;

/**
 * Returns the value if Success, or computes a fallback from the error if Failure.
 */
export const unwrapOrElse = <T, E>(result: Result<T, E>, fn: (error: E) => T): T =>
  result.success ? result.value : fn(result.error);

/**
 * Type guard — narrows to Success<T>.
 */
export const isOk = <T, E>(result: Result<T, E>): result is Success<T> => result.success;

/**
 * Type guard — narrows to Failure<E>.
 */
export const isErr = <T, E>(result: Result<T, E>): result is Failure<E> => !result.success;

/**
 * Combines multiple Results into one.
 * Returns the first Failure encountered, or Ok with all values.
 */
export const combine = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const values: T[] = [];
  for (const result of results) {
    if (!result.success) return result as unknown as Failure<E>;
    values.push(result.value);
  }
  return Ok(values);
};

/**
 * Combines multiple Results into one, collecting ALL errors.
 * Returns Ok(values) if all succeed, Err(errors) even if some fail.
 */
export const combineAll = <T, E>(results: Result<T, E>[]): Result<T[], E[]> => {
  const values: T[] = [];
  const errors: E[] = [];
  for (const result of results) {
    if (result.success) {
      values.push(result.value);
    } else {
      errors.push(result.error);
    }
  }
  return errors.length > 0 ? Err(errors) : Ok(values);
};

/**
 * Wraps a synchronous function that might throw into a Result.
 * Optionally maps the thrown error using `onError`.
 *
 * @example
 * const result = fromThrowable(() => JSON.parse(raw));
 */
export const fromThrowable = <T, E = Error>(
  fn: () => T,
  onError?: (error: unknown) => E,
): Result<T, E> => {
  try {
    return Ok(fn());
  } catch (e) {
    return Err(onError ? onError(e) : (e as E));
  }
};

/**
 * Wraps an async function that might reject into a Result.
 *
 * @example
 * const result = await fromThrowableAsync(() => fetch(url));
 */
export const fromThrowableAsync = <T, E = Error>(
  fn: () => Promise<T>,
  onError?: (error: unknown) => E,
): Promise<Result<T, E>> => {
  return fn()
    .then((value) => Ok(value))
    .catch((e) => Err(onError ? onError(e) : (e as E)));
};

// --- matchError ---

type ErrorHandlerMap<T, E extends { type: string }> = {
  [K in E['type']]?: (error: Extract<E, { type: K }>) => T;
} & {
  default: (error: E) => T;
};

/**
 * Pattern matches over a discriminated error union.
 * Generic — works with any `{ type: string }` error type.
 *
 * @example
 * matchError(err, {
 *   NOT_FOUND: (e) => 404,
 *   VALIDATION_ERROR: (e) => 422,
 *   default: (e) => 500,
 * })
 */
export const matchError = <T, E extends { type: string }>(
  error: E,
  handlers: ErrorHandlerMap<T, E>,
): T => {
  const handler = (handlers as Record<string, ((e: E) => T) | undefined>)[error.type];
  return handler ? handler(error) : handlers.default(error);
};
