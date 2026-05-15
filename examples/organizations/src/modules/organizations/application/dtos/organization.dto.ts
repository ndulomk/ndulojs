export interface CreateOrganizationDTO {
  name: string;
  description?: string;
}

export interface UpdateOrganizationDTO extends Partial<CreateOrganizationDTO> {
  id: string;
}

export interface OrganizationResponseDTO {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
