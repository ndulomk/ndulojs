import { createChannelLogger, createContextLogger } from './factory';
import type { LoggerConfig, LoggerSuite } from './types';

const DEFAULT_CONFIG: Required<LoggerConfig> = {
  level: 'info',
  dir: 'logs',
  pretty: false,
  retainDays: 30,
};

/**
 * Creates the full NduloJS logger suite.
 *
 * Returns three channels (app, http, error) and a context() helper
 * for binding per-request fields like requestId and userId.
 *
 * @example
 * // Development — pretty print to terminal
 * const logger = createLogger({ pretty: true, level: 'debug' });
 *
 * // Production — JSON files with daily rotation
 * const logger = createLogger({ dir: '/var/log/myapp', retainDays: 14 });
 *
 * logger.app.info('Server started');
 * logger.http.info({ method: 'GET', path: '/users', status: 200 }, 'Request');
 * logger.error.error({ err }, 'Unhandled exception');
 *
 * // Per-request context
 * const log = logger.context({ requestId, userId });
 * log.app.info('Processing payment');
 */
export const createLogger = (config: LoggerConfig = {}): LoggerSuite => {
  const resolved: Required<LoggerConfig> = {
    level: config.level ?? DEFAULT_CONFIG.level,
    dir: config.dir ?? DEFAULT_CONFIG.dir,
    pretty: config.pretty ?? DEFAULT_CONFIG.pretty,
    retainDays: config.retainDays ?? DEFAULT_CONFIG.retainDays,
  };

  const app = createChannelLogger('app', resolved);
  const http = createChannelLogger('http', resolved);
  const error = createChannelLogger('error', resolved);

  return {
    app,
    http,
    error,
    context: (ctx) => createContextLogger({ app, http, error }, ctx),
  };
};
