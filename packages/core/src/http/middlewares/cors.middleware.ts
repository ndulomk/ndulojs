import type { CorsConfig } from '../types';

const DEFAULT_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const DEFAULT_HEADERS = ['Content-Type', 'Authorization'];

/**
 * Checks if an origin is allowed by the CORS config.
 */
export const isOriginAllowed = (origin: string | null, config: CorsConfig): boolean => {
  if (!origin) return true;
  if (config.origins === '*') return true;
  return config.origins.includes(origin);
};

/**
 * Builds CORS response headers from config and request origin.
 */
export const buildCorsHeaders = (
  origin: string | null,
  config: CorsConfig,
): Record<string, string> => {
  if (!isOriginAllowed(origin, config)) return {};

  const allowedOrigin = config.origins === '*' ? '*' : (origin ?? '*');
  const methods = (config.methods ?? DEFAULT_METHODS).join(', ');
  const headers = (config.allowedHeaders ?? DEFAULT_HEADERS).join(', ');
  const exposeHeaders = (config.exposeHeaders ?? DEFAULT_HEADERS).join(', ');

  const result: Record<string, string> = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': headers,
    'Access-Control-Expose-Headers': exposeHeaders,
  };

  if (config.credentials) {
    result['Access-Control-Allow-Credentials'] = 'true';
  }

  return result;
};

/**
 * Handles an OPTIONS preflight request.
 * Returns a 204 response with the appropriate CORS headers.
 */
export const handlePreflight = (origin: string | null, config: CorsConfig): Response => {
  const headers = buildCorsHeaders(origin, config);
  return new Response(null, { status: 204, headers });
};
