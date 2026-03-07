import { Ok, Err, ErrorFactory } from 'ndulojs';
import type { IUserRepository, IUserService } from '../ports/user.port.js';
import type { CreateUserDTO, UpdateUserDTO } from '../dtos/user.dto.js';
import type { ISessionService } from './session.service.js';
import { emitUserCreated, emitUserUpdated, emitUserDeleted } from '../../events/user.events.js';
import { hashPassword, comparePassword } from '@/shared/auth/auth.js';
import { createLogger } from 'ndulojs';

const logger = createLogger({ pretty: process.env['NODE_ENV'] !== 'production' });
const COMPONENT = 'UserService';

export const createUserService = (
  repository: IUserRepository,
  sessionService: ISessionService,
): IUserService => ({
  async register(data: CreateUserDTO) {
    const existing = await repository.findByEmail(data.email);
    if (existing) {
      return Err(ErrorFactory.conflict('Email already registered', 'email', COMPONENT));
    }

    const passwordHash = await hashPassword(data.password);
    const user = await repository.create({ ...data, passwordHash });

    Promise.allSettled([
      emitUserCreated(user.id, user.email, user.name),
    ]).catch((err) => logger.error.error(err, 'Background tasks failed on register'));

    return Ok(user);
  },

  async login(email, password, userAgent, ipAddress) {
    const user = await repository.findByEmail(email);
    if (!user) {
      return Err(ErrorFactory.unauthorized('Invalid credentials', 'invalid_credentials', COMPONENT));
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return Err(ErrorFactory.unauthorized('Invalid credentials', 'invalid_credentials', COMPONENT));
    }

    const sessionResult = await sessionService.createSession(user.id, userAgent, ipAddress);
    if (!sessionResult.success) return sessionResult;

    return Ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        timezone: user.timezone,
        locale: user.locale,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken: sessionResult.value.accessToken,
      refreshToken: sessionResult.value.refreshToken,
    });
  },

  async me(userId) {
    const user = await repository.findById(userId);
    if (!user) {
      return Err(ErrorFactory.notFound('User not found', 'User', COMPONENT));
    }
    return Ok(user);
  },

  async list(page, perPage) {
    const result = await repository.list(page, perPage);
    return Ok(result);
  },

  async update(userId, data: UpdateUserDTO) {
    const existing = await repository.findById(userId);
    if (!existing) {
      return Err(ErrorFactory.notFound('User not found', 'User', COMPONENT));
    }

    if (data.email && data.email !== existing.email) {
      const taken = await repository.findByEmail(data.email);
      if (taken) {
        return Err(ErrorFactory.conflict('Email already in use', 'email', COMPONENT));
      }
    }

    const updateData: Partial<UpdateUserDTO> & { passwordHash?: string } = {};
    if (data.email)              updateData.email    = data.email;
    if (data.name)               updateData.name     = data.name;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.locale !== undefined)   updateData.locale   = data.locale;
    if (data.password)           updateData.passwordHash = await hashPassword(data.password);

    const user = await repository.update(userId, updateData);

    Promise.allSettled([
      emitUserUpdated(userId, updateData),
    ]).catch((err) => logger.error.error(err, 'Background tasks failed on update'));

    return Ok(user);
  },

  async delete(userId) {
    const user = await repository.findById(userId);
    if (!user) {
      return Err(ErrorFactory.notFound('User not found', 'User', COMPONENT));
    }

    await repository.softDelete(userId);

    Promise.allSettled([
      emitUserDeleted(userId),
      sessionService.revokeAllUserSessions(userId),
    ]).catch((err) => logger.error.error(err, 'Background tasks failed on delete'));

    return Ok(undefined);
  },

  async updateAvatar(userId, avatarUrl) {
    const user = await repository.findById(userId);
    if (!user) {
      return Err(ErrorFactory.notFound('User not found', 'User', COMPONENT));
    }
    const updated = await repository.update(userId, { avatar: avatarUrl });
    return Ok(updated);
  },
});