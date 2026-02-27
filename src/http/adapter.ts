import type { AppConfig, Handler, HttpMethod, IHttpAdapter, RouteDefinition } from './types';
import { processHandlerResult } from './middlewares/result.middleware';
import { buildCorsHeaders, handlePreflight, isOriginAllowed } from './middlewares/cors.middleware';
import {
  createDefaultLogger,
  createRequestLog,
  createResponseLog,
  generateRequestId,
} from './middlewares/logger.middleware';
import { createMemoryRateLimitStore } from './middlewares/rate-limit.middleware';

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
 * Uses forEach for compatibility — Headers.entries() isn't universally available.
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
 * Avoids exactOptionalPropertyTypes clash with { detail: undefined }.
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
const makeGroupAdapter = (g: AnyElysia): IHttpAdapter => {
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
        fn(makeGroupAdapter(sub));
        return sub;
      });
      return this;
    },
    use(plugin) {
      g.use(plugin);
      return this;
    },
    listen() {
      return;
    },
    stop: () => Promise.resolve(),
  };
  return adapter;
};

export const createElysiaAdapter = async (config: AppConfig): Promise<IHttpAdapter> => {
  const elysiaModule = await import('elysia');
  const ElysiaClass = elysiaModule.Elysia ?? elysiaModule.default;
  const app = new (ElysiaClass as unknown as new () => AnyElysia)();

  const logger = createDefaultLogger(config.logger ?? { enabled: true, level: 'info' });
  createMemoryRateLimitStore();

  if (config.cors) {
    const corsConfig = config.cors;
    app.onRequest((ctx: ElysiaHandlerCtx): Response | undefined => {
      const origin = ctx.request.headers.get('origin');
      if (!isOriginAllowed(origin, corsConfig)) {
        ctx.set.status = 403;
        return new Response('Forbidden: Origin not allowed', { status: 403 });
      }
      Object.assign(ctx.set.headers, buildCorsHeaders(origin, corsConfig));
      if (ctx.request.method === 'OPTIONS') {
        return handlePreflight(origin, corsConfig);
      }
      return undefined;
    });
  }

  // --- Request logging — WeakMap so requests are GC'd automatically ---
  const requestIds = new WeakMap<Request, string>();
  const requestTimes = new WeakMap<Request, number>();

  if (config.logger?.enabled !== false) {
    app.onRequest((ctx: { request: Request }): void => {
      const id = generateRequestId();
      requestIds.set(ctx.request, id);
      requestTimes.set(ctx.request, Date.now());
      logger('info', createRequestLog(ctx.request, id), 'Incoming request');
    });
  }

  // --- Result middleware + response logging ---
  // Returning a value from onAfterHandle replaces the response in Elysia
  app.onAfterHandle((ctx: ElysiaHandlerCtx & { response: unknown }): unknown => {
    const { body, status } = processHandlerResult(ctx.response);
    ctx.set.status = status;

    if (config.logger?.enabled !== false) {
      const id = requestIds.get(ctx.request) ?? 'unknown';
      const start = requestTimes.get(ctx.request) ?? Date.now();
      logger('info', createResponseLog(ctx.request, id, status, start), 'Request completed');
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
    app.use(
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
      app.get(path, wrapHandler(handler), routeOpts(meta));
      return this;
    },
    post(path, handler, meta?) {
      app.post(path, wrapHandler(handler), routeOpts(meta));
      return this;
    },
    put(path, handler, meta?) {
      app.put(path, wrapHandler(handler), routeOpts(meta));
      return this;
    },
    patch(path, handler, meta?) {
      app.patch(path, wrapHandler(handler), routeOpts(meta));
      return this;
    },
    delete(path, handler, meta?) {
      app.delete(path, wrapHandler(handler), routeOpts(meta));
      return this;
    },

    group(prefix, fn) {
      app.group(prefix, (grouped) => {
        fn(makeGroupAdapter(grouped));
        return grouped;
      });
      return this;
    },

    use(plugin) {
      app.use(plugin);
      return this;
    },
    listen(port) {
      app.listen(port);
    },
    stop: async () => {
      await app.stop();
    },
  };

  return adapter;
};

/**
 * Creates the NduloJS app.
 *
 * @example
 * const app = await createApp({ port: 3000, cors: { origins: '*' } });
 * app.get('/health', () => Ok({ status: 'ok' }));
 * app.listen(3000);
 */
export const createApp = (config: AppConfig): Promise<IHttpAdapter> => createElysiaAdapter(config);
