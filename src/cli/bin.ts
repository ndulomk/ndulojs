#!/usr/bin/env bun
import { createProject } from './commands/create.js';
import { generateModule } from './commands/generate.js';
import { addFile } from './commands/add.js';
import { log } from './utils/prompt.js';

const [, , cmd, ...rest] = process.argv;

const HELP = `
Commands:
  ndulojs create <name>
  ndulo generate module <name> [--sub <name>]
  ndulo add <controller|service|repository|dto|port|events> <module>
`;

switch (cmd) {
  case 'create': {
    const [name] = rest;
    if (!name) {
      log.error('Usage: ndulojs create <name>');
      process.exit(1);
    }
    await createProject(name);
    break;
  }

  case 'generate': {
    const [kind, name, flag, subName] = rest;
    if (kind !== 'module' || !name) {
      log.error('Usage: ndulo generate module <name> [--sub <name>]');
      process.exit(1);
    }
    await generateModule(name, flag === '--sub' ? subName : undefined);
    break;
  }

  case 'add': {
    const [type, moduleName] = rest;
    if (!type || !moduleName) {
      log.error('Usage: ndulo add <type> <module>');
      process.exit(1);
    }
    await addFile(type, moduleName);
    break;
  }

  default:
    process.stdout.write(HELP);
}
