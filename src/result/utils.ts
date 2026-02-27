import type { AppError, AppErrorType } from './errors';
import { Ok } from './types';
import type { Failure, Result, Success } from './types';

/**
 * Transforms the value inside a Success result.
 * If the result is a Failure, it passes through untouched.
 *
 * @example
 * const result = Ok(10);
 * const doubled = map(result, (n) => n * 2); // Ok(20)
 */
export const map = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> => {
  if (result.success) return Ok(fn(result.value));
  return result;
};

/**
 * Chains operations that return Results.
 * Prevents nested Results like Result<Result<T, E>, E>.
 *
 * @example
 * const user = await findUser(id);
 * const updated = flatMap(user, (u) => updateUser(u));
 */
export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> => {
  if (result.success) return fn(result.value);
  return result;
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
 *
 * @example
 * const name = unwrapOr(findUser(id), defaultUser);
 */
export const unwrapOr = <T, E>(result: Result<T, E>, fallback: T): T =>
  result.success ? result.value : fallback;

/**
 * Returns the value if Success, or computes a fallback from the error if Failure.
 *
 * @example
 * const name = unwrapOrElse(findUser(id), (err) => createGuestUser(err));
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
 *
 * @example
 * const combined = combine([findUser(id), findFarm(farmId)]);
 * if (!combined.success) return combined; // first error
 * const [user, farm] = combined.value;
 */
export const combine = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const values: T[] = [];
  for (const result of results) {
    if (!result.success) return result;
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
 * Forces you to handle every error type explicitly or fall through to default.
 *
 * @example
 * return matchError(result.error, {
 *   NOT_FOUND: (e) => set.status = 404,
 *   VALIDATION_ERROR: (e) => set.status = 422,
 *   default: (e) => set.status = 500,
 * });
 */
export const matchError = <T>(error: AppError, handlers: ErrorHandlerMap<T>): T => {
  const handler = handlers[error.type] as ((e: AppError) => T) | undefined;
  return handler ? handler(error) : handlers.default(error);
};
