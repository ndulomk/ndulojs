import { Ok, Err, ErrorFactory } from 'ndulojs';
import type { Result, AppError } from 'ndulojs';
import type { IOrganizationRepository } from '../../application/ports/organization.port.js';
import type { CreateOrganizationDTO, UpdateOrganizationDTO, OrganizationResponseDTO } from '../../application/dtos/organization.dto.js';

type OrganizationRow = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const generateId = (): string => crypto.randomUUID();

export const createOrganizationRepository = (): IOrganizationRepository => {
  const store = new Map<string, OrganizationRow>();

  const toDTO = (row: OrganizationRow): OrganizationResponseDTO => ({
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });

  return {
    async findAll() {
      const all = [...store.values()].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      return Ok(all.map(toDTO));
    },

    async findById(id) {
      const row = store.get(id);
      if (!row) {
        return Err(ErrorFactory.notFound('Organization not found', 'Organization', id));
      }
      return Ok(toDTO(row));
    },

    async create(data) {
      const now = new Date();
      const row: OrganizationRow = {
        id: generateId(),
        name: data.name,
        description: data.description ?? null,
        createdAt: now,
        updatedAt: now,
      };
      store.set(row.id, row);
      return Ok(toDTO(row));
    },

    async update(id, data) {
      const row = store.get(id);
      if (!row) {
        return Err(ErrorFactory.notFound('Organization not found', 'Organization', id));
      }
      if (data.name !== undefined) row.name = data.name;
      if (data.description !== undefined) row.description = data.description;
      row.updatedAt = new Date();
      return Ok(toDTO(row));
    },

    async delete(id) {
      if (!store.has(id)) {
        return Err(ErrorFactory.notFound('Organization not found', 'Organization', id));
      }
      store.delete(id);
      return Ok(undefined as void);
    },
  };
};
