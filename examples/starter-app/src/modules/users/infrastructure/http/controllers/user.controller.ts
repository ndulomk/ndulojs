import { Err, ErrorFactory } from '@ndulojs/core';
import type { IHttpAdapter } from '@ndulojs/core';
import type { IUserService } from '../../../application/ports/user.port.js';
import { verifyToken } from '../../../application/services/user.service.js';

export const createUserController = (app: IHttpAdapter, service: IUserService): void => {
  app.group('/users', (r) => {
    r.post('/register', async ({ body }) => {
      const { email, password, name } = body as { email: string; password: string; name: string };
      return service.register({ email, password, name });
    });

    r.post('/login', async ({ body }) => {
      const { email, password } = body as { email: string; password: string };
      return service.login({ email, password });
    });

    r.get('/me', async ({ headers }) => {
      const token = headers['authorization']?.replace('Bearer ', '');
      if (!token) return Err(ErrorFactory.unauthorized('Missing token', 'missing_token'));

      const userId = verifyToken(token);
      if (!userId) return Err(ErrorFactory.unauthorized('Invalid token', 'invalid_token'));

      return service.me(userId);
    });
  });
};