import { join } from 'path';
import pino from 'pino';
import type { LogChannel, LoggerConfig, LogContext, NduloLogger } from './types';

/**
 * Wraps a raw Pino logger into a NduloLogger.
 * Normalises the call signature so both (string) and (obj, msg) work.
 */
const wrapPino = (pinoLogger: pino.Logger): NduloLogger => {
  const call =
    (level: pino.Level) =>
    (obj: LogContext | string, msg?: string): void => {
      if (typeof obj === 'string') {
        pinoLogger[level](obj);
      } else {
        pinoLogger[level](obj, msg ?? '');
      }
    };

  return {
    trace: call('trace'),
    debug: call('debug'),
    info: call('info'),
    warn: call('warn'),
    error: call('error'),
    fatal: call('fatal'),
    child: (context: LogContext): NduloLogger => wrapPino(pinoLogger.child(context)),
    pino: pinoLogger,
  };
};

/**
 * Builds the pino transport options for a given channel.
 *
 * In pretty mode: logs go to stdout with pino-pretty.
 * In production mode: logs go to a daily-rotated file via pino-roll.
 *   - app  → logs/app/app.log     → rotates to app.YYYY-MM-DD.N.log
 *   - http → logs/http/http.log   → rotates to http.YYYY-MM-DD.N.log
 *   - error → logs/error/error.log → rotates to error.YYYY-MM-DD.N.log
 */
const buildTransport = (
  channel: LogChannel,
  config: Required<LoggerConfig>,
): pino.TransportSingleOptions | pino.TransportMultiOptions => {
  if (config.pretty) {
    return {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname',
        messageFormat: `[${channel}] {msg}`,
      },
    };
  }

  const dir = config.dir ?? 'logs';
  const filePath = join(dir, channel, channel);

  return {
    target: 'pino-roll',
    options: {
      file: filePath,
      frequency: 'daily',
      dateFormat: 'yyyy-MM-dd',
      mkdir: true,
      extension: '.log',
      limit: {
        count: config.retainDays,
      },
    },
  };
};

/**
 * Creates a logger for a specific channel with the given config.
 */
export const createChannelLogger = (
  channel: LogChannel,
  config: Required<LoggerConfig>,
): NduloLogger => {
  const transport = buildTransport(channel, config);
  const options: pino.LoggerOptions = {
    base: { channel },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (config.level) {
    options.level = config.level;
  }

  const pinoLogger = pino(options, pino.transport(transport));

  return wrapPino(pinoLogger);
};

/**
 * Creates a context logger by binding fields to all three channels.
 */
export const createContextLogger = (
  channels: { app: NduloLogger; http: NduloLogger; error: NduloLogger },
  ctx: LogContext,
): { app: NduloLogger; http: NduloLogger; error: NduloLogger } => ({
  app: channels.app.child(ctx),
  http: channels.http.child(ctx),
  error: channels.error.child(ctx),
});
