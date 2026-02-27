import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProject } from '../../src/cli/commands/create.js';
import { fileExists, dirExists } from '../../src/cli/utils/fs.js';

let tmp: string;
let originalCwd: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ndulojs-create-'));
  originalCwd = process.cwd();
  process.chdir(tmp);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tmp, { recursive: true, force: true });
});

describe('createProject', () => {
  it('creates the expected file structure', async () => {
    await createProject('my-app');

    expect(await fileExists(join(tmp, 'my-app', 'package.json'))).toBe(true);
    expect(await fileExists(join(tmp, 'my-app', 'tsconfig.json'))).toBe(true);
    expect(await fileExists(join(tmp, 'my-app', '.env.example'))).toBe(true);
    expect(await fileExists(join(tmp, 'my-app', '.gitignore'))).toBe(true);
    expect(await fileExists(join(tmp, 'my-app', 'src', 'index.ts'))).toBe(true);
    expect(await dirExists(join(tmp, 'my-app', 'src', 'modules'))).toBe(true);
  });

  it('package.json has correct name and deps', async () => {
    await createProject('my-app');
    const raw = await readFile(join(tmp, 'my-app', 'package.json'), 'utf-8');
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    expect(pkg['name']).toBe('my-app');
    expect((pkg['dependencies'] as Record<string, unknown>)['@ndulojs/core']).toBeDefined();
  });

  it('index.ts imports from @ndulojs/core', async () => {
    await createProject('my-app');
    const src = await readFile(join(tmp, 'my-app', 'src', 'index.ts'), 'utf-8');
    expect(src).toContain('@ndulojs/core');
    expect(src).toContain('createApp');
    expect(src).toContain('Ok(');
  });

  it('exits if directory already exists', async () => {
    await createProject('my-app');
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit');
    }) as never);

    await expect(createProject('my-app')).rejects.toThrow('process.exit');
    exitSpy.mockRestore();
  });
});
