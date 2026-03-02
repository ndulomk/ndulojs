import type { Result } from '../result/types';
import type { AppError } from '../result/errors';

/**
 * HTTP methods supported by the adapter.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

/**
 * A request context passed to every handler.
 * Framework-agnostic — no Elysia types leak here.
 */
export type RequestContext = {
  readonly request: Request;
  readonly params: Record<string, string>;
  readonly query: Record<string, string>;
  readonly body: unknown;
  readonly headers: Record<string, string>;
  readonly path: string;
  readonly method: HttpMethod;
};

/**
 * A handler receives a context and returns a Result or a raw value.
 * Returning a Result lets the resultMiddleware handle HTTP status codes automatically.
 */
export type Handler<T = unknown> = (
  ctx: RequestContext,
) => Promise<Result<T, AppError> | T> | Result<T, AppError> | T;

/**
 * Route definition — path + handler + optional metadata.
 */
export type RouteDefinition = {
  readonly method: HttpMethod;
  readonly path: string;
  readonly handler: Handler;
  readonly tags?: string[];
  readonly summary?: string;
  readonly description?: string;
};

/**
 * Middleware function — runs before/after handlers.
 * Returns void to continue, or a Response to short-circuit.
 */
export type Middleware = (ctx: RequestContext) => Promise<void | Response> | void | Response;

/**
 * Logger configuration passed to createApp().
 * Mirrors LoggerConfig from the logger package — unified.
 */
export type LoggerConfig = {
  /**
   * Minimum log level. Default: 'info'
   */
  readonly level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | undefined;
  /**
   * Root directory for log files. Default: 'logs'
   * Logs are written here automatically — no manual setup needed.
   */
  readonly dir?: string | undefined;
  /**
   * Pretty-print to terminal instead of writing files.
   * Use true in development, false (default) in production.
   */
  readonly pretty?: boolean | undefined;
  /**
   * How many days of rotated files to retain per channel. Default: 30
   */
  readonly retainDays?: number | undefined;
  /**
   * Set to false to disable all logging entirely. Default: true
   */
  readonly enabled?: boolean | undefined;
};

/**
 * Swagger/OpenAPI configuration.
 */
export type SwaggerConfig = {
  readonly enabled: boolean;
  readonly path?: string | undefined;
  readonly title?: string | undefined;
  readonly version?: string | undefined;
  readonly description?: string | undefined;
  readonly tags?: Array<{ name: string; description?: string | undefined }> | undefined;
};

/**
 * Full app configuration passed to createApp().
 */
export type AppConfig = {
  readonly port: number;
  readonly logger?: LoggerConfig | undefined;
  readonly swagger?: SwaggerConfig | undefined;
};

/**
 * The return value of createApp().
 * Gives access to both the HTTP adapter and the logger instance.
 *
 * @example
 * const { app, logger } = await createApp({ port: 3000 });
 * logger.app.info('Server started');
 * app.get('/health', () => Ok({ status: 'ok' }));
 * app.listen(3000);
 */
export type AppInstance = {
  readonly app: IHttpAdapter;
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  readonly logger: import('../logger/types.js').LoggerSuite;
};

/**
 * The core HTTP adapter interface.
 * All framework-specific code lives behind this contract.
 */
export interface IHttpAdapter {
  /**
   * Register a GET route.
   */
  get(
    path: string,
    handler: Handler,
    meta?: Omit<RouteDefinition, 'method' | 'path' | 'handler'>,
  ): this;

  /**
   * Register a POST route.
   */
  post(
    path: string,
    handler: Handler,
    meta?: Omit<RouteDefinition, 'method' | 'path' | 'handler'>,
  ): this;

  /**
   * Register a PUT route.
   */
  put(
    path: string,
    handler: Handler,
    meta?: Omit<RouteDefinition, 'method' | 'path' | 'handler'>,
  ): this;

  /**
   * Register a PATCH route.
   */
  patch(
    path: string,
    handler: Handler,
    meta?: Omit<RouteDefinition, 'method' | 'path' | 'handler'>,
  ): this;

  /**
   * Register a DELETE route.
   */
  delete(
    path: string,
    handler: Handler,
    meta?: Omit<RouteDefinition, 'method' | 'path' | 'handler'>,
  ): this;

  /**
   * Group routes under a common prefix.
   */
  group(prefix: string, fn: (app: this) => void): this;

  /**
   * Apply a raw Elysia plugin.
   *
   * Use this for any Elysia-native plugin (jwt, bearer, etc.).
   * The plugin is passed directly to the underlying Elysia instance.
   *
   * @example
   * import { jwt } from '@elysiajs/jwt';
   * app.use(jwt({ name: 'jwt', secret: process.env.JWT_SECRET }));
   */
  use(plugin: unknown): this;

  /**
   * Escape hatch — returns the raw underlying Elysia instance.
   *
   * Use only when you need Elysia-specific features that the adapter
   * doesn't expose. Anything done via getElysia() bypasses the abstraction.
   *
   * @example
   * const elysia = app.getElysia();
   * elysia.use(someElysiaOnlyPlugin());
   */
  getElysia(): unknown;

  /**
   * Start listening on the configured port.
   */
  listen(port: number): void;

  /**
   * Stop the server.
   */
  stop(): Promise<void>;
}
