import type { LogContext } from '../../logger';

/**
 * LogEntry extends LogContext so it can be passed directly to NduloLogger methods.
 * error is typed as string | undefined — serialise Error objects before passing.
 */
export type LogEntry = LogContext & {
  readonly requestId: string;
  readonly method: string;
  readonly path: string;
  readonly statusCode?: number | undefined;
  readonly durationMs?: number | undefined;
  readonly userAgent?: string | undefined;
  readonly ip?: string | undefined;
  readonly error?: string | undefined;
  readonly stack?: string | undefined;
};

/**
 * Extracts a client IP from a request.
 */
export const extractIp = (request: Request): string | undefined =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
  request.headers.get('x-real-ip') ??
  undefined;

/**
 * Generates a simple request ID.
 */
export const generateRequestId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

/**
 * Creates an incoming request log entry.
 */
export const createRequestLog = (request: Request, requestId: string): LogEntry => ({
  requestId,
  method: request.method,
  path: new URL(request.url).pathname,
  userAgent: request.headers.get('user-agent') ?? undefined,
  ip: extractIp(request),
});

/**
 * Creates a completed request log entry.
 */
export const createResponseLog = (
  request: Request,
  requestId: string,
  statusCode: number,
  startTime: number,
): LogEntry => ({
  requestId,
  method: request.method,
  path: new URL(request.url).pathname,
  statusCode,
  durationMs: Date.now() - startTime,
});
