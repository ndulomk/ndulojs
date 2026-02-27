import type { Result, AppError } from '@ndulojs/core';
import { AuthResponseDTO, LoginDTO, RegisterDTO, UserDTO } from '../dtos/user.dto';

export interface IUserRepository {
  findByEmail(email: string): Promise<(UserDTO & { passwordHash: string }) | null>;
  findById(id: string): Promise<UserDTO | null>;
  create(data: RegisterDTO & { passwordHash: string }): Promise<UserDTO>;
}

export interface IUserService {
  register(data: RegisterDTO): Promise<Result<AuthResponseDTO, AppError>>;
  login(data: LoginDTO): Promise<Result<AuthResponseDTO, AppError>>;
  me(userId: string): Promise<Result<UserDTO, AppError>>;
}