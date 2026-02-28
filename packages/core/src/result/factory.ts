import type {
  AppError,
  BusinessError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  ValidationFieldError,
} from './errors';

/**
 * Captures the stack trace from the caller's location.
 * Filters out internal framework frames so the trace points
 * to where the error actually happened in user code.
 */
const captureStack = (): string | undefined => {
  const stack = new Error().stack;
  if (!stack) return undefined;

  return stack
    .split('\n')
    .filter((line, index) => {
      if (index === 0) return false;
      if (line.includes('captureStack')) return false;
      if (line.includes('createError')) return false;
      if (line.includes('ErrorFactory')) return false;
      return true;
    })
    .join('\n');
};

/**
 * Internal helper — stamps every error with timestamp and stack.
 */
const createError = <T extends AppError>(data: Omit<T, 'timestamp' | 'stack'>): T =>
  ({
    ...data,
    timestamp: new Date().toISOString(),
    stack: captureStack(),
  }) as T;

/**
 * ErrorFactory — the only way to create AppErrors in NduloJS.
 *
 * All methods return typed errors ready to be wrapped with Err().
 *
 * @example
 * return Err(ErrorFactory.notFound('User not found', 'User', id));
 */
export const ErrorFactory = {
  /**
   * 422 — Input data failed validation.
   * Use when Zod or manual validation fails.
   */
  validation: (
    message: string,
    errors: ValidationFieldError[] = [],
    component?: string,
  ): ValidationError =>
    createError<ValidationError>({
      type: 'VALIDATION_ERROR',
      name: 'ValidationError',
      statusCode: 422,
      message,
      errors,
      component,
    }),

  /**
   * 404 — A requested resource does not exist.
   */
  notFound: (
    message: string,
    resource?: string,
    resourceId?: string | number,
    component?: string,
  ): NotFoundError =>
    createError<NotFoundError>({
      type: 'NOT_FOUND',
      name: 'NotFoundError',
      statusCode: 404,
      message,
      resource,
      resourceId,
      component,
    }),

  /**
   * 401 — Request is not authenticated.
   */
  unauthorized: (
    message: string,
    reason?: UnauthorizedError['reason'],
    component?: string,
  ): UnauthorizedError =>
    createError<UnauthorizedError>({
      type: 'UNAUTHORIZED',
      name: 'UnauthorizedError',
      statusCode: 401,
      message,
      reason,
      component,
    }),

  /**
   * 403 — Authenticated but not allowed.
   */
  forbidden: (message: string, requiredPermission?: string, component?: string): ForbiddenError =>
    createError<ForbiddenError>({
      type: 'FORBIDDEN',
      name: 'ForbiddenError',
      statusCode: 403,
      message,
      requiredPermission,
      component,
    }),

  /**
   * 409 — A resource with conflicting data already exists.
   */
  conflict: (
    message: string,
    conflictingField?: string,
    existingValue?: unknown,
    component?: string,
  ): ConflictError =>
    createError<ConflictError>({
      type: 'CONFLICT',
      name: 'ConflictError',
      statusCode: 409,
      message,
      conflictingField,
      existingValue,
      component,
    }),

  /**
   * 400 — A business rule was violated.
   * Use for domain logic failures that aren't validation errors.
   *
   * @example
   * // Stock would go negative
   * return Err(ErrorFactory.business('Insufficient stock', 'INSUFFICIENT_STOCK'));
   */
  business: (message: string, code?: string, component?: string): BusinessError =>
    createError<BusinessError>({
      type: 'BUSINESS_ERROR',
      name: 'BusinessError',
      statusCode: 400,
      message,
      code,
      component,
    }),

  /**
   * 500 — A database operation failed.
   */
  database: (
    message: string,
    cause?: unknown,
    operation?: DatabaseError['operation'],
    table?: string,
    component?: string,
  ): DatabaseError =>
    createError<DatabaseError>({
      type: 'DATABASE_ERROR',
      name: 'DatabaseError',
      statusCode: 500,
      message,
      operation,
      table,
      cause,
      component,
    }),

  /**
   * 502 — An external service (API, email provider, etc.) failed.
   */
  externalService: (
    message: string,
    service: string,
    cause?: unknown,
    operation?: string,
    component?: string,
  ): ExternalServiceError =>
    createError<ExternalServiceError>({
      type: 'EXTERNAL_SERVICE_ERROR',
      name: 'ExternalServiceError',
      statusCode: 502,
      message,
      service,
      operation,
      cause,
      component,
    }),

  /**
   * 500 — An unexpected internal error occurred.
   */
  internal: (message: string, cause?: unknown, component?: string): InternalServerError =>
    createError<InternalServerError>({
      type: 'INTERNAL_SERVER_ERROR',
      name: 'InternalServerError',
      statusCode: 500,
      message,
      cause,
      component,
    }),

  /**
   * 429 — Too many requests. Include retryAfter in seconds.
   */
  tooManyRequests: (message: string, retryAfter: number, component?: string): BusinessError =>
    createError<BusinessError>({
      type: 'BUSINESS_ERROR',
      name: 'RateLimitError',
      statusCode: 429,
      message,
      code: 'TOO_MANY_REQUESTS',
      component,
      metadata: { retryAfter },
    }),
};
