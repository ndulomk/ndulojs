import { createApp, Ok } from 'ndulojs';
import { registerOrganizationModule } from './modules/organizations/organization.module.js';

const { app, logger } = await createApp({
  port: Number(process.env['PORT']) || 3000,
  swagger: {
    enabled: true,
    title: 'Organizations API',
    version: '1.0.0',
    path: '/docs',
  },
});

app.get('/health', () => Ok({ status: 'ok' }));

registerOrganizationModule(app);

app.listen(Number(process.env['PORT']) || 3000);
logger.app.info(`Server on http://localhost:${Number(process.env['PORT']) || 3000}`);
