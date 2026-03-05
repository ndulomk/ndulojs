import type {
  AppConfig,
  AppInstance,
  Handler,
  HttpMethod,
  IHttpAdapter,
  RouteDefinition,
} from './types';
import { isResult, processHandlerResult } from './middlewares/result.middleware';
import { createLogger } from '../logger/index';
import type { LoggerSuite } from '../logger/types';
import {
  createRequestLog,
  createResponseLog,
  generateRequestId,
} from './middlewares/logger.middleware';
import { isOk } from '../result';

type RouteMeta = Omit<RouteDefinition, 'method' | 'path' | 'handler'>;

/**
 * Logging context passed down to every wrapped handler.
 */
type LogCtx = {
  logger: LoggerSuite;
  requestIds: WeakMap<Request, string>;
  requestTimes: WeakMap<Request, number>;
  loggingEnabled: boolean;
};

/**
 * Minimal Elysia instance shape we actually use.
 */
type AnyElysia = {
  get(path: string, handler: unknown, opts?: unknown): AnyElysia;
  post(path: string, handler: unknown, opts?: unknown): AnyElysia;
  put(path: string, handler: unknown, opts?: unknown): AnyElysia;
  patch(path: string, handler: unknown, opts?: unknown): AnyElysia;
  delete(path: string, handler: unknown, opts?: unknown): AnyElysia;
  group(prefix: string, fn: (grouped: AnyElysia) => AnyElysia): AnyElysia;
  use(plugin: unknown): AnyElysia;
  listen(port: number): AnyElysia;
  stop(): Promise<void>;
  onRequest(handler: unknown): AnyElysia;
};

/**
 * Minimal Elysia handler context — only the fields we read.
 */
type ElysiaHandlerCtx = {
  request: Request;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  set: { status?: number | string | undefined; headers: Record<string, string> };
};

/**
 * Converts Headers to a plain object.
 */
const headersToObject = (headers: Headers): Record<string, string> => {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
};

/**
 * Builds Elysia route options from NduloJS RouteMeta.
 */
const routeOpts = (meta?: RouteMeta): Record<string, unknown> => {
  if (meta === undefined) return {};

  const opts: Record<string, unknown> = {};

  if (meta.detail !== undefined) opts['detail'] = meta.detail;
  if (meta.body !== undefined) opts['body'] = meta.body;
  if (meta.query !== undefined) opts['query'] = meta.query;
  if (meta.params !== undefined) opts['params'] = meta.params;

  return opts;
};

/**
 * Wraps a NduloJS Handler into an Elysia-callable function.
 * Logging happens here — guaranteed to run for every handler, every time.
 */
const wrapHandler =
  (handler: Handler, logCtx: LogCtx) =>
  async (ctx: ElysiaHandlerCtx): Promise<unknown> => {
    const result = await handler({
      request: ctx.request,
      params: ctx.params,
      query: ctx.query,
      body: ctx.body,
      headers: headersToObject(ctx.request.headers),
      path: new URL(ctx.request.url).pathname,
      method: ctx.request.method as HttpMethod,
    });

    const { body, status } = processHandlerResult(result);
    ctx.set.status = status;

    if (logCtx.loggingEnabled) {
      const id = logCtx.requestIds.get(ctx.request) ?? 'unknown';
      const start = logCtx.requestTimes.get(ctx.request) ?? Date.now();
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      const errorStack =
        isResult(result) && !isOk(result) ? (result.error as { stack?: string }).stack : undefined;

      logCtx.logger.http[level](
        {
          ...createResponseLog(ctx.request, id, status, start),
          ...(errorStack !== undefined ? { stack: errorStack } : {}),
        },
        'Request completed',
      );
    }

    return body;
  };

/**
 * Builds a scoped IHttpAdapter for grouped routes.
 */
const makeGroupAdapter = (g: AnyElysia, elysiaRef: AnyElysia, logCtx: LogCtx): IHttpAdapter => {
  const adapter: IHttpAdapter = {
    get(p, h, m?) {
      g.get(p, wrapHandler(h, logCtx), routeOpts(m));
      return this;
    },
    post(p, h, m?) {
      g.post(p, wrapHandler(h, logCtx), routeOpts(m));
      return this;
    },
    put(p, h, m?) {
      g.put(p, wrapHandler(h, logCtx), routeOpts(m));
      return this;
    },
    patch(p, h, m?) {
      g.patch(p, wrapHandler(h, logCtx), routeOpts(m));
      return this;
    },
    delete(p, h, m?) {
      g.delete(p, wrapHandler(h, logCtx), routeOpts(m));
      return this;
    },
    group(prefix, fn) {
      g.group(prefix, (sub) => {
        fn(makeGroupAdapter(sub, elysiaRef, logCtx));
        return sub;
      });
      return this;
    },
    use(plugin) {
      g.use(plugin);
      return this;
    },
    getElysia() {
      return elysiaRef;
    },
    listen() {
      return;
    },
    stop: () => Promise.resolve(),
  };
  return adapter;
};

export const createElysiaAdapter = async (config: AppConfig): Promise<AppInstance> => {
  const elysiaModule = await import('elysia');
  const ElysiaClass = elysiaModule.Elysia ?? elysiaModule.default;
  const elysia = new (ElysiaClass as unknown as new () => AnyElysia)();

  // --- Unified logger ---
  const loggerConfig = config.logger ?? {};
  const logger = createLogger(
    loggerConfig.enabled === false
      ? {}
      : {
          level: loggerConfig.level,
          dir: loggerConfig.dir,
          pretty: loggerConfig.pretty,
          retainDays: loggerConfig.retainDays,
        },
  );

  const loggingEnabled = loggerConfig.enabled !== false;

  // --- Request logging ---
  const requestIds = new WeakMap<Request, string>();
  const requestTimes = new WeakMap<Request, number>();

  if (loggingEnabled) {
    elysia.onRequest((ctx: { request: Request }): void => {
      const id = generateRequestId();
      requestIds.set(ctx.request, id);
      requestTimes.set(ctx.request, Date.now());
      logger.http.info(createRequestLog(ctx.request, id), 'Incoming request');
    });
  }

  // --- Shared logging context passed to every wrapHandler ---
  const logCtx: LogCtx = { logger, requestIds, requestTimes, loggingEnabled };

  // --- Swagger ---
  if (config.swagger?.enabled) {
    const swaggerModule = await import('@elysiajs/swagger');
    const swaggerFn = (swaggerModule.swagger ?? swaggerModule.default) as (
      opts: unknown,
    ) => unknown;
    elysia.use(
      swaggerFn({
        documentation: {
          info: {
            title: config.swagger.title ?? 'NduloJS API',
            version: config.swagger.version ?? '1.0.0',
            ...(config.swagger.description !== undefined
              ? { description: config.swagger.description }
              : {}),
          },
          ...(config.swagger.tags !== undefined ? { tags: config.swagger.tags } : {}),
        },
        path: config.swagger.path ?? '/docs',
      }),
    );
  }

  const adapter: IHttpAdapter = {
    get(path, handler, meta?) {
      elysia.get(path, wrapHandler(handler, logCtx), routeOpts(meta));
      return this;
    },
    post(path, handler, meta?) {
      elysia.post(path, wrapHandler(handler, logCtx), routeOpts(meta));
      return this;
    },
    put(path, handler, meta?) {
      elysia.put(path, wrapHandler(handler, logCtx), routeOpts(meta));
      return this;
    },
    patch(path, handler, meta?) {
      elysia.patch(path, wrapHandler(handler, logCtx), routeOpts(meta));
      return this;
    },
    delete(path, handler, meta?) {
      elysia.delete(path, wrapHandler(handler, logCtx), routeOpts(meta));
      return this;
    },
    group(prefix, fn) {
      elysia.group(prefix, (grouped) => {
        fn(makeGroupAdapter(grouped, elysia, logCtx));
        return grouped;
      });
      return this;
    },
    use(plugin) {
      elysia.use(plugin);
      return this;
    },
    getElysia() {
      return elysia;
    },
    listen(port) {
      elysia.listen(port);
    },
    stop: async () => {
      await elysia.stop();
    },
  };

  return { app: adapter, logger };
};

export const createApp = (config: AppConfig): Promise<AppInstance> => createElysiaAdapter(config);
