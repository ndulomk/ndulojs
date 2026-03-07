import { eq, and, lt, isNull, desc } from 'drizzle-orm';
import type { Database } from '@/db';
import { sessions } from '@/db/schema';
import type { CreateSessionDTO, SessionResponseDTO } from '../../application/dtos/session.dto';

export interface ISessionRepository {
  create(data: CreateSessionDTO): Promise<SessionResponseDTO>;
  findByToken(token: string): Promise<SessionResponseDTO | null>;
  findByRefreshToken(refreshToken: string): Promise<SessionResponseDTO | null>;
  findActiveByUser(userId: string): Promise<SessionResponseDTO[]>;
  revokeSession(id: string): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<number>;
  deleteExpiredSessions(): Promise<number>;
}

export const createSessionRepository = (db: Database): ISessionRepository => {
  return {
    async create(data: CreateSessionDTO): Promise<SessionResponseDTO> {
      const [session] = await db
        .insert(sessions)
        .values({
          userId: data.userId,
          token: data.token,
          refreshToken: data.refreshToken,
          userAgent: data.userAgent,
          ipAddress: data.ipAddress,
          deviceType: data.deviceType,
          expiresAt: data.expiresAt,
        })
        .returning();

      return session;
    },

    async findByToken(token: string): Promise<SessionResponseDTO | null> {
      const [session] = await db
        .select()
        .from(sessions)
        .where(and(
          eq(sessions.token, token),
          eq(sessions.isActive, true),
          isNull(sessions.revokedAt)
        ))
        .limit(1);

      return session || null;
    },

    async findByRefreshToken(refreshToken: string): Promise<SessionResponseDTO | null> {
      const [session] = await db
        .select()
        .from(sessions)
        .where(and(
          eq(sessions.refreshToken, refreshToken),
          eq(sessions.isActive, true),
          isNull(sessions.revokedAt)
        ))
        .limit(1);

      return session || null;
    },

    async findActiveByUser(userId: string): Promise<SessionResponseDTO[]> {
      return await db
        .select()
        .from(sessions)
        .where(and(
          eq(sessions.userId, userId),
          eq(sessions.isActive, true),
          isNull(sessions.revokedAt)
        ))
        .orderBy(desc(sessions.createdAt));
    },

    async revokeSession(id: string): Promise<void> {
      await db
        .update(sessions)
        .set({
          isActive: false,
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, id));
    },

    async revokeAllUserSessions(userId: string): Promise<number> {
      const result = await db
        .update(sessions)
        .set({
          isActive: false,
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(sessions.userId, userId),
          eq(sessions.isActive, true)
        ))
        .returning();

      return result.length;
    },

    async deleteExpiredSessions(): Promise<number> {
      const now = new Date();

      const result = await db
        .delete(sessions)
        .where(lt(sessions.expiresAt, now))
        .returning();

      return result.length;
    },
  };
};