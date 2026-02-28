import { mkdir, writeFile, access, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { constants } from 'node:fs';

export const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

export const dirExists = async (path: string): Promise<boolean> => fileExists(path);

export const createFile = async (
  filePath: string,
  content: string,
  overwrite = false,
): Promise<void> => {
  if (!overwrite && (await fileExists(filePath))) {
    throw new FileExistsError(filePath);
  }
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf-8');
};

export const createFiles = async (
  files: { path: string; content: string }[],
  overwrite = false,
): Promise<void> => {
  if (!overwrite) {
    for (const f of files) {
      if (await fileExists(f.path)) throw new FileExistsError(f.path);
    }
  }
  await Promise.all(files.map((f) => createFile(f.path, f.content, true)));
};

export const listModules = async (cwd = process.cwd()): Promise<string[]> => {
  const modulesDir = join(cwd, 'src', 'modules');
  if (!(await dirExists(modulesDir))) return [];
  try {
    const entries = await readdir(modulesDir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
};

export class FileExistsError extends Error {
  constructor(public readonly path: string) {
    super(`File already exists: ${path}`);
    this.name = 'FileExistsError';
  }
}
