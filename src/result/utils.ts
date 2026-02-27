import type { AppError, AppErrorType } from './errors';
import { Ok } from './types';
import type { Failure, Result, Success } from './types';

/**
 * Transforms the value inside a Success result.
 * If the result is a Failure, it passes through untouched.
 */
export const map = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> => {
  if (result.success) return Ok(fn(result.value));
  return result as unknown as Failure<E>;
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
 * Extracts the value from a Success result.
 * Throws if called on a Failure — use only when you are certain.
 */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.success) return result.value;
  const failure = result;
  throw new Error(`Called unwrap on a Failure: ${JSON.stringify(failure.error)}`);
};

/**
 * Returns the value if Success, or a fallback value if Failure.
 */
export const unwrapOr = <T, E>(result: Result<T, E>, fallback: T): T =>
  result.success ? result.value : fallback;

/**
 * Returns the value if Success, or computes a fallback from the error if Failure.
 */
export const unwrapOrElse = <T, E>(result: Result<T, E>, fn: (error: E) => T): T => {
  if (result.success) return result.value;
  const failure = result;
  return fn(failure.error);
};

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

// --- matchError ---

type ErrorHandlerMap<T> = {
  [K in AppErrorType]?: (error: Extract<AppError, { type: K }>) => T;
} & {
  default: (error: AppError) => T;
};

/**
 * Pattern matches over AppError types.
 */
export const matchError = <T>(error: AppError, handlers: ErrorHandlerMap<T>): T => {
  const handler = handlers[error.type] as ((e: AppError) => T) | undefined;
  return handler ? handler(error) : handlers.default(error);
};
