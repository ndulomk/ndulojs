import { z } from 'zod';

export type CreateUserDTO = {
  email: string;
  name: string;
  password: string;
  timezone?: string;
  locale?: string;
};

export type UpdateUserDTO = {
  email?: string;
  name?: string;
  password?: string;
  avatar?: string;
  timezone?: string;
  locale?: string;
};

export type LoginDTO = {
  email: string;
  password: string;
};

export type UserResponseDTO = {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  timezone: string | null;
  locale: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthResponseDTO = {
  user: UserResponseDTO;
  accessToken: string;
  refreshToken: string;
};

export type ListUsersQueryDTO = {
  page?: number;
  perPage?: number;
};

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  timezone: z.string().max(100).optional(),
  locale: z.string().max(10).optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  avatar: z.string().optional(),
  timezone: z.string().max(100).optional(),
  locale: z.string().max(10).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(10),
});

export const userIdSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
});