import { createProject } from './commands/create.js';
import { generateModule, CancelError } from './commands/generate.js';
import { addFile } from './commands/add.js';
import { log, closeReader } from './utils/prompt.js';

const HELP = `
Commands:
  ndulojs create <name>
  ndulo generate module <name> [--sub <name>]
  ndulo add <controller|service|repository|dto|port|events> <module>
`;

const main = async (): Promise<void> => {
  const [, , cmd, ...rest] = process.argv;

  switch (cmd) {
    case 'create': {
      const [name] = rest;
      if (!name) {
        log.error('Usage: ndulojs create <name>');
        return;
      }
      await createProject(name);
      break;
    }

    case 'generate': {
      const [kind, name, flag, subName] = rest;
      if (kind !== 'module' || !name) {
        log.error('Usage: ndulo generate module <name> [--sub <name>]');
        return;
      }
      await generateModule(name, flag === '--sub' ? subName : undefined);
      break;
    }

    case 'add': {
      const [type, moduleName] = rest;
      if (!type || !moduleName) {
        log.error('Usage: ndulo add <type> <module>');
        return;
      }
      await addFile(type, moduleName);
      break;
    }

    default:
      process.stdout.write(HELP);
  }
};

main()
  .catch((err) => {
    if (err instanceof CancelError) {
      log.info('Cancelled.');
      return;
    }
    log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  })
  .finally(() => {
    closeReader();
  });
