import { Ok, Err, ErrorFactory } from 'ndulojs';
import type { Result, AppError } from 'ndulojs';
import type { ISessionRepository } from '../../infrastructure/persistence/session.repository.js';
import type { RefreshTokenResponseDTO, SessionResponseDTO } from '../dtos/session.dto.js';
import { generateToken, generateRefreshToken } from '@/shared/auth/auth.js';

const COMPONENT = 'SessionService';
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000;

export interface ISessionService {
  createSession(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<Result<{ accessToken: string; refreshToken: string }, AppError>>;
  refreshToken(refreshToken: string): Promise<Result<RefreshTokenResponseDTO, AppError>>;
  revokeSession(sessionId: string): Promise<Result<void, AppError>>;
  revokeAllUserSessions(userId: string): Promise<Result<{ count: number }, AppError>>;
  getActiveSessions(userId: string): Promise<Result<SessionResponseDTO[], AppError>>;
}

const detectDeviceType = (userAgent?: string): string => {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile';
  if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
  return 'desktop';
};

export const createSessionService = (repository: ISessionRepository): ISessionService => ({
  async createSession(userId, userAgent, ipAddress) {
    const accessToken = generateToken(userId);
    const refreshToken = generateRefreshToken(userId);

    await repository.create({
      userId,
      token: accessToken,
      refreshToken,
      userAgent,
      ipAddress,
      deviceType: detectDeviceType(userAgent),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY),
    });

    return Ok({ accessToken, refreshToken });
  },

  async refreshToken(refreshToken) {
    const session = await repository.findByRefreshToken(refreshToken);
    if (!session) {
      return Err(ErrorFactory.unauthorized('Invalid refresh token', 'invalid_token', COMPONENT));
    }
    if (!session.refreshToken) {
      return Err(ErrorFactory.unauthorized('Session has no refresh token', 'missing_token', COMPONENT));
    }
    if (new Date() > session.expiresAt) {
      await repository.revokeSession(session.id);
      return Err(ErrorFactory.unauthorized('Refresh token expired', 'expired_token', COMPONENT));
    }

    const newAccessToken = generateToken(session.userId);
    const newRefreshToken = generateRefreshToken(session.userId);

    await repository.revokeSession(session.id);
    await repository.create({
      userId: session.userId,
      token: newAccessToken,
      refreshToken: newRefreshToken,
      userAgent: session.userAgent ?? undefined,
      ipAddress: session.ipAddress ?? undefined,
      deviceType: session.deviceType ?? undefined,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY),
    });

    return Ok({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  },

  async revokeSession(sessionId) {
    await repository.revokeSession(sessionId);
    return Ok(undefined);
  },

  async revokeAllUserSessions(userId) {
    const count = await repository.revokeAllUserSessions(userId);
    return Ok({ count });
  },

  async getActiveSessions(userId) {
    const sessions = await repository.findActiveByUser(userId);
    return Ok(sessions);
  },
});