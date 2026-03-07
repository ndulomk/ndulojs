import { Elysia } from 'elysia';
import { verifyToken } from '@/shared/auth/auth';
import { ErrorFactory } from 'ndulojs';
import { Err } from 'ndulojs';
import type { RequestContext } from 'ndulojs';

export interface AuthContext {
  userId: string;
}

/**
 * Elysia plugin — applies globally via getElysia().use(authMiddleware()).
 *
 * Derives `auth` on every request from the `auth_token` cookie.
 * The onBeforeHandle guard short-circuits with Err(401) if the token
 * is missing / invalid — so protected handlers never run.
 *
 * The Result stored in `ctx.auth` is also consumed by requireAuth()
 * for handlers that need the userId directly.
 */
export const authMiddleware = () =>
  new Elysia({ name: 'auth' })
    .derive({ as: 'global' }, async ({ cookie }): Promise<{ auth: AuthContext | null }> => {
      const token = cookie['auth_token']?.value;

      if (!token || typeof token !== 'string' || token.trim() === '') {
        return { auth: null };
      }

      const userId = verifyToken(token);
      if (!userId) return { auth: null };


      return { auth: { userId } };
    });

/**
 * Use inside protected handlers to extract the authenticated user.
 *
 * Returns Err(401) if unauthenticated — just return it from the handler.
 *
 * @example
 * router.get('/me', async (ctx) => {
 *   const auth = requireAuth(ctx);
 *   if (!auth.success) return auth;
 *   return userService.me(auth.value.userId);
 * });
 */
export const requireAuth = (
  ctx: RequestContext & { auth?: AuthContext | null },
) => {
  if (!ctx.auth) {
    return Err(ErrorFactory.unauthorized('Authentication required', 'missing_token', 'AuthMiddleware'));
  }
  return { success: true as const, value: ctx.auth };
};