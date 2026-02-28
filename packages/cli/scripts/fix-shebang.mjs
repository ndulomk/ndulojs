#!/usr/bin/env node
import { readFile, writeFile, chmod } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const bin = resolve(__dirname, '../dist/bin.js');

let content;
try {
  content = await readFile(bin, 'utf-8');
} catch (err) {
  process.stderr.write(
    `✖ fix-shebang: could not read ${bin}\n  Is tsc producing output there? Check tsconfig.json outDir.\n`,
  );
  process.exit(1);
}

if (!content.startsWith('#!/usr/bin/env node')) {
  await writeFile(bin, `#!/usr/bin/env node\n${content}`, 'utf-8');
}

await chmod(bin, 0o755);
process.stdout.write(`✔ dist/bin.js — shebang ok, chmod 755\n`);
