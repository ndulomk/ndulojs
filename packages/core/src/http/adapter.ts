import type {
  AppConfig,
  AppInstance,
  Handler,
  HttpMethod,
  IHttpAdapter,
  RouteDefinition,
} from './types';
import { processHandlerResult } from './middlewares/result.middleware';
import { createLogger } from '../logger/index';
import {
  createRequestLog,
  createResponseLog,
  generateRequestId,
} from './middlewares/logger.middleware';

type RouteMeta = Omit<RouteDefinition, 'method' | 'path' | 'handler'>;

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
  onAfterHandle(handler: unknown): AnyElysia;
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
 * Only pass detail to Elysia when meta is defined.
 */
const routeOpts = (meta?: RouteMeta): Record<string, unknown> =>
  meta !== undefined ? { detail: meta } : {};

/**
 * Wraps a NduloJS Handler into an Elysia-callable function.
 */
const wrapHandler =
  (handler: Handler) =>
  (ctx: ElysiaHandlerCtx): unknown =>
    handler({
      request: ctx.request,
      params: ctx.params,
      query: ctx.query,
      body: ctx.body,
      headers: headersToObject(ctx.request.headers),
      path: new URL(ctx.request.url).pathname,
      method: ctx.request.method as HttpMethod,
    });

/**
 * Builds a scoped IHttpAdapter for grouped routes.
 */
const makeGroupAdapter = (g: AnyElysia, elysiaRef: AnyElysia): IHttpAdapter => {
  const adapter: IHttpAdapter = {
    get(p, h, m?) {
      g.get(p, wrapHandler(h), routeOpts(m));
      return this;
    },
    post(p, h, m?) {
      g.post(p, wrapHandler(h), routeOpts(m));
      return this;
    },
    put(p, h, m?) {
      g.put(p, wrapHandler(h), routeOpts(m));
      return this;
    },
    patch(p, h, m?) {
      g.patch(p, wrapHandler(h), routeOpts(m));
      return this;
    },
    delete(p, h, m?) {
      g.delete(p, wrapHandler(h), routeOpts(m));
      return this;
    },
    group(prefix, fn) {
      g.group(prefix, (sub) => {
        fn(makeGroupAdapter(sub, elysiaRef));
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

  // --- Unified logger (pino-based, writes to files or pretty terminal) ---
  const loggerConfig = config.logger ?? {};
  const logger = createLogger(
    loggerConfig.enabled === false
      ? {} // createLogger with empty config still works; we gate logging below
      : {
          level: loggerConfig.level,
          dir: loggerConfig.dir,
          pretty: loggerConfig.pretty,
          retainDays: loggerConfig.retainDays,
        },
  );

  const loggingEnabled = loggerConfig.enabled !== false;

  // --- Request logging — WeakMap so requests are GC'd automatically ---
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

  // --- Result middleware + response logging ---
  elysia.onAfterHandle((ctx: ElysiaHandlerCtx & { response: unknown }): unknown => {
    const { body, status } = processHandlerResult(ctx.response);
    ctx.set.status = status;

    if (loggingEnabled) {
      const id = requestIds.get(ctx.request) ?? 'unknown';
      const start = requestTimes.get(ctx.request) ?? Date.now();
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      logger.http[level](createResponseLog(ctx.request, id, status, start), 'Request completed');
    }

    return body;
  });

  // --- Swagger ---
  if (config.swagger?.enabled) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const swaggerModule = await import('@elysiajs/swagger');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
      elysia.get(path, wrapHandler(handler), routeOpts(meta));
      return this;
    },
    post(path, handler, meta?) {
      elysia.post(path, wrapHandler(handler), routeOpts(meta));
      return this;
    },
    put(path, handler, meta?) {
      elysia.put(path, wrapHandler(handler), routeOpts(meta));
      return this;
    },
    patch(path, handler, meta?) {
      elysia.patch(path, wrapHandler(handler), routeOpts(meta));
      return this;
    },
    delete(path, handler, meta?) {
      elysia.delete(path, wrapHandler(handler), routeOpts(meta));
      return this;
    },
    group(prefix, fn) {
      elysia.group(prefix, (grouped) => {
        fn(makeGroupAdapter(grouped, elysia));
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

/**
 * Creates the NduloJS app.
 *
 * Returns both the HTTP adapter and the logger — the logger is already
 * wired internally for request/response logging. Use it for application logs too.
 *
 * Logs are written to rotating daily files by default (logs/app/, logs/http/, logs/error/).
 * Pass `logger: { pretty: true }` for coloured terminal output in development.
 *
 * @example
 * const { app, logger } = await createApp({ port: 3000 });
 *
 * logger.app.info('Server started');
 *
 * app.get('/health', () => Ok({ status: 'ok' }));
 * app.listen(3000);
 */
export const createApp = (config: AppConfig): Promise<AppInstance> => createElysiaAdapter(config);
