import type { IHttpAdapter } from 'ndulojs';
import { createOrganizationRepository } from './infrastructure/persistence/organization.repository.js';
import { createOrganizationService } from './application/services/organization.service.js';
import { createOrganizationController } from './infrastructure/http/controllers/organization.controller.js';

export const registerOrganizationModule = (app: IHttpAdapter): void => {
  const repo = createOrganizationRepository();
  const service = createOrganizationService(repo);
  createOrganizationController(app, service);
};
