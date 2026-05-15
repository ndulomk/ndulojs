import type { IHttpAdapter } from 'ndulojs';
import type { IOrganizationService } from '../../../application/ports/organization.port.js';

export const createOrganizationController = (app: IHttpAdapter, service: IOrganizationService): void => {
  app.group('/organizations', (router) => {
    router.get('/', async () => service.list());
    router.get('/:id', async (ctx) => service.getById(ctx.params['id']!));
    router.post('/', async (ctx) => service.create(ctx.body as never));
    router.put('/:id', async (ctx) => service.update(ctx.params['id']!, ctx.body as never));
    router.delete('/:id', async (ctx) => service.remove(ctx.params['id']!));
  });
};
