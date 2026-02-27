import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createFile,
  createFiles,
  fileExists,
  dirExists,
  FileExistsError,
} from '../../src/cli/utils/fs.js';

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

  it('throws FileExistsError if file exists and overwrite is false', async () => {
    const p = join(tmp, 'exists.ts');
    await createFile(p, 'v1');
    await expect(createFile(p, 'v2', false)).rejects.toBeInstanceOf(FileExistsError);
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

  it('throws FileExistsError if any file exists and overwrite is false', async () => {
    const p = join(tmp, 'a.ts');
    await createFile(p, 'v1');
    await expect(createFiles([{ path: p, content: 'v2' }], false)).rejects.toBeInstanceOf(
      FileExistsError,
    );
  });

  it('does not create any file if one would fail (pre-check)', async () => {
    const existing = join(tmp, 'exists.ts');
    const newFile = join(tmp, 'new.ts');
    await createFile(existing, 'v1');

    await expect(
      createFiles(
        [
          { path: newFile, content: 'x' },
          { path: existing, content: 'y' },
        ],
        false,
      ),
    ).rejects.toBeInstanceOf(FileExistsError);

    expect(await fileExists(newFile)).toBe(false);
  });
});
