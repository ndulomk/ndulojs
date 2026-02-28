import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileExists } from '../src/utils/fs.js';
import { moduleFiles, submoduleFiles } from '../src/templates/module.js';
import { createFiles } from '../src/utils/fs.js';
import { deriveNames } from '../src/utils/pluralize.js';

let tmp: string;
let originalCwd: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ndulojs-gen-'));
  originalCwd = process.cwd();
  process.chdir(tmp);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tmp, { recursive: true, force: true });
});

describe('moduleFiles', () => {
  it('generates all 7 expected files for a module', () => {
    const files = moduleFiles(deriveNames('farms'));
    const paths = files.map((f) => f.path);

    expect(paths).toContain('src/modules/farms/events/farm.events.ts');
    expect(paths).toContain('src/modules/farms/application/dtos/farm.dto.ts');
    expect(paths).toContain('src/modules/farms/application/ports/farm.port.ts');
    expect(paths).toContain('src/modules/farms/application/services/farm.service.ts');
    expect(paths).toContain('src/modules/farms/infrastructure/persistence/farm.repository.ts');
    expect(paths).toContain('src/modules/farms/infrastructure/http/controllers/farm.controller.ts');
    expect(paths).toContain('src/modules/farms/farm.module.ts');
    expect(paths).toHaveLength(7);
  });

  it('service template is a valid skeleton — empty interfaces, no try/catch', () => {
    const files = moduleFiles(deriveNames('farms'));
    const svc = files.find((f) => f.path.includes('service'))!;
    expect(svc.content).toContain('createFarmService');
    expect(svc.content).toContain('IFarmRepository');
    expect(svc.content).toContain('IFarmService');
    expect(svc.content).not.toContain('try {');
    expect(svc.content).not.toContain('catch');
  });

  it('module file wires DI correctly', () => {
    const files = moduleFiles(deriveNames('farms'));
    const mod = files.find((f) => f.path.includes('.module.ts'))!;
    expect(mod.content).toContain('createFarmRepository');
    expect(mod.content).toContain('createFarmService');
    expect(mod.content).toContain('createFarmController');
  });

  it('port has I{Pascal}Repository and I{Pascal}Service', () => {
    const files = moduleFiles(deriveNames('farms'));
    const port = files.find((f) => f.path.includes('.port.ts'))!;
    expect(port.content).toContain('IFarmRepository');
    expect(port.content).toContain('IFarmService');
  });

  it('content does not include try/catch in any file', () => {
    const files = moduleFiles(deriveNames('farms'));
    for (const f of files) {
      expect(f.content, `${f.path} should not have try/catch`).not.toContain('try {');
    }
  });

  it('creates files on disk', async () => {
    const files = moduleFiles(deriveNames('farms'));
    await createFiles(files, true);
    for (const f of files) {
      expect(await fileExists(join(tmp, f.path))).toBe(true);
    }
  });

  it('generated files are non-empty', async () => {
    const files = moduleFiles(deriveNames('farms'));
    await createFiles(files, true);
    for (const f of files) {
      const content = await readFile(join(tmp, f.path), 'utf-8');
      expect(content.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('submoduleFiles', () => {
  it('nests files under parent module', () => {
    const parent = deriveNames('farms');
    const child = deriveNames('members');
    const files = submoduleFiles(child, parent);
    for (const f of files) {
      expect(f.path).toContain('src/modules/farms/members/');
    }
  });

  it('does not generate events or module entry', () => {
    const files = submoduleFiles(deriveNames('members'), deriveNames('farms'));
    const paths = files.map((f) => f.path);
    expect(paths.some((p) => p.includes('.events.ts'))).toBe(false);
    expect(paths.some((p) => p.includes('.module.ts'))).toBe(false);
  });

  it('generates 5 files', () => {
    const files = submoduleFiles(deriveNames('members'), deriveNames('farms'));
    expect(files).toHaveLength(5);
  });
});
