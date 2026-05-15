import type { Result, AppError } from 'ndulojs';
import type { CreateOrganizationDTO, UpdateOrganizationDTO, OrganizationResponseDTO } from '../dtos/organization.dto.js';

export interface IOrganizationRepository {
  findAll(): Promise<Result<OrganizationResponseDTO[], AppError>>;
  findById(id: string): Promise<Result<OrganizationResponseDTO, AppError>>;
  create(data: CreateOrganizationDTO): Promise<Result<OrganizationResponseDTO, AppError>>;
  update(id: string, data: UpdateOrganizationDTO): Promise<Result<OrganizationResponseDTO, AppError>>;
  delete(id: string): Promise<Result<void, AppError>>;
}

export interface IOrganizationService {
  list(): Promise<Result<OrganizationResponseDTO[], AppError>>;
  getById(id: string): Promise<Result<OrganizationResponseDTO, AppError>>;
  create(data: CreateOrganizationDTO): Promise<Result<OrganizationResponseDTO, AppError>>;
  update(id: string, data: UpdateOrganizationDTO): Promise<Result<OrganizationResponseDTO, AppError>>;
  remove(id: string): Promise<Result<void, AppError>>;
}
