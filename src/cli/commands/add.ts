import { deriveNames } from '../utils/pluralize.js';
import { createFile, fileExists, listModules } from '../utils/fs.js';
import { confirm, log } from '../utils/prompt.js';
import {
  controllerTemplate,
  serviceTemplate,
  repositoryTemplate,
  dtoTemplate,
  portTemplate,
  eventsTemplate,
} from '../templates/module.js';
import type { GeneratedFile, ModuleNames } from '../templates/module.js';

type FileType = 'controller' | 'service' | 'repository' | 'dto' | 'port' | 'events';

const FILE_TYPES: FileType[] = ['controller', 'service', 'repository', 'dto', 'port', 'events'];

const pick = (type: FileType, n: ModuleNames): GeneratedFile =>
  ({
    controller: controllerTemplate(n),
    service: serviceTemplate(n),
    repository: repositoryTemplate(n),
    dto: dtoTemplate(n),
    port: portTemplate(n),
    events: eventsTemplate(n),
  })[type];

export const addFile = async (type: string, moduleName: string): Promise<void> => {
  if (!FILE_TYPES.includes(type as FileType)) {
    log.error(`Unknown type "${type}". Valid: ${FILE_TYPES.join(', ')}`);
    process.exit(1);
  }

  const n = deriveNames(moduleName);
  const modules = await listModules();

  if (!modules.includes(n.kebabPlural)) {
    log.error(`Module "${n.kebabPlural}" not found in src/modules/`);
    process.exit(1);
  }

  const file = pick(type as FileType, n);

  if (await fileExists(file.path)) {
    const ok = await confirm(`"${file.path}" already exists. Overwrite?`);
    if (!ok) {
      log.info('Cancelled.');
      process.exit(0);
    }
  }

  await createFile(file.path, file.content, true);
  log.success(`Added: ${file.path}`);
};
