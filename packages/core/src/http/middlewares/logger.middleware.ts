import type { LoggerConfig } from '../types';

export type LogEntry = {
  readonly requestId: string;
  readonly method: string;
  readonly path: string;
  readonly statusCode?: number | undefined;
  readonly durationMs?: number | undefined;
  readonly userAgent?: string | undefined;
  readonly ip?: string | undefined;
  readonly error?: unknown;
};

export type LoggerFn = (level: 'info' | 'warn' | 'error', entry: LogEntry, message: string) => void;

/**
 * Default logger — writes structured JSON to stdout/stderr.
 * In production, pipe this to your log aggregator.
 */
export const createDefaultLogger = (config: LoggerConfig): LoggerFn => {
  if (!config.enabled) {
    return () => undefined;
  }

  const levelPriority: Record<string, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };
  const configuredLevel = levelPriority[config.level ?? 'info'] ?? 1;

  return (level, entry, message) => {
    const priority = levelPriority[level] ?? 1;
    if (priority < configuredLevel) return;

    const output = JSON.stringify({
      level,
      timestamp: new Date().toISOString(),
      message,
      ...entry,
    });

    if (level === 'error') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  };
};

/**
 * Extracts a client IP from a request.
 */
export const extractIp = (request: Request): string | undefined => {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    undefined
  );
};

/**
 * Generates a simple request ID.
 * Uses crypto.randomUUID if available, falls back to timestamp + random.
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
