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
 * Swagger/OpenAPI detail — shown in /docs.
 */
export type RouteDetail = {
  readonly tags?: string[];
  readonly summary?: string;
  readonly description?: string;
};

/**
 * Route definition — path + handler + optional metadata.
 *
 * `detail`  → Swagger/OpenAPI info (tags, summary, description)
 * `body`    → TypeBox schema for request body — passed to Elysia for validation + Swagger
 * `query`   → TypeBox schema for query string params
 * `params`  → TypeBox schema for path params
 */
export type RouteDefinition = {
  readonly method: HttpMethod;
  readonly path: string;
  readonly handler: Handler;
  readonly detail?: RouteDetail;
  readonly body?: unknown;
  readonly query?: unknown;
  readonly params?: unknown;
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
  readonly level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | undefined;
  readonly dir?: string | undefined;
  readonly pretty?: boolean | undefined;
  readonly retainDays?: number | undefined;
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
  get(
    path: string,
    handler: Handler,
    meta?: Omit<RouteDefinition, 'method' | 'path' | 'handler'>,
  ): this;
  post(
    path: string,
    handler: Handler,
    meta?: Omit<RouteDefinition, 'method' | 'path' | 'handler'>,
  ): this;
  put(
    path: string,
    handler: Handler,
    meta?: Omit<RouteDefinition, 'method' | 'path' | 'handler'>,
  ): this;
  patch(
    path: string,
    handler: Handler,
    meta?: Omit<RouteDefinition, 'method' | 'path' | 'handler'>,
  ): this;
  delete(
    path: string,
    handler: Handler,
    meta?: Omit<RouteDefinition, 'method' | 'path' | 'handler'>,
  ): this;
  group(prefix: string, fn: (app: this) => void): this;
  use(plugin: unknown): this;
  getElysia(): unknown;
  listen(port: number): void;
  stop(): Promise<void>;
}
