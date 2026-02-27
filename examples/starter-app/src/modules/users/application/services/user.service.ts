import { Ok, Err, ErrorFactory } from '@ndulojs/core';
import type { Result, AppError } from '@ndulojs/core';
import { hash, verify } from '@node-rs/argon2';
import { sign, verify as jwtVerify } from 'jsonwebtoken';
import type { IUserRepository, IUserService, RegisterDTO, LoginDTO, AuthResponseDTO, UserDTO } from '../ports/user.port.js';

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret';

const signToken = (userId: string): string =>
  sign({ userId }, JWT_SECRET, { expiresIn: '7d' } as Parameters<typeof sign>[2]);

export const createUserService = (repo: IUserRepository): IUserService => ({
  async register({ email, password, name }: RegisterDTO): Promise<Result<AuthResponseDTO, AppError>> {
    const existing = await repo.findByEmail(email);
    if (existing) return Err(ErrorFactory.conflict('Email already in use', 'email'));

    const passwordHash = await hash(password);
    const user = await repo.create({ email, password, name, passwordHash });
    return Ok({ user, token: signToken(user.id) });
  },

  async login({ email, password }: LoginDTO): Promise<Result<AuthResponseDTO, AppError>> {
    const record = await repo.findByEmail(email);
    if (!record) return Err(ErrorFactory.unauthorized('Invalid credentials', 'invalid_credentials'));

    const valid = await verify(record.passwordHash, password);
    if (!valid) return Err(ErrorFactory.unauthorized('Invalid credentials', 'invalid_credentials'));

    const { passwordHash: _, ...user } = record;
    return Ok({ user, token: signToken(user.id) });
  },

  async me(userId: string): Promise<Result<UserDTO, AppError>> {
    const user = await repo.findById(userId);
    if (!user) return Err(ErrorFactory.notFound('User not found', 'User', userId));
    return Ok(user);
  },
});

export const verifyToken = (token: string): string | null => {
  try {
    const payload = jwtVerify(token, JWT_SECRET) as { userId: string };
    return payload.userId ?? null;
  } catch {
    return null;
  }
};