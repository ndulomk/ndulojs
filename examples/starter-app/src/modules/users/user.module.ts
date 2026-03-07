import type { IHttpAdapter } from 'ndulojs';
import type { Database } from '@/db';
import { createUserRepository } from './infrastructure/persistence/user.repository.js';
import { createSessionRepository } from './infrastructure/persistence/session.repository.js';
import { createSessionService } from './application/services/session.service.js';
import { createUserService } from './application/services/user.service.js';
import { createUserController } from './infrastructure/http/controllers/user.controller.js';

export const registerUserModule = (db: Database, app: IHttpAdapter): void => {
  const userRepository    = createUserRepository(db);
  const sessionRepository = createSessionRepository(db);
  const sessionService    = createSessionService(sessionRepository);
  const userService       = createUserService(userRepository, sessionService);
  createUserController(app, userService, sessionService);
};