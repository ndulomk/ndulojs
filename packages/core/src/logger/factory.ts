import { join } from 'path';
import pino from 'pino';
import type { LogChannel, LoggerConfig, LogContext, LogLevel, NduloLogger } from './types';

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
 * In pretty mode, all channels share ONE underlying pino instance.
 * The channel is added via pino.child({ channel }), avoiding 3 worker threads.
 */
let sharedPrettyPino: pino.Logger | null = null;

const getSharedPrettyLogger = (level: LogLevel): pino.Logger => {
  if (!sharedPrettyPino) {
    sharedPrettyPino = pino({
      level,
      timestamp: pino.stdTimeFunctions.isoTime,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
          messageFormat: '[{channel}] {msg}',
        },
      },
    });
  }
  return sharedPrettyPino;
};

/**
 * Creates a logger for a specific channel.
 *
 * In pretty mode (dev): all channels share one pino-pretty worker thread.
 * In production mode: each channel has its own daily-rotated file via pino-roll.
 *   - app  → logs/app/app.log
 *   - http → logs/http/http.log
 *   - error → logs/error/error.log
 */
export const createChannelLogger = (
  channel: LogChannel,
  config: Required<LoggerConfig>,
): NduloLogger => {
  const level = config.level ?? 'info';
  const dir = config.dir ?? 'logs';

  if (config.pretty) {
    return wrapPino(getSharedPrettyLogger(level).child({ channel }));
  }

  const filePath = join(dir, channel, channel);
  const pinoLogger = pino(
    { base: { channel }, timestamp: pino.stdTimeFunctions.isoTime, level },
    pino.transport({
      target: 'pino-roll',
      options: {
        file: filePath,
        frequency: 'daily',
        dateFormat: 'yyyy-MM-dd',
        mkdir: true,
        extension: '.log',
        limit: { count: config.retainDays },
      },
    }),
  );

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
