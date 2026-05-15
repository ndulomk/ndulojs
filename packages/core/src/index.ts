// Result
export { Ok, Err, isResult, ResultTag } from './result/types.js';
export type { Result, Success, Failure, UnwrapResult } from './result/types.js';
export type {
  AppError,
  AppErrorType,
  BaseAppError,
  ValidationFieldError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BusinessError,
  DatabaseError,
  ExternalServiceError,
  InternalServerError,
} from './result/errors.js';
export { ErrorFactory } from './result/factory.js';
export {
  map,
  asyncMap,
  flatMap,
  asyncFlatMap,
  unwrap,
  unwrapOr,
  unwrapOrElse,
  isOk,
  isErr,
  combine,
  combineAll,
  fromThrowable,
  fromThrowableAsync,
  matchError,
} from './result/utils.js';

// Container
export { createContainer } from './container/index.js';
export type {
  Container,
  ScopedContainer,
  Token,
  Scope,
  Factory,
  Constructor,
  ResolverContainer,
} from './container/types.js';
export {
  AlreadyRegisteredError,
  CircularDependencyError,
  NotRegisteredError,
} from './container/errors.js';

// Logger
export { createLogger } from './logger/index.js';
export { createChannelLogger, createContextLogger } from './logger/factory.js';
export type {
  LoggerSuite,
  NduloLogger,
  LogChannel,
  LogContext,
  LogLevel,
  LoggerConfig,
} from './logger/types.js';

// HTTP
export { createApp } from './http/adapter.js';
export type {
  AppInstance,
  IHttpAdapter,
  Handler,
  RequestContext,
  ResponseControl,
  AppConfig,
  SwaggerConfig,
  Middleware,
  HttpMethod,
  RouteDefinition,
} from './http/types.js';

// Plugin
export { createPluginManager } from './plugin/index.js';
export type { Plugin, PluginContext, PluginManager } from './plugin/types.js';
