import { deriveNames } from '../utils/pluralize.js';
import { createFiles, dirExists } from '../utils/fs.js';
import { moduleFiles, submoduleFiles } from '../templates/module.js';
import { confirm, log } from '../utils/prompt.js';

export const generateModule = async (name: string, sub?: string): Promise<void> => {
  const n = deriveNames(name);
  const files = sub ? submoduleFiles(deriveNames(sub), n) : moduleFiles(n);
  const label = sub ? `${n.kebabPlural}/${deriveNames(sub).kebabPlural}` : n.kebabPlural;
  const moduleDir = `src/modules/${label}`;

  if (await dirExists(moduleDir)) {
    const ok = await confirm(`Module "${label}" already exists. Overwrite?`);
    if (!ok) {
      log.info('Cancelled.');
      process.exit(0);
    }
  }

  await createFiles(files, true);
  log.success(`Module "${label}" created`);
  log.note('Files created', files.map((f) => `  ${f.path}`).join('\n'));
};
