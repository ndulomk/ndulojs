import type { Result, AppError } from 'ndulojs';
import type { CreateUserDTO, UpdateUserDTO, UserResponseDTO, AuthResponseDTO } from '../dtos/user.dto.js';

export interface ListResponse<T> {
  data: T;
  pagination: {
    currentPage: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface IUserRepository {
  create(data: CreateUserDTO & { passwordHash: string }): Promise<UserResponseDTO>;
  findById(id: string): Promise<UserResponseDTO | null>;
  findByEmail(email: string): Promise<(UserResponseDTO & { passwordHash: string }) | null>;
  list(page: number, perPage: number): Promise<ListResponse<UserResponseDTO[]>>;
  update(id: string, data: Partial<UpdateUserDTO> & { passwordHash?: string }): Promise<UserResponseDTO>;
  softDelete(id: string): Promise<void>;
}

export interface IUserService {
  register(data: CreateUserDTO): Promise<Result<UserResponseDTO, AppError>>;
  login(
    email: string,
    password: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<Result<AuthResponseDTO, AppError>>;
  me(userId: string): Promise<Result<UserResponseDTO, AppError>>;
  list(page: number, perPage: number): Promise<Result<ListResponse<UserResponseDTO[]>, AppError>>;
  update(userId: string, data: UpdateUserDTO): Promise<Result<UserResponseDTO, AppError>>;
  delete(userId: string): Promise<Result<void, AppError>>;
  updateAvatar(userId: string, avatarUrl: string): Promise<Result<UserResponseDTO, AppError>>;
}