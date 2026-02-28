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
 * CORS configuration.
 */
export type CorsConfig = {
  readonly origins: string[] | '*';
  readonly methods?: HttpMethod[];
  readonly allowedHeaders?: string[];
  readonly credentials?: boolean;
};

/**
 * Rate limit configuration.
 */
export type RateLimitConfig = {
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly keyPrefix?: string;
};

/**
 * Built-in rate limit presets.
 */
export const RateLimitPresets = {
  AUTH: { windowMs: 15 * 60 * 1000, maxRequests: 5, keyPrefix: 'auth:' },
  API: { windowMs: 60 * 1000, maxRequests: 60, keyPrefix: 'api:' },
  PUBLIC: { windowMs: 60 * 1000, maxRequests: 120, keyPrefix: 'public:' },
  STRICT: { windowMs: 60 * 60 * 1000, maxRequests: 10, keyPrefix: 'strict:' },
} as const satisfies Record<string, RateLimitConfig>;

/**
 * Logger configuration.
 */
export type LoggerConfig = {
  readonly enabled: boolean;
  readonly level?: 'debug' | 'info' | 'warn' | 'error';
};

/**
 * Full app configuration passed to createApp().
 */
export type AppConfig = {
  readonly port: number;
  readonly cors?: CorsConfig | undefined;
  readonly logger?: LoggerConfig | undefined;
  readonly swagger?: SwaggerConfig | undefined;
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
   * Apply a raw framework plugin (escape hatch for Elysia plugins).
   * Use sparingly — this breaks the abstraction.
   */
  use(plugin: unknown): this;

  /**
   * Start listening on the configured port.
   */
  listen(port: number): void;

  /**
   * Stop the server.
   */
  stop(): Promise<void>;
}
