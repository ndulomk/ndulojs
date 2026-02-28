import type { AppError } from '../../result/errors';
import { isOk } from '../../result/utils';
import type { Result } from '../../result';

/**
 * Checks if a value is a Result monad.
 */
export const isResult = (value: unknown): value is Result<unknown, AppError> =>
  typeof value === 'object' &&
  value !== null &&
  'success' in value &&
  (typeof (value as Record<string, unknown>)['value'] !== 'undefined' ||
    typeof (value as Record<string, unknown>)['error'] !== 'undefined');

/**
 * Maps an AppError type to an HTTP status code.
 */
export const errorToStatus = (error: AppError): number => error.statusCode;

/**
 * Formats an AppError into a consistent HTTP response body.
 */
export const formatErrorResponse = (
  error: AppError,
): {
  success: false;
  error: {
    type: AppError['type'];
    message: string;
    code?: string | undefined;
    details?: unknown;
    resource?: string | undefined;
    timestamp: string;
  };
} => ({
  success: false,
  error: {
    type: error.type,
    message: error.message,
    code: 'code' in error ? (error as { code?: string }).code : undefined,
    details: error.type === 'VALIDATION_ERROR' ? error.errors : undefined,
    resource: 'resource' in error ? (error as { resource?: string }).resource : undefined,
    timestamp: error.timestamp,
  },
});

/**
 * Formats a successful Result into a consistent HTTP response body.
 */
export const formatSuccessResponse = <T>(value: T): { success: true; data: T } => ({
  success: true,
  data: value,
});

/**
 * Determines the appropriate log level for an AppError.
 */
export const errorLogLevel = (error: AppError): 'error' | 'warn' | 'info' => {
  if (error.statusCode >= 500) return 'error';
  if (error.type === 'UNAUTHORIZED' || error.type === 'FORBIDDEN') return 'info';
  if (error.type === 'VALIDATION_ERROR') return 'info';
  if (error.type === 'NOT_FOUND') return 'info';
  if (error.type === 'CONFLICT' || error.type === 'BUSINESS_ERROR') return 'warn';
  return 'warn';
};

/**
 * Processes a handler's return value.
 * - If it's a Result<T, AppError>: unwraps it into a proper HTTP response.
 * - If it's a raw value: passes it through untouched.
 *
 * This is the core of NduloJS's automatic error handling.
 * Handlers never throw — they return Results.
 */
export const processHandlerResult = (value: unknown): { body: unknown; status: number } => {
  if (!isResult(value)) {
    return { body: value, status: 200 };
  }

  if (isOk(value)) {
    return {
      body: formatSuccessResponse(value.value),
      status: 200,
    };
  }

  const error = value.error;
  return {
    body: formatErrorResponse(error),
    status: errorToStatus(error),
  };
};
