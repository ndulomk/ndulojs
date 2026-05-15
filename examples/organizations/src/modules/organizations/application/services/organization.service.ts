import type { Result, AppError } from 'ndulojs';
import type { IOrganizationRepository, IOrganizationService } from '../ports/organization.port.js';
import type { CreateOrganizationDTO, UpdateOrganizationDTO, OrganizationResponseDTO } from '../dtos/organization.dto.js';

export const createOrganizationService = (repo: IOrganizationRepository): IOrganizationService => ({
  async list() {
    return repo.findAll();
  },

  async getById(id: string) {
    return repo.findById(id);
  },

  async create(data: CreateOrganizationDTO) {
    return repo.create(data);
  },

  async update(id: string, data: UpdateOrganizationDTO) {
    return repo.update(id, data);
  },

  async remove(id: string) {
    return repo.delete(id);
  },
});
