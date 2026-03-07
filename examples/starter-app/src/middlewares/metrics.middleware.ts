import { Elysia } from 'elysia';
import { httpRequestDuration, httpRequestTotal, httpRequestErrors } from '@/shared/metrics/metrics';

export const metricsMiddleware = () =>
  new Elysia({ name: 'metrics' })
    .derive(() => {
      const startTime = Date.now();
      return { startTime };
    })
    .onAfterHandle(({ request, path, set, startTime }) => {
      if (!startTime) return;

      const duration = (Date.now() - startTime) / 1000;
      const method = request.method;
      const statusCode = set.status?.toString() || '200';

      httpRequestDuration.observe(
        {
          method,
          route: path,
          status_code: statusCode,
        },
        duration
      );

      httpRequestTotal.inc({
        method,
        route: path,
        status_code: statusCode,
      });
    })
    .onError(({ request, path, error }) => {
      const method = request.method;
      const errorType = error instanceof Error ? error.name : 'Unknown';
      
      httpRequestErrors.inc({
        method,
        route: path,
        error_type: errorType,
      });
    });