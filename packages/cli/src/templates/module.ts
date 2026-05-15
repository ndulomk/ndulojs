import type { ModuleNames } from '../utils/pluralize.js';
export type { ModuleNames };

export interface GeneratedFile {
  path: string;
  content: string;
}

export const eventsTemplate = (n: ModuleNames): GeneratedFile => ({
  path: `src/modules/${n.kebabPlural}/events/${n.kebab}.events.ts`,
  content: `export type ${n.pascal}EventPayload = Record<string, unknown>;

export const ${n.camel}Events = {} as const;
`,
});

export const dtoTemplate = (n: ModuleNames, parentDir?: string): GeneratedFile => ({
  path: `src/modules/${parentDir ?? n.kebabPlural}/application/dtos/${n.kebab}.dto.ts`,
  content: `export interface Create${n.pascal}DTO {
  name: string;
  description?: string;
}

export interface Update${n.pascal}DTO extends Partial<Create${n.pascal}DTO> {
  id: string;
}

export interface ${n.pascal}ResponseDTO {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
`,
});

export const portTemplate = (n: ModuleNames, parentDir?: string): GeneratedFile => ({
  path: `src/modules/${parentDir ?? n.kebabPlural}/application/ports/${n.kebab}.port.ts`,
  content: `import type { Result, AppError } from 'ndulojs';
import type { Create${n.pascal}DTO, Update${n.pascal}DTO, ${n.pascal}ResponseDTO } from '../dtos/${n.kebab}.dto.js';

export interface I${n.pascal}Repository {
  findAll(): Promise<Result<${n.pascal}ResponseDTO[], AppError>>;
  findById(id: string): Promise<Result<${n.pascal}ResponseDTO, AppError>>;
  create(data: Create${n.pascal}DTO): Promise<Result<${n.pascal}ResponseDTO, AppError>>;
  update(id: string, data: Update${n.pascal}DTO): Promise<Result<${n.pascal}ResponseDTO, AppError>>;
  delete(id: string): Promise<Result<void, AppError>>;
}

export interface I${n.pascal}Service {
  list(): Promise<Result<${n.pascal}ResponseDTO[], AppError>>;
  getById(id: string): Promise<Result<${n.pascal}ResponseDTO, AppError>>;
  create(data: Create${n.pascal}DTO): Promise<Result<${n.pascal}ResponseDTO, AppError>>;
  update(id: string, data: Update${n.pascal}DTO): Promise<Result<${n.pascal}ResponseDTO, AppError>>;
  remove(id: string): Promise<Result<void, AppError>>;
}
`,
});

export const serviceTemplate = (n: ModuleNames, parentDir?: string): GeneratedFile => ({
  path: `src/modules/${parentDir ?? n.kebabPlural}/application/services/${n.kebab}.service.ts`,
  content: `import type { Result, AppError } from 'ndulojs';
import type { I${n.pascal}Repository, I${n.pascal}Service } from '../ports/${n.kebab}.port.js';
import type { Create${n.pascal}DTO, Update${n.pascal}DTO, ${n.pascal}ResponseDTO } from '../dtos/${n.kebab}.dto.js';

export const create${n.pascal}Service = (repo: I${n.pascal}Repository): I${n.pascal}Service => ({
  async list() {
    return repo.findAll();
  },

  async getById(id: string) {
    return repo.findById(id);
  },

  async create(data: Create${n.pascal}DTO) {
    return repo.create(data);
  },

  async update(id: string, data: Update${n.pascal}DTO) {
    return repo.update(id, data);
  },

  async remove(id: string) {
    return repo.delete(id);
  },
});
`,
});

export const repositoryTemplate = (n: ModuleNames, parentDir?: string): GeneratedFile => ({
  path: `src/modules/${parentDir ?? n.kebabPlural}/infrastructure/persistence/${n.kebab}.repository.ts`,
  content: `import type { Result, AppError } from 'ndulojs';
import type { I${n.pascal}Repository } from '../../application/ports/${n.kebab}.port.js';
import type { Create${n.pascal}DTO, Update${n.pascal}DTO, ${n.pascal}ResponseDTO } from '../../application/dtos/${n.kebab}.dto.js';

export const create${n.pascal}Repository = (): I${n.pascal}Repository => ({
  async findAll() {
    throw new Error('Not implemented');
  },

  async findById(_id: string) {
    throw new Error('Not implemented');
  },

  async create(_data: Create${n.pascal}DTO) {
    throw new Error('Not implemented');
  },

  async update(_id: string, _data: Update${n.pascal}DTO) {
    throw new Error('Not implemented');
  },

  async delete(_id: string) {
    throw new Error('Not implemented');
  },
});
`,
});

export const controllerTemplate = (n: ModuleNames, parentDir?: string): GeneratedFile => ({
  path: `src/modules/${parentDir ?? n.kebabPlural}/infrastructure/http/controllers/${n.kebab}.controller.ts`,
  content: `import type { IHttpAdapter } from 'ndulojs';
import type { I${n.pascal}Service } from '../../../application/ports/${n.kebab}.port.js';

export const create${n.pascal}Controller = (app: IHttpAdapter, service: I${n.pascal}Service): void => {
  app.group('/${n.kebabPlural}', (router) => {
    router.get('/', async () => service.list());
    router.get('/:id', async (ctx) => service.getById(ctx.params['id']!));
    router.post('/', async (ctx) => service.create(ctx.body as never));
    router.put('/:id', async (ctx) => service.update(ctx.params['id']!, ctx.body as never));
    router.delete('/:id', async (ctx) => service.remove(ctx.params['id']!));
  });
};
`,
});

export const moduleTemplate = (n: ModuleNames): GeneratedFile => ({
  path: `src/modules/${n.kebabPlural}/${n.kebab}.module.ts`,
  content: `import type { IHttpAdapter } from 'ndulojs';
import { create${n.pascal}Repository } from './infrastructure/persistence/${n.kebab}.repository.js';
import { create${n.pascal}Service } from './application/services/${n.kebab}.service.js';
import { create${n.pascal}Controller } from './infrastructure/http/controllers/${n.kebab}.controller.js';

export const register${n.pascal}Module = (app: IHttpAdapter): void => {
  const repo = create${n.pascal}Repository();
  const service = create${n.pascal}Service(repo);
  create${n.pascal}Controller(app, service);
};
`,
});

export const moduleFiles = (n: ModuleNames): GeneratedFile[] => [
  eventsTemplate(n),
  dtoTemplate(n),
  portTemplate(n),
  serviceTemplate(n),
  repositoryTemplate(n),
  controllerTemplate(n),
  moduleTemplate(n),
];

export const submoduleFiles = (n: ModuleNames, parent: ModuleNames): GeneratedFile[] => [
  dtoTemplate(n, parent.kebabPlural),
  portTemplate(n, parent.kebabPlural),
  serviceTemplate(n, parent.kebabPlural),
  repositoryTemplate(n, parent.kebabPlural),
  controllerTemplate(n, parent.kebabPlural),
];
