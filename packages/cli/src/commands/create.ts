import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dirExists } from '../utils/fs.js';
import { log } from '../utils/prompt.js';

const packageJson = (name: string): string =>
  JSON.stringify(
    {
      name,
      version: '0.1.0',
      type: 'module',
      scripts: { dev: 'bun --watch src/index.ts', start: 'bun src/index.ts', test: 'vitest' },
      dependencies: { '@ndulojs/core': 'latest', elysia: 'latest', zod: 'latest' },
      devDependencies: { '@types/bun': 'latest', typescript: 'latest', vitest: 'latest' },
    },
    null,
    2,
  );

const tsconfig = (): string =>
  JSON.stringify(
    {
      compilerOptions: {
        target: 'ESNext',
        module: 'ESNext',
        moduleResolution: 'bundler',
        strict: true,
        outDir: 'dist',
        rootDir: 'src',
        paths: { '@/*': ['./src/*'] },
      },
      include: ['src'],
    },
    null,
    2,
  );

const indexTs = `import { createApp, createContainer, Ok } from '@ndulojs/core';

const container = createContainer();
const app = await createApp({ port: Number(process.env['PORT']) || 3000 });

app.get('/health', () => Ok({ status: 'ok' }));
app.listen(Number(process.env['PORT']) || 3000);
`;

export const createProject = async (name: string): Promise<void> => {
  const dest = join(process.cwd(), name);

  if (await dirExists(dest)) {
    log.error(`Directory "${name}" already exists.`);
    process.exit(1);
  }

  await mkdir(join(dest, 'src', 'modules'), { recursive: true });

  await Promise.all([
    writeFile(join(dest, 'package.json'), packageJson(name)),
    writeFile(join(dest, 'tsconfig.json'), tsconfig()),
    writeFile(join(dest, '.env.example'), 'PORT=3000\nNODE_ENV=development\n'),
    writeFile(join(dest, '.gitignore'), 'node_modules\ndist\nlogs\n.env\n'),
    writeFile(join(dest, 'src', 'index.ts'), indexTs),
  ]);

  log.success(`Project "${name}" ready`);
  log.note('Next steps', `  cd ${name}\n  bun install\n  cp .env.example .env\n  bun dev`);
};
