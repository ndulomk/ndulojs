import type { Logger } from 'pino';

/**
 * Log levels supported by NduloJS.
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Configuration for createLogger().
 */
export type LoggerConfig = {
  /** Minimum level to emit. Default: 'info' */
  readonly level?: LogLevel | undefined;
  /** Root directory for log files. Default: 'logs' */
  readonly dir?: string | undefined;
  /** Pretty-print to terminal instead of writing to files. Default: false */
  readonly pretty?: boolean | undefined;
  /** Maximum number of rotated files to keep per channel. Default: 30 */
  readonly retainDays?: number | undefined;
};

/**
 * Context fields that can be bound to a logger instance.
 * All fields are optional — bind what you have.
 */
export type LogContext = {
  readonly requestId?: string | undefined;
  readonly userId?: string | undefined;
  readonly service?: string | undefined;
  readonly component?: string | undefined;
  readonly traceId?: string | undefined;
  [key: string]: string | number | boolean | undefined;
};

/**
 * A NduloJS logger — thin wrapper around Pino.
 */
export type NduloLogger = {
  readonly trace: (obj: LogContext | string, msg?: string) => void;
  readonly debug: (obj: LogContext | string, msg?: string) => void;
  readonly info: (obj: LogContext | string, msg?: string) => void;
  readonly warn: (obj: LogContext | string, msg?: string) => void;
  readonly error: (obj: LogContext | string, msg?: string) => void;
  readonly fatal: (obj: LogContext | string, msg?: string) => void;
  /** Creates a child logger with bound context fields. */
  readonly child: (context: LogContext) => NduloLogger;
  /** The underlying Pino instance — escape hatch. */
  readonly pino: Logger;
};

/**
 * The three log channels NduloJS manages.
 */
export type LogChannel = 'app' | 'http' | 'error';

/**
 * The full logger suite returned by createLogger().
 */
export type LoggerSuite = {
  readonly app: NduloLogger;
  readonly http: NduloLogger;
  readonly error: NduloLogger;
  readonly context: (ctx: LogContext) => {
    app: NduloLogger;
    http: NduloLogger;
    error: NduloLogger;
  };
};
