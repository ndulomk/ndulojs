import { Ok, Err, ErrorFactory } from 'ndulojs';
import type { IHttpAdapter, RequestContext } from 'ndulojs';
import { t } from 'elysia';
import type { AuthContext } from '@/middlewares/auth.middleware.js';
import { requireAuth } from '@/middlewares/auth.middleware.js';
import { rateLimit, RateLimitPresets } from '@/middlewares/rate-limit.middleware.js';
import { parseMultipart } from '@/shared/upload/multipart.parser.js';
import { userUpload } from '@/shared/upload/upload.service.js';
import type { IUserService } from '../../../application/ports/user.port.js';
import type { ISessionService } from '../../../application/services/session.service.js';
import {
  createUserSchema,
  loginSchema,
  updateUserSchema,
  listUsersQuerySchema,
  userIdSchema,
} from '../../../application/dtos/user.dto.js';
import { validateWithZod } from '@/shared/utils/validate.js';
import { AnyCookieStore, setAuthCookie } from '@/shared/utils/cookie-utils.js';

type AuthedContext = RequestContext & { 
  auth?: AuthContext | null
  cookie?: AnyCookieStore
};

const extractRequestInfo = (ctx: RequestContext) => ({
  userAgent: ctx.headers['user-agent'] ?? undefined,
  ipAddress: ctx.headers['x-forwarded-for'] ?? ctx.headers['x-real-ip'] ?? undefined,
});

export const createUserController = (
  app: IHttpAdapter,
  userService: IUserService,
  sessionService: ISessionService,
): void => {

  app.group('/users/auth', (router) => {
    router.post('/register', async (ctx: AuthedContext) => {
      const limited = await rateLimit(ctx, RateLimitPresets.AUTH);
      if (limited) return limited;

      const validation = validateWithZod(createUserSchema, ctx.body, 'UserController');
      if (!validation.success) return validation;

      const info = extractRequestInfo(ctx);
      const userResult = await userService.register(validation.value);
      if (!userResult.success) return userResult;

      const sessionResult = await sessionService.createSession(
        userResult.value.id,
        info.userAgent,
        info.ipAddress,
      );
      if (!sessionResult.success) return sessionResult;

      const cookies = ctx.cookie as AnyCookieStore;
      setAuthCookie(cookies, sessionResult.value.accessToken);

      return Ok({
        user: userResult.value,
        accessToken: sessionResult.value.accessToken,
        refreshToken: sessionResult.value.refreshToken,
      });
    }, {
      detail: {
        tags: ['auth'],
        summary: 'Register new user',
        description: 'Creates a new user account and returns tokens',
      },
      body: t.Object({
        email:    t.String({ format: 'email' }),
        name:     t.String({ minLength: 2 }),
        password: t.String({ minLength: 6 }),
        timezone: t.Optional(t.String({ maxLength: 100 })),
        locale:   t.Optional(t.String({ maxLength: 10 })),
      }),
    });

    router.post('/login', async (ctx: AuthedContext) => {
      const limited = await rateLimit(ctx, RateLimitPresets.AUTH);
      if (limited) return limited;

      const validation = validateWithZod(loginSchema, ctx.body, 'UserController');
      if (!validation.success) return validation;

      const info = extractRequestInfo(ctx);
      const result = await userService.login(
        validation.value.email,
        validation.value.password,
        info.userAgent,
        info.ipAddress,
      );
      if (!result.success) return result;
      const cookies = ctx.cookie as AnyCookieStore;
      setAuthCookie(cookies, result.value.accessToken);
      return Ok({
        user: result.value.user,
        accessToken: result.value.accessToken,
        refreshToken: result.value.refreshToken,
      });
    }, {
      detail: {
        tags: ['auth'],
        summary: 'User login',
      },
      body: t.Object({
        email:    t.String({ format: 'email' }),
        password: t.String({ minLength: 1 }),
      }),
    });

    router.post('/logout', async (_ctx: AuthedContext) => {
      return Ok({ message: 'Logged out successfully' });
    }, {
      detail: {
        tags: ['auth'],
        summary: 'User logout',
      },
    });

    router.post('/refresh', async (ctx: AuthedContext) => {
      const body = ctx.body as { refreshToken?: unknown };
      if (!body.refreshToken || typeof body.refreshToken !== 'string') {
        return Err(ErrorFactory.validation('refreshToken is required', [], 'SessionController'));
      }
      return sessionService.refreshToken(body.refreshToken);
    }, {
      detail: {
        tags: ['auth'],
        summary: 'Refresh access token',
      },
      body: t.Object({
        refreshToken: t.String(),
      }),
    });
  });

  app.group('/users', (router) => {
    router.get('/me', async (ctx: AuthedContext) => {
      const auth = requireAuth(ctx);
      if (!auth.success) return auth;
      return userService.me(auth.value.userId);
    }, {
      detail: {
        tags: ['users'],
        summary: 'Get current user',
      },
    });

    router.get('/', async (ctx: AuthedContext) => {
      const auth = requireAuth(ctx);
      if (!auth.success) return auth;

      const limited = await rateLimit(ctx, RateLimitPresets.API);
      if (limited) return limited;

      const validation = validateWithZod(listUsersQuerySchema, ctx.query, 'UserController');
      if (!validation.success) return validation;

      return userService.list(validation.value.page, validation.value.perPage);
    }, {
      detail: {
        tags: ['users'],
        summary: 'List users',
      },
      query: t.Object({
        page:    t.Optional(t.Number()),
        perPage: t.Optional(t.Number()),
      }),
    });

    router.patch('/me', async (ctx: AuthedContext) => {
      const auth = requireAuth(ctx);
      if (!auth.success) return auth;

      const validation = validateWithZod(updateUserSchema, ctx.body, 'UserController');
      if (!validation.success) return validation;

      return userService.update(auth.value.userId, validation.value);
    }, {
      detail: {
        tags: ['users'],
        summary: 'Update current user',
      },
      body: t.Object({
        email:    t.Optional(t.String({ format: 'email' })),
        name:     t.Optional(t.String({ minLength: 2 })),
        password: t.Optional(t.String({ minLength: 6 })),
        avatar:   t.Optional(t.String()),
        timezone: t.Optional(t.String({ maxLength: 100 })),
        locale:   t.Optional(t.String({ maxLength: 10 })),
      }),
    });

    router.post('/me/avatar', async (ctx: AuthedContext) => {
      const auth = requireAuth(ctx);
      if (!auth.success) return auth;

      const parsed = await parseMultipart(ctx.request);
      if (!parsed.success) return parsed;

      const file = parsed.value.files.find((f) => f.fieldname === 'avatar');
      if (!file) {
        return Err(ErrorFactory.validation('avatar field is required', [], 'UserController'));
      }

      const uploaded = await userUpload.uploadOne(file);
      if (!uploaded.success) return uploaded;

      return userService.updateAvatar(auth.value.userId, uploaded.value.url);
    }, {
      detail: {
        tags: ['users'],
        summary: 'Upload avatar',
        description: 'multipart/form-data com campo "avatar" (JPEG/PNG/WebP, max 5 MB)',
      },
    });

    router.delete('/:id', async (ctx: AuthedContext) => {
      const auth = requireAuth(ctx);
      if (!auth.success) return auth;

      const validation = validateWithZod(userIdSchema, ctx.params, 'UserController');
      if (!validation.success) return validation;

      return userService.delete(validation.value.id);
    }, {
      detail: {
        tags: ['users'],
        summary: 'Delete user',
      },
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
    });
  });

  app.group('/sessions', (router) => {

    router.get('/', async (ctx: AuthedContext) => {
      const auth = requireAuth(ctx);
      if (!auth.success) return auth;
      return sessionService.getActiveSessions(auth.value.userId);
    }, {
      detail: {
        tags: ['sessions'],
        summary: 'List active sessions',
      },
    });

    router.delete('/:sessionId', async (ctx: AuthedContext) => {
      const auth = requireAuth(ctx);
      if (!auth.success) return auth;
      await sessionService.revokeSession(ctx.params['sessionId'] ?? '');
      return Ok({ message: 'Session revoked successfully' });
    }, {
      detail: {
        tags: ['sessions'],
        summary: 'Revoke session',
      },
      params: t.Object({
        sessionId: t.String({ format: 'uuid' }),
      }),
    });

    router.post('/revoke-all', async (ctx: AuthedContext) => {
      const auth = requireAuth(ctx);
      if (!auth.success) return auth;
      const result = await sessionService.revokeAllUserSessions(auth.value.userId);
      if (!result.success) return result;
      return Ok({ message: `${result.value.count} sessions revoked`, count: result.value.count });
    }, {
      detail: {
        tags: ['sessions'],
        summary: 'Revoke all sessions',
      },
    });
  });
};