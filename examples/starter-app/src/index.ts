import { createApp, createContainer, Ok } from '@ndulojs/core';
import { createUserRepository } from './modules/users/infrastructure/persistence/user.repository.js';
import { createUserService } from './modules/users/application/services/user.service.js';
import { createUserController } from './modules/users/infrastructure/http/controllers/user.controller.js';
const PORT = Number(process.env['PORT']) || 3000;

const container = createContainer()
  .register('UserRepository', () => createUserRepository())
  .register('UserService',    (c) => createUserService(c.resolve('UserRepository')));

const app = await createApp({
  port: PORT,
  cors: { origins: '*' },
  logger: { enabled: true, level: 'info' },
});

app.get('/health', () => Ok({ status: 'ok' }));

createUserController(app, container.resolve('UserService'));

app.listen(PORT);