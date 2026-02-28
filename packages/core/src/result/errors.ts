/**
 * Base structure for all application errors.
 * Every error has a type, message, statusCode, and timestamp.
 */
export interface BaseAppError {
  readonly type: string;
  readonly message: string;
  readonly statusCode: number;
  readonly timestamp: string;
  readonly name?: string | undefined;
  readonly stack?: string | undefined;
  readonly component?: string | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
}

/**
 * An individual field that failed validation.
 * Designed for form feedback — tells exactly what field failed and why.
 */
export interface ValidationFieldError {
  readonly field: string;
  readonly message: string;
  readonly rule?: string;
  readonly value?: unknown;
}

export type ValidationError = BaseAppError & {
  readonly type: 'VALIDATION_ERROR';
  readonly errors: ValidationFieldError[];
};

export type NotFoundError = BaseAppError & {
  readonly type: 'NOT_FOUND';
  readonly resource?: string | undefined;
  readonly resourceId?: string | number | undefined;
};

export type UnauthorizedError = BaseAppError & {
  readonly type: 'UNAUTHORIZED';
  readonly reason?:
    | 'invalid_token'
    | 'expired_token'
    | 'missing_token'
    | 'invalid_credentials'
    | 'missing_credentials'
    | undefined;
};

export type ForbiddenError = BaseAppError & {
  readonly type: 'FORBIDDEN';
  readonly requiredPermission?: string | undefined;
};

export type ConflictError = BaseAppError & {
  readonly type: 'CONFLICT';
  readonly conflictingField?: string | undefined;
  readonly existingValue?: unknown;
};

export type BusinessError = BaseAppError & {
  readonly type: 'BUSINESS_ERROR';
  readonly code?: string | undefined;
};

export type DatabaseError = BaseAppError & {
  readonly type: 'DATABASE_ERROR';
  readonly operation?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'TRANSACTION' | undefined;
  readonly table?: string | undefined;
  readonly cause?: unknown;
};

export type ExternalServiceError = BaseAppError & {
  readonly type: 'EXTERNAL_SERVICE_ERROR';
  readonly service: string;
  readonly operation?: string | undefined;
  readonly cause?: unknown;
};

export type InternalServerError = BaseAppError & {
  readonly type: 'INTERNAL_SERVER_ERROR';
  readonly service?: string | undefined;
  readonly operation?: string | undefined;
  readonly cause?: unknown;
};

/**
 * Discriminated union of all possible application errors.
 * Use this as the E in Result<T, AppError>.
 */
export type AppError =
  | ValidationError
  | NotFoundError
  | UnauthorizedError
  | ForbiddenError
  | ConflictError
  | BusinessError
  | DatabaseError
  | ExternalServiceError
  | InternalServerError;

/**
 * All possible AppError type strings.
 * Useful for type guards and switch statements.
 */
export type AppErrorType = AppError['type'];
