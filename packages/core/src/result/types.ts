/**
 * Represents a successful operation.
 */
export type Success<T> = {
  readonly success: true;
  readonly value: T;
};

/**
 * Represents a failed operation.
 */
export type Failure<E> = {
  readonly success: false;
  readonly error: E;
};

/**
 * A Result is either a Success or a Failure.
 * Forces explicit error handling — no more uncontrolled try/catch.
 *
 * @example
 * const result: Result<User, AppError> = await findUser(id);
 *
 * if (result.success) {
 *   console.log(result.value); // User
 * } else {
 *   console.log(result.error); // AppError
 * }
 */
export type Result<T, E = unknown> = Success<T> | Failure<E>;

/**
 * Extracts the value type T from a Result<T, E>.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UnwrapResult<T> = T extends Result<infer U, any> ? U : never;

/**
 * Creates a Success result.
 *
 * @example
 * return Ok(user);
 */
export const Ok = <T>(value: T): Success<T> => ({
  success: true,
  value,
});

/**
 * Creates a Failure result.
 *
 * @example
 * return Err(ErrorFactory.notFound('User not found'));
 */
export const Err = <E>(error: E): Failure<E> => ({
  success: false,
  error,
});
