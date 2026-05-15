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
    return;
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
      if (await fileExists(f.path)) return;
    }
  }
  for (const f of files) {
    await mkdir(dirname(f.path), { recursive: true });
  }
  await Promise.all(files.map((f) => writeFile(f.path, f.content, 'utf-8')));
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
