import type {
  AppConfig,
  AppInstance,
  Handler,
  HttpMethod,
  IHttpAdapter,
  Middleware,
  RequestContext,
  RouteDefinition,
} from './types';
import {
  processHandlerResult,
  isResult,
  formatErrorResponse,
} from './middlewares/result.middleware';
import { createLogger } from '../logger/index';
import type { LoggerSuite } from '../logger/types';
import {
  createRequestLog,
  createResponseLog,
  generateRequestId,
} from './middlewares/logger.middleware';
import { isOk } from '../result';
import type { AppError } from '../result/errors';
import { createPluginManager } from '../plugin';

type RouteMeta = Omit<RouteDefinition, 'method' | 'path' | 'handler'>;

type LogCtx = {
  logger: LoggerSuite;
  requestIds: WeakMap<Request, string>;
  requestTimes: WeakMap<Request, number>;
  loggingEnabled: boolean;
  excludePaths: Set<string>;
};

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

type ElysiaHandlerCtx = {
  request: Request;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  set: { status?: number | string | undefined; headers: Record<string, string> };
};

const headersToObject = (headers: Headers): Record<string, string> => {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
};

const routeOpts = (meta?: RouteMeta): Record<string, unknown> => {
  if (meta === undefined) return {};
  const opts: Record<string, unknown> = {};
  if (meta.detail !== undefined) opts['detail'] = meta.detail;
  if (meta.body !== undefined) opts['body'] = meta.body;
  if (meta.query !== undefined) opts['query'] = meta.query;
  if (meta.params !== undefined) opts['params'] = meta.params;
  return opts;
};

const buildRequestContext = (ctx: ElysiaHandlerCtx): RequestContext => ({
  request: ctx.request,
  params: ctx.params,
  query: ctx.query,
  body: ctx.body,
  headers: headersToObject(ctx.request.headers),
  path: new URL(ctx.request.url).pathname,
  method: ctx.request.method as HttpMethod,
  set: { headers: {} },
  state: {},
});

const mergeResponse = (ndulo: RequestContext, elysiaSet: ElysiaHandlerCtx['set']): void => {
  if (ndulo.set.status !== undefined) {
    elysiaSet.status = ndulo.set.status;
  }
  for (const [key, value] of Object.entries(ndulo.set.headers)) {
    elysiaSet.headers[key] = value;
  }
};

const wrapHandler =
  (handler: Handler, middlewares: Middleware[], logCtx: LogCtx) =>
  async (elysiaCtx: ElysiaHandlerCtx): Promise<unknown> => {
    const nduloCtx = buildRequestContext(elysiaCtx);

    try {
      if (middlewares.length > 0) {
        let mwIndex = 0;
        let calledNext = false;
        let body: unknown;

        const next = async (): Promise<void> => {
          calledNext = true;
          mwIndex++;
          const mw = middlewares[mwIndex];
          if (mw) {
            await mw(nduloCtx, next);
          } else {
            body = await runHandler(handler, nduloCtx, elysiaCtx, logCtx);
          }
        };

        const firstMw = middlewares[0];
        if (!firstMw) {
          return await runHandler(handler, nduloCtx, elysiaCtx, logCtx);
        }
        const mwResult = await firstMw(nduloCtx, next);
        if (mwResult instanceof Response) return mwResult;
        if (!calledNext) return;
        return body;
      }

      return await runHandler(handler, nduloCtx, elysiaCtx, logCtx);
    } catch (err) {
      return handleUncaughtError(err, nduloCtx, elysiaCtx, logCtx);
    }
  };

const runHandler = async (
  handler: Handler,
  nduloCtx: RequestContext,
  elysiaCtx: ElysiaHandlerCtx,
  logCtx: LogCtx,
): Promise<unknown> => {
  const result = await handler(nduloCtx);
  const { body, status } = processHandlerResult(result);
  elysiaCtx.set.status = status;
  mergeResponse(nduloCtx, elysiaCtx.set);

  if (logCtx.loggingEnabled && !logCtx.excludePaths.has(nduloCtx.path)) {
    const id = logCtx.requestIds.get(nduloCtx.request) ?? 'unknown';
    const start = logCtx.requestTimes.get(nduloCtx.request) ?? Date.now();
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    const errorStack =
      isResult(result) && !isOk(result) ? (result.error as { stack?: string }).stack : undefined;

    logCtx.logger.http[level](
      {
        ...createResponseLog(nduloCtx.request, id, status, start),
        ...(errorStack !== undefined ? { stack: errorStack } : {}),
      },
      'Request completed',
    );
  }

  return body;
};

const handleUncaughtError = (
  err: unknown,
  nduloCtx: RequestContext,
  elysiaCtx: ElysiaHandlerCtx,
  logCtx: LogCtx,
): unknown => {
  const message = err instanceof Error ? err.message : 'Internal server error';
  const errorBody = formatErrorResponse({
    type: 'INTERNAL_SERVER_ERROR',
    message,
    statusCode: 500,
    timestamp: new Date().toISOString(),
    name: 'InternalServerError',
  } as AppError);

  elysiaCtx.set.status = 500;

  if (logCtx.loggingEnabled) {
    logCtx.logger.error.error(
      {
        err: err instanceof Error ? err.message : String(err),
        path: nduloCtx.path,
        method: nduloCtx.method,
      },
      'Unhandled error in handler',
    );
  }

  return errorBody;
};

const routeMethods = ['get', 'post', 'put', 'patch', 'delete'] as const;
type RouteMethod = (typeof routeMethods)[number];

const createAdapter = (
  target: AnyElysia,
  elysiaRef: AnyElysia,
  logCtx: LogCtx,
  middlewares: Middleware[],
  isRoot: boolean,
  startHooks: Array<() => Promise<void> | void>,
  stopHooks: Array<() => Promise<void> | void>,
): IHttpAdapter => {
  const register = (method: RouteMethod, path: string, handler: Handler, meta?: RouteMeta) => {
    target[method](path, wrapHandler(handler, middlewares, logCtx), routeOpts(meta));
  };

  return {
    get(p, h, m?) {
      register('get', p, h, m);
      return this;
    },
    post(p, h, m?) {
      register('post', p, h, m);
      return this;
    },
    put(p, h, m?) {
      register('put', p, h, m);
      return this;
    },
    patch(p, h, m?) {
      register('patch', p, h, m);
      return this;
    },
    delete(p, h, m?) {
      register('delete', p, h, m);
      return this;
    },
    group(prefix, fn) {
      target.group(prefix, (sub) => {
        fn(createAdapter(sub, elysiaRef, logCtx, middlewares, false, startHooks, stopHooks));
        return sub;
      });
      return this;
    },
    use(plugin) {
      target.use(plugin);
      return this;
    },
    middleware(fn) {
      middlewares.push(fn);
      return this;
    },
    getElysia() {
      return elysiaRef;
    },
    onStart(fn) {
      startHooks.push(fn);
      return this;
    },
    onStop(fn) {
      stopHooks.push(fn);
      return this;
    },
    listen(port) {
      elysiaRef.listen(port);
    },
    stop: isRoot
      ? async () => {
          for (const hook of stopHooks) await hook();
          await elysiaRef.stop();
        }
      : async () => {
          for (const hook of stopHooks) await hook();
        },
  };
};

export const createElysiaAdapter = async (config: AppConfig): Promise<AppInstance> => {
  const elysiaModule = await import('elysia');
  const ElysiaClass = elysiaModule.Elysia ?? elysiaModule.default;
  const elysia = new (ElysiaClass as unknown as new () => AnyElysia)();

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
  const excludePaths = new Set<string>();
  if (!loggingEnabled) excludePaths.add('*');

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

  const logCtx: LogCtx = { logger, requestIds, requestTimes, loggingEnabled, excludePaths };

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

  const middlewares: Middleware[] = [];
  const startHooks: Array<() => Promise<void> | void> = [];
  const stopHooks: Array<() => Promise<void> | void> = [];

  const adapter = createAdapter(elysia, elysia, logCtx, middlewares, true, startHooks, stopHooks);

  const plugins = createPluginManager({
    container: config.container ?? ({} as never),
    app: adapter,
    logger,
  });

  plugins.registerAll();
  await plugins.bootAll();

  for (const hook of startHooks) await hook();

  return { app: adapter, logger, plugins };
};

export const createApp = (config: AppConfig): Promise<AppInstance> => createElysiaAdapter(config);
