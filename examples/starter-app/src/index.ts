import { createApp, Err, ErrorFactory, Ok } from 'ndulojs';
import { cors } from '@elysiajs/cors';
import { AnyElysia, Elysia } from 'elysia';
import { env } from '@/config/env.js';
import { db } from '@/db/index.js';
import { appLogger } from '@/shared/logger/logger.js';
import { getMetrics, activeConnections } from '@/shared/metrics/metrics.js';
import { registerUserModule } from '@/modules/users/user.module.js';

async function bootstrap() {
  const { app, logger } = await createApp({
    port: env.PORT,
    swagger: {
      enabled: true,
      title: 'PM1 API',
      version: '1.0.0',
      description: 'Production-ready API with full observability & security',
      path: '/docs',
      tags: [
        { name: 'health',   description: 'Health check endpoints' },
        { name: 'metrics',  description: 'Metrics and observability' },
        { name: 'auth',     description: 'Authentication & User Management' },
        { name: 'users',    description: 'User operations' },
        { name: 'sessions', description: 'Session management' },
      ],
    },
    logger: {
      enabled: true,
      level: env.LOG_LEVEL,
      pretty: env.LOG_PRETTY,
      dir: 'logs',
      retainDays: 30,
    },
  });

  const elysia: AnyElysia = app.getElysia() as AnyElysia;

  elysia.use(
    cors({
      origin: (request) => {
        const origin = request.headers.get('origin');
        if (!origin) return true;
        if (env.CORS_ORIGINS.includes('*')) return true;
        return env.CORS_ORIGINS.includes(origin);
      },
      credentials: env.CORS_CREDENTIALS,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-workspace-id'],
      exposeHeaders: ['Content-Type', 'Authorization', 'x-workspace-id'],
    }),
  );
  elysia
    .onBeforeHandle(() => { activeConnections.inc(); })
    .onAfterHandle(()  => { activeConnections.dec(); });
  app.get('/health', () => Ok({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }), { detail: {
    tags: ['health'],
    summary: 'Health check',
    description: 'Returns the health status of the application',
  }

  });


  app.get('/ready', () => Ok({
    status: 'ready',
    timestamp: new Date().toISOString(),
  }), {
    detail: {
      tags: ['health'],
      summary: 'Readiness check',
    }
  });

  app.get('/test-ok',    () => Ok({ msg: 'success' }));
app.get('/test-error', () => Err(ErrorFactory.notFound('test not found', 'Test', '1')));



  registerUserModule(db, app);
  app.listen(env.PORT);
  logger.app.info(`Server running on http://localhost:${env.PORT}`);
  logger.app.info(`Swagger docs on http://localhost:${env.PORT}/docs`);
  logger.app.info(`Metrics on http://localhost:${env.METRICS_PORT}/metrics`);
  const metricsApp = new Elysia()
    .get('/metrics', async () =>
      new Response(await getMetrics(), {
        headers: { 'Content-Type': 'text/plain; version=0.0.4' },
      }),
    )
    .listen(env.METRICS_PORT);

  appLogger.info(`Metrics server running on port ${env.METRICS_PORT}`);


  const shutdown = async (signal: string) => {
    logger.app.info(`${signal} received — shutting down gracefully`);
    await app.stop();
    await metricsApp.stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  appLogger.error(err, 'Failed to start server');
  process.exit(1);
});