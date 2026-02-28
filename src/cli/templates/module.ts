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

export const dtoTemplate = (n: ModuleNames): GeneratedFile => ({
  path: `src/modules/${n.kebabPlural}/application/dtos/${n.kebab}.dto.ts`,
  content: `export type Create${n.pascal}DTO = Record<string, unknown>;
export type Update${n.pascal}DTO = Partial<Create${n.pascal}DTO>;
export type ${n.pascal}ResponseDTO = { id: string };
`,
});

export const portTemplate = (n: ModuleNames): GeneratedFile => ({
  path: `src/modules/${n.kebabPlural}/application/ports/${n.kebab}.port.ts`,
  content: `import type { Result, AppError } from '@ndulojs/core';
import type { Create${n.pascal}DTO, ${n.pascal}ResponseDTO } from '../dtos/${n.kebab}.dto.js';

export interface I${n.pascal}Repository {}

export interface I${n.pascal}Service {}
`,
});

export const serviceTemplate = (n: ModuleNames): GeneratedFile => ({
  path: `src/modules/${n.kebabPlural}/application/services/${n.kebab}.service.ts`,
  content: `import type { I${n.pascal}Repository, I${n.pascal}Service } from '../ports/${n.kebab}.port.js';

export const create${n.pascal}Service = (repo: I${n.pascal}Repository): I${n.pascal}Service => ({});
`,
});

export const repositoryTemplate = (n: ModuleNames): GeneratedFile => ({
  path: `src/modules/${n.kebabPlural}/infrastructure/persistence/${n.kebab}.repository.ts`,
  content: `import type { I${n.pascal}Repository } from '../../application/ports/${n.kebab}.port.js';

export const create${n.pascal}Repository = (): I${n.pascal}Repository => ({});
`,
});

export const controllerTemplate = (n: ModuleNames): GeneratedFile => ({
  path: `src/modules/${n.kebabPlural}/infrastructure/http/controllers/${n.kebab}.controller.ts`,
  content: `import type { IHttpAdapter } from '@ndulojs/core';
import type { I${n.pascal}Service } from '../../../application/ports/${n.kebab}.port.js';

export const create${n.pascal}Controller = (app: IHttpAdapter, service: I${n.pascal}Service): void => {
  app.group('/${n.kebabPlural}', (router) => {
    // define routes here
  });
};
`,
});

export const moduleTemplate = (n: ModuleNames): GeneratedFile => ({
  path: `src/modules/${n.kebabPlural}/${n.kebab}.module.ts`,
  content: `import type { IHttpAdapter } from '@ndulojs/core';
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

export const submoduleFiles = (n: ModuleNames, parent: ModuleNames): GeneratedFile[] => {
  const nest = (f: GeneratedFile): GeneratedFile => ({
    ...f,
    path: f.path.replace(
      `src/modules/${n.kebabPlural}/`,
      `src/modules/${parent.kebabPlural}/${n.kebabPlural}/`,
    ),
  });
  return [
    dtoTemplate(n),
    portTemplate(n),
    serviceTemplate(n),
    repositoryTemplate(n),
    controllerTemplate(n),
  ].map(nest);
};
