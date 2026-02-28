// Result
export { Ok, Err } from './result/types.js';
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
  flatMap,
  unwrap,
  unwrapOr,
  unwrapOrElse,
  isOk,
  isErr,
  combine,
  matchError,
} from './result/utils.js';

// Container
export { createContainer } from './container/index.js';
export type { Container, ScopedContainer, Token, Scope } from './container/types.js';

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
export { RateLimitPresets } from './http/types.js';
export type {
  IHttpAdapter,
  Handler,
  RequestContext,
  AppConfig,
  CorsConfig,
  RateLimitConfig,
  SwaggerConfig,
} from './http/types.js';
