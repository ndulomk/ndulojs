import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFile, createFiles, fileExists, dirExists } from '../src/utils/fs.js';

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ndulojs-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('fileExists', () => {
  it('returns true for an existing file', async () => {
    const p = join(tmp, 'a.ts');
    await createFile(p, '');
    expect(await fileExists(p)).toBe(true);
  });

  it('returns false for a missing file', async () => {
    expect(await fileExists(join(tmp, 'nope.ts'))).toBe(false);
  });
});

describe('dirExists', () => {
  it('returns true for an existing dir', async () => {
    expect(await dirExists(tmp)).toBe(true);
  });

  it('returns false for a missing dir', async () => {
    expect(await dirExists(join(tmp, 'nope'))).toBe(false);
  });
});

describe('createFile', () => {
  it('creates a file with the given content', async () => {
    const p = join(tmp, 'hello.ts');
    await createFile(p, 'export const x = 1;');
    expect(await readFile(p, 'utf-8')).toBe('export const x = 1;');
  });

  it('creates intermediate directories automatically', async () => {
    const p = join(tmp, 'a', 'b', 'c.ts');
    await createFile(p, '');
    expect(await fileExists(p)).toBe(true);
  });

  it('does not overwrite if overwrite is false', async () => {
    const p = join(tmp, 'exists.ts');
    await createFile(p, 'v1');
    await createFile(p, 'v2', false);
    expect(await readFile(p, 'utf-8')).toBe('v1');
  });

  it('overwrites if overwrite is true', async () => {
    const p = join(tmp, 'exists.ts');
    await createFile(p, 'v1');
    await createFile(p, 'v2', true);
    expect(await readFile(p, 'utf-8')).toBe('v2');
  });
});

describe('createFiles', () => {
  it('creates all files', async () => {
    const files = [
      { path: join(tmp, 'a.ts'), content: 'a' },
      { path: join(tmp, 'b.ts'), content: 'b' },
    ];
    await createFiles(files);
    expect(await fileExists(files[0]!.path)).toBe(true);
    expect(await fileExists(files[1]!.path)).toBe(true);
  });

  it('does not overwrite existing files when overwrite is false', async () => {
    const p = join(tmp, 'a.ts');
    await createFile(p, 'v1');
    await createFiles([{ path: p, content: 'v2' }], false);
    expect(await readFile(p, 'utf-8')).toBe('v1');
  });

  it('does not create new files if an existing file is found (pre-check)', async () => {
    const existing = join(tmp, 'exists.ts');
    const newFile = join(tmp, 'new.ts');
    await createFile(existing, 'v1');

    await createFiles(
      [
        { path: newFile, content: 'x' },
        { path: existing, content: 'y' },
      ],
      false,
    );

    expect(await fileExists(newFile)).toBe(false);
  });
});
